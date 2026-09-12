import { NotificationType, VideoProcessingJobType } from '@prisma/client';

export interface ScheduleDispatchJobData {
  scheduleId: string;
}

export interface SourceSyncJobData {
  sourcePageId: string;
}

export interface PublishPostJobData {
  postId: string;
}

export interface VideoImportJobData {
  videoId: string;
  sourceUrl: string;
}

export interface VideoProcessingJobData {
  videoId: string;
  jobType: VideoProcessingJobType;
  inputKey?: string;
  outputKey?: string;
}

export interface AnalyticsJobData {
  postId: string;
  externalPostId: string;
  pageId: string;
}

export interface NotificationJobData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
}
