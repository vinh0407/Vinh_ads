import { Module } from '@nestjs/common';
import { VideoGeneratorService } from './video-generator.service';
import { VideoGeneratorController } from './video-generator.controller';

@Module({
  controllers: [VideoGeneratorController],
  providers: [VideoGeneratorService],
  exports: [VideoGeneratorService],
})
export class VideoGeneratorModule {}
