import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as express from 'express';
import * as path from 'path';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { ValidationPipe as CustomValidationPipe } from './common/pipes/validation.pipe';
import { EncryptionUtil } from './common/utils/encryption.util';

declare global {
  interface BigInt {
    toJSON(): number;
  }
}

// Enable JSON serialization for BigInt values (e.g. Prisma fileSize, analytics metrics)
BigInt.prototype.toJSON = function (this: bigint): number {
  return Number(this);
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  const configService = app.get(ConfigService);

  // Initialize encryption
  const encryptionKey = configService.get<string>('app.encryption.key');
  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY must be set and at least 32 characters long');
  }
  EncryptionUtil.init(encryptionKey);

  // Security
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  const isProduction = configService.get<string>('app.env') === 'production';
  const configuredFrontend = configService.get<string>('app.frontendUrl');
  const allowedOrigins = isProduction
    ? ([configuredFrontend].filter(Boolean) as string[])
    : Array.from(
        new Set(
          [
            configuredFrontend,
            'http://localhost:3001',
            'http://localhost:3000',
            'http://127.0.0.1:3001',
            'http://127.0.0.1:3000',
          ].filter(Boolean) as string[],
        ),
      );

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Serve local uploaded files statically with security headers
  const uploadsPath = path.join(process.cwd(), 'uploads');
  app.use(
    '/api/uploads',
    express.static(uploadsPath, {
      setHeaders: (res) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Security-Policy', "default-src 'none'");
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      },
    }),
  );

  // Global prefix
  app.setGlobalPrefix('api');

  // Global pipes
  app.useGlobalPipes(new CustomValidationPipe());

  // Global filters
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global interceptors
  app.useGlobalInterceptors(new ResponseInterceptor());

  const port = configService.get<number>('app.port') || 3000;
  await app.listen(port);
  console.log(`🚀 Application running on port ${port}`);
}

bootstrap();
