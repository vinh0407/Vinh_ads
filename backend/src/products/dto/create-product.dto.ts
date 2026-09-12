import { IsString, IsOptional, IsUrl, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'Bluetooth Headphones XYZ' })
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'https://shopee.vn/product/123' })
  @IsUrl()
  shopeeUrl: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @ApiProperty({ example: 299000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  price: number;

  @ApiPropertyOptional({ example: 'VND' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: 'Electronics' })
  @IsOptional()
  @IsString()
  category?: string;
}
