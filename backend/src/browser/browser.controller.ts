import { Controller, Post, Get, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BrowserService } from './browser.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { IsIn, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class LaunchInteractiveLoginDto {
  @IsNotEmpty({ message: 'Nền tảng đăng nhập không được để trống' })
  @IsIn(['ZALO', 'FACEBOOK', 'SHOPEE', 'THREADS'], {
    message: 'Nền tảng phải là ZALO, FACEBOOK, SHOPEE hoặc THREADS',
  })
  target: 'ZALO' | 'FACEBOOK' | 'SHOPEE' | 'THREADS';

  @IsOptional()
  @IsNumber()
  timeoutSeconds?: number = 90;
}

@ApiTags('browser')
@Controller('browser')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BrowserController {
  constructor(private readonly browserService: BrowserService) {}

  @Get('sessions')
  @ApiOperation({ summary: 'Kiểm tra trạng thái Cookie & Session đã lưu trên PC cục bộ' })
  @ApiResponse({ status: 200, description: 'Danh sách session của các nền tảng' })
  async getStoredSessionStatus() {
    const statuses = await this.browserService.getStoredSessionStatus();
    return {
      success: true,
      data: statuses,
    };
  }

  @Post('launch-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mở cửa sổ Chrome thật trên PC để quét QR Zalo / đăng nhập Shopee' })
  @ApiResponse({ status: 200, description: 'Mở trình duyệt thành công' })
  async launchInteractiveLogin(@Body() dto: LaunchInteractiveLoginDto) {
    const timeoutMs = (dto.timeoutSeconds || 90) * 1000;
    const res = await this.browserService.launchInteractiveLogin(dto.target, timeoutMs);
    return {
      success: true,
      data: res,
    };
  }
}
