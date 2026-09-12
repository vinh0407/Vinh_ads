import { IsUUID, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateScheduleDto {
  @ApiProperty({ example: 'post-uuid' })
  @IsUUID()
  postId: string;

  @ApiProperty({ example: '2026-08-18T18:00:00Z' })
  @IsDateString()
  scheduledAt: string;
}