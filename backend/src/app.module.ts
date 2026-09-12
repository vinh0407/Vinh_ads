import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SourcesModule } from './sources/sources.module';
import { VideosModule } from './videos/videos.module';
import { ProductsModule } from './products/products.module';
import { TemplatesModule } from './templates/templates.module';
import { PostsModule } from './posts/posts.module';
import { SchedulesModule } from './schedules/schedules.module';
import { FacebookModule } from './facebook/facebook.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { NotificationsModule } from './notifications/notifications.module';
import { LogsModule } from './logs/logs.module';
import { StorageModule } from './storage/storage.module';
import { QueueModule } from './queue/queue.module';
import { AiModule } from './ai/ai.module';
import { BrowserModule } from './browser/browser.module';
import { NewsModule } from './news/news.module';
import { VideoGeneratorModule } from './video-generator/video-generator.module';
import { MissionsModule } from './missions/missions.module';
import { OmnichannelModule } from './omnichannel/omnichannel.module';
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
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: configService.get<number>('app.rateLimit.api.windowMs') || 60000,
            limit: configService.get<number>('app.rateLimit.api.max') || 100,
          },
        ],
      }),
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    SourcesModule,
    VideosModule,
    ProductsModule,
    TemplatesModule,
    PostsModule,
    SchedulesModule,
    FacebookModule,
    AnalyticsModule,
    NotificationsModule,
    LogsModule,
    StorageModule,
    QueueModule,
    AiModule,
    BrowserModule,
    NewsModule,
    VideoGeneratorModule,
    MissionsModule,
    OmnichannelModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
