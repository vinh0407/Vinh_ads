const PLACEHOLDER = /(change-in-production|your[-_]|example|changeme)/i;

export function validateEnvironment(input: Record<string, unknown>) {
  const env: Record<string, string | undefined> = {};
  for (const [name, value] of Object.entries(input)) {
    if (typeof value === 'string') env[name] = value;
  }
  const mode = env.NODE_ENV || 'development';
  if (!['development', 'test', 'production'].includes(mode))
    throw new Error('NODE_ENV must be development, test, or production');
  const production = mode === 'production';
  const requireValue = (name: string, minLength = 1) => {
    const value = env[name]?.trim();
    if (!value || value.length < minLength || PLACEHOLDER.test(value))
      throw new Error(`${name} is required and must not be a placeholder`);
    return value;
  };
  const validateUrl = (name: string, protocols: string[]) => {
    const value = requireValue(name);
    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      throw new Error(`${name} must be a valid URL`);
    }
    if (!protocols.includes(parsed.protocol))
      throw new Error(`${name} uses an unsupported protocol`);
    return parsed;
  };
  const validateGroup = (label: string, names: string[]) => {
    const present = names.filter((name) => Boolean(env[name]?.trim()));
    if (present.length && present.length !== names.length)
      throw new Error(
        `${label} configuration must provide: ${names.join(', ')}`,
      );
  };

  const jwt = requireValue('JWT_SECRET', 32);
  const refresh = requireValue('JWT_REFRESH_SECRET', 32);
  requireValue('ENCRYPTION_KEY', 32);
  if (jwt === refresh)
    throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be different');
  const database = validateUrl('DATABASE_URL', ['postgresql:', 'postgres:']);
  if (production && (!database.username || !database.password))
    throw new Error(
      'DATABASE_URL must include database credentials in production',
    );

  const facebook = [
    'FACEBOOK_APP_ID',
    'FACEBOOK_APP_SECRET',
    'FACEBOOK_CALLBACK_URL',
    'FACEBOOK_API_VERSION',
  ];
  const storage = [
    'STORAGE_ENDPOINT',
    'STORAGE_BUCKET',
    'STORAGE_ACCESS_KEY',
    'STORAGE_SECRET_KEY',
  ];
  validateGroup('Facebook', facebook);
  validateGroup('S3/R2', storage);
  if (production) {
    requireValue('REDIS_HOST');
    requireValue('REDIS_PASSWORD');
    facebook.forEach((name) => requireValue(name));
    storage.forEach((name) => requireValue(name));
    validateUrl('FACEBOOK_CALLBACK_URL', ['https:']);
    validateUrl('STORAGE_ENDPOINT', ['https:']);
  }
  if (env.FACEBOOK_API_VERSION && !/^v\d+\.\d+$/.test(env.FACEBOOK_API_VERSION))
    throw new Error('FACEBOOK_API_VERSION must use the form vN.N');
  if (
    env.REDIS_PORT &&
    (!Number.isInteger(Number(env.REDIS_PORT)) ||
      Number(env.REDIS_PORT) < 1 ||
      Number(env.REDIS_PORT) > 65535)
  )
    throw new Error('REDIS_PORT must be a valid port');
  return input;
}
