import { IsString, IsOptional, IsEnum, IsUrl, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VideoStatus } from '@prisma/client';

export class CreateVideoDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceVideoId?: string;

  @ApiProperty({ example: 'My Video Title' })
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 120 })
  @IsOptional()
  @IsInt()
  @Min(0)
  duration?: number;

  @ApiPropertyOptional({ example: 1920 })
  @IsOptional()
  @IsInt()
  width?: number;

  @ApiPropertyOptional({ example: 1080 })
  @IsOptional()
  @IsInt()
  height?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  thumbnailUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  storageKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  fileSize?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hashSha256?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  perceptualHash?: string;

  @ApiPropertyOptional({ enum: VideoStatus })
  @IsOptional()
  @IsEnum(VideoStatus)
  status?: VideoStatus;
}