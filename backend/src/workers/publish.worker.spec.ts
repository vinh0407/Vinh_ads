import { PostStatus } from '@prisma/client';
import { PublishWorker } from './publish.worker';

describe('PublishWorker (Publisher & Retry Behavior)', () => {
  const basePost = {
    id: 'post-1',
    userId: 'user-1',
    status: PostStatus.QUEUED,
    facebookPageId: 'page-row-1',
    caption: 'Great caption 🔥',
    firstComment: 'Shop here: https://link',
    video: { storageKey: 'video-key-1' },
    facebookPage: { pageId: 'fb-page-1', pageName: 'My Awesome Page', token: {} },
    postProducts: [],
  };

  const makeWorker = (postData: any = basePost, overrides: any = {}) => {
    const prisma = {
      post: {
        findUnique: jest.fn().mockResolvedValue(postData),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue({}),
      },
      schedule: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      activityLog: { create: jest.fn().mockResolvedValue({}) },
      facebookPageToken: { findUnique: jest.fn() },
    };
    const queue = {
      addAnalyticsJob: jest.fn().mockResolvedValue({ id: 'analytics-1' }),
      addNotificationJob: jest.fn().mockResolvedValue({ id: 'notification-1' }),
      addPublishJob: jest.fn(),
    };
    const storage = {
      getDownloadUrl: jest.fn().mockResolvedValue('https://storage.cdn/video.mp4'),
    };
    const worker = Object.create(PublishWorker.prototype) as PublishWorker;
    Object.assign(worker, {
      prisma,
      queue,
      storage,
      getDecryptedToken: jest.fn().mockResolvedValue('decrypted-fb-token'),
      publishToFacebook: jest.fn().mockResolvedValue('fb-external-post-123'),
      ...overrides,
    });
    return { worker, prisma, queue, storage };
  };

  describe('post state handling before publish', () => {
    it('skips already-published posts without database mutations', async () => {
      // ARRANGE
      const { worker, prisma } = makeWorker({ ...basePost, status: PostStatus.PUBLISHED });
      const job = { data: { postId: 'post-1' }, attemptsMade: 0, opts: { attempts: 3 } };

      // ACT
      const result = await worker.processPublishJob(job as any);

      // ASSERT
      expect(result).toEqual({ success: true, alreadyPublished: true });
      expect(prisma.post.updateMany).not.toHaveBeenCalled();
      expect((worker as any).publishToFacebook).not.toHaveBeenCalled();
    });

    it('skips cancelled posts and exits early', async () => {
      // ARRANGE
      const { worker, prisma } = makeWorker({ ...basePost, status: PostStatus.CANCELLED });
      const job = { data: { postId: 'post-1' }, attemptsMade: 0, opts: { attempts: 3 } };

      // ACT
      const result = await worker.processPublishJob(job as any);

      // ASSERT
      expect(result).toEqual({ success: false, reason: 'Post cancelled' });
      expect(prisma.post.updateMany).not.toHaveBeenCalled();
      expect((worker as any).publishToFacebook).not.toHaveBeenCalled();
    });

    it('prevents concurrent processing when another worker acquired the claim', async () => {
      // ARRANGE
      const { worker, prisma } = makeWorker(basePost);
      prisma.post.updateMany.mockResolvedValue({ count: 0 }); // Claim failed
      const job = { data: { postId: 'post-1' }, attemptsMade: 0, opts: { attempts: 3 } };

      // ACT
      const result = await worker.processPublishJob(job as any);

      // ASSERT
      expect(result).toEqual({ success: true, alreadyProcessing: true });
      expect((worker as any).publishToFacebook).not.toHaveBeenCalled();
    });
  });

  describe('successful publishing flow', () => {
    it('publishes video to Facebook, updates post & schedule, and dispatches follow-ups', async () => {
      // ARRANGE
      const { worker, prisma, queue, storage } = makeWorker(basePost);
      const job = { data: { postId: 'post-1' }, attemptsMade: 0, opts: { attempts: 3 } };

      // ACT
      const result = await worker.processPublishJob(job as any);

      // ASSERT
      expect(result).toEqual({ success: true, externalPostId: 'fb-external-post-123' });
      expect((worker as any).getDecryptedToken).toHaveBeenCalledWith('page-row-1');
      expect(storage.getDownloadUrl).toHaveBeenCalledWith('video-key-1');
      expect((worker as any).publishToFacebook).toHaveBeenCalledWith(
        'fb-page-1',
        'decrypted-fb-token',
        'https://storage.cdn/video.mp4',
        'Great caption 🔥',
        'Shop here: https://link',
      );
      expect(prisma.post.update).toHaveBeenCalledWith({
        where: { id: 'post-1' },
        data: {
          status: PostStatus.PUBLISHED,
          publishedAt: expect.any(Date),
          externalPostId: 'fb-external-post-123',
        },
      });
      expect(prisma.schedule.updateMany).toHaveBeenCalledWith({
        where: { postId: 'post-1', status: { in: ['PENDING', 'PROCESSING'] } },
        data: { status: 'COMPLETED' },
      });
      expect(queue.addAnalyticsJob).toHaveBeenCalledWith({
        postId: 'post-1',
        externalPostId: 'fb-external-post-123',
        pageId: 'fb-page-1',
      });
      expect(queue.addNotificationJob).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          type: 'POST_PUBLISHED',
        }),
      );
    });
  });

  describe('retry behavior (P1)', () => {
    it('re-queues post for BullMQ retry on intermediate failure without failing schedule', async () => {
      // ARRANGE: first attempt out of 3
      const { worker, prisma, queue } = makeWorker(basePost, {
        publishToFacebook: jest.fn().mockRejectedValue(new Error('Facebook API timeout')),
      });
      const job = { data: { postId: 'post-1' }, attemptsMade: 0, opts: { attempts: 3 } };

      // ACT & ASSERT
      await expect(worker.processPublishJob(job as any)).rejects.toThrow('Facebook API timeout');
      expect(prisma.post.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'post-1' },
          data: expect.objectContaining({
            status: PostStatus.QUEUED,
            errorCode: 'PUBLISH_RETRY',
            errorMessage: 'Facebook API timeout',
          }),
        }),
      );
      // Schedule should NOT be marked FAILED during intermediate retry
      expect(prisma.schedule.updateMany).not.toHaveBeenCalled();
      // Failure notification should NOT be dispatched yet
      expect(queue.addNotificationJob).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'POST_FAILED' }),
      );
    });

    it('marks post and schedule as FAILED on final attempt exhaustion and alerts user', async () => {
      // ARRANGE: 3rd attempt out of 3 (attemptsMade = 2)
      const { worker, prisma, queue } = makeWorker(basePost, {
        publishToFacebook: jest.fn().mockRejectedValue(new Error('Permanent Facebook policy violation')),
      });
      const job = { data: { postId: 'post-1' }, attemptsMade: 2, opts: { attempts: 3 } };

      // ACT & ASSERT
      await expect(worker.processPublishJob(job as any)).rejects.toThrow('Permanent Facebook policy violation');
      expect(prisma.post.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'post-1' },
          data: expect.objectContaining({
            status: PostStatus.FAILED,
            errorCode: 'PUBLISH_FAILED',
            errorMessage: 'Permanent Facebook policy violation',
          }),
        }),
      );
      expect(prisma.schedule.updateMany).toHaveBeenCalledWith({
        where: { postId: 'post-1', status: { in: ['PENDING', 'PROCESSING'] } },
        data: { status: 'FAILED' },
      });
      expect(queue.addNotificationJob).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          type: 'POST_FAILED',
          message: expect.stringContaining('Permanent Facebook policy violation'),
        }),
      );
    });
  });
});
