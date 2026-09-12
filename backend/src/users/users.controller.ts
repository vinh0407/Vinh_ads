import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  async me(@CurrentUser() user: User) {
    const { passwordHash: _passwordHash, ...sanitized } = user;
    return sanitized;
  }

  @Patch('me')
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.updateProfile(userId, updateUserDto);
  }

  @Patch('me/password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(userId, changePasswordDto);
  }

  @Get('me/settings')
  async getSettings(@CurrentUser('id') userId: string) {
    return this.usersService.getSettings(userId);
  }

  @Patch('me/settings')
  async updateSettings(
    @CurrentUser('id') userId: string,
    @Body() settingsData: UpdateSettingsDto,
  ) {
    return this.usersService.updateSettings(userId, settingsData);
  }

  @Get('me/stats')
  async getStats(@CurrentUser('id') userId: string) {
    return this.usersService.getStats(userId);
  }
}
