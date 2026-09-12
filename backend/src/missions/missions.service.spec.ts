import { Test, TestingModule } from '@nestjs/testing';
import { MissionsService } from './missions.service';
import { GeminiService } from '../ai/gemini.service';
import { NewsService } from '../news/news.service';
import { VideoGeneratorService } from '../video-generator/video-generator.service';

describe('MissionsService', () => {
  let service: MissionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MissionsService,
        {
          provide: GeminiService,
          useValue: {
            summarizeNewsArticle: jest.fn().mockResolvedValue({
              title: 'AI Story',
              summary: 'Summary text',
              category: 'AI_TECH',
              whyItMatters: 'Very important',
              impactAnalysis: 'Big impact',
              sentiment: 'POSITIVE',
              keyFacts: ['Fact 1'],
            }),
            generateTikTokScript: jest.fn().mockResolvedValue({
              hook: 'Viral Hook',
              newsContext: 'News content',
              analysis: 'Deep analysis',
              opinion: 'Strong opinion',
              callToAction: 'Follow now',
              fullScriptText: 'Viral Hook\nNews content',
              estimatedSeconds: 45,
              hashtags: ['#ai'],
              suggestedVisuals: ['Visual 1'],
            }),
            generateSocialDraft: jest.fn().mockResolvedValue({
              headline: 'Headline',
              body: 'Threads body draft',
              hashtags: ['#threads'],
              callToAction: 'Comment now',
              trendScore: 88,
            }),
          },
        },
        {
          provide: NewsService,
          useValue: {
            getTrendingNews: jest.fn().mockResolvedValue([
              {
                id: '1',
                title: 'AI Breakthrough',
                url: 'https://example.com/ai',
                summary: 'AI breakthrough summary',
                category: 'AI_TECH',
                source: 'TechSource',
                publishedAt: new Date().toISOString(),
              },
            ]),
          },
        },
        {
          provide: VideoGeneratorService,
          useValue: {
            renderTikTokVideo: jest.fn().mockResolvedValue({
              videoId: 'v123',
              videoUrl: '/api/uploads/sample.mp4',
              durationSeconds: 45,
            }),
          },
        },
      ],
    }).compile();

    service = module.get<MissionsService>(MissionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(service.isHalted()).toBe(false);
  });

  it('should trigger emergency stop and halt missions', () => {
    const res = service.stopAllAgents();
    expect(res.success).toBe(true);
    expect(service.isHalted()).toBe(true);

    const resumeRes = service.resumeAllAgents();
    expect(resumeRes.success).toBe(true);
    expect(service.isHalted()).toBe(false);
  });

  it('should create a multi-agent mission and generate DAG steps', async () => {
    const mission = await service.createAndExecuteMission(
      'Tìm tin AI nóng hôm nay, phân tích và chuẩn bị video TikTok cùng bài đăng Threads',
    );

    expect(mission).toBeDefined();
    expect(mission.id).toBeDefined();
    expect(mission.steps.length).toBe(5);
    expect(mission.steps[0].agent).toBe('RESEARCH_AGENT');
    expect(mission.steps[4].requiresApproval).toBe(true);
  });
});
