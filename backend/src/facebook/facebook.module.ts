import { Module } from '@nestjs/common';
import { FacebookService } from './facebook.service';
import { FacebookController } from './facebook.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FacebookController],
  providers: [FacebookService],
  exports: [FacebookService],
})
export class FacebookModule {}