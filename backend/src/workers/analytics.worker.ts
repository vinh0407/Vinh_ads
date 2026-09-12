import { Injectable, Logger } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { FacebookService } from '../facebook/facebook.service';
import { EncryptionUtil } from '../common/utils/encryption.util';
import { AnalyticsJobData } from '../queue/job-contracts';
import { getErrorMessage } from '../common/utils/error.util';

interface PostMetrics {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  affiliateClicks: number;
  ctr: number;
  revenue: number;
}

interface PageMetrics {
  followers: number;
  engagement: number;
}

@Injectable()
export class AnalyticsWorker {
  private readonly logger = new Logger(AnalyticsWorker.name);
  private worker: Worker<AnalyticsJobData>;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private facebook: FacebookService,
  ) {
    this.initializeWorker();
  }

  private initializeWorker() {
    this.worker = new Worker<AnalyticsJobData>(
      'analytics-sync',
      async (job: Job<AnalyticsJobData>) => {
        return this.syncAnalytics(job.data);
      },
      {
        connection: {
          host: this.configService.get<string>('app.redis.host'),
          port: this.configService.get<number>('app.redis.port'),
          password: this.configService.get<string>('app.redis.password'),
        },
        concurrency: 2,
      },
    );
  }

  private async syncAnalytics(data: AnalyticsJobData) {
    const { postId, externalPostId, pageId } = data;
    this.logger.log(`Syncing analytics for post ${postId}`);

    try {
      const accessToken = await this.getDecryptedToken(pageId);
      if (!accessToken) {
        this.logger.warn(`No token for page ${pageId}`);
        return { success: false, reason: 'No token' };
      }

      const metrics = await this.fetchPostMetrics(externalPostId, accessToken);
      const pageMetrics = await this.fetchPageMetrics(pageId, accessToken);

      await this.prisma.postMetric.create({
        data: {
          postId,
          views: BigInt(metrics.views || 0),
          likes: BigInt(metrics.likes || 0),
          comments: BigInt(metrics.comments || 0),
          shares: BigInt(metrics.shares || 0),
          affiliateClicks: BigInt(metrics.affiliateClicks || 0),
          ctr: metrics.ctr,
          revenue: metrics.revenue,
        },
      });

      if (pageMetrics) {
        await this.prisma.pageMetric.create({
          data: {
            facebookPageId: pageId,
            followers: BigInt(pageMetrics.followers || 0),
            engagement: BigInt(pageMetrics.engagement || 0),
          },
        });
      }

      return { success: true, metrics };
    } catch (error: unknown) {
      this.logger.error(`Failed to sync analytics: ${getErrorMessage(error)}`);
      throw error;
    }
  }

  private async getDecryptedToken(pageId: string): Promise<string | null> {
    const tokenRecord = await this.prisma.facebookPageToken.findUnique({
      where: { facebookPageId: pageId },
    });
    if (!tokenRecord) return null;
    return EncryptionUtil.decrypt(tokenRecord.accessTokenEncrypted);
  }

  private async fetchPostMetrics(postId: string, accessToken: string) {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${postId}/insights?metric=post_video_views,post_video_complete_views_30s,post_engaged_users,post_clicks&access_token=${accessToken}`,
    );
    if (!response.ok) throw new Error('Failed to fetch post metrics');
    const data: unknown = await response.json();
    return this.parseMetrics(data);
  }

  private async fetchPageMetrics(
    pageId: string,
    accessToken: string,
  ): Promise<PageMetrics | null> {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${pageId}?fields=followers_count,engagement&access_token=${accessToken}`,
    );
    if (!response.ok) return null;
    const data: unknown = await response.json();
    if (!this.isRecord(data)) return null;
    return {
      followers: this.toNumber(data.followers_count),
      engagement: this.toNumber(data.engagement),
    };
  }

  private parseMetrics(data: unknown): PostMetrics {
    const metrics: PostMetrics = {
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      affiliateClicks: 0,
      ctr: 0,
      revenue: 0,
    };
    if (this.isRecord(data) && Array.isArray(data.data)) {
      for (const item of data.data) {
        if (!this.isRecord(item) || !Array.isArray(item.values)) continue;
        const firstValue = item.values[0];
        const value = this.isRecord(firstValue)
          ? this.toNumber(firstValue.value)
          : 0;
        switch (item.name) {
          case 'post_video_views':
            metrics.views = value;
            break;
          case 'post_engaged_users':
            metrics.likes = value;
            break;
        }
      }
    }
    return metrics;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private toNumber(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  }

  async onModuleDestroy() {
    await this.worker.close();
  }
}
