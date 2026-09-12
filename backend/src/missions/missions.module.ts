import { Module } from '@nestjs/common';
import { MissionsService } from './missions.service';
import { MissionsController } from './missions.controller';
import { AiModule } from '../ai/ai.module';
import { NewsModule } from '../news/news.module';
import { VideoGeneratorModule } from '../video-generator/video-generator.module';

import { ProductsModule } from '../products/products.module';
import { OmnichannelModule } from '../omnichannel/omnichannel.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    AiModule,
    NewsModule,
    VideoGeneratorModule,
    ProductsModule,
    OmnichannelModule,
    PrismaModule,
  ],
  controllers: [MissionsController],
  providers: [MissionsService],
  exports: [MissionsService],
})
export class MissionsModule {}
