import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { ValidationPipe as CustomValidationPipe } from './common/pipes/validation.pipe';
import { EncryptionUtil } from './common/utils/encryption.util';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Initialize encryption
  EncryptionUtil.init(configService.get<string>('app.encryption.key'));

  // Security
  app.use(helmet());
  app.enableCors({
    origin: configService.get<string>('app.frontendUrl'),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // Global pipes
  app.useGlobalPipes(new CustomValidationPipe());

  // Global filters
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global interceptors
  app.useGlobalInterceptors(new ResponseInterceptor());

  const port = configService.get<number>('app.port');
  await app.listen(port);
  console.log(`🚀 Application running on port ${port}`);
}

bootstrap();