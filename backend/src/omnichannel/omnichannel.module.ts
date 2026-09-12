import { Module } from '@nestjs/common';
import { TiktokService } from './tiktok.service';
import { YoutubeService } from './youtube.service';
import { OmnichannelService } from './omnichannel.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [TiktokService, YoutubeService, OmnichannelService],
  exports: [TiktokService, YoutubeService, OmnichannelService],
})
export class OmnichannelModule {}
