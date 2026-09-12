import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GeminiService } from './gemini.service';

describe('GeminiService', () => {
  let service: GeminiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeminiService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'app.gemini.apiKey') return 'mock-key';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<GeminiService>(GeminiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should summarize news in fallback/mock mode without error', async () => {
    const res = await service.summarizeNewsArticle({
      title: 'Thử nghiệm AI tóm tắt tin tức',
      content: 'Nội dung bài viết mẫu về công nghệ trí tuệ nhân tạo và tự động hóa video.',
      url: 'https://example.com/ai-news',
    });

    expect(res).toBeDefined();
    expect(res.title).toContain('Thử nghiệm AI');
    expect(res.category).toBeDefined();
    expect(res.keyFacts.length).toBeGreaterThan(0);
  });

  it('should generate TikTok 9:16 script with hook and CTA', async () => {
    const script = await service.generateTikTokScript({
      title: 'Công nghệ AI mới làm chấn động giới sáng tạo',
      summary: 'Một mô hình AI mới vừa ra mắt có khả năng biến bài báo thành video trong 30 giây.',
      whyItMatters: 'Giúp tiết kiệm 90% thời gian sản xuất nội dung.',
    });

    expect(script).toBeDefined();
    expect(script.hook).toBeDefined();
    expect(script.callToAction).toBeDefined();
    expect(script.fullScriptText).toContain(script.hook);
    expect(script.hashtags.length).toBeGreaterThan(0);
  });

  it('should classify customer message and provide suggested reply', async () => {
    const reply = await service.classifyAndAnswerMessage({
      message: 'Shop ơi áo này còn size L không ạ?',
      channel: 'Zalo Web',
    });

    expect(reply).toBeDefined();
    expect(reply.intent).toBeDefined();
    expect(reply.suggestedReply).toBeDefined();
    expect(reply.requiresHumanReview).toBe(true);
  });

  it('should generate high engagement draft for Threads', async () => {
    const draft = await service.generateSocialDraft({
      topic: 'Gen Z chuộng phong cách brutalist fitness',
      platform: 'THREADS',
      affiliateProduct: {
        name: 'Bình nước thể thao giữ nhiệt',
        url: 'https://shopee.vn/product/123',
      },
    });

    expect(draft).toBeDefined();
    expect(draft.headline).toBeDefined();
    expect(draft.body).toBeDefined();
    expect(draft.trendScore).toBeGreaterThan(0);
  });
});
