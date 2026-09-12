import { Module } from '@nestjs/common';
import { NewsService } from './news.service';
import { NewsController } from './news.controller';
import { BrowserModule } from '../browser/browser.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [BrowserModule, AiModule],
  controllers: [NewsController],
  providers: [NewsService],
  exports: [NewsService],
})
export class NewsModule {}
