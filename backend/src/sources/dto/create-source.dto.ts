import { IsString, IsUrl, IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Platform } from '@prisma/client';

export class CreateSourceDto {
  @ApiProperty({ enum: Platform, example: Platform.FACEBOOK })
  @IsEnum(Platform)
  platform: Platform;

  @ApiProperty({ example: '123456789' })
  @IsString()
  platformPageId: string;

  @ApiProperty({ example: 'Tech News Page' })
  @IsString()
  pageName: string;

  @ApiProperty({ example: 'https://facebook.com/technews' })
  @IsUrl()
  pageUrl: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  syncEnabled?: boolean;

  @ApiPropertyOptional({ example: 1800, description: 'Sync interval in seconds' })
  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(86400)
  syncInterval?: number;
}