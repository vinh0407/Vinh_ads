import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType, Prisma } from '@prisma/client';

import { paginate } from '../common/utils/pagination.util';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    userId: string,
    params: { page?: number; limit?: number; unreadOnly?: boolean },
  ) {
    const { page = 1, limit = 20, unreadOnly = false } = params;
    const where: Prisma.NotificationWhereInput = { userId };
    if (unreadOnly) where.readAt = null;

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return paginate(items, total, page, limit);
  }

  async markAsRead(userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!notification) throw new NotFoundException('Notification not found');
    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  async create(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
  ) {
    return this.prisma.notification.create({
      data: { userId, type, title, message },
    });
  }
}
