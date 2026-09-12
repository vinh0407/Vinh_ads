import { ApiProperty } from '@nestjs/swagger';
import { AffiliateNetwork } from '@prisma/client';
import { IsEnum, IsUrl } from 'class-validator';

export class AddAffiliateLinkDto {
  @ApiProperty({ enum: AffiliateNetwork })
  @IsEnum(AffiliateNetwork)
  network: AffiliateNetwork;

  @ApiProperty()
  @IsUrl()
  originalUrl: string;

  @ApiProperty()
  @IsUrl()
  affiliateUrl: string;
}
