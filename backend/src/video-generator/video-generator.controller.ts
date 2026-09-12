import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { VideoGeneratorService } from './video-generator.service';
import { RenderTikTokVideoDto } from './dto/render-video.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GeminiService } from '../ai/gemini.service';

@ApiTags('video-generator')
@Controller('video-generator')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VideoGeneratorController {
  constructor(
    private readonly videoGeneratorService: VideoGeneratorService,
    private readonly geminiService: GeminiService,
  ) {}

  @Post('render')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Dựng video TikTok 9:16 (1080x1920) kèm giọng đọc tiếng Việt bằng FFmpeg' })
  @ApiResponse({ status: 200, description: 'Video 9:16 được render thành công' })
  async renderTikTokVideo(@Body() dto: RenderTikTokVideoDto) {
    const result = await this.videoGeneratorService.renderTikTokVideo({
      title: dto.title,
      hook: dto.hook,
      scriptText: dto.scriptText,
      callToAction: dto.callToAction,
    });

    return {
      success: true,
      data: result,
    };
  }

  @Post('product-ad-script')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Tạo kịch bản video quảng cáo 15–20s chuẩn Google Flow / Gemini AI cho Shopee Affiliate' })
  async generateProductAdScript(
    @Body()
    dto: {
      productName: string;
      productImage?: string;
      price?: number;
      category?: string;
      description?: string;
    },
  ) {
    const result = await this.geminiService.generateProductAdVideoScript(dto);
    return {
      success: true,
      data: result,
    };
  }

  @Post('match-product')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Tìm sản phẩm Shopee tương tự từ video/nội dung cào được từ Fanpage hoặc TikTok lớn' })
  async matchProduct(
    @Body()
    dto: {
      title: string;
      content: string;
      existingCatalog?: Array<{ id: string; name: string; shopeeUrl: string; price: number }>;
    },
  ) {
    const result = await this.geminiService.matchSimilarShopeeProduct(dto);
    return {
      success: true,
      data: result,
    };
  }
}
