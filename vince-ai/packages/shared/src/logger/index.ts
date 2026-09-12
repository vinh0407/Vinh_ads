import pino from 'pino';
import pinoPretty from 'pino-pretty';

/**
 * Logger utility for Vince AI
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const logLevel = process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info');

const prettyStream = isDevelopment
  ? pinoPretty({
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname',
    })
  : undefined;

export const logger = pino({
  level: logLevel,
  transport: prettyStream
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    service: 'vince-ai',
    environment: process.env.NODE_ENV || 'development',
  },
});

export function createLogger(context: Record<string, unknown>) {
  return logger.child(context);
}

export const loggers = {
  auth: logger.child({ module: 'auth' }),
  ai: logger.child({ module: 'ai' }),
  video: logger.child({ module: 'video' },
  browser: logger.child({ module: 'browser' }),
  research: logger.child({ module: 'research' },
  content: logger.child({ module: 'content' }),
  social: logger.child({ module: 'social' }),
  affiliate: logger.child({ module: 'affiliate' },
  database: logger.child({ module: 'database' }),
  queue: logger.child({ module: 'queue' }),
  security: logger.child({ module: 'security' }),
  performance: logger.child({ module: 'performance' }),
  qa: logger.child({ module: 'qa' }),
  api: logger.child({ module: 'api' }),
  websocket: logger.child({ module: 'websocket' }),
  worker: logger.child({ module: 'worker' }),
  scheduler: logger.child({ module: 'scheduler' }),
  ffmpeg: logger.child({ module: 'ffmpeg' }),
  storage: logger.child({ module: 'storage' }),
};

export function logError(logger: pino.Logger, error: Error, context?: Record<string, unknown>) {
  logger.error({
    err: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    ...context,
  }, error.message);
}

export function logPerformance(label: string, duration: number, metadata?: Record<string, unknown>) {
  logger.info({ duration, ...metadata }, `${label} took ${duration}ms`);
}

export function logAudit(action: string, context: Record<string, unknown>) {
  logger.info({ audit: true, action, ...context }, `AUDIT: ${action}`);
}

export function logSecurity(event: string, context: Record<string, unknown>) {
  logger.warn({ security: true, event, ...context }, `SECURITY: ${event}`);
}

export function logMetric(name: string, value: number, tags?: Record<string, string>) {
  logger.info({ metric: true, name, value, tags }, `METRIC: ${name}=${value}`);
}

export function createChildLogger(parent: pino.Logger, context: Record<string, unknown>) {
  return parent.child(context);
}

export default logger;