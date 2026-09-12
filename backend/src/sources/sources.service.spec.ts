import { SourcesService } from './sources.service';
import { NotFoundException } from '@nestjs/common';

describe('SourcesService', () => {
  it('queues a sync job for a source owned by the user', async () => {
    const prisma = {
      sourcePage: {
        findFirst: jest
          .fn()
          .mockResolvedValue({
            id: 'source-1',
            userId: 'user-1',
            syncEnabled: true,
          }),
      },
    } as any;
    const queue = {
      addSourceSyncJob: jest.fn().mockResolvedValue({ id: 'job-1' }),
    } as any;
    const service = new SourcesService(prisma, queue);

    const result = await service.sync('user-1', 'source-1');

    expect(queue.addSourceSyncJob).toHaveBeenCalledWith({
      sourcePageId: 'source-1',
    });
    expect(result).toEqual({ success: true, message: 'Sync initiated' });
  });

  it('returns not found when the source is absent or belongs to another user', async () => {
    const prisma = {
      sourcePage: { findFirst: jest.fn().mockResolvedValue(null) },
    } as any;
    const service = new SourcesService(prisma, {} as any);

    await expect(service.findOne('user-1', 'source-2')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
