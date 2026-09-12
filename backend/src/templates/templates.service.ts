import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';

@Injectable()
export class TemplatesService {
  constructor(private prisma: PrismaService) {}

  async createCaption(userId: string, createTemplateDto: CreateTemplateDto) {
    if (createTemplateDto.isDefault) {
      await this.prisma.captionTemplate.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }
    return this.prisma.captionTemplate.create({
      data: { userId, ...createTemplateDto },
    });
  }

  async createComment(userId: string, createTemplateDto: CreateTemplateDto) {
    if (createTemplateDto.isDefault) {
      await this.prisma.commentTemplate.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }
    return this.prisma.commentTemplate.create({
      data: { userId, ...createTemplateDto },
    });
  }

  async findAllCaptions(userId: string) {
    return this.prisma.captionTemplate.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllComments(userId: string) {
    return this.prisma.commentTemplate.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneCaption(userId: string, id: string) {
    const template = await this.prisma.captionTemplate.findFirst({
      where: { id, userId },
    });
    if (!template) throw new NotFoundException('Caption template not found');
    return template;
  }

  async findOneComment(userId: string, id: string) {
    const template = await this.prisma.commentTemplate.findFirst({
      where: { id, userId },
    });
    if (!template) throw new NotFoundException('Comment template not found');
    return template;
  }

  async updateCaption(
    userId: string,
    id: string,
    updateTemplateDto: UpdateTemplateDto,
  ) {
    await this.findOneCaption(userId, id);
    if (updateTemplateDto.isDefault) {
      await this.prisma.captionTemplate.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }
    return this.prisma.captionTemplate.update({
      where: { id },
      data: updateTemplateDto,
    });
  }

  async updateComment(
    userId: string,
    id: string,
    updateTemplateDto: UpdateTemplateDto,
  ) {
    await this.findOneComment(userId, id);
    if (updateTemplateDto.isDefault) {
      await this.prisma.commentTemplate.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }
    return this.prisma.commentTemplate.update({
      where: { id },
      data: updateTemplateDto,
    });
  }

  async deleteCaption(userId: string, id: string) {
    await this.findOneCaption(userId, id);
    return this.prisma.captionTemplate.delete({ where: { id } });
  }

  async deleteComment(userId: string, id: string) {
    await this.findOneComment(userId, id);
    return this.prisma.commentTemplate.delete({ where: { id } });
  }

  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  async renderCaption(
    userId: string,
    templateId: string,
    variables: Record<string, string>,
  ) {
    const template = await this.prisma.captionTemplate.findFirst({
      where: { id: templateId, userId },
    });
    if (!template) throw new NotFoundException('Template not found');
    let content = template.content;
    for (const [key, value] of Object.entries(variables)) {
      content = content.replace(
        new RegExp(`\\{${this.escapeRegex(key)}\\}`, 'g'),
        () => value,
      );
    }
    return content;
  }

  async renderComment(
    userId: string,
    templateId: string,
    variables: Record<string, string>,
  ) {
    const template = await this.prisma.commentTemplate.findFirst({
      where: { id: templateId, userId },
    });
    if (!template) throw new NotFoundException('Template not found');
    let content = template.content;
    for (const [key, value] of Object.entries(variables)) {
      content = content.replace(
        new RegExp(`\\{${this.escapeRegex(key)}\\}`, 'g'),
        () => value,
      );
    }
    return content;
  }
}
