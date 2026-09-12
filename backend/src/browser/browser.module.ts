import { Module, Global } from '@nestjs/common';
import { BrowserService } from './browser.service';
import { BrowserController } from './browser.controller';

@Global()
@Module({
  controllers: [BrowserController],
  providers: [BrowserService],
  exports: [BrowserService],
})
export class BrowserModule {}
