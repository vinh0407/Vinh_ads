import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityAction, JobStatus, Prisma } from '@prisma/client';

import { paginate } from '../common/utils/pagination.util';

@Injectable()
export class LogsService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    userId: string,
    params: {
      page?: number;
      limit?: number;
      action?: ActivityAction;
      entityType?: string;
    },
  ) {
    const { page = 1, limit = 50, action, entityType } = params;
    const where: Prisma.ActivityLogWhereInput = { userId };
    if (action) where.action = action;
    if (entityType) where.entityType = entityType;

    const [items, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.activityLog.count({ where }),
    ]);

    return paginate(items, total, page, limit);
  }

  async log(
    userId: string,
    data: {
      action: ActivityAction;
      entityType: string;
      entityId: string;
      status?: JobStatus;
      message?: string;
      metadata?: Prisma.InputJsonValue;
    },
  ) {
    return this.prisma.activityLog.create({
      data: { userId, ...data },
    });
  }
}
