import { Test, TestingModule } from '@nestjs/testing';
import { NewsService } from './news.service';
import { BrowserService } from '../browser/browser.service';
import { GeminiService } from '../ai/gemini.service';

describe('NewsService', () => {
  let service: NewsService;
  let browserService: BrowserService;
  let geminiService: GeminiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NewsService,
        {
          provide: BrowserService,
          useValue: {
            getCuratedTrendingNews: jest.fn().mockResolvedValue([
              {
                id: 'news-1',
                title: 'AI News Test',
                url: 'https://example.com/test',
                summary: 'Summary test',
                category: 'AI_TECH',
                source: 'TechSource',
                publishedAt: new Date().toISOString(),
              },
            ]),
            extractArticle: jest.fn().mockResolvedValue({
              url: 'https://example.com/article',
              title: 'Bài báo mẫu về trí tuệ nhân tạo',
              description: 'Mô tả bài báo',
              content: 'Đây là nội dung bài báo chi tiết có độ dài lớn hơn 50 ký tự để vượt qua validation.',
              sourceDomain: 'example.com',
            }),
          },
        },
        {
          provide: GeminiService,
          useValue: {
            summarizeNewsArticle: jest.fn().mockResolvedValue({
              title: 'Tóm tắt bài báo AI',
              summary: 'Bài viết nói về sự phát triển của công nghệ.',
              category: 'AI_TECH',
              whyItMatters: 'Quan trọng cho tương lai công nghệ.',
              impactAnalysis: 'Tác động lớn tới ngành sáng tạo.',
              sentiment: 'POSITIVE',
              keyFacts: ['Sự thật 1', 'Sự thật 2'],
            }),
            generateTikTokScript: jest.fn().mockResolvedValue({
              hook: 'Hook giật gân',
              newsContext: 'Ngữ cảnh tin',
              analysis: 'Phân tích tin',
              opinion: 'Ý kiến cá nhân',
              callToAction: 'Follow ngay!',
              estimatedSeconds: 45,
              hashtags: ['#ai', '#news'],
              suggestedVisuals: ['Visual 1'],
              fullScriptText: 'Hook giật gân\n\nNgữ cảnh tin',
            }),
          },
        },
      ],
    }).compile();

    service = module.get<NewsService>(NewsService);
    browserService = module.get<BrowserService>(BrowserService);
    geminiService = module.get<GeminiService>(GeminiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should get trending news items', async () => {
    const news = await service.getTrendingNews();
    expect(news).toHaveLength(1);
    expect(news[0].title).toBe('AI News Test');
  });

  it('should analyze news URL and return structured analysis with TikTok script', async () => {
    const result = await service.analyzeNewsUrl('https://example.com/article', true);
    expect(result).toBeDefined();
    expect(result.article.title).toBe('Bài báo mẫu về trí tuệ nhân tạo');
    expect(result.analysis.category).toBe('AI_TECH');
    expect(result.tiktokScript).toBeDefined();
    expect(result.tiktokScript?.hook).toBe('Hook giật gân');
  });
});
