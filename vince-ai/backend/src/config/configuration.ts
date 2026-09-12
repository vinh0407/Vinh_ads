import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  env: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001',
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-change-in-production',
    accessTokenExpiry: '15m',
    refreshTokenExpiry: '7d',
  },
  encryption: {
    key: process.env.ENCRYPTION_KEY || '32-char-encryption-key-for-tokens!!',
  },
  facebook: {
    appId: process.env.FACEBOOK_APP_ID,
    appSecret: process.env.FACEBOOK_APP_SECRET,
    callbackUrl: process.env.FACEBOOK_CALLBACK_URL || 'http://localhost:3000/api/facebook/callback',
  },
  storage: {
    endpoint: process.env.STORAGE_ENDPOINT,
    bucket: process.env.STORAGE_BUCKET,
    accessKey: process.env.STORAGE_ACCESS_KEY,
    secretKey: process.env.STORAGE_SECRET_KEY,
    region: process.env.STORAGE_REGION || 'auto',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  rateLimit: {
    login: { max: 5, windowMs: 60000 },
    api: { max: 100, windowMs: 60000 },
    upload: { max: 10, windowMs: 60000 },
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
  },
  nemotron: {
    apiKey: process.env.NEMOTRON_API_KEY,
  },
  opencode: {
    apiKey: process.env.OPENCODE_API_KEY,
  },
})