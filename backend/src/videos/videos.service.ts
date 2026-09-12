import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateVideoDto } from './dto/create-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { Prisma, VideoStatus } from '@prisma/client';
import { paginate } from '../common/utils/pagination.util';

@Injectable()
export class VideosService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
  ) {}

  async upload(
    userId: string,
    file: Express.Multer.File,
    title?: string,
    description?: string,
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException('No video file provided');
    }

    const allowedMimes = new Set([
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/x-matroska',
      'video/avi',
      'video/x-msvideo',
      'video/mpeg',
    ]);
    const mimeType = file.mimetype?.toLowerCase() || 'video/mp4';
    if (!allowedMimes.has(mimeType)) {
      throw new BadRequestException(
        `Unsupported file type: ${file.mimetype}. Only video files are allowed.`,
      );
    }

    const key = this.storageService.generateVideoKey(
      userId,
      file.originalname || 'uploaded-video.mp4',
    );
    const downloadUrl = await this.storageService.uploadBuffer(
      key,
      file.buffer,
      mimeType,
    );

    const videoTitle = title?.trim() || file.originalname || 'Uploaded Video';

    const video = await this.prisma.video.create({
      data: {
        userId,
        title: videoTitle,
        description: description?.trim() || null,
        storageKey: key,
        fileSize: BigInt(file.size),
        mimeType: file.mimetype || 'video/mp4',
        status: VideoStatus.READY,
        thumbnailUrl: null,
        videoFiles: {
          create: {
            fileType: 'ORIGINAL',
            storageKey: key,
            fileSize: BigInt(file.size),
            mimeType: file.mimetype || 'video/mp4',
          },
        },
      },
      include: {
        videoFiles: true,
      },
    });

    return {
      ...video,
      url: downloadUrl,
    };
  }

  async create(userId: string, createVideoDto: CreateVideoDto) {
    return this.prisma.video.create({
      data: {
        userId,
        ...createVideoDto,
      },
    });
  }

  async findAll(
    userId: string,
    params: {
      page?: number;
      limit?: number;
      status?: VideoStatus;
      sourceId?: string;
    },
  ) {
    const { page = 1, limit = 20, status, sourceId } = params;
    const where: Prisma.VideoWhereInput = { userId };
    if (status) where.status = status;
    if (sourceId) where.sourceVideoId = sourceId;

    const [items, total] = await Promise.all([
      this.prisma.video.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.video.count({ where }),
    ]);

    return paginate(items, total, page, limit);
  }

  async findOne(userId: string, id: string) {
    const video = await this.prisma.video.findFirst({
      where: { id, userId },
      include: { videoFiles: true, processingJobs: true },
    });
    if (!video) throw new NotFoundException('Video not found');
    return video;
  }

  async update(userId: string, id: string, updateVideoDto: UpdateVideoDto) {
    await this.findOne(userId, id);
    return this.prisma.video.update({
      where: { id },
      data: updateVideoDto,
    });
  }

  async delete(userId: string, id: string) {
    const video = await this.findOne(userId, id);
    if (video.storageKey) {
      await this.storageService.deleteFile(video.storageKey);
    }
    return this.prisma.video.delete({ where: { id } });
  }

  async archive(userId: string, id: string) {
    await this.findOne(userId, id);
    return this.prisma.video.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });
  }
}
