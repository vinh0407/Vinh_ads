import axios, { AxiosInstance } from 'axios';
import WebSocket from 'ws';
import { EventEmitter } from 'eventemitter3';
import {
  AIProviderName,
  AIProviderStatus,
  AIProviderCapabilities,
  ProviderHealth,
  ProviderConfig,
  ProviderError,
  ValidationError,
} from '@vince-ai/shared';
import { logger } from '@vince-ai/shared/logger';

// ============================================
// Types
// ============================================

export interface OpenCodeConfig {
  apiKey?: string;
  baseUrl?: string;
  wsUrl?: string;
  timeout?: number;
}

export interface OpenCodeSession {
  id: string;
  status: 'active' | 'idle' | 'closed';
  createdAt: string;
  updatedAt: string;
}

export interface OpenCodeCommand {
  type: 'execute' | 'read' | 'write' | 'edit' | 'list' | 'search' | 'terminal';
  payload: unknown;
}

export interface OpenCodeResponse {
  type: 'result' | 'error' | 'progress' | 'complete';
  data?: unknown;
  error?: string;
  progress?: number;
  message?: string;
}

export interface OpenCodeFileOperation {
  type: 'read' | 'write' | 'edit' | 'delete' | 'list';
  path: string;
  content?: string;
  oldContent?: string;
  newContent?: string;
}

export interface OpenCodeTerminalCommand {
  command: string;
  cwd?: string;
  env?: Record<string, string>;
}

// ============================================
// OpenCode Provider
// ============================================

export class OpenCodeProvider extends EventEmitter<{
  connected: [sessionId: string];
  disconnected: [reason: string];
  error: [error: Error];
  session_created: [sessionId: string];
  session_closed: [sessionId: string];
  command_completed: [command: string; result: unknown];
  command_failed: [command: string; error: Error];
}> {
  private httpClient: AxiosInstance;
  private ws: WebSocket | null = null;
  private config: OpenCodeConfig;
  private status: AIProviderStatus = 'disconnected';
  private health: ProviderHealth = {
    status: 'unknown',
    errorRate: 0,
    lastCheck: new Date().toISOString(),
  };
  private sessionId: string | null = null;
  private wsConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000;

  constructor(config: OpenCodeConfig = {}) {
    super();
    this.config = {
      baseUrl: 'http://localhost:3000',
      wsUrl: 'ws://localhost:3000/ws',
      timeout: 30000,
      ...config,
    };

    this.httpClient = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (this.config.apiKey) {
      this.httpClient.defaults.headers.common['Authorization'] = `Bearer ${this.config.apiKey}`;
    }
  }

  async initialize(config?: { apiKey?: string }): Promise<void> {
    if (config?.apiKey) {
      this.httpClient.defaults.headers.common['Authorization'] = `Bearer ${config.apiKey}`;
    }

    try {
      await this.healthCheck();
      this.status = 'connected';
      this.emit('connected', 'default');
      logger.info({ module: 'opencode' }, 'OpenCode provider connected');
    } catch (error) {
      this.status = 'error';
      this.emit('error', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async connectWebSocket(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.wsUrl || 'ws://localhost:3000/ws');

        this.ws.onopen = () => {
          this.wsConnected = true;
          this.reconnectAttempts = 0;
          logger.info({ module: 'opencode' }, 'WebSocket connected');
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleWSMessage(data);
          } catch (error) {
            logger.warn({ err: error }, 'Failed to parse WebSocket message');
          }
        };

        this.ws.onclose = () => {
          this.wsConnected = false;
          this.handleWSClose();
        };

        this.ws.onerror = (error) => {
          logger.error({ err: error, module: 'opencode' }, 'WebSocket error');
          this.emit('error', new Error('WebSocket error'));
        };

        // Wait for connection
        const timeout = setTimeout(() => {
          reject(new Error('WebSocket connection timeout'));
        }, 10000);

        this.ws.onopen = () => {
          clearTimeout(timeout);
          resolve();
        };

        this.ws.onerror = (error) => {
          clearTimeout(timeout);
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private handleWSMessage(data: OpenCodeResponse): void {
    switch (data.type) {
      case 'result':
        this.emit('command_completed', 'unknown', data.data);
        break;
      case 'error':
        this.emit('command_failed', 'unknown', new Error(data.error || 'Unknown error'));
        break;
      case 'progress':
        // Progress updates
        break;
      case 'complete':
        this.emit('command_completed', 'unknown', data.data);
        break;
    }
  }

  private handleWSClose(): void {
    this.wsConnected = false;
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.reconnectAttempts++;
        this.connectWebSocket().catch(() => {});
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  async healthCheck(): Promise<ProviderHealth> {
    const start = Date.now();
    try {
      const response = await this.httpClient.get('/health', { timeout: 5000 });
      
      const latency = Date.now() - start;
      
      this.health = {
        status: response.data.status === 'ok' ? 'healthy' : 'degraded',
        latency,
        errorRate: 0,
        lastCheck: new Date().toISOString(),
      };

      return this.health;
    } catch (error) {
      this.health = {
        status: 'down',
        latency: Date.now() - start,
        errorRate: 1,
        lastCheck: new Date().toISOString(),
      };
      this.emit('error', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  // ============================================
  // Session Management
  // ============================================

  async createSession(config?: { cwd?: string; env?: Record<string, string> }): Promise<string> {
    const response = await this.httpClient.post<{ session: { id: string } }>('/sessions', {
      cwd: config?.cwd || process.cwd(),
      env: config?.env,
    });
    
    this.sessionId = response.data.session.id;
    this.emit('session_created', this.sessionId);
    return this.sessionId;
  }

  async closeSession(sessionId?: string): Promise<void> {
    const id = sessionId || this.sessionId;
    if (!id) return;

    await this.httpClient.delete(`/sessions/${id}`);
    this.emit('session_closed', id);
    
    if (this.sessionId === id) {
      this.sessionId = null;
    }
  }

  async getSession(sessionId?: string): Promise<OpenCodeSession | null> {
    const id = sessionId || this.sessionId;
    if (!id) return null;

    try {
      const response = await this.httpClient.get(`/sessions/${id}`);
      return response.data;
    } catch {
      return null;
    }
  }

  // ============================================
  // File Operations
  // ============================================

  async readFile(path: string, sessionId?: string): Promise<string> {
    const id = sessionId || this.sessionId;
    if (!id) throw new Error('No active session');

    const response = await this.httpClient.post<{ content: string }>(`/sessions/${id}/files/read`, {
      path,
    });
    return response.data.content;
  }

  async writeFile(path: string, content: string, sessionId?: string): Promise<void> {
    const id = sessionId || this.sessionId;
    if (!id) throw new Error('No active session');

    await this.httpClient.post(`/sessions/${id}/files/write`, { path, content });
  }

  async editFile(path: string, oldContent: string, newContent: string, sessionId?: string): Promise<void> {
    const id = sessionId || this.sessionId;
    if (!id) throw new Error('No active session');

    await this.httpClient.post(`/sessions/${id}/files/edit`, {
      path,
      old_content: oldContent,
      new_content: newContent,
    });
  }

  async listFiles(path: string, sessionId?: string): Promise<string[]> {
    const id = sessionId || this.sessionId;
    if (!id) throw new Error('No active session');

    const response = await this.httpClient.post<{ files: string[] }>(`/sessions/${id}/files/list`, {
      path,
    });
    return response.data.files;
  }

  // ============================================
  // Terminal Commands
  // ============================================

  async executeCommand(command: string, options?: { cwd?: string; env?: Record<string, string>; sessionId?: string }): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const id = options?.sessionId || this.sessionId;
    if (!id) throw new Error('No active session');

    const response = await this.httpClient.post<{ stdout: string; stderr: string; exit_code: number }>(`/sessions/${id}/terminal`, {
      command,
      cwd: options?.cwd,
      env: options?.env,
    });

    return {
      stdout: response.data.stdout,
      stderr: response.data.stderr,
      exitCode: response.data.exit_code,
    };
  }

  // ============================================
  // Search & Code Intelligence
  // ============================================

  async searchCode(query: string, options?: { path?: string; sessionId?: string }): Promise<Array<{ file: string; line: number; content: string }>> {
    const id = options?.sessionId || this.sessionId;
    if (!id) throw new Error('No active session');

    const response = await this.httpClient.post<{ results: Array<{ file: string; line: number; content: string }> }>(`/sessions/${id}/search`, {
      query,
      path: options?.path,
    });
    return response.data.results;
  }

  async getSymbols(path: string, sessionId?: string): Promise<Array<{ name: string; type: string; line: number }>> {
    const id = sessionId || this.sessionId;
    if (!id) throw new Error('No active session');

    const response = await this.httpClient.post<{ symbols: Array<{ name: string; type: string; line: number }> }>(`/sessions/${id}/symbols`, {
      path,
    });
    return response.data.symbols;
  }

  // ============================================
  // Provider Interface
  // ============================================

  getName(): 'opencode' {
    return 'opencode';
  }

  getStatus(): 'connected' | 'disconnected' | 'connecting' | 'error' {
    return this.status;
  }

  getHealth(): ProviderHealth {
    return this.health;
  }

  getCapabilities() {
    return {
      text: true,
      vision: false,
      audio: false,
      videoAnalysis: false,
      structuredOutput: true,
      toolCalling: true,
      streaming: true,
      maxTokens: 128000,
      supportedModels: ['opencode'],
    };
  }

  getConfig(): any {
    return {
      model: 'opencode',
    };
  }

  isHealthy(): boolean {
    return this.health.status === 'healthy';
  }

  getMetrics() {
    return {
      status: this.status,
      health: this.health,
      sessionId: this.sessionId,
      wsConnected: this.wsConnected,
    };
  }

  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.wsConnected = false;
    this.status = 'disconnected';
    this.emit('disconnected', 'user_requested');
  }

  getStatus(): 'connected' | 'disconnected' | 'connecting' | 'error' {
    return this.status;
  }
}

// ============================================
// Factory Functions
// ============================================

export async function createOpenCodeProvider(config: OpenCodeConfig = {}): Promise<OpenCodeProvider> {
  const provider = new OpenCodeProvider(config);
  await provider.initialize(config);
  return provider;
}

export { AIProviderName } from '@vince-ai/shared';