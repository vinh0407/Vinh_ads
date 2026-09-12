import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateScheduleDto } from "./dto/create-schedule.dto";
import { QueueService } from "../queue/queue.service";
import { JobStatus, PostStatus } from "@prisma/client";

@Injectable()
export class SchedulesService {
  constructor(
    private prisma: PrismaService,
    private queue: QueueService,
  ) {}

  async create(userId: string, createScheduleDto: CreateScheduleDto) {
    const post = await this.prisma.post.findFirst({
      where: { id: createScheduleDto.postId, userId },
      include: { schedule: true },
    });
    if (!post) throw new NotFoundException("Post not found");

    if (
      post.status === PostStatus.PUBLISHED ||
      post.status === PostStatus.CANCELLED
    ) {
      throw new ConflictException(
        `Cannot schedule a ${post.status.toLowerCase()} post`,
      );
    }

    if (post.schedule) {
      throw new ConflictException("Post already has an existing schedule");
    }

    const schedule = await this.prisma.schedule.create({
      data: {
        postId: createScheduleDto.postId,
        scheduledAt: new Date(createScheduleDto.scheduledAt),
      },
    });
    await this.prisma.post.update({
      where: { id: post.id },
      data: { status: PostStatus.SCHEDULED },
    });
    await this.queue.addScheduleJob(
      { scheduleId: schedule.id },
      schedule.scheduledAt,
    );
    return schedule;
  }

  async findAll(userId: string) {
    return this.prisma.schedule.findMany({
      where: { post: { userId } },
      include: { post: { include: { video: true, facebookPage: true } } },
      orderBy: { scheduledAt: "asc" },
    });
  }

  async findOne(userId: string, id: string) {
    const schedule = await this.prisma.schedule.findFirst({
      where: { id, post: { userId } },
      include: { post: true },
    });
    if (!schedule) throw new NotFoundException("Schedule not found");
    return schedule;
  }

  async update(userId: string, id: string, scheduledAt: string) {
    await this.findOne(userId, id);
    const date = new Date(scheduledAt);
    if (isNaN(date.getTime())) {
      throw new BadRequestException("Invalid scheduled date format");
    }
    const schedule = await this.prisma.schedule.update({
      where: { id },
      data: { scheduledAt: date, status: JobStatus.PENDING },
    });
    await this.queue.removeScheduleJob(id);
    await this.queue.addScheduleJob({ scheduleId: id }, schedule.scheduledAt);
    return schedule;
  }

  async delete(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.queue.removeScheduleJob(id);
    return this.prisma.schedule.delete({ where: { id } });
  }
}
