import { SchedulerWorker } from './scheduler.worker';
import { JobStatus, PostStatus } from '@prisma/client';

describe('SchedulerWorker (Scheduler Dispatch)', () => {
  const makeWorker = (prisma: any, queue: any) => {
    const worker = Object.create(SchedulerWorker.prototype) as SchedulerWorker;
    Object.assign(worker, { prisma, queue });
    return worker;
  };

  describe('processDueSchedules', () => {
    it('enqueues scheduler jobs for pending schedules that are due', async () => {
      // ARRANGE
      const prisma = {
        schedule: {
          findMany: jest.fn().mockResolvedValue([
            { id: 'schedule-1', scheduledAt: new Date(Date.now() - 5000) },
            { id: 'schedule-2', scheduledAt: new Date(Date.now() - 1000) },
          ]),
        },
      };
      const queue = {
        addScheduleJob: jest.fn().mockResolvedValue({ id: 'job-1' }),
      };
      const worker = makeWorker(prisma, queue);

      // ACT
      const result = await worker.processDueSchedules();

      // ASSERT
      expect(result.processed).toBe(2);
      expect(queue.addScheduleJob).toHaveBeenCalledTimes(2);
      expect(queue.addScheduleJob).toHaveBeenCalledWith({ scheduleId: 'schedule-1' });
      expect(queue.addScheduleJob).toHaveBeenCalledWith({ scheduleId: 'schedule-2' });
    });
  });

  describe('processScheduleJob', () => {
    it('claims a due schedule atomically and enqueues one publish job', async () => {
      // ARRANGE
      const schedule = {
        id: 'schedule-1',
        postId: 'post-1',
        status: JobStatus.PENDING,
        scheduledAt: new Date(Date.now() - 1000),
        post: { status: PostStatus.SCHEDULED },
      };
      const prisma = {
        schedule: {
          findUnique: jest.fn().mockResolvedValue(schedule),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
      };
      const queue = {
        addPublishJob: jest.fn().mockResolvedValue({ id: 'publish-job-1' }),
      };
      const worker = makeWorker(prisma, queue);

      // ACT
      const result = await worker.processScheduleJob({ scheduleId: 'schedule-1' });

      // ASSERT
      expect(result).toEqual({ success: true, postId: 'post-1' });
      expect(prisma.schedule.updateMany).toHaveBeenCalledWith({
        where: { id: 'schedule-1', status: JobStatus.PENDING },
        data: { status: JobStatus.PROCESSING },
      });
      expect(queue.addPublishJob).toHaveBeenCalledWith({ postId: 'post-1' });
    });

    it('avoids duplicate execution when another worker already claimed the schedule', async () => {
      // ARRANGE
      const schedule = {
        id: 'schedule-1',
        postId: 'post-1',
        status: JobStatus.PENDING,
        scheduledAt: new Date(Date.now() - 1000),
        post: { status: PostStatus.SCHEDULED },
      };
      const prisma = {
        schedule: {
          findUnique: jest.fn().mockResolvedValue(schedule),
          updateMany: jest.fn().mockResolvedValue({ count: 0 }), // Another worker won the claim
        },
      };
      const queue = { addPublishJob: jest.fn() };
      const worker = makeWorker(prisma, queue);

      // ACT
      const result = await worker.processScheduleJob({ scheduleId: 'schedule-1' });

      // ASSERT
      expect(result).toEqual({ success: true, alreadyDispatched: true });
      expect(queue.addPublishJob).not.toHaveBeenCalled();
    });

    it('throws error when schedule is not due yet', async () => {
      // ARRANGE: scheduled in the future
      const schedule = {
        id: 'schedule-future',
        postId: 'post-1',
        status: JobStatus.PENDING,
        scheduledAt: new Date(Date.now() + 60000),
        post: { status: PostStatus.SCHEDULED },
      };
      const prisma = {
        schedule: { findUnique: jest.fn().mockResolvedValue(schedule) },
      };
      const queue = { addPublishJob: jest.fn() };
      const worker = makeWorker(prisma, queue);

      // ACT & ASSERT
      await expect(
        worker.processScheduleJob({ scheduleId: 'schedule-future' }),
      ).rejects.toThrow('Schedule is not due yet');
      expect(queue.addPublishJob).not.toHaveBeenCalled();
    });

    it('marks schedule COMPLETED without publishing if post was cancelled', async () => {
      // ARRANGE
      const schedule = {
        id: 'schedule-1',
        postId: 'post-1',
        status: JobStatus.PENDING,
        scheduledAt: new Date(Date.now() - 1000),
        post: { status: PostStatus.CANCELLED },
      };
      const prisma = {
        schedule: {
          findUnique: jest.fn().mockResolvedValue(schedule),
          update: jest.fn().mockResolvedValue({}),
        },
      };
      const queue = { addPublishJob: jest.fn() };
      const worker = makeWorker(prisma, queue);

      // ACT
      const result = await worker.processScheduleJob({ scheduleId: 'schedule-1' });

      // ASSERT
      expect(result).toEqual({ success: false, reason: 'Post cancelled' });
      expect(prisma.schedule.update).toHaveBeenCalledWith({
        where: { id: 'schedule-1' },
        data: { status: JobStatus.COMPLETED },
      });
      expect(queue.addPublishJob).not.toHaveBeenCalled();
    });

    it('reverts schedule to PENDING if adding publish job to queue fails', async () => {
      // ARRANGE
      const schedule = {
        id: 'schedule-1',
        postId: 'post-1',
        status: JobStatus.PENDING,
        scheduledAt: new Date(Date.now() - 1000),
        post: { status: PostStatus.SCHEDULED },
      };
      const prisma = {
        schedule: {
          findUnique: jest.fn().mockResolvedValue(schedule),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
      };
      const queue = {
        addPublishJob: jest.fn().mockRejectedValue(new Error('Queue unavailable')),
      };
      const worker = makeWorker(prisma, queue);

      // ACT & ASSERT
      await expect(
        worker.processScheduleJob({ scheduleId: 'schedule-1' }),
      ).rejects.toThrow('Queue unavailable');
      expect(prisma.schedule.updateMany).toHaveBeenLastCalledWith({
        where: { id: 'schedule-1', status: JobStatus.PROCESSING },
        data: { status: JobStatus.PENDING },
      });
    });
  });
});
