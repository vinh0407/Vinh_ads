import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { QueueService } from '../queue/queue.service';
import { PostStatus, Prisma } from '@prisma/client';
import { paginate } from '../common/utils/pagination.util';

@Injectable()
export class PostsService {
  constructor(
    private prisma: PrismaService,
    private queue: QueueService,
  ) {}

  async create(userId: string, createPostDto: CreatePostDto) {
    const { productIds, ...data } = createPostDto;
    await this.assertOwnership(
      userId,
      data.videoId,
      data.facebookPageId,
      productIds || [],
    );
    return this.prisma.post.create({
      data: {
        userId,
        ...data,
        postProducts: productIds
          ? {
              create: productIds.map((productId) => ({ productId })),
            }
          : undefined,
      },
      include: { postProducts: { include: { product: true } } },
    });
  }

  async findAll(
    userId: string,
    params: {
      page?: number;
      limit?: number;
      status?: PostStatus;
    },
  ) {
    const { page = 1, limit = 20, status } = params;
    const where: Prisma.PostWhereInput = { userId };
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          video: true,
          facebookPage: true,
          postProducts: { include: { product: true } },
        },
      }),
      this.prisma.post.count({ where }),
    ]);

    return paginate(items, total, page, limit);
  }

  async findOne(userId: string, id: string) {
    const post = await this.prisma.post.findFirst({
      where: { id, userId },
      include: {
        video: true,
        facebookPage: true,
        postProducts: { include: { product: true } },
        schedule: true,
      },
    });
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  async update(userId: string, id: string, updatePostDto: UpdatePostDto) {
    const post = await this.findOne(userId, id);
    const { productIds, ...data } = updatePostDto;
    await this.assertOwnership(
      userId,
      data.videoId || post.videoId,
      data.facebookPageId || post.facebookPageId,
      productIds || [],
    );
    const updateData: Prisma.PostUncheckedUpdateInput = { ...data };
    if (productIds) {
      updateData.postProducts = {
        deleteMany: {},
        create: productIds.map((productId: string) => ({ productId })),
      };
    }
    return this.prisma.post.update({
      where: { id },
      data: updateData,
      include: { postProducts: { include: { product: true } } },
    });
  }

  async delete(userId: string, id: string) {
    await this.findOne(userId, id);
    return this.prisma.post.delete({ where: { id } });
  }

  async publish(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.queue.addPublishJob({ postId: id });
    return this.prisma.post.update({
      where: { id },
      data: { status: 'QUEUED' },
    });
  }

  private async assertOwnership(
    userId: string,
    videoId: string,
    facebookPageId: string,
    productIds: string[],
  ) {
    const [video, page, products] = await Promise.all([
      this.prisma.video.findFirst({
        where: { id: videoId, userId },
        select: { id: true },
      }),
      this.prisma.facebookPage.findFirst({
        where: { id: facebookPageId, userId },
        select: { id: true },
      }),
      this.prisma.product.count({ where: { id: { in: productIds }, userId } }),
    ]);
    if (!video || !page || products !== new Set(productIds).size)
      throw new NotFoundException('Related resource not found');
  }

  async cancel(userId: string, id: string) {
    const post = await this.findOne(userId, id);
    if (post.status === 'PUBLISHED') {
      throw new ConflictException('Cannot cancel published post');
    }
    return this.prisma.post.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }
}
