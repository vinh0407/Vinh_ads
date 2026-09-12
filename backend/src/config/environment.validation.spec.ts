import { validateEnvironment } from './environment.validation';

const validProduction = {
  NODE_ENV:'production', JWT_SECRET:'j'.repeat(32), JWT_REFRESH_SECRET:'r'.repeat(32), ENCRYPTION_KEY:'e'.repeat(32),
  DATABASE_URL:'postgresql://app:strong-password@db:5432/app', REDIS_HOST:'redis', REDIS_PORT:'6379', REDIS_PASSWORD:'redis-password',
  FACEBOOK_APP_ID:'123', FACEBOOK_APP_SECRET:'facebook-secret', FACEBOOK_CALLBACK_URL:'https://app.example/api/facebook/callback', FACEBOOK_API_VERSION:'v25.0',
  STORAGE_ENDPOINT:'https://account.r2.cloudflarestorage.com', STORAGE_BUCKET:'bucket', STORAGE_ACCESS_KEY:'access', STORAGE_SECRET_KEY:'storage-secret',
};

describe('environment validation',()=>{
  it.each(['JWT_SECRET','JWT_REFRESH_SECRET','ENCRYPTION_KEY','DATABASE_URL','REDIS_PASSWORD','FACEBOOK_APP_SECRET','STORAGE_SECRET_KEY'])('fails production startup when %s is missing',(name)=>{
    const env={...validProduction,[name]:''};
    expect(()=>validateEnvironment(env)).toThrow(name);
  });
  it('rejects placeholder secrets',()=>expect(()=>validateEnvironment({...validProduction,JWT_SECRET:'your-secret-change-in-production'})).toThrow('JWT_SECRET'));
  it('accepts explicit local development without optional integrations',()=>expect(validateEnvironment({NODE_ENV:'development',JWT_SECRET:'j'.repeat(32),JWT_REFRESH_SECRET:'r'.repeat(32),ENCRYPTION_KEY:'e'.repeat(32),DATABASE_URL:'postgresql://dev:dev@localhost:5432/app'}).NODE_ENV).toBe('development'));
  it('rejects partially configured optional credentials in development',()=>expect(()=>validateEnvironment({NODE_ENV:'development',JWT_SECRET:'j'.repeat(32),JWT_REFRESH_SECRET:'r'.repeat(32),ENCRYPTION_KEY:'e'.repeat(32),DATABASE_URL:'postgresql://dev:dev@localhost:5432/app',FACEBOOK_APP_ID:'123'})).toThrow('Facebook'));
});
