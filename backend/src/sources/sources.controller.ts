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
import { SourcesService } from './sources.service';
import { CreateSourceDto } from './dto/create-source.dto';
import { UpdateSourceDto } from './dto/update-source.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('sources')
@UseGuards(JwtAuthGuard)
export class SourcesController {
  constructor(private sourcesService: SourcesService) {}

  @Post()
  async create(@CurrentUser('id') userId: string, @Body() createSourceDto: CreateSourceDto) {
    return this.sourcesService.create(userId, createSourceDto);
  }

  @Get()
  async findAll(@CurrentUser('id') userId: string) {
    return this.sourcesService.findAll(userId);
  }

  @Get(':id')
  async findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.sourcesService.findOne(userId, id);
  }

  @Patch(':id')
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() updateSourceDto: UpdateSourceDto,
  ) {
    return this.sourcesService.update(userId, id, updateSourceDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@CurrentUser('id') userId: string, @Param('id') id: string) {
    await this.sourcesService.delete(userId, id);
  }

  @Post(':id/toggle')
  async toggleSync(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.sourcesService.toggleSync(userId, id);
  }

  @Post(':id/sync')
  async sync(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.sourcesService.sync(userId, id);
  }
}