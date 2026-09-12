import { Controller, Post, Get, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { NewsService } from './news.service';
import { AnalyzeNewsUrlDto, GenerateCustomScriptDto } from './dto/analyze-news.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('news')
@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get('trending')
  @ApiOperation({ summary: 'Lấy danh sách tin tức công nghệ & xu hướng nóng hôm nay' })
  @ApiResponse({ status: 200, description: 'Danh sách tin tức thị trường & công nghệ mới nhất' })
  async getTrendingNews() {
    const items = await this.newsService.getTrendingNews();
    return {
      success: true,
      data: items,
    };
  }

  @Post('analyze')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'AI đọc bài báo từ URL, tóm tắt thông tin và tạo kịch bản video TikTok 9:16' })
  @ApiResponse({ status: 200, description: 'Phân tích tin tức và kịch bản video thành công' })
  async analyzeNewsUrl(@Body() dto: AnalyzeNewsUrlDto) {
    const result = await this.newsService.analyzeNewsUrl(dto.url, dto.includeTikTokScript !== false);
    return {
      success: true,
      data: result,
    };
  }

  @Post('script')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Tạo kịch bản TikTok 9:16 tùy chỉnh từ tóm tắt người dùng nhập' })
  @ApiResponse({ status: 200, description: 'Kịch bản TikTok 9:16 được tạo thành công' })
  async generateCustomScript(@Body() dto: GenerateCustomScriptDto) {
    const result = await this.newsService.generateCustomScript(dto.title, dto.summary, dto.whyItMatters);
    return {
      success: true,
      data: result,
    };
  }
}
