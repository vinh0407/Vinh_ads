import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTemplateDto {
  @ApiProperty({ example: 'Default Caption Template' })
  @IsString()
  name: string;

  @ApiProperty({ example: '🔥 {product_name}\n\n👉 Xem sản phẩm: {affiliate_url}' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}