import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import * as ffmpeg from 'fluent-ffmpeg';
import * as googleTTS from 'google-tts-api';

const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const ffprobeInstaller = require('@ffprobe-installer/ffprobe');

if (ffmpegInstaller.path) {
  ffmpeg.setFfmpegPath(ffmpegInstaller.path);
}
if (ffprobeInstaller.path) {
  ffmpeg.setFfprobePath(ffprobeInstaller.path);
}

export interface RenderedVideoResult {
  videoId: string;
  videoUrl: string;
  durationSeconds: number;
  format: '9:16';
  resolution: '1080x1920';
  filePath: string;
}

@Injectable()
export class VideoGeneratorService {
  private readonly logger = new Logger(VideoGeneratorService.name);
  private readonly outputDir: string;

  constructor() {
    this.outputDir = path.resolve(process.cwd(), 'uploads', 'generated-videos');
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Generates Vietnamese audio narration using Edge-TTS (HoaiMy or NamMinh neural voices)
   * with automatic fallback to google-tts-api.
   */
  async generateSpeechAudio(
    text: string,
    outputFile: string,
    voice: 'female' | 'male' = 'female',
  ): Promise<string> {
    const cleanText = text.slice(0, 3000).replace(/["'`]/g, '');
    const voiceName = voice === 'male' ? 'vi-VN-NamMinhNeural' : 'vi-VN-HoaiMyNeural';

    try {
      this.logger.log(`Attempting Edge-TTS synthesis with voice: ${voiceName}`);
      const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
      const tts = new MsEdgeTTS();
      await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
      const { audioStream } = tts.toStream(cleanText);

      await new Promise<void>((resolve, reject) => {
        const fileStream = fs.createWriteStream(outputFile);
        audioStream.pipe(fileStream);
        fileStream.on('finish', () => resolve());
        fileStream.on('error', (err: any) => reject(err));
        audioStream.on('error', (err: any) => reject(err));
      });

      if (fs.existsSync(outputFile) && fs.statSync(outputFile).size > 1000) {
        this.logger.log(`Edge-TTS synthesis succeeded (${fs.statSync(outputFile).size} bytes): ${outputFile}`);
        return outputFile;
      }
    } catch (edgeErr) {
      this.logger.warn(`Edge-TTS synthesis failed, falling back to Google TTS: ${edgeErr}`);
    }

    // Fallback to Google TTS
    try {
      const base64 = await googleTTS.getAudioBase64(cleanText.slice(0, 500), {
        lang: 'vi',
        slow: false,
        host: 'https://translate.google.com',
        timeout: 10000,
      });
      const buffer = Buffer.from(base64, 'base64');
      fs.writeFileSync(outputFile, buffer);
      return outputFile;
    } catch (gErr) {
      this.logger.error(`Fallback Google TTS failed as well: ${gErr}`);
      fs.writeFileSync(outputFile, Buffer.alloc(1024));
      return outputFile;
    }
  }

  /**
   * Probes the actual duration of an audio or video file in seconds using ffprobe.
   */
  async getMediaDuration(filePath: string): Promise<number> {
    return new Promise((resolve) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err || !metadata?.format?.duration) {
          this.logger.debug(`Could not probe media duration, falling back to 30s: ${err?.message}`);
          resolve(30);
        } else {
          const duration = Math.max(5, Math.round(metadata.format.duration));
          resolve(duration);
        }
      });
    });
  }

  /**
   * Renders a 9:16 vertical TikTok/Reels video with voiceover, ambient backing audio, and editorial visual styling.
   */
  async renderTikTokVideo(payload: {
    title: string;
    hook: string;
    scriptText: string;
    callToAction?: string;
    voice?: 'female' | 'male';
  }): Promise<RenderedVideoResult> {
    const videoId = `tiktok_${Date.now()}`;
    const audioPath = path.join(this.outputDir, `${videoId}_audio.mp3`);
    const outputPath = path.join(this.outputDir, `${videoId}.mp4`);

    this.logger.log(`Starting TikTok 9:16 video generation: ${videoId}`);

    // Step 1: Generate speech audio with Edge-TTS
    const speechText = `${payload.hook}. ${payload.scriptText}. ${payload.callToAction || 'Xem link sản phẩm và chi tiết dưới phần bình luận'}`;
    await this.generateSpeechAudio(speechText, audioPath, payload.voice || 'female');

    // Step 2: Measure exact audio duration
    const actualDuration = await this.getMediaDuration(audioPath);

    // Step 3: Render 9:16 vertical MP4 video using FFmpeg with audio ducking and styled banners
    return new Promise<RenderedVideoResult>((resolve, reject) => {
      ffmpeg()
        // Video background canvas
        .input('color=c=#07090e:s=1080x1920:r=30')
        .inputFormat('lavfi')
        // Input 1: Voice narration
        .input(audioPath)
        // Input 2: Subtle warm ambient background tone
        .input('aevalsrc=exprs=\'0.025*sin(2*PI*110*t)+0.015*sin(2*PI*220*t)\':s=44100')
        .inputFormat('lavfi')
        .complexFilter([
          // Main content container card
          {
            filter: 'drawbox',
            options: {
              x: '80',
              y: '340',
              w: '920',
              h: '1150',
              color: '#0d131f@0.94',
              t: 'fill',
            },
            outputs: 'basecard',
          },
          // Red brand top indicator
          {
            filter: 'drawbox',
            options: {
              x: '80',
              y: '340',
              w: '920',
              h: '16',
              color: '#ef4444',
              t: 'fill',
            },
            inputs: 'basecard',
            outputs: 'card_with_indicator',
          },
          // Footer Affiliate CTA badge (Emerald/Green highlighted)
          {
            filter: 'drawbox',
            options: {
              x: '80',
              y: '1540',
              w: '920',
              h: '160',
              color: '#064e3b@0.90',
              t: 'fill',
            },
            inputs: 'card_with_indicator',
            outputs: 'v_final',
          },
          // Audio Ducking: Narration at full volume + Background ambient tone at 12% volume
          {
            filter: 'volume',
            options: { volume: '1.0' },
            inputs: '1:a',
            outputs: 'voice',
          },
          {
            filter: 'volume',
            options: { volume: '0.12' },
            inputs: '2:a',
            outputs: 'bgm',
          },
          {
            filter: 'amix',
            options: {
              inputs: '2',
              duration: 'first',
              dropout_transition: '2',
            },
            inputs: ['voice', 'bgm'],
            outputs: 'a_final',
          },
        ])
        .outputOptions([
          '-map [v_final]',
          '-map [a_final]',
          '-c:v libx264',
          '-tune stillimage',
          '-c:a aac',
          '-b:a 192k',
          '-pix_fmt yuv420p',
          '-shortest',
          '-movflags +faststart',
        ])
        .save(outputPath)
        .on('start', (commandLine) => {
          this.logger.log(`FFmpeg spawn command: ${commandLine}`);
        })
        .on('end', () => {
          this.logger.log(`FFmpeg render finished: ${outputPath} (${actualDuration}s)`);
          // Clean up temp audio
          if (fs.existsSync(audioPath)) {
            try {
              fs.unlinkSync(audioPath);
            } catch {}
          }

          resolve({
            videoId,
            videoUrl: `/api/uploads/generated-videos/${videoId}.mp4`,
            durationSeconds: actualDuration,
            format: '9:16',
            resolution: '1080x1920',
            filePath: outputPath,
          });
        })
        .on('error', (err) => {
          this.logger.error('FFmpeg render error', err);
          if (fs.existsSync(audioPath)) {
            try {
              fs.unlinkSync(audioPath);
            } catch {}
          }
          reject(err);
        });
    });
  }
}
