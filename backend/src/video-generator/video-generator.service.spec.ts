import { Test, TestingModule } from '@nestjs/testing';
import { VideoGeneratorService } from './video-generator.service';

describe('VideoGeneratorService', () => {
  let service: VideoGeneratorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VideoGeneratorService],
    }).compile();

    service = module.get<VideoGeneratorService>(VideoGeneratorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
