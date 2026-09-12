import { IsUrl, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class AnalyzeNewsUrlDto {
  @IsNotEmpty({ message: 'URL bài báo không được để trống' })
  @IsUrl({}, { message: 'Đường dẫn URL bài báo không hợp lệ' })
  url: string;

  @IsOptional()
  @IsBoolean()
  includeTikTokScript?: boolean = true;
}

export class GenerateCustomScriptDto {
  @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
  title: string;

  @IsNotEmpty({ message: 'Nội dung tóm tắt không được để trống' })
  summary: string;

  @IsOptional()
  whyItMatters?: string;
}
