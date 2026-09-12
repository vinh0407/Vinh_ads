import { AnalyticsService } from './analytics.service';

describe('AnalyticsService (Multi-Tenant Isolation & Aggregates)', () => {
  let service: AnalyticsService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      post: {
        count: jest.fn().mockResolvedValue(5),
        findMany: jest.fn().mockResolvedValue([]),
      },
      video: { count: jest.fn().mockResolvedValue(3) },
      product: {
        count: jest.fn().mockResolvedValue(10),
        findMany: jest.fn().mockResolvedValue([]),
      },
      facebookPage: {
        count: jest.fn().mockResolvedValue(2),
        findMany: jest.fn().mockResolvedValue([]),
      },
      postMetric: {
        aggregate: jest.fn().mockResolvedValue({
          _sum: {
            views: 1000n,
            likes: 150n,
            comments: 20n,
            shares: 10n,
            affiliateClicks: 45n,
          },
        }),
      },
    };
    service = new AnalyticsService(prisma);
  });

  describe('getOverview', () => {
    it('scopes counts and metric aggregation strictly to authenticated user', async () => {
      // ARRANGE
      const userId = 'user-owner';

      // ACT
      const result = await service.getOverview(userId);

      // ASSERT
      expect(prisma.post.count).toHaveBeenCalledWith({ where: { userId } });
      expect(prisma.video.count).toHaveBeenCalledWith({ where: { userId } });
      expect(prisma.product.count).toHaveBeenCalledWith({ where: { userId } });
      expect(prisma.facebookPage.count).toHaveBeenCalledWith({
        where: { userId, status: 'ACTIVE' },
      });
      expect(prisma.postMetric.aggregate).toHaveBeenCalledWith({
        where: { post: { userId } },
        _sum: {
          views: true,
          likes: true,
          comments: true,
          shares: true,
          affiliateClicks: true,
        },
      });
      expect(result.counts).toEqual({ posts: 5, videos: 3, products: 10, pages: 2 });
      expect(result.totals.views).toBe(1000n);
      expect(result.totals.likes).toBe(150n);
      expect(result.totals.affiliateClicks).toBe(45n);
    });

    it('defaults metrics to 0 when aggregates return null sums', async () => {
      // ARRANGE: no posts or metrics yet for this user
      const userId = 'new-user';
      prisma.postMetric.aggregate.mockResolvedValue({
        _sum: {
          views: null,
          likes: null,
          comments: null,
          shares: null,
          affiliateClicks: null,
        },
      });

      // ACT
      const result = await service.getOverview(userId);

      // ASSERT
      expect(result.totals).toEqual({
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        affiliateClicks: 0,
      });
    });
  });

  describe('getPostAnalytics', () => {
    it('applies pagination parameters and scopes query to user', async () => {
      // ARRANGE
      const userId = 'user-owner';
      const posts = [{ id: 'post-1', userId }];
      prisma.post.findMany.mockResolvedValue(posts);
      prisma.post.count.mockResolvedValue(45);

      // ACT
      const result = await service.getPostAnalytics(userId, { page: 2, limit: 10 });

      // ASSERT
      expect(prisma.post.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: 10,
        take: 10,
        include: {
          metrics: { orderBy: { recordedAt: 'desc' }, take: 1 },
          video: true,
          facebookPage: true,
        },
      });
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(45);
      expect(result.totalPages).toBe(5);
    });
  });

  describe('getPageAnalytics', () => {
    it('returns only active Facebook pages for requesting user', async () => {
      // ARRANGE
      const userId = 'user-owner';
      prisma.facebookPage.findMany.mockResolvedValue([{ id: 'page-1', userId }]);

      // ACT
      const result = await service.getPageAnalytics(userId);

      // ASSERT
      expect(prisma.facebookPage.findMany).toHaveBeenCalledWith({
        where: { userId, status: 'ACTIVE' },
        include: { pageMetrics: { orderBy: { recordedAt: 'desc' }, take: 1 } },
      });
      expect(result).toHaveLength(1);
    });
  });
});
