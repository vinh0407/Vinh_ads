import { Injectable, Logger } from '@nestjs/common';
import { Worker, Job, Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { QueueService } from '../queue/queue.service';
import { HashUtil } from '../common/utils/hash.util';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { VideoProcessingJobData } from '../queue/job-contracts';
import { getErrorMessage } from '../common/utils/error.util';

interface ProcessingResult {
  outputKey?: string;
  metadata?: {
    duration?: number;
    width?: number;
    height?: number;
    hashSha256?: string;
    perceptualHash?: string;
  };
}

@Injectable()
export class VideoProcessorWorker {
  private readonly logger = new Logger(VideoProcessorWorker.name);
  private worker: Worker<VideoProcessingJobData>;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private storage: StorageService,
    private queue: QueueService,
    @InjectQueue('video-processing')
    private videoProcessingQueue: Queue<VideoProcessingJobData>,
  ) {
    this.initializeWorker();
  }

  private initializeWorker() {
    this.worker = new Worker<VideoProcessingJobData>(
      'video-processing',
      async (job: Job<VideoProcessingJobData>) => {
        return this.processJob(job);
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

    this.worker.on('completed', (job) => {
      this.logger.log(`Job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Job ${job?.id} failed: ${err.message}`);
    });
  }

  private async processJob(job: Job<VideoProcessingJobData>) {
    const { videoId, jobType, inputKey, outputKey } = job.data;
    this.logger.log(`Processing ${jobType} for video ${videoId}`);

    const processingJob = await this.prisma.videoProcessingJob.findFirst({
      where: { videoId, jobType, status: 'PROCESSING' },
    });

    if (!processingJob) {
      throw new Error(
        `Processing job not found for video ${videoId} type ${jobType}`,
      );
    }

    try {
      let result: ProcessingResult = {};

      switch (jobType) {
        case 'DOWNLOAD':
          result = await this.downloadVideo(
            videoId,
            this.requireKey(inputKey, 'inputKey'),
          );
          break;
        case 'VALIDATE':
          result = await this.validateVideo(
            videoId,
            this.requireKey(inputKey, 'inputKey'),
          );
          break;
        case 'HASH':
          result = await this.computeHashes(
            videoId,
            this.requireKey(inputKey, 'inputKey'),
          );
          break;
        case 'THUMBNAIL':
          result = await this.generateThumbnail(
            videoId,
            this.requireKey(inputKey, 'inputKey'),
            this.requireKey(outputKey, 'outputKey'),
          );
          break;
        case 'TRANSCODE':
          result = await this.transcodeVideo(
            videoId,
            this.requireKey(inputKey, 'inputKey'),
            this.requireKey(outputKey, 'outputKey'),
          );
          break;
      }

      await this.prisma.videoProcessingJob.update({
        where: { id: processingJob.id },
        data: {
          status: 'COMPLETED',
          outputKey: result.outputKey,
          completedAt: new Date(),
        },
      });

      if (jobType === 'HASH') {
        const hashSha256 = this.requireKey(
          result.metadata?.hashSha256,
          'hashSha256',
        );
        const perceptualHash = this.requireKey(
          result.metadata?.perceptualHash,
          'perceptualHash',
        );
        await this.checkDuplicateAndUpdateStatus(
          videoId,
          hashSha256,
          perceptualHash,
        );
      }

      return result;
    } catch (error: unknown) {
      await this.prisma.videoProcessingJob.update({
        where: { id: processingJob.id },
        data: {
          status: 'FAILED',
          errorMessage: getErrorMessage(error),
          completedAt: new Date(),
        },
      });
      throw error;
    }
  }

  private requireKey(value: string | undefined, name: string): string {
    if (!value) throw new Error(`${name} is required for this processing job`);
    return value;
  }

  private async downloadVideo(videoId: string, sourceUrl: string) {
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
    });
    if (!video) throw new Error('Video not found');

    const storageKey = this.storage.generateVideoKey(
      video.userId,
      `video-${videoId}.mp4`,
    );
    const downloadUrl = await this.storage.getDownloadUrl(sourceUrl);

    const response = await fetch(downloadUrl);
    if (!response.ok)
      throw new Error(`Failed to download video: ${response.statusText}`);

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadUrl = await this.storage.getUploadUrl(storageKey, 'video/mp4');
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: buffer,
      headers: { 'Content-Type': 'video/mp4' },
    });

    if (!uploadResponse.ok)
      throw new Error('Failed to upload video to storage');

    await this.prisma.video.update({
      where: { id: videoId },
      data: {
        storageKey,
        fileSize: BigInt(buffer.length),
        mimeType: 'video/mp4',
      },
    });

    await this.queue.addVideoProcessingJob({
      videoId,
      jobType: 'VALIDATE',
      inputKey: storageKey,
    });
    await this.queue.addVideoProcessingJob({
      videoId,
      jobType: 'HASH',
      inputKey: storageKey,
    });

    return { outputKey: storageKey };
  }

  private async validateVideo(videoId: string, storageKey: string) {
    const downloadUrl = await this.storage.getDownloadUrl(storageKey);
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
    });
    if (!video) throw new Error('Video not found');

    const metadata = await this.getVideoMetadata(downloadUrl);

    await this.prisma.video.update({
      where: { id: videoId },
      data: {
        duration: metadata.duration,
        width: metadata.width,
        height: metadata.height,
      },
    });

    const thumbnailKey = this.storage.generateThumbnailKey(
      video.userId,
      videoId,
    );

    await this.queue.addThumbnailJob({
      videoId,
      jobType: 'THUMBNAIL',
      inputKey: storageKey,
      outputKey: thumbnailKey,
    });

    return { metadata };
  }

  private async getVideoMetadata(videoUrl: string) {
    return new Promise<{ duration: number; width: number; height: number }>(
      (resolve, reject) => {
        const ffprobe = spawn('ffprobe', [
          '-v',
          'error',
          '-select_streams',
          'v:0',
          '-show_entries',
          'stream=width,height,duration',
          '-of',
          'csv=p=0',
          videoUrl,
        ]);

        let output = '';
        ffprobe.stdout.on('data', (data) => {
          output += data.toString();
        });
        ffprobe.stderr.on('data', (data) => {
          this.logger.error(`ffprobe stderr: ${data}`);
        });
        ffprobe.on('close', (code) => {
          if (code !== 0)
            return reject(new Error(`ffprobe exited with code ${code}`));
          const [width, height, duration] = output
            .trim()
            .split(',')
            .map(Number);
          resolve({ width, height, duration: Math.floor(duration) });
        });
      },
    );
  }

  private async computeHashes(videoId: string, storageKey: string) {
    const downloadUrl = await this.storage.getDownloadUrl(storageKey);
    const response = await fetch(downloadUrl);
    const buffer = Buffer.from(await response.arrayBuffer());

    const hashSha256 = HashUtil.sha256(buffer);
    const perceptualHash = HashUtil.perceptualHash(buffer);

    await this.prisma.video.update({
      where: { id: videoId },
      data: { hashSha256, perceptualHash },
    });

    return { metadata: { hashSha256, perceptualHash } };
  }

  private async checkDuplicateAndUpdateStatus(
    videoId: string,
    hashSha256: string,
    perceptualHash: string,
  ) {
    const existingVideo = await this.prisma.video.findFirst({
      where: {
        hashSha256,
        id: { not: videoId },
        status: { not: 'ARCHIVED' },
      },
    });

    if (existingVideo) {
      await this.prisma.video.update({
        where: { id: videoId },
        data: { status: 'ARCHIVED' },
      });
      this.logger.log(
        `Video ${videoId} is duplicate of ${existingVideo.id}, archived`,
      );
      return;
    }

    const similarVideo = await this.prisma.video.findFirst({
      where: {
        perceptualHash,
        id: { not: videoId },
        status: { not: 'ARCHIVED' },
      },
    });

    if (similarVideo) {
      this.logger.warn(
        `Video ${videoId} is perceptually similar to ${similarVideo.id}`,
      );
    }

    await this.prisma.video.update({
      where: { id: videoId },
      data: { status: 'READY' },
    });
  }

  private async generateThumbnail(
    videoId: string,
    inputKey: string,
    outputKey: string,
  ) {
    const inputUrl = await this.storage.getDownloadUrl(inputKey);

    const tempInput = path.join('/tmp', `input-${videoId}.mp4`);
    const tempOutput = path.join('/tmp', `thumb-${videoId}.jpg`);

    const downloadResponse = await fetch(inputUrl);
    fs.writeFileSync(
      tempInput,
      Buffer.from(await downloadResponse.arrayBuffer()),
    );

    await new Promise<void>((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-i',
        tempInput,
        '-ss',
        '00:00:05',
        '-vframes',
        '1',
        '-vf',
        'scale=640:360:force_original_aspect_ratio=decrease',
        '-y',
        tempOutput,
      ]);

      ffmpeg.on('close', (code) => {
        fs.unlinkSync(tempInput);
        if (code !== 0)
          return reject(new Error(`ffmpeg exited with code ${code}`));
        resolve();
      });
    });

    const thumbnailBuffer = fs.readFileSync(tempOutput);
    fs.unlinkSync(tempOutput);

    const uploadUrl = await this.storage.getUploadUrl(outputKey, 'image/jpeg');
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: thumbnailBuffer,
      headers: { 'Content-Type': 'image/jpeg' },
    });

    if (!uploadResponse.ok) throw new Error('Failed to upload thumbnail');

    await this.prisma.video.update({
      where: { id: videoId },
      data: { thumbnailUrl: await this.storage.getDownloadUrl(outputKey) },
    });

    return { outputKey };
  }

  private async transcodeVideo(
    videoId: string,
    inputKey: string,
    outputKey: string,
  ) {
    // Optional: transcode to standard format
    // Implementation similar to generateThumbnail but with full video processing
    return { outputKey };
  }

  async onModuleDestroy() {
    await this.worker.close();
  }
}
