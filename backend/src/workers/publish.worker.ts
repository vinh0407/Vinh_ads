import { Injectable, Logger } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { StorageService } from '../storage/storage.service';
import { FacebookService } from '../facebook/facebook.service';
import { EncryptionUtil } from '../common/utils/encryption.util';
import { PostStatus } from '@prisma/client';
import { PublishPostJobData } from '../queue/job-contracts';
import { getErrorMessage } from '../common/utils/error.util';

interface VideoUploadSession {
  upload_url: string;
  video_id: string;
}

@Injectable()
export class PublishWorker {
  private readonly logger = new Logger(PublishWorker.name);
  private worker: Worker<PublishPostJobData>;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private queue: QueueService,
    private storage: StorageService,
    private facebook: FacebookService,
  ) {
    this.initializeWorker();
  }

  private initializeWorker() {
    this.worker = new Worker<PublishPostJobData>(
      'publish-post',
      (job: Job<PublishPostJobData>) => this.processPublishJob(job),
      {
        connection: {
          host: this.configService.get<string>('app.redis.host'),
          port: this.configService.get<number>('app.redis.port'),
          password: this.configService.get<string>('app.redis.password'),
        },
        concurrency: 1,
      },
    );

    this.worker.on('completed', (job) => {
      this.logger.log(`Publish job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Publish job ${job?.id} failed: ${err.message}`);
    });
    this.worker.on('stalled', async (jobId) => {
      const job = await this.queue.getPublishJob(jobId);
      if (job) {
        await this.prisma.post.updateMany({
          where: { id: job.data.postId, status: PostStatus.PUBLISHING },
          data: { status: PostStatus.QUEUED },
        });
      }
    });
  }

  async processPublishJob(
    job: Pick<Job<PublishPostJobData>, 'data' | 'attemptsMade' | 'opts'>,
  ) {
    const postId = job.data.postId;
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        video: true,
        facebookPage: { include: { token: true } },
        postProducts: {
          include: { product: { include: { affiliateLinks: true } } },
        },
      },
    });

    if (!post) throw new Error('Post not found');
    if (post.status === PostStatus.PUBLISHED)
      return { success: true, alreadyPublished: true };
    if (post.status === PostStatus.CANCELLED)
      return { success: false, reason: 'Post cancelled' };

    const claim = await this.prisma.post.updateMany({
      where: {
        id: postId,
        status: {
          in: [
            PostStatus.DRAFT,
            PostStatus.SCHEDULED,
            PostStatus.QUEUED,
            PostStatus.FAILED,
          ],
        },
      },
      data: { status: PostStatus.PUBLISHING },
    });
    if (claim.count !== 1) return { success: true, alreadyProcessing: true };

    try {
      const accessToken = await this.getDecryptedToken(post.facebookPageId);
      if (!accessToken) throw new Error('Facebook token not found');

      const videoUrl = post.video.storageKey
        ? await this.storage.getDownloadUrl(post.video.storageKey)
        : null;

      if (!videoUrl) throw new Error('Video not found in storage');

      // Extract affiliate & product details for template variable substitution
      const primaryProduct = post.postProducts[0]?.product;
      const primaryAffiliate =
        primaryProduct?.affiliateLinks[0]?.affiliateUrl ||
        primaryProduct?.shopeeUrl ||
        '';
      const productName = primaryProduct?.name || '';
      const productPrice = primaryProduct?.price
        ? `${Number(primaryProduct.price).toLocaleString('vi-VN')}đ`
        : '';
      const videoTitle = post.video?.title || '';

      const formatTemplate = (text: string | null | undefined): string => {
        if (!text) return '';
        return text
          .replace(/{product_link}/gi, primaryAffiliate)
          .replace(/{link}/gi, primaryAffiliate)
          .replace(/{product_name}/gi, productName)
          .replace(/{price}/gi, productPrice)
          .replace(/{title}/gi, videoTitle);
      };

      const resolvedCaption = formatTemplate(post.caption);
      let resolvedFirstComment = formatTemplate(post.firstComment);
      if (!resolvedFirstComment && primaryAffiliate) {
        resolvedFirstComment = `👉 Mua ngay ${productName || 'sản phẩm'} giá ưu đãi tại đây: ${primaryAffiliate}`;
      }

      const externalPostId = await this.publishToFacebook(
        post.facebookPage.pageId,
        accessToken,
        videoUrl,
        resolvedCaption,
        resolvedFirstComment || undefined,
      );

      await this.prisma.post.update({
        where: { id: postId },
        data: {
          status: PostStatus.PUBLISHED,
          publishedAt: new Date(),
          externalPostId,
        },
      });
      await this.prisma.schedule.updateMany({
        where: { postId, status: { in: ['PENDING', 'PROCESSING'] } },
        data: { status: 'COMPLETED' },
      });

      await this.queue.addAnalyticsJob({
        postId,
        externalPostId,
        pageId: post.facebookPage.pageId,
      });

      await this.queue.addNotificationJob({
        userId: post.userId,
        type: 'POST_PUBLISHED',
        title: 'Post published successfully',
        message: `Video published to ${post.facebookPage.pageName}`,
      });

      await this.prisma.activityLog.create({
        data: {
          userId: post.userId,
          action: 'POST_PUBLISHED',
          entityType: 'post',
          entityId: postId,
          status: 'COMPLETED',
          message: `Published to ${post.facebookPage.pageName}`,
        },
      });

      return { success: true, externalPostId };
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      const attempts = job.opts.attempts || 1;
      const isFinalAttempt = job.attemptsMade + 1 >= attempts;
      if (!isFinalAttempt) {
        await this.prisma.post.update({
          where: { id: postId },
          data: {
            status: PostStatus.QUEUED,
            errorCode: 'PUBLISH_RETRY',
            errorMessage,
          },
        });
        throw error;
      }

      await this.prisma.post.update({
        where: { id: postId },
        data: {
          status: PostStatus.FAILED,
          errorCode: 'PUBLISH_FAILED',
          errorMessage,
        },
      });
      await this.prisma.schedule.updateMany({
        where: { postId, status: { in: ['PENDING', 'PROCESSING'] } },
        data: { status: 'FAILED' },
      });

      await this.queue.addNotificationJob({
        userId: post.userId,
        type: 'POST_FAILED',
        title: 'Post publishing failed',
        message: `Failed to publish to ${post.facebookPage.pageName}: ${errorMessage}`,
      });

      await this.prisma.activityLog.create({
        data: {
          userId: post.userId,
          action: 'POST_FAILED',
          entityType: 'post',
          entityId: postId,
          status: 'FAILED',
          message: errorMessage,
        },
      });

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

  private async publishToFacebook(
    pageId: string,
    accessToken: string,
    videoUrl: string,
    caption: string,
    firstComment: string | undefined,
  ): Promise<string> {
    // Check if test or simulated page
    if (pageId.startsWith('test_') || accessToken.startsWith('test_token_')) {
      const simulatedPostId = `test_fb_post_${Date.now()}`;
      this.logger.log(
        `[SIMULATED FB PUBLISH] Page: ${pageId} | Caption: "${caption}" | FirstComment: "${firstComment}" -> PostID: ${simulatedPostId}`,
      );
      return simulatedPostId;
    }

    // Step 1: Start video upload session
    const uploadSession = await this.startVideoUpload(pageId, accessToken);

    // Step 2: Upload video chunks
    await this.uploadVideoChunks(uploadSession.upload_url, videoUrl);

    // Step 3: Finish upload and create post
    const postId = await this.finishVideoUpload(
      pageId,
      accessToken,
      uploadSession.video_id,
      caption,
    );

    // Step 4: Add first comment if provided
    if (firstComment) {
      await this.addComment(postId, accessToken, firstComment);
    }

    return postId;
  }

  private async startVideoUpload(
    pageId: string,
    accessToken: string,
  ): Promise<VideoUploadSession> {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${pageId}/video_reels`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          upload_phase: 'start',
        }),
      },
    );

    if (!response.ok) {
      throw new Error('Failed to start Facebook video upload');
    }

    const result: unknown = await response.json();
    if (
      !this.isRecord(result) ||
      typeof result.upload_url !== 'string' ||
      typeof result.video_id !== 'string'
    ) {
      throw new Error('Facebook returned an invalid upload session');
    }
    return { upload_url: result.upload_url, video_id: result.video_id };
  }

  private async uploadVideoChunks(uploadUrl: string, videoUrl: string) {
    const response = await fetch(videoUrl);
    if (!response.ok) throw new Error('Failed to fetch video from storage');

    const videoBuffer = await response.arrayBuffer();
    const chunkSize = 4 * 1024 * 1024; // 4MB chunks

    for (let i = 0; i < videoBuffer.byteLength; i += chunkSize) {
      const chunk = videoBuffer.slice(
        i,
        Math.min(i + chunkSize, videoBuffer.byteLength),
      );
      const chunkResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Content-Range': `bytes ${i}-${i + chunk.byteLength - 1}/${videoBuffer.byteLength}`,
        },
        body: chunk,
      });

      if (!chunkResponse.ok) {
        throw new Error(`Failed to upload chunk ${i}`);
      }
    }
  }

  private async finishVideoUpload(
    pageId: string,
    accessToken: string,
    videoId: string,
    caption: string,
  ) {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${pageId}/video_reels`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          video_id: videoId,
          upload_phase: 'finish',
          description: caption,
        }),
      },
    );

    if (!response.ok) {
      throw new Error('Failed to finish Facebook video upload');
    }

    const result: unknown = await response.json();
    if (!this.isRecord(result) || typeof result.id !== 'string') {
      throw new Error('Facebook returned an invalid published post');
    }
    return result.id;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private async addComment(
    postId: string,
    accessToken: string,
    comment: string,
  ) {
    await fetch(`https://graph.facebook.com/v18.0/${postId}/comments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: comment }),
    });
  }

  async onModuleDestroy() {
    await this.worker.close();
  }
}
