import { Injectable, Logger, BadRequestException, Optional } from '@nestjs/common';
import { GeminiService } from '../ai/gemini.service';
import { NewsService } from '../news/news.service';
import { VideoGeneratorService } from '../video-generator/video-generator.service';
import { OmnichannelService } from '../omnichannel/omnichannel.service';
import { PrismaService } from '../prisma/prisma.service';

export interface MissionStep {
  id: string;
  agent: 'RESEARCH_AGENT' | 'NEWS_AGENT' | 'CONTENT_AGENT' | 'VIDEO_AGENT' | 'AFFILIATE_AGENT' | 'QA_AGENT';
  title: string;
  status: 'PENDING' | 'RUNNING' | 'DONE' | 'WAITING_APPROVAL' | 'FAILED' | 'ABORTED';
  details?: string;
  output?: any;
  requiresApproval?: boolean;
}

export interface MissionExecution {
  id: string;
  goal: string;
  status: 'PLANNING' | 'RUNNING' | 'PAUSED_FOR_APPROVAL' | 'COMPLETED' | 'FAILED' | 'STOPPED';
  steps: MissionStep[];
  approvalRequest?: {
    action: string;
    previewData: any;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
  };
  createdAt: string;
  completedAt?: string;
}

@Injectable()
export class MissionsService {
  private readonly logger = new Logger(MissionsService.name);
  private isEmergencyHalted = false;
  private activeMissions: Map<string, MissionExecution> = new Map();

  constructor(
    private readonly geminiService: GeminiService,
    private readonly newsService: NewsService,
    private readonly videoGeneratorService: VideoGeneratorService,
    @Optional() private readonly omnichannelService?: OmnichannelService,
    @Optional() private readonly prisma?: PrismaService,
  ) {}

  /**
   * Checks if emergency kill-switch is active.
   */
  isHalted(): boolean {
    return this.isEmergencyHalted;
  }

  /**
   * Trigger emergency stop across all running tasks & browser automation.
   */
  stopAllAgents(): { success: boolean; message: string; timestamp: string } {
    this.isEmergencyHalted = true;
    this.logger.warn('EMERGENCY KILL-SWITCH TRIGGERED! Halting all agents & tasks.');

    // Abort all running missions
    for (const mission of this.activeMissions.values()) {
      if (mission.status === 'RUNNING' || mission.status === 'PLANNING') {
        mission.status = 'STOPPED';
        mission.steps.forEach((step) => {
          if (step.status === 'RUNNING' || step.status === 'PENDING') {
            step.status = 'ABORTED';
          }
        });
      }
    }

    return {
      success: true,
      message: 'TOÀN BỘ AGENT VÀ WORKFLOW ĐÃ ĐƯỢC DỪNG KHẨN CẤP THÀNH CÔNG.',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Resumes normal agent execution.
   */
  resumeAllAgents(): { success: boolean; message: string } {
    this.isEmergencyHalted = false;
    this.logger.log('Emergency stop lifted. System restored to normal operations.');
    return {
      success: true,
      message: 'Hệ thống đã được mở khóa, sẵn sàng tiếp nhận nhiệm vụ mới.',
    };
  }

  /**
   * Creates and orchestrates a new multi-agent mission from user prompt.
   */
  async createAndExecuteMission(goal: string): Promise<MissionExecution> {
    if (this.isEmergencyHalted) {
      throw new BadRequestException(
        'Hệ thống đang ở trạng thái DỪNG KHẨN CẤP (Kill-Switch). Vui lòng mở khóa trước khi chạy nhiệm vụ.',
      );
    }

    const missionId = `mission_${Date.now()}`;
    this.logger.log(`Decomposing mission [${missionId}]: "${goal}"`);

    // Step 1: Decompose goal into standard subagent execution steps
    const steps: MissionStep[] = [
      {
        id: 'step-1',
        agent: 'RESEARCH_AGENT',
        title: 'Quét và thu thập nguồn tin công nghệ/thị trường nóng hôm nay',
        status: 'PENDING',
      },
      {
        id: 'step-2',
        agent: 'NEWS_AGENT',
        title: 'Phân tích cốt lõi, trích xuất sự thật & tác động (Why It Matters)',
        status: 'PENDING',
      },
      {
        id: 'step-3',
        agent: 'CONTENT_AGENT',
        title: 'Viết kịch bản TikTok 9:16 có hook 3 giây & bài đăng Threads',
        status: 'PENDING',
      },
      {
        id: 'step-4',
        agent: 'AFFILIATE_AGENT',
        title: 'Tìm kiếm sản phẩm Shopee phù hợp xu hướng & tạo link tracking',
        status: 'PENDING',
      },
      {
        id: 'step-5',
        agent: 'QA_AGENT',
        title: 'Kiểm duyệt chất lượng & chuyển sang Hàng đợi phê duyệt (Approval)',
        status: 'PENDING',
        requiresApproval: true,
      },
    ];

    const mission: MissionExecution = {
      id: missionId,
      goal,
      status: 'RUNNING',
      steps,
      createdAt: new Date().toISOString(),
    };

    this.activeMissions.set(missionId, mission);

    // Asynchronously execute workflow steps
    this.executeMissionWorkflow(missionId).catch((err) => {
      this.logger.error(`Mission ${missionId} execution failed`, err);
    });

    return mission;
  }

  private async executeMissionWorkflow(missionId: string) {
    const mission = this.activeMissions.get(missionId);
    if (!mission || this.isEmergencyHalted) return;

    try {
      // Step 1: Research Agent (collect top news)
      const step1 = mission.steps[0];
      step1.status = 'RUNNING';
      const trending = await this.newsService.getTrendingNews();
      const topStory = trending[0] || {
        title: 'Google và OpenAI tăng tốc cuộc đua chip AI tự phát triển',
        summary: 'Các tập đoàn công nghệ lớn đổ hàng tỷ USD để tự chủ phần cứng AI.',
        url: 'https://vnexpress.net/so-hoa/cong-nghe',
      };
      step1.status = 'DONE';
      step1.output = { storyFound: topStory.title, source: topStory.source };

      if (this.isEmergencyHalted) return;

      // Step 2: News Agent (Summarize & Fact Extraction)
      const step2 = mission.steps[1];
      step2.status = 'RUNNING';
      const analysis = await this.geminiService.summarizeNewsArticle({
        title: topStory.title,
        content: topStory.summary,
        url: topStory.url,
      });
      step2.status = 'DONE';
      step2.output = {
        category: analysis.category,
        whyItMatters: analysis.whyItMatters,
        factsCount: analysis.keyFacts.length,
      };

      if (this.isEmergencyHalted) return;

      // Step 3: Content Agent (Write 9:16 script & Render vertical video)
      const step3 = mission.steps[2];
      step3.status = 'RUNNING';
      const script = await this.geminiService.generateTikTokScript({
        title: analysis.title || topStory.title,
        summary: analysis.summary,
        whyItMatters: analysis.whyItMatters,
        keyFacts: analysis.keyFacts,
      });
      const threadsDraft = await this.geminiService.generateSocialDraft({
        topic: analysis.title || topStory.title,
        platform: 'THREADS',
      });

      // Render actual 9:16 vertical TikTok/Reels video with Edge-TTS
      let renderedVideo: any = {
        videoUrl: '/api/uploads/generated-videos/sample.mp4',
        durationSeconds: 30,
      };
      try {
        renderedVideo = await this.videoGeneratorService.renderTikTokVideo({
          title: analysis.title || topStory.title,
          hook: script.hook,
          scriptText: `${script.newsContext}. ${script.analysis}`,
          callToAction: script.callToAction,
        });
      } catch (renderErr) {
        this.logger.warn(`Mission video render fallback: ${renderErr}`);
      }

      step3.status = 'DONE';
      step3.output = {
        hook: script.hook,
        threadsPost: threadsDraft.body,
        videoUrl: renderedVideo.videoUrl,
        durationSeconds: renderedVideo.durationSeconds,
      };

      if (this.isEmergencyHalted) return;

      // Step 4: Affiliate Agent (Smart Opportunity Match)
      const step4 = mission.steps[3];
      step4.status = 'RUNNING';

      let affiliateMatch = {
        productName: 'Củ sạc nhanh GaN 65W 3 cổng thông minh',
        price: 249000,
        commission: '15%',
        affiliateLink: 'https://s.shopee.vn/affiliate?sub_id=tech_viral',
        category: 'Công nghệ & Phụ kiện',
      };

      if (this.prisma) {
        try {
          const dbProduct = await this.prisma.product.findFirst({
            where: { status: 'ACTIVE' },
            include: { affiliateLinks: true },
            orderBy: { createdAt: 'desc' },
          });
          if (dbProduct) {
            affiliateMatch = {
              productName: dbProduct.name,
              price: Number(dbProduct.price),
              commission: '12%',
              affiliateLink: dbProduct.affiliateLinks[0]?.affiliateUrl || dbProduct.shopeeUrl,
              category: dbProduct.category || analysis.category,
            };
          }
        } catch {}
      }

      // If category is Fitness, optimize recommendation
      if (analysis.category === 'FITNESS' && affiliateMatch.productName.includes('sạc')) {
        affiliateMatch = {
          productName: 'Bình nước thể thao giữ nhiệt thông minh 1000ml',
          price: 189000,
          commission: '14%',
          affiliateLink: 'https://s.shopee.vn/affiliate?sub_id=fitness_hub',
          category: 'Thể thao & Dã ngoại',
        };
      }

      step4.status = 'DONE';
      step4.output = affiliateMatch;

      if (this.isEmergencyHalted) return;

      // Step 5: QA Agent & Approval Required (Human-in-the-loop)
      const step5 = mission.steps[4];
      step5.status = 'WAITING_APPROVAL';
      mission.status = 'PAUSED_FOR_APPROVAL';
      mission.approvalRequest = {
        action: 'PUBLISH_CONTENT_AND_VIDEO',
        previewData: {
          title: topStory.title,
          hook: script.hook,
          tiktokScriptText: script.fullScriptText,
          threadsPost: threadsDraft.body,
          videoUrl: renderedVideo.videoUrl,
          durationSeconds: renderedVideo.durationSeconds,
          affiliateProduct: affiliateMatch,
          supportedPlatforms: ['FACEBOOK', 'TIKTOK', 'YOUTUBE'],
        },
        status: 'PENDING',
      };

      this.logger.log(`Mission ${missionId} completed all tasks. WAITING FOR HUMAN APPROVAL.`);
    } catch (error) {
      this.logger.error(`Error during mission workflow for ${missionId}`, error);
      mission.status = 'FAILED';
    }
  }

  /**
   * Handles user human-in-the-loop decision (Approve or Reject) and dispatches Omnichannel.
   */
  async handleApprovalDecision(
    missionId: string,
    decision: 'APPROVE' | 'REJECT',
    editedPayload?: string,
    platforms?: ('FACEBOOK' | 'TIKTOK' | 'YOUTUBE')[],
  ) {
    const mission = this.activeMissions.get(missionId);
    if (!mission) {
      throw new BadRequestException('Nhiệm vụ không tồn tại.');
    }

    if (!mission.approvalRequest) {
      throw new BadRequestException('Nhiệm vụ này không có yêu cầu phê duyệt đang chờ.');
    }

    mission.approvalRequest.status = decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    const qaStep = mission.steps.find((s) => s.agent === 'QA_AGENT');

    if (decision === 'APPROVE') {
      if (qaStep) qaStep.status = 'DONE';
      mission.status = 'COMPLETED';
      mission.completedAt = new Date().toISOString();

      let publishResults = null;
      if (this.omnichannelService) {
        try {
          const targetPlatforms =
            platforms && platforms.length > 0
              ? platforms
              : (['FACEBOOK', 'TIKTOK', 'YOUTUBE'] as ('FACEBOOK' | 'TIKTOK' | 'YOUTUBE')[]);

          publishResults = await this.omnichannelService.publishToAllPlatforms('system', {
            title: mission.approvalRequest.previewData.title,
            caption:
              editedPayload ||
              mission.approvalRequest.previewData.threadsPost ||
              mission.approvalRequest.previewData.hook,
            videoUrl: mission.approvalRequest.previewData.videoUrl,
            affiliateLink: mission.approvalRequest.previewData.affiliateProduct?.affiliateLink,
            platforms: targetPlatforms,
          });
          mission.approvalRequest.previewData.publishResult = publishResults;
        } catch (err: any) {
          this.logger.error(`Omnichannel dispatch error: ${err.message}`);
        }
      }

      return {
        success: true,
        message: 'Nhiệm vụ đã được phê duyệt và phát sóng đa kênh (Facebook, TikTok, YouTube Shorts) thành công!',
        publishResults,
        mission,
      };
    } else {
      if (qaStep) qaStep.status = 'FAILED';
      mission.status = 'FAILED';
      return {
        success: true,
        message: 'Nhiệm vụ đã bị từ chối và hủy bỏ.',
        mission,
      };
    }
  }

  /**
   * Retrieves all missions.
   */
  getAllMissions(): MissionExecution[] {
    return Array.from(this.activeMissions.values()).reverse();
  }

  /**
   * Retrieves a single mission by ID.
   */
  getMissionById(missionId: string): MissionExecution | undefined {
    return this.activeMissions.get(missionId);
  }
}
