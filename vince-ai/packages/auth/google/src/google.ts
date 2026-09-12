import {
  Issuer,
  Client,
  TokenSet,
  UserinfoResponse,
  generators,
  customFetch,
} from 'openid-client';
import { EventEmitter } from 'eventemitter3';
import {
  ID,
  Timestamp,
  ProviderAuth,
  ProviderError,
  ProviderConfig,
  ProviderStatus,
  Result,
  ok,
  err,
  VinceError,
  AuthenticationError,
} from '@vince-ai/shared';
import { logger } from '@vince-ai/shared/logger';
import { encryptString, decryptString, hashString, generateSecureRandom } from '@vince-ai/shared/crypto';
import { emitEvent } from '@vince-ai/shared/events';

// ============================================
// Types
// ============================================

export interface GoogleAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  locale?: string;
}

export interface GoogleTokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Timestamp;
  scopes: string[];
  tokenType: string;
  idToken?: string;
}

export interface StoredGoogleAuth {
  userId: ID;
  googleUserId: string;
  email: string;
  name: string;
  picture?: string;
  tokens: GoogleTokenData;
  scopes: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface OAuthState {
  state: string;
  codeVerifier: string;
  redirectUri: string;
  scopes: string[];
  createdAt: Timestamp;
  expiresAt: Timestamp;
}

export type GoogleAuthState = 
  | 'NOT_CONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'ERROR'
  | 'EXPIRED'
  | 'REAUTH_REQUIRED'
  | 'LOGGING_OUT';

export interface GoogleAuthEvents {
  'state_changed': { state: GoogleAuthState; previousState?: GoogleAuthState };
  'connected': { userInfo: GoogleUserInfo };
  'disconnected': { reason: string };
  'error': { error: Error };
  'token_refreshed': { expiresAt: Timestamp };
  'token_expired': { };
}

// ============================================
// PKCE Implementation
// ============================================

export class PKCEManager {
  static generateCodeVerifier(): string {
    return generators.codeVerifier();
  }

  static generateCodeChallenge(codeVerifier: string): string {
    return generators.codeChallenge(codeVerifier);
  }

  static generateState(): string {
    return generators.state();
  }

  static verifyCodeChallenge(codeVerifier: string, codeChallenge: string): boolean {
    const expectedChallenge = this.generateCodeChallenge(codeVerifier);
    return codeVerifier === codeChallenge; // openid-client handles verification
  }
}

// ============================================
// Google OAuth Client
// ============================================

export class GoogleOAuthClient extends EventEmitter<{
  state_changed: [state: GoogleAuthState, previousState?: GoogleAuthState];
  connected: [userInfo: GoogleUserInfo];
  disconnected: [reason: string];
  error: [error: Error];
  token_refreshed: [expiresAt: Timestamp];
  token_expired: [];
}> {
  private client: Client | null = null;
  private config: GoogleAuthConfig;
  private issuer: Issuer<Client> | null = null;
  private currentState: GoogleAuthState = 'NOT_CONNECTED';
  private storedAuth: StoredGoogleAuth | null = null;
  private oauthState: OAuthState | null = null;
  private tokenRefreshInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: GoogleAuthConfig) {
    super();
    this.config = config;
  }

  async initialize(): Promise<void> {
    try {
      this.issuer = await Issuer.discover('https://accounts.google.com');
      this.client = new this.issuer.Client({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uris: [this.config.redirectUri],
        response_types: ['code'],
        token_endpoint_auth_method: 'client_secret_post',
      });

      // Load stored auth if exists
      await this.loadStoredAuth();
      
      logger.info({ module: 'google-auth' }, 'Google OAuth client initialized');
    } catch (error) {
      logger.error({ err: error, module: 'google-auth' }, 'Failed to initialize Google OAuth client');
      throw new AuthenticationError('Failed to initialize Google OAuth', { error: String(error) });
    }
  }

  private async loadStoredAuth(): Promise<void> {
    try {
      // In a real implementation, load from secure storage
      // const stored = await this.credentialManager.get('google_auth');
      // if (stored) {
      //   this.storedAuth = JSON.parse(stored);
      //   this.updateState(this.storedAuth.tokens.expiresAt > new Date().toISOString() ? 'CONNECTED' : 'EXPIRED');
      // }
    } catch (error) {
      logger.warn({ err: error, module: 'google-auth' }, 'Failed to load stored auth');
    }
  }

  async saveAuth(auth: StoredGoogleAuth): Promise<void> {
    this.storedAuth = auth;
    // In a real implementation, save to secure storage
    // await this.credentialManager.set('google_auth', JSON.stringify(auth));
    
    if (auth.tokens.expiresAt > new Date().toISOString()) {
      this.updateState('CONNECTED');
      this.scheduleTokenRefresh();
    } else {
      this.updateState('EXPIRED');
    }
  }

  getAuthorizationUrl(scopes?: string[]): { url: string; state: string; codeVerifier: string } {
    if (!this.client) {
      throw new AuthenticationError('Google OAuth client not initialized');
    }

    const scopes = scopes || this.config.scopes;
    const codeVerifier = generators.codeVerifier();
    const codeChallenge = generators.codeChallenge(codeVerifier);
    const state = generators.state();

    const oauthState: OAuthState = {
      state,
      codeVerifier,
      redirectUri: this.config.redirectUri,
      scopes,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
    };

    this.oauthState = oauthState;

    const url = this.client.authorizationUrl({
      scope: scopes.join(' '),
      redirect_uri: this.config.redirectUri,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: true,
    });

    return { url, state, codeVerifier };
  }

  async handleCallback(url: string): Promise<Result<StoredGoogleAuth, VinceError>> {
    if (!this.client || !this.oauthState) {
      return err(new AuthenticationError('OAuth client not initialized or state missing'));
    }

    const urlObj = new URL(url);
    const returnedState = urlObj.searchParams.get('state');
    const code = urlObj.searchParams.get('code');
    const error = urlObj.searchParams.get('error');

    // Validate state
    if (!returnedState || returnedState !== this.oauthState.state) {
      return err(new AuthenticationError('Invalid OAuth state'));
    }

    // Check expiration
    if (new Date(this.oauthState.expiresAt) < new Date()) {
      return err(new AuthenticationError('OAuth state expired'));
    }

    // Handle OAuth errors
    if (error) {
      const errorDesc = urlObj.searchParams.get('error_description');
      logger.warn({ error, errorDesc, module: 'google-auth' }, 'OAuth error received');
      return err(new AuthenticationError(`OAuth error: ${error} - ${errorDesc || 'Unknown error'}`));
    }

    if (!code) {
      return err(new AuthenticationError('No authorization code received'));
    }

    try {
      this.updateState('CONNECTING');

      // Exchange code for tokens
      const tokenSet = await this.client.callback(
        this.config.redirectUri,
        { code, state: this.oauthState.state },
        { code_verifier: this.oauthState.codeVerifier }
      );

      // Get user info
      const userInfo = await this.getUserInfo(tokenSet);

      // Create token data
      const tokenData: GoogleTokenData = {
        accessToken: tokenSet.access_token!,
        refreshToken: tokenSet.refresh_token,
        expiresAt: new Date(Date.now() + (tokenSet.expires_in! * 1000)).toISOString(),
        scopes: this.oauthState.scopes,
        tokenType: tokenSet.token_type!,
        idToken: tokenSet.id_token,
      };

      // Store auth
      const storedAuth: StoredGoogleAuth = {
        userId: generateUUID() as ID,
        googleUserId: userInfo.sub,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        tokens: tokenData,
        scopes: this.oauthState.scopes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await this.saveAuth(storedAuth);
      this.oauthState = null;

      // Emit events
      this.emit('connected', userInfo);
      emitEvent('auth:login', { userId: storedAuth.userId, provider: 'google' });

      logger.info({ userId: storedAuth.userId, email: userInfo.email }, 'Google OAuth connected');
      return ok(storedAuth);
    } catch (error) {
      this.updateState('ERROR');
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ err: error, module: 'google-auth' }, 'OAuth callback failed');
      return err(new AuthenticationError(`OAuth callback failed: ${errorMessage}`));
    }
  }

  async getUserInfo(tokenSet: TokenSet): Promise<GoogleUserInfo> {
    if (!this.client) {
      throw new AuthenticationError('Google OAuth client not initialized');
    }

    const userInfo = await this.client.userinfo(tokenSet);
    return userInfo as GoogleUserInfo;
  }

  async refreshAccessToken(): Promise<Result<GoogleTokenData, VinceError>> {
    if (!this.client || !this.storedAuth?.tokens.refreshToken) {
      return err(new AuthenticationError('No refresh token available'));
    }

    try {
      const tokenSet = await this.client.refresh(this.storedAuth.tokens.refreshToken);

      const newTokenData: GoogleTokenData = {
        ...this.storedAuth.tokens,
        accessToken: tokenSet.access_token!,
        expiresAt: new Date(Date.now() + (tokenSet.expires_in! * 1000)).toISOString(),
        refreshToken: tokenSet.refresh_token || this.storedAuth.tokens.refreshToken,
      };

      const updatedAuth: StoredGoogleAuth = {
        ...this.storedAuth,
        tokens: newTokenData,
        updatedAt: new Date().toISOString(),
      };

      await this.saveAuth(updatedAuth);
      this.emit('token_refreshed', newTokenData.expiresAt);

      logger.info({ module: 'google-auth' }, 'Access token refreshed');
      return ok(newTokenData);
    } catch (error) {
      logger.error({ err: error, module: 'google-auth' }, 'Token refresh failed');
      this.updateState('EXPIRED');
      return err(new AuthenticationError('Token refresh failed'));
    }
  }

  async getValidAccessToken(): Promise<string | null> {
    if (!this.storedAuth) return null;

    if (new Date(this.storedAuth.tokens.expiresAt) <= new Date()) {
      const result = await this.refreshAccessToken();
      if (!result.success) return null;
      return result.data.accessToken;
    }

    return this.storedAuth.tokens.accessToken;
  }

  isAuthenticated(): boolean {
    return this.currentState === 'CONNECTED' && this.storedAuth !== null;
  }

  getAuthState(): GoogleAuthState {
    return this.currentState;
  }

  getStoredAuth(): StoredGoogleAuth | null {
    return this.storedAuth;
  }

  getUserInfoSync(): GoogleUserInfo | null {
    if (!this.storedAuth) return null;
    return {
      sub: this.storedAuth.googleUserId,
      email: this.storedAuth.email,
      email_verified: true,
      name: this.storedAuth.name,
      picture: this.storedAuth.picture,
    };
  }

  async disconnect(): Promise<void> {
    if (this.storedAuth) {
      try {
        // Revoke token if possible
        if (this.client && this.storedAuth.tokens.accessToken) {
          await this.client.revoke(this.storedAuth.tokens.accessToken);
        }
      } catch (error) {
        logger.warn({ err: error, module: 'google-auth' }, 'Failed to revoke token');
      }

      const previousState = this.currentState;
      this.storedAuth = null;
      this.updateState('NOT_CONNECTED');
      this.clearTokenRefreshInterval();

      this.emit('disconnected', 'user_requested');
      emitEvent('auth:logout', { userId: 'unknown', provider: 'google' });

      logger.info({ module: 'google-auth' }, 'Google OAuth disconnected');
    }
  }

  async reconnect(): Promise<Result<StoredGoogleAuth, VinceError>> {
    this.updateState('NOT_CONNECTED');
    const { url } = this.getAuthorizationUrl();
    // In a real implementation, this would open a browser window
    // For now, we return the URL for the frontend to handle
    return err(new AuthenticationError('Reconnect requires user interaction'));
  }

  async testConnection(): Promise<Result<{ valid: boolean; userInfo?: GoogleUserInfo }, VinceError>> {
    const accessToken = await this.getValidAccessToken();
    if (!accessToken) {
      return ok({ valid: false });
    }

    try {
      if (!this.client) {
        return err(new AuthenticationError('Client not initialized'));
      }

      const tokenSet = new TokenSet({ access_token: accessToken });
      const userInfo = await this.getUserInfo(tokenSet);
      return ok({ valid: true, userInfo });
    } catch (error) {
      return ok({ valid: false });
    }
  }

  private updateState(newState: GoogleAuthState): void {
    const previousState = this.currentState;
    this.currentState = newState;
    this.emit('state_changed', newState, previousState);
  }

  private scheduleTokenRefresh(): void {
    this.clearTokenRefreshInterval();

    if (!this.storedAuth) return;

    const expiresAt = new Date(this.storedAuth.tokens.expiresAt).getTime();
    const now = Date.now();
    const refreshAt = expiresAt - 5 * 60 * 1000; // 5 minutes before expiry
    const delay = Math.max(0, refreshAt - Date.now());

    if (delay <= 0) {
      // Token already expired or expiring soon
      this.refreshAccessToken();
      return;
    }

    this.tokenRefreshInterval = setTimeout(() => {
      this.refreshAccessToken();
    }, delay);
  }

  private clearTokenRefreshInterval(): void {
    if (this.tokenRefreshInterval) {
      clearTimeout(this.tokenRefreshInterval);
      this.tokenRefreshInterval = null;
    }
  }

  destroy(): void {
    this.clearTokenRefreshInterval();
    this.removeAllListeners();
  }
}

// ============================================
// Credential Manager
// ============================================

export class CredentialManager {
  private static instance: CredentialManager;
  private storage: Map<string, string> = new Map();
  private encryptionKey: string;

  static getInstance(): CredentialManager {
    if (!CredentialManager.instance) {
      CredentialManager.instance = new CredentialManager();
    }
    return CredentialManager.instance;
  }

  private constructor() {
    // In production, derive from OS keychain or user-provided master password
    this.encryptionKey = process.env.ENCRYPTION_KEY || generateSecureRandom(32);
  }

  async set(key: string, value: string): Promise<void> {
    const encrypted = await encryptString(value, this.encryptionKey);
    this.storage.set(key, encrypted);
  }

  async get(key: string): Promise<string | null> {
    const encrypted = this.storage.get(key);
    if (!encrypted) return null;
    try {
      return await decryptString(encrypted, this.encryptionKey);
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    this.storage.delete(key);
  }

  async clear(): Promise<void> {
    this.storage.clear();
  }

  async has(key: string): Promise<boolean> {
    return this.storage.has(key);
  }
}

// ============================================
// Google Auth Service (High-level)
// ============================================

export class GoogleAuthService {
  private client: GoogleOAuthClient;
  private credentialManager: CredentialManager;

  constructor(config: GoogleAuthConfig) {
    this.client = new GoogleOAuthClient(config);
    this.credentialManager = CredentialManager.getInstance();
  }

  async initialize(): Promise<void> {
    await this.client.initialize();
  }

  getClient(): GoogleOAuthClient {
    return this.client;
  }

  getAuthUrl(): { url: string; state: string } {
    const { url, state } = this.client.getAuthorizationUrl();
    return { url, state };
  }

  async handleCallback(url: string): Promise<Result<StoredGoogleAuth, VinceError>> {
    return this.client.handleCallback(url);
  }

  async getValidToken(): Promise<string | null> {
    return this.client.getValidAccessToken();
  }

  isConnected(): boolean {
    return this.client.isAuthenticated();
  }

  getStatus(): GoogleAuthState {
    return this.client.getAuthState();
  }

  async disconnect(): Promise<void> {
    await this.client.disconnect();
  }

  async testConnection(): Promise<{ valid: boolean; userInfo?: GoogleUserInfo }> {
    return this.client.testConnection();
  }

  onStateChange(listener: (state: GoogleAuthState, previousState?: GoogleAuthState) => void): () => void {
    this.client.on('state_changed', listener);
    return () => this.client.off('state_changed', listener);
  }

  onConnected(listener: (userInfo: GoogleUserInfo) => void): () => void {
    this.client.on('connected', listener);
    return () => this.client.off('connected', listener);
  }

  onDisconnected(listener: (reason: string) => void): () => void {
    this.client.on('disconnected', listener);
    return () => this.client.off('disconnected', listener);
  }

  onError(listener: (error: Error) => void): () => void {
    this.client.on('error', listener);
    return () => this.client.off('error', listener);
  }

  destroy(): void {
    this.client.destroy();
  }
}

// ============================================
// Utility Functions
// ============================================

function generateUUID(): string {
  return crypto.randomUUID();
}

function generateSecureRandom(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function createGoogleAuthService(config: GoogleAuthConfig): Promise<GoogleAuthService> {
  const service = new GoogleAuthService(config);
  await service.initialize();
  return service;
}

export { GoogleOAuthClient, CredentialManager, StoredGoogleAuth, GoogleAuthState, GoogleAuthConfig, GoogleUserInfo, GoogleTokenData, OAuthState };