import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('schedules')
@UseGuards(JwtAuthGuard)
export class SchedulesController {
  constructor(private schedulesService: SchedulesService) {}

  @Post()
  async create(@CurrentUser('id') userId: string, @Body() createScheduleDto: CreateScheduleDto) {
    return this.schedulesService.create(userId, createScheduleDto);
  }

  @Get()
  async findAll(@CurrentUser('id') userId: string) {
    return this.schedulesService.findAll(userId);
  }

  @Get(':id')
  async findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.schedulesService.findOne(userId, id);
  }

  @Patch(':id')
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() updateScheduleDto: UpdateScheduleDto,
  ) {
    return this.schedulesService.update(userId, id, updateScheduleDto.scheduledAt);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@CurrentUser('id') userId: string, @Param('id') id: string) {
    await this.schedulesService.delete(userId, id);
  }
}