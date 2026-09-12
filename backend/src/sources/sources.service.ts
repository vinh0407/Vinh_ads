import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSourceDto } from './dto/create-source.dto';
import { UpdateSourceDto } from './dto/update-source.dto';
import { QueueService } from '../queue/queue.service';

@Injectable()
export class SourcesService {
  constructor(
    private prisma: PrismaService,
    private queue: QueueService,
  ) {}

  async create(userId: string, createSourceDto: CreateSourceDto) {
    return this.prisma.sourcePage.create({
      data: {
        userId,
        ...createSourceDto,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.sourcePage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const source = await this.prisma.sourcePage.findFirst({
      where: { id, userId },
    });
    if (!source) {
      throw new NotFoundException('Source not found');
    }
    return source;
  }

  async update(userId: string, id: string, updateSourceDto: UpdateSourceDto) {
    await this.findOne(userId, id);
    return this.prisma.sourcePage.update({
      where: { id },
      data: updateSourceDto,
    });
  }

  async delete(userId: string, id: string) {
    await this.findOne(userId, id);
    return this.prisma.sourcePage.delete({ where: { id } });
  }

  async toggleSync(userId: string, id: string) {
    const source = await this.findOne(userId, id);
    return this.prisma.sourcePage.update({
      where: { id },
      data: { syncEnabled: !source.syncEnabled },
    });
  }

  async sync(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.queue.addSourceSyncJob({ sourcePageId: id });
    return { success: true, message: 'Sync initiated' };
  }
}
