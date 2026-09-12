import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PostStatus } from '@prisma/client';

@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostsController {
  constructor(private postsService: PostsService) {}

  @Post()
  async create(
    @CurrentUser('id') userId: string,
    @Body() createPostDto: CreatePostDto,
  ) {
    return this.postsService.create(userId, createPostDto);
  }

  @Get()
  async findAll(
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: PostStatus,
  ) {
    return this.postsService.findAll(userId, { page, limit, status });
  }

  @Get(':id')
  async findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.postsService.findOne(userId, id);
  }

  @Patch(':id')
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() updatePostDto: UpdatePostDto,
  ) {
    return this.postsService.update(userId, id, updatePostDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@CurrentUser('id') userId: string, @Param('id') id: string) {
    await this.postsService.delete(userId, id);
  }

  @Post(':id/publish')
  async publish(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.postsService.publish(userId, id);
  }

  @Post(':id/cancel')
  async cancel(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.postsService.cancel(userId, id);
  }
}
