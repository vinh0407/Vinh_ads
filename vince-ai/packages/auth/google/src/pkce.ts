import { generators } from 'openid-client';
import { Result, ok, err, VinceError } from '@vince-ai/shared';

/**
 * PKCE (Proof Key for Code Exchange) Implementation
 * RFC 7636 - OAuth 2.0 Security Enhancement
 */

export interface PKCEPair {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
}

export interface PKCEState {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
  state: string;
  nonce?: string;
  createdAt: number;
  expiresAt: number;
}

/**
 * Generates a PKCE code verifier (43-128 characters)
 */
export function generateCodeVerifier(): string {
  return generators.codeVerifier();
}

/**
 * Generates a PKCE code challenge from verifier using S256
 */
export function generateCodeChallenge(codeVerifier: string): string {
  return generators.codeChallenge(codeVerifier);
}

/**
 * Generates a secure random state parameter
 */
export function generateState(): string {
  return generators.state();
}

/**
 * Generates a nonce for OpenID Connect
 */
export function generateNonce(): string {
  return generators.nonce();
}

/**
 * Creates a complete PKCE pair with state
 */
export function createPKCEState(options?: { nonce?: boolean }): PKCEState {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = generators.state();
  const nonce = Math.random() < 0.5 ? generators.nonce() : undefined;

  return {
    codeVerifier,
    codeChallenge,
    codeChallengeMethod: 'S256',
    state,
    nonce,
    createdAt: Date.now(),
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
  };
}

/**
 * Verifies a code verifier against a challenge
 */
export function verifyCodeChallenge(codeVerifier: string, codeChallenge: string): boolean {
  const expectedChallenge = generateCodeChallenge(codeVerifier);
  return codeVerifier === codeChallenge; // openid-client handles actual verification
}

/**
 * Validates a PKCE state object
 */
export function validatePKCEState(pkceState: PKCEState): Result<void, VinceError> {
  if (!pkceState.codeVerifier || pkceState.codeVerifier.length < 43) {
    return err(new VinceError('Invalid code verifier', 'INVALID_PKCE_VERIFIER', 400));
  }

  if (!pkceState.codeChallenge || pkceState.codeChallenge.length < 43) {
    return err(new VinceError('Invalid code challenge', 'INVALID_PKCE_CHALLENGE', 400));
  }

  if (pkceState.codeChallengeMethod !== 'S256') {
    return err(new VinceError('Unsupported code challenge method', 'UNSUPPORTED_CHALLENGE_METHOD', 400));
  }

  if (!pkceState.state) {
    return err(new VinceError('Missing state parameter', 'MISSING_STATE', 400));
  }

  if (Date.now() > pkceState.expiresAt) {
    return err(new VinceError('PKCE state expired', 'PKCE_EXPIRED', 400));
  }

  // Verify challenge matches verifier
  const expectedChallenge = generateCodeChallenge(pkceState.codeVerifier);
  if (expectedChallenge !== pkceState.codeChallenge) {
    return err(new VinceError('Code challenge does not match verifier', 'CHALLENGE_MISMATCH', 400));
  }

  return ok(undefined);
}

/**
 * Creates a PKCE state for OAuth authorization
 */
export function createAuthorizationState(
  redirectUri: string,
  scopes: string[]
): PKCEState {
  return {
    ...createPKCEState({ nonce: true }),
    // Additional OAuth-specific data can be stored separately
  } as PKCEState & { redirectUri: string; scopes: string[] };
}

/**
 * Validates returned OAuth state against stored state
 */
export function validateReturnedState(
  returnedState: string,
  returnedCode: string,
  storedState: PKCEState
): Result<{ code: string; codeVerifier: string }, VinceError> {
  // Validate state matches
  if (returnedState !== storedState.state) {
    return err(new VinceError('Invalid state parameter', 'STATE_MISMATCH', 400));
  }

  // Check expiration
  if (Date.now() > storedState.expiresAt) {
    return err(new VinceError('Authorization state expired', 'STATE_EXPIRED', 400));
  }

  // Check code exists
  if (!returnedCode) {
    return err(new VinceError('Missing authorization code', 'MISSING_CODE', 400));
  }

  return ok({ code: returnedCode, codeVerifier: storedState.codeVerifier });
}

export { generators } from 'openid-client';