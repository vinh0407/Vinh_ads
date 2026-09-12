import { IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateScheduleDto {
  @ApiProperty({ example: '2026-08-18T18:00:00Z', description: 'ISO 8601 date string for schedule' })
  @IsDateString()
  scheduledAt: string;
}
