import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class UpdateSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoSync?: boolean;

  @ApiPropertyOptional({ minimum: 60, maximum: 86400 })
  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(86400)
  defaultSyncInterval?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  defaultCaptionTemplateId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  defaultCommentTemplateId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notificationEnabled?: boolean;
}
