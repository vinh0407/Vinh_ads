import { Injectable, Logger } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationJobData } from '../queue/job-contracts';

@Injectable()
export class NotificationWorker {
  private readonly logger = new Logger(NotificationWorker.name);
  private worker: Worker<NotificationJobData>;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.initializeWorker();
  }

  private initializeWorker() {
    this.worker = new Worker<NotificationJobData>(
      'notification',
      async (job: Job<NotificationJobData>) => {
        return this.sendNotification(job.data);
      },
      {
        connection: {
          host: this.configService.get<string>('app.redis.host'),
          port: this.configService.get<number>('app.redis.port'),
          password: this.configService.get<string>('app.redis.password'),
        },
        concurrency: 5,
      },
    );
  }

  private async sendNotification(data: NotificationJobData) {
    const { userId, type, title, message } = data;
    this.logger.log(`Sending notification to user ${userId}: ${title}`);

    await this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
      },
    });

    return { success: true };
  }

  async onModuleDestroy() {
    await this.worker.close();
  }
}
