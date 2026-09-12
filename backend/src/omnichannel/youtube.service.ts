import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface YouTubeShortsPublishResult {
  platform: 'YOUTUBE';
  success: boolean;
  videoId?: string;
  videoUrl?: string;
  error?: string;
}

@Injectable()
export class YoutubeService {
  private readonly logger = new Logger(YoutubeService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Publishes video to YouTube Shorts using YouTube Data API v3.
   * Ensures #Shorts is appended to title/description for vertical 9:16 short-form discovery.
   */
  async publishShorts(payload: {
    accessToken?: string;
    videoUrl: string;
    title: string;
    description: string;
    tags?: string[];
    affiliateLink?: string;
  }): Promise<YouTubeShortsPublishResult> {
    const { videoUrl, title, description, tags, affiliateLink } = payload;
    const token = payload.accessToken || process.env.YOUTUBE_ACCESS_TOKEN;

    const formattedTitle = title.includes('#Shorts') ? title : `${title} #Shorts`;
    let fullDescription = `${description}\n\n#Shorts #Trending`;
    if (affiliateLink) {
      fullDescription += `\n\n👉 Mua sản phẩm chính hãng với giá ưu đãi tại: ${affiliateLink}`;
    }

    // Simulation / Dev mode check
    if (!token || token.startsWith('test_') || token.startsWith('mock_')) {
      const simulatedVideoId = `yt_shorts_${Date.now()}`;
      this.logger.log(
        `[SIMULATED YOUTUBE SHORTS PUBLISH] Video: ${videoUrl} | Title: "${formattedTitle}" -> VideoID: ${simulatedVideoId}`,
      );
      return {
        platform: 'YOUTUBE',
        success: true,
        videoId: simulatedVideoId,
        videoUrl: `https://youtube.com/shorts/${simulatedVideoId}`,
      };
    }

    try {
      this.logger.log(`Initiating YouTube Shorts upload for: "${formattedTitle}"`);
      // Step 1: Create resumable upload session on YouTube Data API v3
      const metadata = {
        snippet: {
          title: formattedTitle.slice(0, 100),
          description: fullDescription,
          tags: tags || ['shorts', 'trending', 'review', 'affiliate'],
          categoryId: '28', // Science & Technology / Howto & Style
        },
        status: {
          privacyStatus: 'public',
          selfDeclaredMadeForKids: false,
        },
      };

      const initResponse = await fetch(
        'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json; charset=UTF-8',
            'X-Upload-Content-Type': 'video/mp4',
          },
          body: JSON.stringify(metadata),
        },
      );

      if (!initResponse.ok) {
        throw new Error(`Failed to initialize YouTube resumable upload: HTTP ${initResponse.status}`);
      }

      const uploadUrl = initResponse.headers.get('location');
      if (!uploadUrl) {
        throw new Error('YouTube did not return a resumable upload location URL');
      }

      // Step 2: Stream video bytes to the resumable upload URL
      const videoFetch = await fetch(videoUrl);
      if (!videoFetch.ok) {
        throw new Error(`Could not fetch video file from ${videoUrl}`);
      }
      const videoBuffer = await videoFetch.arrayBuffer();

      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Length': videoBuffer.byteLength.toString(),
        },
        body: videoBuffer,
      });

      const uploadedData = (await uploadResponse.json()) as any;
      if (!uploadResponse.ok || !uploadedData?.id) {
        throw new Error(uploadedData?.error?.message || 'YouTube upload stream failed');
      }

      const videoId = uploadedData.id;
      return {
        platform: 'YOUTUBE',
        success: true,
        videoId,
        videoUrl: `https://youtube.com/shorts/${videoId}`,
      };
    } catch (error: any) {
      this.logger.error(`YouTube Shorts API publish failed: ${error.message}`);
      return {
        platform: 'YOUTUBE',
        success: false,
        error: error.message,
      };
    }
  }
}
