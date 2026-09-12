import { Platform, SourceStatus } from '@prisma/client';
import { SyncWorker } from './sync.worker';

describe('SyncWorker (Sync Worker & Retry Behavior)', () => {
  const baseSource = {
    id: 'source-1',
    userId: 'user-1',
    platform: Platform.FACEBOOK,
    platformPageId: 'page-1',
    pageName: 'My Facebook Page',
    status: SourceStatus.ACTIVE,
    syncEnabled: true,
    syncInterval: 3600,
    lastSyncedAt: new Date(Date.now() - 4000 * 1000), // Due for sync
  };

  const setup = (sourceData: any = baseSource) => {
    const prisma: any = {
      sourcePage: {
        findMany: jest.fn().mockResolvedValue([sourceData]),
        findUnique: jest.fn().mockResolvedValue(sourceData),
        update: jest.fn().mockResolvedValue({}),
      },
      syncRun: {
        create: jest.fn().mockResolvedValue({ id: 'run-1' }),
        update: jest.fn().mockResolvedValue({}),
      },
      facebookPage: {
        findFirst: jest.fn().mockResolvedValue({ id: 'fb-row' }),
      },
      sourceVideo: {
        findUnique: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: 'sv-1' }),
      },
      video: {
        create: jest.fn().mockResolvedValue({ id: 'v-1' }),
      },
    };
    const queue = {
      addSourceSyncJob: jest.fn().mockResolvedValue({ id: 'job-sync-1' }),
      addNotificationJob: jest.fn().mockResolvedValue({ id: 'job-notif-1' }),
    };
    const storage = {
      getUploadUrl: jest.fn().mockResolvedValue('https://storage.upload/video.mp4'),
    };
    const facebook = {
      getPageToken: jest.fn().mockResolvedValue('page-token-abc'),
    };
    const worker = Object.create(SyncWorker.prototype) as SyncWorker;
    Object.assign(worker, {
      logger: { warn: jest.fn(), error: jest.fn(), log: jest.fn() },
      prisma,
      queue,
      storage,
      facebook,
      configService: { get: jest.fn().mockReturnValue('v25.0') },
    });
    return { worker, prisma, queue, storage, facebook };
  };

  beforeEach(() => {
    global.fetch = jest.fn() as any;
  });

  describe('dispatchDueSources', () => {
    it('dispatches sync job for due active sources and skips not-due sources', async () => {
      // ARRANGE
      const dueSource = { ...baseSource, id: 'due-1', lastSyncedAt: new Date(Date.now() - 7200000) };
      const notDueSource = { ...baseSource, id: 'not-due-2', lastSyncedAt: new Date(Date.now() - 60000) };
      const { worker, prisma, queue } = setup();
      prisma.sourcePage.findMany.mockResolvedValue([dueSource, notDueSource]);

      // ACT
      await worker.dispatchDueSources();

      // ASSERT
      expect(queue.addSourceSyncJob).toHaveBeenCalledTimes(1);
      expect(queue.addSourceSyncJob).toHaveBeenCalledWith({ sourcePageId: 'due-1' });
    });
  });

  describe('processSync video pipeline', () => {
    it('skips sync if source is inactive or syncEnabled is false', async () => {
      // ARRANGE
      const { worker, prisma } = setup({ ...baseSource, syncEnabled: false });

      // ACT
      const result = await worker.processSync('source-1', 1, 3);

      // ASSERT
      expect(result).toEqual({ success: false, reason: 'Source not active' });
      expect(prisma.syncRun.create).not.toHaveBeenCalled();
    });

    it('downloads, stores, and creates records for new video', async () => {
      // ARRANGE
      const { worker, prisma } = setup();
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [
              {
                id: 'video-ext-1',
                title: 'New Video',
                created_time: '2026-01-01T00:00:00Z',
                source: 'https://cdn.facebook/video.mp4',
              },
            ],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
          headers: new Headers({ 'content-type': 'video/mp4' }),
        })
        .mockResolvedValueOnce({ ok: true });

      // ACT
      const result = await worker.processSync('source-1', 1, 3);

      // ASSERT
      expect(result.videosNew).toBe(1);
      expect(prisma.sourceVideo.create).toHaveBeenCalled();
      expect(prisma.video.create).toHaveBeenCalled();
      expect(prisma.syncRun.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'COMPLETED', videosNew: 1 }),
        }),
      );
    });

    it('deduplicates existing videos by source page and external video id', async () => {
      // ARRANGE
      const { worker, prisma } = setup();
      prisma.sourceVideo.findUnique.mockResolvedValue({ id: 'existing-sv', video: { id: 'existing-v' } });
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 'video-ext-1',
              created_time: '2026-01-01T00:00:00Z',
              source: 'https://cdn.facebook/video.mp4',
            },
          ],
        }),
      });

      // ACT
      const result = await worker.processSync('source-1', 1, 3);

      // ASSERT
      expect(result.videosSkipped).toBe(1);
      expect(prisma.video.create).not.toHaveBeenCalled();
    });
  });

  describe('retry behavior on failure', () => {
    it('fails syncRun on intermediate error without setting SourcePage to ERROR', async () => {
      // ARRANGE: attempt 1 of 3 (transient network failure)
      const { worker, prisma } = setup();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 429,
        headers: new Headers({ 'retry-after': '60' }),
        json: async () => ({ error: { message: 'Rate limit exceeded' } }),
      });

      // ACT & ASSERT
      await expect(worker.processSync('source-1', 1, 3)).rejects.toThrow();
      expect(prisma.syncRun.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'FAILED' }),
        }),
      );
      // SourcePage should NOT be marked ERROR on intermediate attempt
      expect(prisma.sourcePage.update).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: SourceStatus.ERROR }),
        }),
      );
    });

    it('marks SourcePage status as ERROR when final attempt is exhausted', async () => {
      // ARRANGE: attempt 3 of 3 (final failure)
      const { worker, prisma } = setup();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: { message: 'Facebook Internal Server Error' } }),
      });

      // ACT & ASSERT
      await expect(worker.processSync('source-1', 3, 3)).rejects.toThrow();
      expect(prisma.sourcePage.update).toHaveBeenCalledWith({
        where: { id: 'source-1' },
        data: { status: SourceStatus.ERROR },
      });
    });
  });
});
