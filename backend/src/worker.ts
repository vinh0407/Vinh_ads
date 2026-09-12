import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module';
import { ConfigService } from '@nestjs/config';
import { EncryptionUtil } from './common/utils/encryption.util';

async function bootstrap() {
  const app = await NestFactory.create(WorkerModule);
  app.enableShutdownHooks();
  EncryptionUtil.init(app.get(ConfigService).getOrThrow<string>('app.encryption.key'));
  console.log('🔄 Worker started');
}

bootstrap();
