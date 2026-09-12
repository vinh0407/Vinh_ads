import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { VideosService } from './videos.service';
import { CreateVideoDto } from './dto/create-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { VideoStatus } from '@prisma/client';

@Controller('videos')
@UseGuards(JwtAuthGuard)
export class VideosController {
  constructor(private videosService: VideosService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 100 * 1024 * 1024,
      },
    }),
  )
  async upload(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('title') title?: string,
    @Body('description') description?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No video file provided');
    }
    return this.videosService.upload(userId, file, title, description);
  }

  @Post()
  async create(
    @CurrentUser('id') userId: string,
    @Body() createVideoDto: CreateVideoDto,
  ) {
    return this.videosService.create(userId, createVideoDto);
  }

  @Get()
  async findAll(
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: VideoStatus,
    @Query('sourceId') sourceId?: string,
  ) {
    return this.videosService.findAll(userId, {
      page,
      limit,
      status,
      sourceId,
    });
  }

  @Get(':id')
  async findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.videosService.findOne(userId, id);
  }

  @Patch(':id')
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() updateVideoDto: UpdateVideoDto,
  ) {
    return this.videosService.update(userId, id, updateVideoDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@CurrentUser('id') userId: string, @Param('id') id: string) {
    await this.videosService.delete(userId, id);
  }

  @Post(':id/archive')
  async archive(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.videosService.archive(userId, id);
  }
}
