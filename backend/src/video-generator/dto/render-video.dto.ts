import { IsNotEmpty, IsOptional, IsString, IsArray } from 'class-validator';

export class RenderTikTokVideoDto {
  @IsNotEmpty({ message: 'Tiêu đề video không được để trống' })
  @IsString()
  title: string;

  @IsNotEmpty({ message: 'Hook không được để trống' })
  @IsString()
  hook: string;

  @IsNotEmpty({ message: 'Nội dung đọc (script) không được để trống' })
  @IsString()
  scriptText: string;

  @IsOptional()
  @IsString()
  callToAction?: string;

  @IsOptional()
  @IsArray()
  hashtags?: string[];

  @IsOptional()
  @IsString()
  bgImageUrl?: string;
}
