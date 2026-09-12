import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';
import { User } from '@prisma/client';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async updateProfile(userId: string, updateUserDto: UpdateUserDto) {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.findByEmail(updateUserDto.email);
      if (existingUser) {
        throw new ConflictException({
          code: 'EMAIL_ALREADY_EXISTS',
          message: 'Email already in use',
        });
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: updateUserDto.name,
        email: updateUserDto.email,
        avatarUrl: updateUserDto.avatarUrl,
      },
    });

    const { passwordHash: _passwordHash, ...sanitized } = updatedUser;
    return sanitized;
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    const isPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new BadRequestException({
        code: 'INVALID_CURRENT_PASSWORD',
        message: 'Current password is incorrect',
      });
    }

    const newPasswordHash = await bcrypt.hash(
      changePasswordDto.newPassword,
      12,
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    // Revoke all refresh tokens
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { success: true, message: 'Password changed successfully' };
  }

  async getSettings(userId: string) {
    let settings = await this.prisma.userSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      settings = await this.prisma.userSettings.create({
        data: { userId },
      });
    }

    return settings;
  }

  async updateSettings(userId: string, settingsData: UpdateSettingsDto) {
    return this.prisma.userSettings.upsert({
      where: { userId },
      create: { userId, ...settingsData },
      update: settingsData,
    });
  }

  async getStats(userId: string) {
    const [
      totalVideos,
      readyVideos,
      scheduledPosts,
      publishedPosts,
      totalProducts,
      connectedPages,
    ] = await Promise.all([
      this.prisma.video.count({ where: { userId } }),
      this.prisma.video.count({ where: { userId, status: 'READY' } }),
      this.prisma.post.count({ where: { userId, status: 'SCHEDULED' } }),
      this.prisma.post.count({ where: { userId, status: 'PUBLISHED' } }),
      this.prisma.product.count({ where: { userId } }),
      this.prisma.facebookPage.count({ where: { userId, status: 'ACTIVE' } }),
    ]);

    return {
      totalVideos,
      readyVideos,
      scheduledPosts,
      publishedPosts,
      totalProducts,
      connectedPages,
    };
  }
}
