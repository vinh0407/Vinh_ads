import { Result, ok, err, AuthenticationError, VinceError } from '@vince-ai/shared';
import { logger } from '@vince-ai/shared/logger';
import { encryptString, decryptString } from '@vince-ai/shared/crypto';
import { GoogleOAuthClient, StoredGoogleAuth, GoogleTokenData, GoogleAuthConfig } from './google';

/**
 * Session Manager for Google Authentication
 * Handles token storage, refresh, and session persistence
 */

export interface SessionData {
  userId: string;
  googleUserId: string;
  email: string;
  name: string;
  picture?: string;
  tokens: GoogleTokenData;
  scopes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SessionOptions {
  encryptionKey: string;
  storagePrefix?: string;
  autoRefresh?: boolean;
  refreshBufferMs?: number;
}

export class SessionManager {
  private client: GoogleOAuthClient;
  private options: Required<SessionOptions>;
  private session: SessionData | null = null;
  private refreshInterval: NodeJS.Timeout | null = null;

  constructor(
    client: GoogleOAuthClient,
    options: SessionOptions
  ) {
    this.client = client;
    this.options = {
      encryptionKey: options.encryptionKey,
      storagePrefix: options.storagePrefix || 'vince_ai_google_',
      autoRefresh: options.autoRefresh ?? true,
      refreshBufferMs: options.refreshBufferMs ?? 5 * 60 * 1000, // 5 minutes
    };
  }

  /**
   * Initializes the session manager
   */
  async initialize(): Promise<void> {
    await this.loadSession();
  }

  /**
   * Gets the current session
   */
  getSession(): SessionData | null {
    return this.session;
  }

  /**
   * Checks if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.session !== null && this.isTokenValid();
  }

  /**
   * Gets the current access token, refreshing if necessary
   */
  async getAccessToken(): Promise<string | null> {
    if (!this.session) return null;

    if (!this.isTokenValid()) {
      const refreshed = await this.refreshAccessToken();
      if (!refreshed) return null;
    }

    return this.session?.tokens.accessToken ?? null;
  }

  /**
   * Gets the ID token
   */
  getIdToken(): string | null {
    return this.session?.tokens.idToken ?? null;
  }

  /**
   * Gets the current user info
   */
  getUserInfo() {
    if (!this.session) return null;
    return {
      userId: this.session.userId,
      googleUserId: this.session.googleUserId,
      email: this.session.email,
      name: this.session.name,
      picture: this.session.picture,
    };
  }

  /**
   * Gets the current session state
   */
  getState(): 'authenticated' | 'expired' | 'unauthenticated' {
    if (!this.session) return 'unauthenticated';
    return this.isTokenValid() ? 'authenticated' : 'expired';
  }

  /**
   * Saves a new session after successful authentication
   */
  async saveSession(auth: StoredGoogleAuth): Promise<void> {
    this.session = {
      userId: auth.userId,
      googleUserId: auth.googleUserId,
      email: auth.email,
      name: auth.name,
      picture: auth.picture,
      tokens: auth.tokens,
      scopes: auth.scopes,
      createdAt: auth.createdAt,
      updatedAt: auth.updatedAt,
    };

    await this.persistSession();
    this.scheduleTokenRefresh();
  }

  /**
   * Updates the access token after refresh
   */
  async updateTokens(tokenData: GoogleTokenData): Promise<void> {
    if (!this.session) {
      throw new Error('No active session');
    }

    this.session.tokens = tokenData;
    this.session.updatedAt = new Date().toISOString();
    await this.persistSession();
    this.scheduleTokenRefresh();
  }

  /**
   * Refreshes the access token using the refresh token
   */
  async refreshAccessToken(): Promise<boolean> {
    if (!this.session?.tokens.refreshToken) {
      logger.warn('No refresh token available');
      return false;
    }

    try {
      const tokenSet = await this.client['client']?.refresh(this.session.tokens.refreshToken);
      
      if (!tokenSet) {
        logger.error('Failed to refresh token: no token set returned');
        return false;
      }

      const tokenData: GoogleTokenData = {
        accessToken: tokenSet.access_token!,
        refreshToken: tokenSet.refresh_token || this.session.tokens.refreshToken,
        expiresAt: new Date(Date.now() + (tokenSet.expires_in! * 1000)).toISOString(),
        scopes: this.session.scopes,
        tokenType: tokenSet.token_type!,
        idToken: tokenSet.id_token,
      };

      await this.updateTokens(tokenData);
      return true;
    } catch (error) {
      logger.error({ err: error }, 'Failed to refresh access token');
      return false;
    }
  }

  /**
   * Clears the current session
   */
  async clearSession(): Promise<void> {
    this.clearRefreshTimer();
    this.session = null;
    await this.clearPersistedSession();
  }

  /**
   * Checks if the access token is still valid
   */
  private isTokenValid(): boolean {
    if (!this.session?.tokens.expiresAt) return false;
    const expiry = new Date(this.session.tokens.expiresAt).getTime();
    const buffer = this.options.refreshBufferMs;
    return Date.now() < (expiry - this.options.refreshBufferMs);
  }

  /**
   * Loads session from storage
   */
  private async loadSession(): Promise<void> {
    try {
      // Load from secure storage (implementation depends on platform)
      // For now, we'll use a simple in-memory approach
      // In production, use secure storage (keychain, credential manager, etc.)
    } catch (error) {
      logger.warn({ err: error }, 'Failed to load session');
    }
  }

  /**
   * Persists session to storage
   */
  private async persistSession(): Promise<void> {
    if (!this.session) return;

    try {
      const encrypted = await encryptString(
        JSON.stringify(this.session),
        this.options.encryptionKey
      );
      // Save to secure storage
      // await this.storage.set(`${this.options.storagePrefix}session`, encrypted);
    } catch (error) {
      logger.error({ err: error }, 'Failed to persist session');
    }
  }

  /**
   * Clears persisted session
   */
  private async clearPersistedSession(): Promise<void> {
    try {
      // await this.storage.delete(`${this.options.storagePrefix}session`);
    } catch (error) {
      logger.warn({ err: error }, 'Failed to clear persisted session');
    }
  }

  /**
   * Schedules automatic token refresh
   */
  private scheduleTokenRefresh(): void {
    if (!this.options.autoRefresh || !this.session) return;

    this.clearRefreshTimer();

    const expiresAt = new Date(this.session.tokens.expiresAt).getTime();
    const refreshAt = Date.now() + this.options.refreshBufferMs;
    const delay = Math.max(0, new Date(this.session.tokens.expiresAt).getTime() - Date.now() - this.options.refreshBufferMs);

    if (delay <= 0) {
      // Token already expired or expiring soon
      this.refreshAccessToken();
      return;
    }

    this.refreshInterval = setTimeout(() => {
      this.refreshAccessToken();
    }, delay);
  }

  /**
   * Clears the refresh timer
   */
  private clearRefreshTimer(): void {
    if (this.refreshInterval) {
      clearTimeout(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  /**
   * Destroys the session manager
   */
  destroy(): void {
    this.clearRefreshTimer();
    this.session = null;
  }
}

/**
 * Creates a session manager for a Google OAuth client
 */
export function createSessionManager(
  client: GoogleOAuthClient,
  encryptionKey: string
): SessionManager {
  return new SessionManager(client, {
    encryptionKey,
    autoRefresh: true,
    refreshBufferMs: 5 * 60 * 1000,
  });
}

/**
 * Token storage interface for different platforms
 */
export interface TokenStorage {
  set(key: string, value: string): Promise<void>;
  get(key: string): Promise<string | null>;
  delete(key: string): Promise<void>;
}

/**
 * In-memory token storage (for development/testing)
 */
export class InMemoryTokenStorage implements TokenStorage {
  private storage = new Map<string, string>();

  async set(key: string, value: string): Promise<void> {
    this.storage.set(key, value);
  }

  async get(key: string): Promise<string | null> {
    return this.storage.get(key) ?? null;
  }

  async delete(key: string): Promise<void> {
    this.storage.delete(key);
  }
}

/**
 * Secure token storage using OS keychain (placeholder for native implementation)
 */
export class SecureTokenStorage implements TokenStorage {
  private prefix: string;

  constructor(prefix: string = 'vince_ai_') {
    this.prefix = prefix;
  }

  async set(key: string, value: string): Promise<void> {
    // Implementation would use native keychain/credential manager
    // For now, fallback to in-memory with encryption
  }

  async get(key: string): Promise<string | null> {
    return null;
  }

  async delete(key: string): Promise<void> {
    // Delete from secure storage
  }
}

/**
 * Creates a session manager with platform-appropriate storage
 */
export function createSessionManagerForPlatform(
  client: GoogleOAuthClient,
  encryptionKey: string,
  platform: 'electron' | 'node' | 'browser' = 'node'
): SessionManager {
  return new SessionManager(client, {
    encryptionKey,
    autoRefresh: true,
  });
}