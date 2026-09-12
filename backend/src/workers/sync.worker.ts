import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import {
  Platform,
  SourcePage,
  SourceStatus,
  VideoStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { StorageService } from '../storage/storage.service';
import { FacebookService } from '../facebook/facebook.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SourceSyncJobData } from '../queue/job-contracts';
import { getErrorMessage } from '../common/utils/error.util';

interface FacebookVideo {
  id: string;
  title?: string;
  description?: string;
  created_time?: string;
  length?: number;
  source?: string;
  picture?: string;
}

@Injectable()
export class SyncWorker implements OnModuleDestroy {
  private readonly logger = new Logger(SyncWorker.name);
  private worker: Worker<SourceSyncJobData>;
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private queue: QueueService,
    private storage: StorageService,
    private facebook: FacebookService,
  ) {
    this.worker = new Worker<SourceSyncJobData>(
      'source-sync',
      (job: Job<SourceSyncJobData>) =>
        this.processSync(
          job.data.sourcePageId,
          job.attemptsMade + 1,
          job.opts.attempts || 1,
        ),
      {
        connection: {
          host: this.configService.get<string>('app.redis.host'),
          port: this.configService.get<number>('app.redis.port'),
          password: this.configService.get<string>('app.redis.password'),
        },
        concurrency: 2,
      },
    );
    this.worker.on('failed', (job, error) =>
      this.logger.error(`Sync job ${job?.id} failed: ${error.message}`),
    );
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async dispatchDueSources() {
    const sources = await this.prisma.sourcePage.findMany({
      where: { status: SourceStatus.ACTIVE, syncEnabled: true },
    });
    const now = Date.now();
    for (const source of sources) {
      if (
        !source.lastSyncedAt ||
        source.lastSyncedAt.getTime() + source.syncInterval * 1000 <= now
      )
        await this.queue.addSourceSyncJob({ sourcePageId: source.id });
    }
  }

  async processSync(sourcePageId: string, attempt = 1, maxAttempts = 1) {
    const source = await this.prisma.sourcePage.findUnique({
      where: { id: sourcePageId },
    });
    if (!source || source.status !== SourceStatus.ACTIVE || !source.syncEnabled)
      return { success: false, reason: 'Source not active' };
    const run = await this.prisma.syncRun.create({
      data: { sourcePageId, status: 'PROCESSING' },
    });
    try {
      if (source.platform !== Platform.FACEBOOK)
        throw new Error(`Unsupported source platform: ${source.platform}`);
      const result = await this.syncFacebookPage(source);
      await this.prisma.syncRun.update({
        where: { id: run.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          videosFound: result.found,
          videosNew: result.new,
          videosSkipped: result.skipped,
        },
      });
      await this.prisma.sourcePage.update({
        where: { id: source.id },
        data: { lastSyncedAt: new Date(), status: SourceStatus.ACTIVE },
      });
      if (result.new)
        await this.queue.addNotificationJob({
          userId: source.userId,
          type: 'VIDEO_IMPORTED',
          title: 'New videos imported',
          message: `${result.new} new videos found from ${source.pageName}`,
        });
      return {
        success: true,
        videosFound: result.found,
        videosNew: result.new,
        videosSkipped: result.skipped,
      };
    } catch (error: unknown) {
      await this.prisma.syncRun.update({
        where: { id: run.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage: getErrorMessage(error),
        },
      });
      if (attempt >= maxAttempts)
        await this.prisma.sourcePage.update({
          where: { id: source.id },
          data: { status: SourceStatus.ERROR },
        });
      throw error;
    }
  }

  private async syncFacebookPage(source: SourcePage) {
    const connected = await this.prisma.facebookPage.findFirst({
      where: {
        userId: source.userId,
        pageId: source.platformPageId,
        status: 'ACTIVE',
      },
    });
    if (!connected)
      throw new Error('Source Page is not connected through Facebook OAuth');
    const token = await this.facebook.getPageToken(connected.id);
    if (!token)
      throw new Error(
        'Facebook Page token is missing or expired; reconnect the Page',
      );
    const videos = await this.fetchFacebookVideos(source.platformPageId, token);
    let imported = 0,
      skipped = 0;
    for (const item of videos) {
      try {
        if (!item.id || !item.source || !item.created_time) {
          skipped++;
          continue;
        }
        const existing = await this.prisma.sourceVideo.findUnique({
          where: {
            sourcePageId_externalVideoId: {
              sourcePageId: source.id,
              externalVideoId: item.id,
            },
          },
          include: { video: true },
        });
        if (existing?.video) {
          skipped++;
          continue;
        }
        const stored = await this.downloadAndStore(source.userId, {
          ...item,
          source: item.source,
        });
        const sourceVideo =
          existing ||
          (await this.prisma.sourceVideo.create({
            data: {
              sourcePageId: source.id,
              externalVideoId: item.id,
              sourceUrl: item.source,
              title: item.title || `Facebook video ${item.id}`,
              description: item.description,
              publishedAt: new Date(item.created_time),
              duration: item.length ? Math.round(item.length) : null,
              thumbnailUrl: item.picture,
              status: SourceStatus.ACTIVE,
            },
          }));
        await this.prisma.video.create({
          data: {
            userId: source.userId,
            sourceVideoId: sourceVideo.id,
            title: sourceVideo.title,
            description: sourceVideo.description,
            duration: sourceVideo.duration,
            thumbnailUrl: sourceVideo.thumbnailUrl,
            storageKey: stored.key,
            fileSize: BigInt(stored.size),
            mimeType: stored.contentType,
            status: VideoStatus.DISCOVERED,
          },
        });
        imported++;
      } catch (error: unknown) {
        this.logger.warn(
          `Skipping Facebook video ${item.id || 'unknown'}: ${getErrorMessage(error)}`,
        );
        skipped++;
      }
    }
    return { found: videos.length, new: imported, skipped };
  }

  private async fetchFacebookVideos(pageId: string, token: string) {
    const version = this.configService.get<string>('app.facebook.apiVersion');
    if (!version) throw new Error('Facebook API version is not configured');
    const videos: FacebookVideo[] = [];
    let after: string | undefined;
    do {
      const url = new URL(
        `https://graph.facebook.com/${version}/${encodeURIComponent(pageId)}/videos`,
      );
      url.search = new URLSearchParams({
        fields: 'id,title,description,created_time,length,source,picture',
        limit: '25',
        ...(after ? { after } : {}),
      }).toString();
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.status === 429)
        throw new Error(
          `Facebook rate limit exceeded; retry after ${response.headers.get('retry-after') || 'unknown'} seconds`,
        );
      if (!response.ok)
        throw new Error(
          `Facebook API request failed with status ${response.status}`,
        );
      const body: unknown = await response.json();
      if (!this.isFacebookVideosResponse(body))
        throw new Error('Facebook API returned an invalid videos payload');
      videos.push(...body.data);
      after = body.paging?.cursors?.after;
    } while (after && videos.length < 100);
    return videos;
  }
  private isFacebookVideosResponse(
    value: unknown,
  ): value is {
    data: FacebookVideo[];
    paging?: { cursors?: { after?: string } };
  } {
    if (!this.isRecord(value)) return false;
    return (
      Array.isArray(value.data) &&
      value.data.every(
        (item) => this.isRecord(item) && typeof item.id === 'string',
      )
    );
  }
  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private async downloadAndStore(
    userId: string,
    video: FacebookVideo & { source: string },
  ) {
    const sourceUrl = new URL(video.source);
    if (sourceUrl.protocol !== 'https:')
      throw new Error('Facebook video source URL is invalid');
    const response = await fetch(sourceUrl);
    if (!response.ok)
      throw new Error(`Facebook video is unavailable (${response.status})`);
    const contentType = response.headers.get('content-type') || 'video/mp4';
    if (!contentType.startsWith('video/'))
      throw new Error('Facebook source did not return video content');
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.length) throw new Error('Facebook video is empty');
    const key = `originals/${userId}/facebook-${video.id}.mp4`;
    const uploadUrl = await this.storage.getUploadUrl(key, contentType);
    const upload = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: bytes,
    });
    if (!upload.ok)
      throw new Error(`Video storage upload failed (${upload.status})`);
    return { key, size: bytes.length, contentType };
  }
  async onModuleDestroy() {
    await this.worker?.close();
  }
}
