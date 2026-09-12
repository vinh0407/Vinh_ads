import * as crypto from 'crypto';

export class HashUtil {
  static sha256(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  static sha256Stream(stream: NodeJS.ReadableStream): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  static perceptualHash(buffer: Buffer): string {
    // Simple perceptual hash - in production use a proper library like sharp + p-hash
    // This is a placeholder implementation
    const hash = crypto.createHash('md5').update(buffer).digest('hex');
    return hash.substring(0, 16);
  }

  static generateVideoId(): string {
    return crypto.randomUUID();
  }
}