import { IsNotEmpty, IsString, IsOptional, IsArray } from 'class-validator';

export class CreateMissionDto {
  @IsNotEmpty({ message: 'Mô tả nhiệm vụ không được để trống' })
  @IsString()
  goal: string;

  @IsOptional()
  @IsArray()
  enabledAgents?: string[]; // ['RESEARCH', 'NEWS', 'CONTENT', 'VIDEO', 'AFFILIATE', 'CUSTOMER']
}

export class ApprovalActionDto {
  @IsNotEmpty({ message: 'Trạng thái phê duyệt không được để trống' })
  @IsString()
  decision: 'APPROVE' | 'REJECT';

  @IsOptional()
  @IsString()
  editedPayload?: string;

  @IsOptional()
  @IsArray()
  platforms?: ('FACEBOOK' | 'TIKTOK' | 'YOUTUBE')[];
}
