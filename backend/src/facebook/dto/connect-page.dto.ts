import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConnectPageDto {
  @ApiProperty() @IsString() @IsNotEmpty() @IsUUID() sessionId: string;
  @ApiProperty() @IsString() @IsNotEmpty() pageId: string;
}
