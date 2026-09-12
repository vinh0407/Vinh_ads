import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './queue/queue.module';
import { SourcesModule } from './sources/sources.module';
import { VideosModule } from './videos/videos.module';
import { PostsModule } from './posts/posts.module';
import { SchedulesModule } from './schedules/schedules.module';
import { FacebookModule } from './facebook/facebook.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { NotificationsModule } from './notifications/notifications.module';
import { LogsModule } from './logs/logs.module';
import { StorageModule } from './storage/storage.module';
import { VideoProcessorWorker } from './workers/video-processor.worker';
import { SyncWorker } from './workers/sync.worker';
import { PublishWorker } from './workers/publish.worker';
import { SchedulerWorker } from './workers/scheduler.worker';
import { AnalyticsWorker } from './workers/analytics.worker';
import { NotificationWorker } from './workers/notification.worker';
import configuration from './config/configuration';
import { validateEnvironment } from './config/environment.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnvironment,
      envFilePath: ['.env.local', '.env'],
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    QueueModule,
    SourcesModule,
    VideosModule,
    PostsModule,
    SchedulesModule,
    FacebookModule,
    AnalyticsModule,
    NotificationsModule,
    LogsModule,
    StorageModule,
  ],
  providers: [
    VideoProcessorWorker,
    SyncWorker,
    PublishWorker,
    SchedulerWorker,
    AnalyticsWorker,
    NotificationWorker,
  ],
})
export class WorkerModule {}