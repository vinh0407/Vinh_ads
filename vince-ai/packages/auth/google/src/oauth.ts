import { Issuer, Client, TokenSet, generators, customFetch } from 'openid-client';
import { EventEmitter } from 'eventemitter3';
import { Result, ok, err, AuthenticationError, VinceError } from '@vince-ai/shared';
import { logger } from '@vince-ai/shared/logger';

/**
 * OAuth 2.0 Client for Google
 * Supports PKCE, state management, token refresh
 */

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  authorizationEndpoint?: string;
  tokenEndpoint?: string;
  userinfoEndpoint?: string;
  revocationEndpoint?: string;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // Unix timestamp
  tokenType: string;
  scope: string;
  idToken?: string;
}

export interface OAuthState {
  state: string;
  codeVerifier: string;
  redirectUri: string;
  scopes: string[];
  createdAt: number;
  expiresAt: number;
  nonce?: string;
}

export interface UserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  locale?: string;
  hd?: string;
}

export type OAuthStateEnum = 'disconnected' | 'connecting' | 'connected' | 'error' | 'expired';

export interface OAuthEvents {
  'state_change': [previousState: OAuthStateEnum, newState: OAuthStateEnum];
  'tokens_received': [tokens: OAuthTokens];
  'tokens_refreshed': [tokens: OAuthTokens];
  'authenticated': [userInfo: UserInfo];
  'unauthenticated': [reason: string];
  'error': [error: Error];
}

export class OAuthClient extends EventEmitter<OAuthEvents> {
  private client: Client | null = null;
  private config: OAuthConfig;
  private issuer: any = null;
  private state: OAuthStateEnum = 'disconnected';
  private tokens: OAuthTokens | null = null;
  private userInfo: UserInfo | null = null;
  private pendingState: OAuthState | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;

  constructor(config: OAuthConfig) {
    super();
    this.config = config;
  }

  async initialize(): Promise<void> {
    try {
      // Discover Google's OpenID configuration
      this.issuer = await Issuer.discover('https://accounts.google.com');
      
      this.client = new this.issuer.Client({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uris: [this.config.redirectUri],
        response_types: ['code'],
        token_endpoint_auth_method: 'client_secret_post',
      });

      // Load existing tokens if available
      await this.loadStoredTokens();
      
      logger.info({ module: 'oauth' }, 'OAuth client initialized');
    } catch (error) {
      logger.error({ err: error, module: 'oauth' }, 'Failed to initialize OAuth client');
      throw new AuthenticationError('Failed to initialize OAuth client');
    }
  }

  private async loadStoredTokens(): Promise<void> {
    // Load from secure storage
    // Implementation depends on platform (electron, node, browser)
  }

  private async saveTokens(): Promise<void> {
    // Save to secure storage
  }

  generateAuthUrl(scopes?: string[]): { url: string; state: string; codeVerifier: string } {
    if (!this.client) {
      throw new AuthenticationError('OAuth client not initialized');
    }

    const scopes = scopes || this.config.scopes;
    const codeVerifier = generators.codeVerifier();
    const codeChallenge = generators.codeChallenge(codeVerifier);
    const state = generators.state();
    const nonce = generators.nonce();

    const oauthState: OAuthState = {
      state,
      codeVerifier,
      redirectUri: this.config.redirectUri,
      scopes: scopes || this.config.scopes,
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
      nonce,
    };

    this.pendingState = oauthState;

    const url = this.client.authorizationUrl({
      scope: (scopes || this.config.scopes).join(' '),
      redirect_uri: this.config.redirectUri,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      nonce,
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: true,
    });

    return { url, state, codeVerifier };
  }

  async handleCallback(url: string): Promise<Result<{ tokens: OAuthTokens; userInfo: UserInfo }, VinceError>> {
    if (!this.client || !this.pendingState) {
      return err(new AuthenticationError('OAuth client not initialized or no pending state'));
    }

    const urlObj = new URL(url);
    const returnedState = urlObj.searchParams.get('state');
    const code = urlObj.searchParams.get('code');
    const error = urlObj.searchParams.get('error');
    const errorDescription = urlObj.searchParams.get('error_description');

    // Validate state
    if (!returnedState || returnedState !== this.pendingState.state) {
      return err(new AuthenticationError('Invalid OAuth state'));
    }

    // Check expiration
    if (this.pendingState.expiresAt < Date.now()) {
      return err(new AuthenticationError('OAuth state expired'));
    }

    // Handle OAuth errors
    if (error) {
      logger.warn({ error, errorDescription, module: 'oauth' }, 'OAuth error received');
      return err(new AuthenticationError(`OAuth error: ${error} - ${errorDescription || 'Unknown error'}`));
    }

    if (!code) {
      return err(new AuthenticationError('No authorization code received'));
    }

    try {
      this.setState('connecting');

      const params = this.client.callbackParams(url);
      const tokenSet = await this.client.callback(
        this.config.redirectUri,
        params,
        { code_verifier: this.pendingState.codeVerifier }
      );

      const tokens = this.tokenSetToTokens(tokenSet);
      const userInfo = await this.fetchUserInfo(tokens.accessToken);

      this.tokens = tokens;
      this.userInfo = userInfo;
      this.setState('connected');

      await this.saveTokens();
      this.scheduleTokenRefresh();

      this.pendingState = null;
      this.emit('authenticated', userInfo);
      this.emit('tokens_received', tokens);

      logger.info({ module: 'oauth' }, 'OAuth authentication successful');
      return ok({ tokens, userInfo });
    } catch (error) {
      this.setState('error');
      const message = error instanceof Error ? error.message : String(error);
      logger.error({ err: error, module: 'oauth' }, 'OAuth callback failed');
      return err(new AuthenticationError(`OAuth callback failed: ${message}`));
    }
  }

  private async fetchUserInfo(accessToken: string): Promise<UserInfo> {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user info: ${response.status}`);
    }

    return response.json();
  }

  async refreshTokens(): Promise<Result<OAuthTokens, Error>> {
    if (!this.client || !this.tokens?.refreshToken) {
      return err(new Error('No refresh token available'));
    }

    try {
      const tokenSet = await this.client.refresh(this.tokens.refreshToken);
      const tokens = this.tokenSetToTokens(tokenSet);
      this.tokens = tokens;
      await this.saveTokens();
      this.scheduleTokenRefresh();
      this.emit('tokens_refreshed', tokens);
      return ok(tokens);
    } catch (error) {
      this.setState('expired');
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async getValidAccessToken(): Promise<string | null> {
    if (!this.tokens) return null;

    if (Date.now() >= this.tokens.expiresAt - 60000) { // 1 minute buffer
      const result = await this.refreshTokens();
      if (!result.success) return null;
      return result.data.accessToken;
    }

    return this.tokens.accessToken;
  }

  async revokeAccess(): Promise<void> {
    if (!this.client || !this.tokens?.accessToken) return;

    try {
      await this.client.revoke(this.tokens.accessToken);
    } catch (error) {
      logger.warn({ err: error, module: 'oauth' }, 'Failed to revoke access token');
    }

    this.tokens = null;
    this.userInfo = null;
    this.setState('disconnected');
    this.clearRefreshTimer();
  }

  private tokenSetToTokens(tokenSet: TokenSet): OAuthTokens {
    return {
      accessToken: tokenSet.access_token!,
      refreshToken: tokenSet.refresh_token,
      expiresAt: Date.now() + (tokenSet.expires_in! * 1000),
      tokenType: tokenSet.token_type!,
      scope: tokenSet.scope!,
      idToken: tokenSet.id_token,
    };
  }

  private setState(newState: OAuthStateEnum): void {
    const previousState = this.state;
    this.state = newState;
    this.emit('state_change', previousState, newState);
  }

  getState(): OAuthStateEnum {
    return this.state;
  }

  getTokens(): OAuthTokens | null {
    return this.tokens;
  }

  getUserInfo(): UserInfo | null {
    return this.userInfo;
  }

  isAuthenticated(): boolean {
    return this.state === 'connected' && this.tokens !== null;
  }

  private scheduleTokenRefresh(): void {
    if (!this.tokens) return;

    const expiresAt = this.tokens.expiresAt;
    const refreshAt = expiresAt - 5 * 60 * 1000; // 5 minutes before expiry
    const delay = Math.max(0, refreshAt - Date.now());

    if (delay <= 0) {
      this.refreshTokens();
      return;
    }

    this.refreshTimer = setTimeout(() => {
      this.refreshTokens();
    }, delay);
  }

  private clearRefreshTimer(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  destroy(): void {
    this.clearRefreshTimer();
    this.removeAllListeners();
  }
}

/**
 * Creates an OAuth client for Google
 */
export async function createGoogleOAuthClient(config: OAuthConfig): Promise<OAuthClient> {
  const client = new OAuthClient({
    ...config,
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
    userinfoEndpoint: 'https://www.googleapis.com/oauth2/v3/userinfo',
    revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
  });

  await client.initialize();
  return client;
}