import { z } from 'zod';
import { ValidationError } from '../errors';

/**
 * Validation utilities using Zod
 */

export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
    throw new ValidationError(`Validation failed: ${errors}`, { issues: result.error.errors });
  }
  return result.data;
}

export function validateAsync<T>(schema: z.ZodSchema<T>, data: unknown): Promise<T> {
  return schema.parseAsync(data);
}

export function validatePartial<T>(schema: z.ZodSchema<T>, data: unknown): Partial<T> {
  const partialSchema = schema.partial();
  return validate(partialSchema, data);
}

// Common validation schemas
export const idSchema = z.string().uuid({ message: 'Invalid ID format' });

export const emailSchema = z.string().email({ message: 'Invalid email format' });

export const urlSchema = z.string().url({ message: 'Invalid URL format' });

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long')
  .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character');

export const urlSafeStringSchema = z
  .string()
  .min(1, 'Cannot be empty')
  .max(2048, 'Too long')
  .regex(/^[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]+$/, 'Invalid characters in URL');

export const slugSchema = z
  .string()
  .min(1, 'Cannot be empty')
  .max(100, 'Too long')
  .regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens allowed')
  .regex(/^[a-z0-9]/, 'Must start with letter or number')
  .regex(/[a-z0-9]$/, 'Must end with letter or number');

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const dateRangeSchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
}).refine(
  data => !data.from || !data.to || new Date(data.from) <= new Date(data.to),
  { message: 'From date must be before or equal to to date', path: ['from'] }
);

export const paginationResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
  });

export const apiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z
      .object({
        code: z.string(),
        message: z.string(),
        details: z.record(z.unknown()).optional(),
        timestamp: z.string().datetime(),
        path: z.string(),
      })
      .optional(),
    timestamp: z.string().datetime(),
  });

export const aiTaskSchema = z.object({
  task: z.enum([
    'script_generation',
    'research',
    'creative_content',
    'marketing_strategy',
    'caption',
    'product_analysis',
    'visual_analysis',
    'video_qa',
    'video_generation',
    'image_generation',
    'audio_generation',
    'translation',
    'summarization',
    'fact_check',
    'coding',
    'reasoning',
    'planning',
  ]),
  input: z.unknown(),
  context: z.record(z.unknown()).optional(),
  constraints: z
    .object({
      maxCost: z.number().positive().optional(),
      maxTime: z.number().positive().optional(),
      requiredProviders: z.array(z.string()).optional(),
      excludedProviders: z.array(z.string()).optional(),
      minQuality: z.number().min(0).max(10).optional(),
    })
    .optional(),
  preferences: z
    .object({
      preferSpeed: z.boolean().optional(),
      preferQuality: z.boolean().optional(),
      preferCost: z.boolean().optional(),
      preferredProvider: z.string().optional(),
    })
    .optional(),
});

export const videoPresetSchema = z.enum([
  'tiktok',
  'youtube_shorts',
  'instagram_reels',
  'youtube',
  'square',
  'cinematic',
]);

export const videoStatusSchema = z.enum([
  'draft',
  'planning',
  'scripting',
  'storyboarding',
  'generating_assets',
  'generating_video',
  'rendering',
  'qa',
  'fixing',
  'completed',
  'failed',
  'cancelled',
]);

export const providerStatusSchema = z.enum([
  'disconnected',
  'connecting',
  'connected',
  'error',
  'expired',
  'reauth_required',
]);

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const dateRangeQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
}).refine(
  data => !data.from || !data.to || new Date(data.from) <= new Date(data.to),
  { message: 'From date must be before or equal to to date', path: ['from'] }
);

export function createApiResponse<T>(data: unknown): { success: true; data: T; timestamp: string } {
  return {
    success: true,
    data: data as T,
    timestamp: new Date().toISOString(),
  };
}

export function createApiError(code: string, message: string, details?: Record<string, unknown>): {
  success: false;
  error: { code: string; message: string; details?: Record<string, unknown>; timestamp: string; path: string };
} {
  return {
    success: false,
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
      path: '',
    },
  };
}