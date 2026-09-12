/**
 * Custom error classes for Vince AI
 */

export class VinceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>,
    public recoverable: boolean = false,
    public suggestedAction?: string
  ) {
    super(message);
    this.name = 'VinceError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class AuthenticationError extends VinceError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'AUTHENTICATION_ERROR', 401, details, true, 'Please reconnect your account');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends VinceError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'AUTHORIZATION_ERROR', 403, details, false, 'Contact administrator');
    this.name = 'AuthorizationError';
  }
}

export class ValidationError extends VinceError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, details, true, 'Check input data');
    this.name = 'ValidationError';
  }
}

export class ProviderError extends VinceError {
  constructor(message: string, public provider: string, details?: Record<string, unknown>) {
    super(message, 'PROVIDER_ERROR', 502, details, true, 'Try again or switch provider');
    this.name = 'ProviderError';
  }
}

export class RateLimitError extends VinceError {
  constructor(message: string, public retryAfter: number, details?: Record<string, unknown>) {
    super(message, 'RATE_LIMIT_ERROR', 429, details, true, `Retry after ${retryAfter} seconds`);
    this.name = 'RateLimitError';
  }
}

export class NotFoundError extends VinceError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, 'NOT_FOUND', 404, { resource, id }, false, 'Check ID');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends VinceError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CONFLICT', 409, details, false, 'Resolve conflict');
    this.name = 'ConflictError';
  }
}

export class QuotaExceededError extends VinceError {
  constructor(resource: string, limit: number, details?: Record<string, unknown>) {
    super(`Quota exceeded for ${resource}: ${limit}`, 'QUOTA_EXCEEDED', 429, { resource, limit }, true, 'Upgrade plan or wait');
    this.name = 'QuotaExceededError';
  }
}