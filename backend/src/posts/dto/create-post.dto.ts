import { IsString, IsOptional, IsArray, IsUUID, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePostDto {
  @ApiProperty({ example: 'video-uuid' })
  @IsUUID()
  videoId: string;

  @ApiProperty({ example: 'page-uuid' })
  @IsUUID()
  facebookPageId: string;

  @ApiProperty({ example: '🔥 Check out this product!' })
  @IsString()
  caption: string;

  @ApiPropertyOptional({ example: '🛒 Link sản phẩm: https://affiliate.link' })
  @IsOptional()
  @IsString()
  firstComment?: string;

  @ApiPropertyOptional({ type: [String], example: ['product-uuid-1', 'product-uuid-2'] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  productIds?: string[];

  @ApiPropertyOptional({ example: '2026-08-18T18:00:00Z' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}