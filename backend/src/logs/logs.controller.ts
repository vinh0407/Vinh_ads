import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { LogsService } from './logs.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ActivityAction } from '@prisma/client';

@Controller('logs')
@UseGuards(JwtAuthGuard)
export class LogsController {
  constructor(private logsService: LogsService) {}

  @Get()
  findAll(
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('action') action?: ActivityAction,
    @Query('entityType') entityType?: string,
  ) {
    return this.logsService.findAll(userId, {
      page,
      limit,
      action,
      entityType,
    });
  }
}
