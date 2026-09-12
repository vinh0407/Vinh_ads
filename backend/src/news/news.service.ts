import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { BrowserService, ExtractedArticle, TrendingNewsItem } from '../browser/browser.service';
import { GeminiService, NewsSummaryResult, TikTokScriptResult } from '../ai/gemini.service';

export interface FullNewsAnalysisResult {
  article: ExtractedArticle;
  analysis: NewsSummaryResult;
  tiktokScript?: TikTokScriptResult;
  generatedAt: string;
}

@Injectable()
export class NewsService {
  private readonly logger = new Logger(NewsService.name);

  constructor(
    private readonly browserService: BrowserService,
    private readonly geminiService: GeminiService,
  ) {}

  async getTrendingNews(): Promise<TrendingNewsItem[]> {
    return this.browserService.getCuratedTrendingNews();
  }

  async analyzeNewsUrl(url: string, includeTikTokScript = true): Promise<FullNewsAnalysisResult> {
    this.logger.log(`Analyzing news URL: ${url}`);
    
    let article: ExtractedArticle;
    try {
      article = await this.browserService.extractArticle(url);
    } catch (error) {
      this.logger.error(`Failed to extract article from ${url}`, error);
      throw new BadRequestException(
        `Không thể cào nội dung từ URL này. Vui lòng kiểm tra lại đường dẫn: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    if (!article.content || article.content.trim().length < 50) {
      throw new BadRequestException('Nội dung bài viết quá ngắn hoặc trang yêu cầu đăng nhập.');
    }

    // Step 2: Run Gemini Summarization and Fact Extraction
    const analysis = await this.geminiService.summarizeNewsArticle({
      title: article.title,
      content: article.content,
      url: article.url,
    });

    // Step 3: Run TikTok Script Generator if requested
    let tiktokScript: TikTokScriptResult | undefined;
    if (includeTikTokScript) {
      tiktokScript = await this.geminiService.generateTikTokScript({
        title: analysis.title || article.title,
        summary: analysis.summary,
        whyItMatters: analysis.whyItMatters,
        keyFacts: analysis.keyFacts,
      });
    }

    return {
      article,
      analysis,
      tiktokScript,
      generatedAt: new Date().toISOString(),
    };
  }

  async generateCustomScript(title: string, summary: string, whyItMatters?: string): Promise<TikTokScriptResult> {
    return this.geminiService.generateTikTokScript({
      title,
      summary,
      whyItMatters,
    });
  }
}
