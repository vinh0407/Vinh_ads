import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface TikTokPublishResult {
  platform: 'TIKTOK';
  success: boolean;
  publishId?: string;
  shareUrl?: string;
  error?: string;
}

@Injectable()
export class TiktokService {
  private readonly logger = new Logger(TiktokService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Publishes video to TikTok using TikTok Content Posting API v2.
   * Endpoint: https://open.tiktokapis.com/v2/post/publish/video/init/
   */
  async publishVideo(payload: {
    accessToken?: string;
    videoUrl: string;
    title: string;
    disableComment?: boolean;
    disableDuet?: boolean;
  }): Promise<TikTokPublishResult> {
    const { videoUrl, title, disableComment, disableDuet } = payload;
    const token = payload.accessToken || process.env.TIKTOK_ACCESS_TOKEN;

    // Simulation / Dev mode check
    if (!token || token.startsWith('test_') || token.startsWith('mock_')) {
      const simulatedId = `tiktok_pub_${Date.now()}`;
      this.logger.log(
        `[SIMULATED TIKTOK PUBLISH] Video: ${videoUrl} | Title: "${title}" -> PublishID: ${simulatedId}`,
      );
      return {
        platform: 'TIKTOK',
        success: true,
        publishId: simulatedId,
        shareUrl: `https://www.tiktok.com/@creator/video/${simulatedId}`,
      };
    }

    try {
      this.logger.log(`Initiating TikTok video publish for: "${title}"`);
      const response = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify({
          post_info: {
            title: title.slice(0, 150),
            privacy_level: 'PUBLIC_TO_EVERYONE',
            disable_duet: disableDuet ?? false,
            disable_stitch: false,
            disable_comment: disableComment ?? false,
            video_cover_timestamp_ms: 1000,
          },
          source_info: {
            source: 'PULL_FROM_URL',
            video_url: videoUrl,
          },
        }),
      });

      const data = (await response.json()) as any;
      if (!response.ok || data?.error?.code !== 'ok') {
        throw new Error(data?.error?.message || `HTTP Error ${response.status}`);
      }

      const publishId = data.data.publish_id;
      return {
        platform: 'TIKTOK',
        success: true,
        publishId,
        shareUrl: `https://www.tiktok.com/@creator/video/${publishId}`,
      };
    } catch (error: any) {
      this.logger.error(`TikTok Content Posting API failed: ${error.message}`);
      return {
        platform: 'TIKTOK',
        success: false,
        error: error.message,
      };
    }
  }
}
