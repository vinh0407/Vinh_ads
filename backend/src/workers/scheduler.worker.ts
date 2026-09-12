import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Worker } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { JobStatus, PostStatus } from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ScheduleDispatchJobData } from '../queue/job-contracts';
import { getErrorMessage } from '../common/utils/error.util';

@Injectable()
export class SchedulerWorker implements OnModuleDestroy {
  private readonly logger = new Logger(SchedulerWorker.name);
  private worker: Worker<ScheduleDispatchJobData>;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private queue: QueueService,
  ) {
    this.worker = new Worker<ScheduleDispatchJobData>(
      'schedule-dispatch',
      (job: Job<ScheduleDispatchJobData>) => this.processScheduleJob(job.data),
      {
        connection: {
          host: this.configService.get<string>('app.redis.host'),
          port: this.configService.get<number>('app.redis.port'),
          password: this.configService.get<string>('app.redis.password'),
        },
        concurrency: 5,
      },
    );
    this.worker.on('failed', (job, error) =>
      this.logger.error(`Schedule job ${job?.id} failed: ${error.message}`),
    );
  }

  async processScheduleJob(data: ScheduleDispatchJobData) {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id: data.scheduleId },
      include: { post: true },
    });
    if (!schedule) return { success: false, reason: 'Schedule not found' };
    if (schedule.post.status === PostStatus.CANCELLED) {
      await this.prisma.schedule.update({
        where: { id: schedule.id },
        data: { status: JobStatus.COMPLETED },
      });
      return { success: false, reason: 'Post cancelled' };
    }
    if (schedule.post.status === PostStatus.PUBLISHED) {
      await this.prisma.schedule.update({
        where: { id: schedule.id },
        data: { status: JobStatus.COMPLETED },
      });
      return { success: true, alreadyPublished: true };
    }
    if (schedule.scheduledAt.getTime() > Date.now())
      throw new Error('Schedule is not due yet');

    const claim = await this.prisma.schedule.updateMany({
      where: { id: schedule.id, status: JobStatus.PENDING },
      data: { status: JobStatus.PROCESSING },
    });
    if (claim.count !== 1) return { success: true, alreadyDispatched: true };

    try {
      await this.queue.addPublishJob({ postId: schedule.postId });
      return { success: true, postId: schedule.postId };
    } catch (error: unknown) {
      await this.prisma.schedule.updateMany({
        where: { id: schedule.id, status: JobStatus.PROCESSING },
        data: { status: JobStatus.PENDING },
      });
      throw error;
    }
  }

  async processDueSchedules() {
    const now = new Date();
    const dueSchedules = await this.prisma.schedule.findMany({
      where: {
        status: JobStatus.PENDING,
        scheduledAt: { lte: now },
      },
    });

    for (const schedule of dueSchedules) {
      await this.queue.addScheduleJob({ scheduleId: schedule.id });
    }

    return { processed: dueSchedules.length };
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async dispatchDueSchedules() {
    try {
      await this.processDueSchedules();
    } catch (error: unknown) {
      this.logger.error(
        `Failed to dispatch schedules: ${getErrorMessage(error)}`,
      );
    }
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }
}
