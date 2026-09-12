import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private client: S3Client | null = null;
  private bucket: string = '';
  private isLocal: boolean = false;
  private uploadsDir: string;

  constructor(private configService: ConfigService) {
    const region = configService.get<string>('app.storage.region') || 'auto';
    const endpoint = configService.get<string>('app.storage.endpoint') || '';
    const accessKey = configService.get<string>('app.storage.accessKey') || '';
    const secretKey = configService.get<string>('app.storage.secretKey') || '';
    const bucket = configService.get<string>('app.storage.bucket') || '';

    this.uploadsDir = path.join(process.cwd(), 'uploads');

    const isPlaceholder =
      !endpoint ||
      !accessKey ||
      !secretKey ||
      !bucket ||
      endpoint.includes('your-account-id') ||
      accessKey.includes('placeholder');

    if (isPlaceholder) {
      this.isLocal = true;
      this.logger.log(`Storage running in local filesystem fallback mode: ${this.uploadsDir}`);
      if (!fs.existsSync(this.uploadsDir)) {
        fs.mkdirSync(this.uploadsDir, { recursive: true });
      }
    } else {
      this.client = new S3Client({
        region,
        endpoint,
        credentials: {
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
        },
      });
      this.bucket = bucket;
    }
  }

  isLocalMode(): boolean {
    return this.isLocal;
  }

  async uploadBuffer(key: string, buffer: Buffer, contentType: string): Promise<string> {
    if (this.isLocal || !this.client) {
      const fullPath = path.join(this.uploadsDir, key);
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      await fs.promises.writeFile(fullPath, buffer);
      return `/api/uploads/${key.replace(/\\/g, '/')}`;
    }

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });
    await this.client.send(command);
    return this.getDownloadUrl(key);
  }

  async getUploadUrl(key: string, contentType: string, expiresIn = 3600): Promise<string> {
    if (this.isLocal || !this.client) {
      return `/api/uploads/${key.replace(/\\/g, '/')}`;
    }
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(this.client, command, { expiresIn });
  }

  async getDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    if (this.isLocal || !this.client) {
      return `/api/uploads/${key.replace(/\\/g, '/')}`;
    }
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return getSignedUrl(this.client, command, { expiresIn });
  }

  async deleteFile(key: string): Promise<void> {
    if (this.isLocal || !this.client) {
      const fullPath = path.join(this.uploadsDir, key);
      if (fs.existsSync(fullPath)) {
        try {
          await fs.promises.unlink(fullPath);
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          this.logger.warn(`Failed to delete local file ${fullPath}: ${message}`);
        }
      }
      return;
    }
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    await this.client.send(command);
  }

  generateVideoKey(userId: string, originalName: string): string {
    const rawExt = (originalName || '').split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp4';
    const allowedExts = new Set(['mp4', 'webm', 'mov', 'mkv', 'avi', 'mpeg']);
    const ext = allowedExts.has(rawExt) ? rawExt : 'mp4';
    const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '');
    return `originals/${safeUserId}/${uuidv4()}.${ext}`;
  }

  generateThumbnailKey(userId: string, videoId: string): string {
    return `thumbnails/${userId}/${videoId}.jpg`;
  }

  generateProcessedKey(userId: string, videoId: string, format: string): string {
    return `processed/${userId}/${videoId}.${format}`;
  }
}