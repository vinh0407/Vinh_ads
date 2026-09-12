import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueueService } from './queue.service';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('app.redis.host'),
          port: configService.get<number>('app.redis.port'),
          password: configService.get<string>('app.redis.password'),
        },
      }),
    }),
    BullModule.registerQueue(
      { name: 'source-sync' },
      { name: 'video-import' },
      { name: 'video-processing' },
      { name: 'thumbnail-generation' },
      { name: 'schedule-dispatch' },
      { name: 'publish-post' },
      { name: 'analytics-sync' },
      { name: 'notification' },
    ),
  ],
  providers: [QueueService],
  exports: [QueueService, BullModule],
})
export class QueueModule {}
