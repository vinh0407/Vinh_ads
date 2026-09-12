import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationType } from '@prisma/client';

describe('NotificationsService (Notifications & Tenant Isolation)', () => {
  let service: NotificationsService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      notification: {
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        create: jest.fn(),
      },
    };
    service = new NotificationsService(prisma);
  });

  describe('findAll', () => {
    it('returns paginated notifications filtered by unreadOnly when requested', async () => {
      // ARRANGE
      const userId = 'user-1';
      prisma.notification.findMany.mockResolvedValue([
        { id: 'notif-1', userId, readAt: null },
      ]);
      prisma.notification.count.mockResolvedValue(1);

      // ACT
      const result = await service.findAll(userId, {
        page: 1,
        limit: 10,
        unreadOnly: true,
      });

      // ASSERT
      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId, readAt: null },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      });
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });
  });

  describe('markAsRead', () => {
    it('marks notification as read when owned by user', async () => {
      // ARRANGE
      const userId = 'user-1';
      prisma.notification.findFirst.mockResolvedValue({ id: 'notif-1', userId });
      prisma.notification.update.mockResolvedValue({
        id: 'notif-1',
        readAt: new Date(),
      });

      // ACT
      const result = await service.markAsRead(userId, 'notif-1');

      // ASSERT
      expect(prisma.notification.findFirst).toHaveBeenCalledWith({
        where: { id: 'notif-1', userId },
      });
      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
        data: { readAt: expect.any(Date) },
      });
      expect(result.readAt).toBeDefined();
    });

    it('rejects marking another user notification as read with NotFoundException', async () => {
      // ARRANGE
      prisma.notification.findFirst.mockResolvedValue(null);

      // ACT & ASSERT
      await expect(
        service.markAsRead('attacker-user', 'victim-notif'),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.notification.update).not.toHaveBeenCalled();
    });
  });

  describe('markAllAsRead', () => {
    it('marks all unread notifications as read for calling user only', async () => {
      // ARRANGE
      const userId = 'user-1';
      prisma.notification.updateMany.mockResolvedValue({ count: 5 });

      // ACT
      const result = await service.markAllAsRead(userId);

      // ASSERT
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId, readAt: null },
        data: { readAt: expect.any(Date) },
      });
      expect(result).toEqual({ count: 5 });
    });
  });

  describe('create notification', () => {
    it('creates notification with specified type, title, and message', async () => {
      // ARRANGE
      const userId = 'user-1';
      prisma.notification.create.mockResolvedValue({
        id: 'notif-new',
        userId,
        type: NotificationType.POST_PUBLISHED,
        title: 'Post Published',
        message: 'Your video was posted to Facebook',
      });

      // ACT
      const result = await service.create(
        userId,
        NotificationType.POST_PUBLISHED,
        'Post Published',
        'Your video was posted to Facebook',
      );

      // ASSERT
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId,
          type: NotificationType.POST_PUBLISHED,
          title: 'Post Published',
          message: 'Your video was posted to Facebook',
        },
      });
      expect(result.id).toBe('notif-new');
    });
  });
});
