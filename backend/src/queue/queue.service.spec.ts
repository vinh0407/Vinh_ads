import { QueueService } from './queue.service';

describe('QueueService job contracts', () => {
  it('uses stable job ids and BullMQ retries for scheduler and publisher jobs', async () => {
    const noopQueue = { add: jest.fn(), getJob: jest.fn() } as any;
    const scheduleQueue = { add: jest.fn().mockResolvedValue({ id: 'schedule-schedule-1' }) } as any;
    const publishQueue = { add: jest.fn().mockResolvedValue({ id: 'publish-post-1' }), getJob: jest.fn().mockResolvedValue(null) } as any;
    const service = new QueueService(noopQueue, noopQueue, noopQueue, noopQueue, scheduleQueue, publishQueue, noopQueue, noopQueue);
    await service.addScheduleJob({ scheduleId: 'schedule-1' }, new Date(Date.now() + 60_000));
    await service.addPublishJob({ postId: 'post-1' });
    expect(scheduleQueue.add).toHaveBeenCalledWith('dispatch', { scheduleId: 'schedule-1' }, expect.objectContaining({ jobId: 'schedule-schedule-1', attempts: 3 }));
    expect(publishQueue.add).toHaveBeenCalledWith('publish', { postId: 'post-1' }, expect.objectContaining({ jobId: 'publish-post-1', attempts: 3 }));
  });

  it('allows an explicitly re-enqueued failed publish job', async () => {
    const noopQueue = { add: jest.fn(), getJob: jest.fn() } as any;
    const failedJob = { isFailed: jest.fn().mockResolvedValue(true), remove: jest.fn().mockResolvedValue(undefined) };
    const publishQueue = { add: jest.fn(), getJob: jest.fn().mockResolvedValue(failedJob) } as any;
    const service = new QueueService(noopQueue, noopQueue, noopQueue, noopQueue, noopQueue, publishQueue, noopQueue, noopQueue);
    await service.addPublishJob({ postId: 'post-1' });
    expect(failedJob.remove).toHaveBeenCalled();
    expect(publishQueue.add).toHaveBeenCalledWith('publish', { postId: 'post-1' }, expect.objectContaining({ jobId: 'publish-post-1' }));
  });
});
