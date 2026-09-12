import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('overview')
  getOverview(@CurrentUser('id') userId: string) {
    return this.analyticsService.getOverview(userId);
  }

  @Get('posts')
  getPostAnalytics(
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.analyticsService.getPostAnalytics(userId, { page, limit });
  }

  @Get('products')
  getProductAnalytics(@CurrentUser('id') userId: string) {
    return this.analyticsService.getProductAnalytics(userId);
  }

  @Get('pages')
  getPageAnalytics(@CurrentUser('id') userId: string) {
    return this.analyticsService.getPageAnalytics(userId);
  }
}