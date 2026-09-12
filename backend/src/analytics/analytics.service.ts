import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

import { paginate } from '../common/utils/pagination.util';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getOverview(userId: string) {
    const [posts, videos, products, pages] = await Promise.all([
      this.prisma.post.count({ where: { userId } }),
      this.prisma.video.count({ where: { userId } }),
      this.prisma.product.count({ where: { userId } }),
      this.prisma.facebookPage.count({ where: { userId, status: 'ACTIVE' } }),
    ]);

    const metrics = await this.prisma.postMetric.aggregate({
      where: { post: { userId } },
      _sum: { views: true, likes: true, comments: true, shares: true, affiliateClicks: true },
    });

    return {
      counts: { posts, videos, products, pages },
      totals: {
        views: metrics._sum.views || 0,
        likes: metrics._sum.likes || 0,
        comments: metrics._sum.comments || 0,
        shares: metrics._sum.shares || 0,
        affiliateClicks: metrics._sum.affiliateClicks || 0,
      },
    };
  }

  async getPostAnalytics(userId: string, params: { page?: number; limit?: number }) {
    const { page = 1, limit = 20 } = params;
    const [items, total] = await Promise.all([
      this.prisma.post.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          metrics: { orderBy: { recordedAt: 'desc' }, take: 1 },
          video: true,
          facebookPage: true,
        },
      }),
      this.prisma.post.count({ where: { userId } }),
    ]);

    return paginate(items, total, page, limit);
  }

  async getProductAnalytics(userId: string) {
    return this.prisma.product.findMany({
      where: { userId },
      include: {
        affiliateLinks: true,
        postProducts: { include: { post: { include: { metrics: true } } } },
      },
    });
  }

  async getPageAnalytics(userId: string) {
    return this.prisma.facebookPage.findMany({
      where: { userId, status: 'ACTIVE' },
      include: { pageMetrics: { orderBy: { recordedAt: 'desc' }, take: 1 } },
    });
  }
}