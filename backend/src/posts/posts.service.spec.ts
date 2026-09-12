import { PostsService } from './posts.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { PostStatus } from '@prisma/client';

describe('PostsService (Post Creation, Ownership & Lifecycle)', () => {
  let service: PostsService;
  let prisma: any;
  let queue: any;

  beforeEach(() => {
    prisma = {
      post: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      video: {
        findFirst: jest.fn(),
      },
      facebookPage: {
        findFirst: jest.fn(),
      },
      product: {
        count: jest.fn(),
      },
    };
    queue = {
      addPublishJob: jest.fn().mockResolvedValue({ id: 'job-publish-1' }),
    };
    service = new PostsService(prisma, queue);
  });

  describe('create post with multi-resource validation', () => {
    it('creates post successfully when video, page, and products belong to user', async () => {
      // ARRANGE
      const userId = 'user-owner';
      const dto = {
        videoId: 'video-1',
        facebookPageId: 'page-1',
        caption: 'Awesome product promo',
        firstComment: 'Buy here',
        productIds: ['prod-1', 'prod-2'],
      };
      prisma.video.findFirst.mockResolvedValue({ id: 'video-1' });
      prisma.facebookPage.findFirst.mockResolvedValue({ id: 'page-1' });
      prisma.product.count.mockResolvedValue(2); // Both products exist and belong to user
      prisma.post.create.mockResolvedValue({
        id: 'post-new',
        userId,
        status: PostStatus.DRAFT,
        ...dto,
      });

      // ACT
      const result = await service.create(userId, dto as any);

      // ASSERT
      expect(prisma.video.findFirst).toHaveBeenCalledWith({
        where: { id: 'video-1', userId },
        select: { id: true },
      });
      expect(prisma.facebookPage.findFirst).toHaveBeenCalledWith({
        where: { id: 'page-1', userId },
        select: { id: true },
      });
      expect(prisma.product.count).toHaveBeenCalledWith({
        where: { id: { in: ['prod-1', 'prod-2'] }, userId },
      });
      expect(prisma.post.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          caption: 'Awesome product promo',
          postProducts: {
            create: [{ productId: 'prod-1' }, { productId: 'prod-2' }],
          },
        }),
        include: { postProducts: { include: { product: true } } },
      });
      expect(result.id).toBe('post-new');
    });

    it('rejects post creation if video belongs to another user or is missing', async () => {
      // ARRANGE: video not found for this user
      const userId = 'user-owner';
      prisma.video.findFirst.mockResolvedValue(null);
      prisma.facebookPage.findFirst.mockResolvedValue({ id: 'page-1' });
      prisma.product.count.mockResolvedValue(0);

      // ACT & ASSERT
      await expect(
        service.create(userId, {
          videoId: 'victim-video',
          facebookPageId: 'page-1',
          caption: 'promo',
        } as any),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.post.create).not.toHaveBeenCalled();
    });

    it('rejects post creation if Facebook Page belongs to another user', async () => {
      // ARRANGE: page not found for this user
      const userId = 'user-owner';
      prisma.video.findFirst.mockResolvedValue({ id: 'video-1' });
      prisma.facebookPage.findFirst.mockResolvedValue(null);
      prisma.product.count.mockResolvedValue(0);

      // ACT & ASSERT
      await expect(
        service.create(userId, {
          videoId: 'video-1',
          facebookPageId: 'victim-page',
          caption: 'promo',
        } as any),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.post.create).not.toHaveBeenCalled();
    });

    it('rejects post creation if any referenced product belongs to another user', async () => {
      // ARRANGE: 2 productIds provided, but only 1 belongs to calling user
      const userId = 'user-owner';
      prisma.video.findFirst.mockResolvedValue({ id: 'video-1' });
      prisma.facebookPage.findFirst.mockResolvedValue({ id: 'page-1' });
      prisma.product.count.mockResolvedValue(1); // 1 out of 2 found

      // ACT & ASSERT
      await expect(
        service.create(userId, {
          videoId: 'video-1',
          facebookPageId: 'page-1',
          caption: 'promo',
          productIds: ['my-product', 'other-user-product'],
        } as any),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.post.create).not.toHaveBeenCalled();
    });
  });

  describe('update post ownership & validation', () => {
    it('rejects updating post with another user video', async () => {
      // ARRANGE
      const userId = 'user-owner';
      prisma.post.findFirst.mockResolvedValue({
        id: 'post-1',
        userId,
        videoId: 'old-video',
        facebookPageId: 'old-page',
      });
      prisma.video.findFirst.mockResolvedValue(null); // other user's video
      prisma.facebookPage.findFirst.mockResolvedValue({ id: 'old-page' });
      prisma.product.count.mockResolvedValue(0);

      // ACT & ASSERT
      await expect(
        service.update(userId, 'post-1', { videoId: 'stolen-video' } as any),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.post.update).not.toHaveBeenCalled();
    });
  });

  describe('publish post flow', () => {
    it('queues a publish job before updating post status to QUEUED', async () => {
      // ARRANGE
      const userId = 'user-owner';
      prisma.post.findFirst.mockResolvedValue({
        id: 'post-1',
        userId,
        status: PostStatus.DRAFT,
      });
      prisma.post.update.mockResolvedValue({
        id: 'post-1',
        status: PostStatus.QUEUED,
      });

      // ACT
      const result = await service.publish(userId, 'post-1');

      // ASSERT
      expect(queue.addPublishJob).toHaveBeenCalledWith({ postId: 'post-1' });
      expect(prisma.post.update).toHaveBeenCalledWith({
        where: { id: 'post-1' },
        data: { status: 'QUEUED' },
      });
      expect(result.status).toBe('QUEUED');
    });
  });

  describe('cancel post flow', () => {
    it('cancels an uncompleted post successfully', async () => {
      // ARRANGE
      const userId = 'user-owner';
      prisma.post.findFirst.mockResolvedValue({
        id: 'post-1',
        userId,
        status: PostStatus.SCHEDULED,
      });
      prisma.post.update.mockResolvedValue({
        id: 'post-1',
        status: PostStatus.CANCELLED,
      });

      // ACT
      const result = await service.cancel(userId, 'post-1');

      // ASSERT
      expect(prisma.post.update).toHaveBeenCalledWith({
        where: { id: 'post-1' },
        data: { status: 'CANCELLED' },
      });
      expect(result.status).toBe(PostStatus.CANCELLED);
    });

    it('rejects cancellation of an already published post with ConflictException', async () => {
      // ARRANGE
      const userId = 'user-owner';
      prisma.post.findFirst.mockResolvedValue({
        id: 'post-1',
        userId,
        status: PostStatus.PUBLISHED,
      });

      // ACT & ASSERT
      await expect(service.cancel(userId, 'post-1')).rejects.toThrow(ConflictException);
      expect(prisma.post.update).not.toHaveBeenCalled();
    });
  });

  describe('findOne isolation', () => {
    it('rejects access to posts belonging to another user', async () => {
      // ARRANGE
      prisma.post.findFirst.mockResolvedValue(null);

      // ACT & ASSERT
      await expect(service.findOne('user-1', 'foreign-post')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
