import { BadRequestException, NotFoundException } from '@nestjs/common';
import { VideosService } from './videos.service';

describe('VideosService', () => {
  let prisma: any;
  let storageService: any;
  let service: VideosService;

  beforeEach(() => {
    prisma = {
      video: {
        findFirst: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
    };
    storageService = {
      generateVideoKey: jest.fn().mockReturnValue('originals/user-1/uuid.mp4'),
      uploadBuffer: jest.fn().mockResolvedValue('/api/uploads/originals/user-1/uuid.mp4'),
      deleteFile: jest.fn().mockResolvedValue(undefined),
    };
    service = new VideosService(prisma, storageService);
  });

  it('returns not found when the video is absent or belongs to another user', async () => {
    prisma.video.findFirst.mockResolvedValue(null);

    await expect(service.findOne('user-1', 'video-2')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws BadRequestException when no file is provided to upload', async () => {
    await expect(
      service.upload('user-1', null as any, 'Test Title'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('successfully uploads video buffer and creates record', async () => {
    const mockFile: any = {
      originalname: 'demo.mp4',
      mimetype: 'video/mp4',
      size: 10240,
      buffer: Buffer.from('fake-video-content'),
    };

    const mockCreatedVideo = {
      id: 'video-123',
      userId: 'user-1',
      title: 'My Video',
      description: 'Test description',
      storageKey: 'originals/user-1/uuid.mp4',
      fileSize: BigInt(10240),
      status: 'READY',
    };

    prisma.video.create.mockResolvedValue(mockCreatedVideo);

    const result = await service.upload('user-1', mockFile, 'My Video', 'Test description');

    expect(storageService.generateVideoKey).toHaveBeenCalledWith('user-1', 'demo.mp4');
    expect(storageService.uploadBuffer).toHaveBeenCalledWith(
      'originals/user-1/uuid.mp4',
      mockFile.buffer,
      'video/mp4',
    );
    expect(prisma.video.create).toHaveBeenCalled();
    expect(result.id).toBe('video-123');
    expect(result.url).toBe('/api/uploads/originals/user-1/uuid.mp4');
  });

  it('throws BadRequestException when non-video MIME type is uploaded', async () => {
    const maliciousFile: any = {
      originalname: 'exploit.html',
      mimetype: 'text/html',
      size: 1024,
      buffer: Buffer.from('<script>alert("xss")</script>'),
    };

    await expect(
      service.upload('user-1', maliciousFile, 'Malicious File'),
    ).rejects.toThrow(BadRequestException);
    expect(storageService.uploadBuffer).not.toHaveBeenCalled();
    expect(prisma.video.create).not.toHaveBeenCalled();
  });
});
