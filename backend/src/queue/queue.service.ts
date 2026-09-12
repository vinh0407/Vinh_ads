import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import {
  AnalyticsJobData,
  NotificationJobData,
  PublishPostJobData,
  ScheduleDispatchJobData,
  SourceSyncJobData,
  VideoImportJobData,
  VideoProcessingJobData,
} from './job-contracts';

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue('source-sync')
    private sourceSyncQueue: Queue<SourceSyncJobData>,
    @InjectQueue('video-import')
    private videoImportQueue: Queue<VideoImportJobData>,
    @InjectQueue('video-processing')
    private videoProcessingQueue: Queue<VideoProcessingJobData>,
    @InjectQueue('thumbnail-generation')
    private thumbnailQueue: Queue<VideoProcessingJobData>,
    @InjectQueue('schedule-dispatch')
    private scheduleQueue: Queue<ScheduleDispatchJobData>,
    @InjectQueue('publish-post')
    private publishQueue: Queue<PublishPostJobData>,
    @InjectQueue('analytics-sync')
    private analyticsQueue: Queue<AnalyticsJobData>,
    @InjectQueue('notification')
    private notificationQueue: Queue<NotificationJobData>,
  ) {}

  async addSourceSyncJob(data: SourceSyncJobData) {
    const jobId = `sync-${data.sourcePageId}`;
    const existing = await this.sourceSyncQueue.getJob(jobId);
    if (existing && (await existing.isFailed())) await existing.remove();
    return this.sourceSyncQueue.add('sync', data, {
      jobId,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
    });
  }

  async addVideoImportJob(data: VideoImportJobData) {
    return this.videoImportQueue.add('import', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 10000 },
    });
  }

  async addVideoProcessingJob(data: VideoProcessingJobData) {
    return this.videoProcessingQueue.add('process', data, {
      attempts: 2,
      backoff: { type: 'exponential', delay: 15000 },
    });
  }

  async addThumbnailJob(data: VideoProcessingJobData) {
    return this.thumbnailQueue.add('generate', data, {
      attempts: 2,
      backoff: { type: 'exponential', delay: 5000 },
    });
  }

  async addScheduleJob(data: ScheduleDispatchJobData, scheduledAt?: Date) {
    return this.scheduleQueue.add('dispatch', data, {
      jobId: `schedule-${data.scheduleId}`,
      delay: scheduledAt ? Math.max(0, scheduledAt.getTime() - Date.now()) : 0,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });
  }

  async removeScheduleJob(scheduleId: string) {
    const job = await this.scheduleQueue.getJob(`schedule-${scheduleId}`);
    if (job) await job.remove();
  }

  async addPublishJob(data: PublishPostJobData) {
    const jobId = `publish-${data.postId}`;
    const existingJob = await this.publishQueue.getJob(jobId);
    if (existingJob && (await existingJob.isFailed())) {
      await existingJob.remove();
    }
    return this.publishQueue.add('publish', data, {
      jobId,
      attempts: 3,
      backoff: { type: 'exponential', delay: 30000 },
    });
  }

  getPublishJob(jobId: string) {
    return this.publishQueue.getJob(jobId);
  }

  async addAnalyticsJob(data: AnalyticsJobData) {
    return this.analyticsQueue.add('sync', data, {
      attempts: 2,
      backoff: { type: 'exponential', delay: 60000 },
    });
  }

  async addNotificationJob(data: NotificationJobData) {
    return this.notificationQueue.add('send', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });
  }

  getQueueStats() {
    return {
      sourceSync: this.sourceSyncQueue.getJobCounts(),
      videoImport: this.videoImportQueue.getJobCounts(),
      videoProcessing: this.videoProcessingQueue.getJobCounts(),
      thumbnail: this.thumbnailQueue.getJobCounts(),
      schedule: this.scheduleQueue.getJobCounts(),
      publish: this.publishQueue.getJobCounts(),
      analytics: this.analyticsQueue.getJobCounts(),
      notification: this.notificationQueue.getJobCounts(),
    };
  }
}
