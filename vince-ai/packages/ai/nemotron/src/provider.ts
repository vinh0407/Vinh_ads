import axios, { AxiosInstance } from 'axios';
import { EventEmitter } from 'eventemitter3';
import {
  AIProviderName,
  AIProviderStatus,
  AIProviderCapabilities,
  ProviderHealth,
  ProviderConfig,
  ProviderError,
  AIProvider,
  TaskType,
  Result,
  ok,
  err,
  VinceError,
  ValidationError,
} from '@vince-ai/shared';
import { logger } from '@vince-ai/shared/logger';

// ============================================
// Types
// ============================================

export interface NemotronConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  defaultTemperature?: number;
  defaultMaxTokens?: number;
  timeout?: number;
}

export interface NemotronRequest {
  prompt: string;
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  stopSequences?: string[];
  stream?: boolean;
}

export interface NemotronMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface NemotronCompletionRequest {
  messages: NemotronMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  top_k?: number;
  stop?: string[];
  stream?: boolean;
}

export interface NemotronCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface NemotronStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }>;
}

// ============================================
// Nemotron Provider
// ============================================

export class NemotronProvider extends EventEmitter<{
  connected: [];
  disconnected: [reason: string];
  error: [error: Error];
  request_started: [task: string];
  request_completed: [task: string; duration: number];
  request_failed: [task: string; error: Error];
}> {
  private client: AxiosInstance;
  private config: NemotronConfig;
  private status: AIProviderStatus = 'disconnected';
  private health: ProviderHealth = {
    status: 'unknown',
    errorRate: 0,
    lastCheck: new Date().toISOString(),
  };
  private requestCount = 0;
  private errorCount = 0;
  private totalLatency = 0;
  private modelName: string;

  constructor(config: NemotronConfig = {}) {
    super();
    this.config = {
      baseUrl: 'https://integrate.api.nvidia.com/v1',
      model: 'nemotron-3-ultra',
      defaultTemperature: 0.7,
      defaultMaxTokens: 4096,
      timeout: 60000,
      ...config,
    };
    this.modelName = this.config.model || 'nemotron-3-ultra';

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request/response interceptors
    this.client.interceptors.request.use((config) => {
      if (this.config.apiKey) {
        config.headers.Authorization = `Bearer ${this.config.apiKey}`;
      }
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        this.errorCount++;
        return Promise.reject(error);
      }
    );
  }

  async initialize(apiKey: string): Promise<void> {
    if (!apiKey) {
      throw new ValidationError('Nemotron API key required');
    }

    this.config.apiKey = apiKey;
    
    try {
      await this.healthCheck();
      this.status = 'connected';
      this.emit('connected');
      logger.info({ module: 'nemotron' }, 'Nemotron provider connected');
    } catch (error) {
      this.status = 'error';
      this.emit('error', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async healthCheck(): Promise<ProviderHealth> {
    const start = Date.now();
    try {
      const response = await this.client.post('/chat/completions', {
        model: this.modelName,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1,
      }, { timeout: 5000 });

      const latency = Date.now() - start;
      
      this.health = {
        status: 'healthy',
        latency,
        errorRate: this.requestCount > 0 ? this.errorCount / this.requestCount : 0,
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
  // Text Generation
  // ============================================

  async generateText(request: NemotronRequest): Promise<string> {
    const start = Date.now();
    this.requestCount++;

    try {
      const messages: NemotronMessage[] = [];
      
      if (request.systemPrompt) {
        messages.push({ role: 'system', content: request.systemPrompt });
      }
      messages.push({ role: 'user', content: request.prompt });

      const response = await this.client.post<NemotronCompletionResponse>('/chat/completions', {
        model: request.model || this.modelName,
        messages,
        temperature: request.temperature ?? this.config.defaultTemperature ?? 0.7,
        max_tokens: request.maxTokens ?? this.config.defaultMaxTokens ?? 4096,
        top_p: request.topP ?? 0.95,
        top_k: request.topK ?? 50,
        stop: request.stopSequences,
        stream: false,
      });

      const latency = Date.now() - start;
      this.totalLatency += latency;

      const choice = response.data.choices[0];
      if (!choice || !choice.message.content) {
        throw new Error('Empty response from Nemotron');
      }

      this.emit('request_completed', 'generateText', latency);
      return choice.message.content;
    } catch (error) {
      this.errorCount++;
      this.emit('request_failed', 'generateText', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async generateTextStream(request: NemotronRequest): Promise<AsyncIterable<string>> {
    const messages: NemotronMessage[] = [];
    
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    messages.push({ role: 'user', content: request.prompt });

    const response = await this.client.post('/chat/completions', {
      model: request.model || this.modelName,
      messages,
      temperature: request.temperature ?? this.config.defaultTemperature ?? 0.7,
      max_tokens: request.maxTokens ?? this.config.defaultMaxTokens ?? 4096,
      top_p: request.topP ?? 0.95,
      top_k: request.topK ?? 50,
      stop: request.stopSequences,
      stream: true,
    }, {
      responseType: 'stream',
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of response.data) {
          const lines = chunk.toString().split('\n').filter(line => line.startsWith('data: '));
          for (const line of lines) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                controller.enqueue(content);
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
        controller.close();
      }
    });

    return {
      [Symbol.asyncIterator]() {
        const reader = stream.getReader();
        return {
          async next() {
            const { done, value } = await reader.read();
            if (done) return { done: true, value: undefined };
            return { done: false, value };
          },
        };
      };
    }
  }

  // ============================================
  // Vision/Video Analysis (Nemotron specialty)
  // ============================================

  async analyzeImage(imageBase64: string, prompt: string): Promise<string> {
    const messages = [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${imageBase64}`,
              detail: 'high',
            },
          },
        ],
      };

    const response = await this.client.post<NemotronCompletionResponse>('/chat/completions', {
      model: 'nemotron-3-ultra',
      messages,
      max_tokens: 4096,
      temperature: 0.3,
    });

    return response.data.choices[0]?.message?.content || '';
  }

  async analyzeVideo(framesBase64: string[], prompt: string): Promise<string> {
    const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
      { type: 'text', text: prompt },
    ];

    for (const frame of framesBase64) {
      content.push({
        type: 'image_url',
        image_url: {
          url: `data:image/jpeg;base64,${frame}`,
          detail: 'high',
        },
      });
    }

    const messages = [{ role: 'user', content }];

    const response = await this.client.post<NemotronCompletionResponse>('/chat/completions', {
      model: 'nemotron-3-ultra',
      messages,
      max_tokens: 4096,
      temperature: 0.3,
    });

    return response.data.choices[0]?.message?.content || '';
  }

  // ============================================
  // Video QA (Nemotron Specialty)
  // ============================================

  async analyzeVideoQA(
    framesBase64: string[],
    criteria: {
      checkComposition?: boolean;
      checkConsistency?: boolean;
      checkText?: boolean;
      checkSubtitles?: boolean;
      checkArtifacts?: boolean;
      checkContinuity?: boolean;
      checkLighting?: boolean;
      checkAudioSync?: boolean;
    }
  ): Promise<{
    score: number;
    issues: Array<{
      severity: 'critical' | 'high' | 'medium' | 'low';
      type: string;
      description: string;
      frameIndex?: number;
      recommendedFix: string;
    }>;
    summary: string;
  }> {
    const criteriaList = Object.entries(criteria)
      .filter(([_, enabled]) => enabled)
      .map(([key]) => key)
      .join(', ');

    const prompt = `Analyze this video sequence for quality issues. Check for: ${criteriaList}.
    
    For each issue found, provide:
    1. Severity (critical/high/medium/low)
    2. Type (composition/consistency/text/subtitles/artifacts/continuity/lighting/audio_sync)
    3. Description
    4. Frame index (if applicable)
    5. Recommended fix
    
    Return as JSON with score (0-10), issues array, and summary.`;

    const messages = [
      { role: 'system', content: 'You are an expert video quality analyst. Analyze video frames for quality issues.' },
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          ...framesBase64.map(frame => ({
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${frame}`, detail: 'high' },
          })),
        ],
      },
    ];

    const response = await this.client.post<NemotronCompletionResponse>('/chat/completions', {
      model: 'nemotron-3-ultra',
      messages,
      max_tokens: 4096,
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    try {
      return JSON.parse(response.data.choices[0]?.message?.content || '{}');
    } catch {
      throw new Error('Failed to parse Nemotron QA response');
    }
  }

  // ============================================
  // Provider Interface
  // ============================================

  getName(): AIProviderName {
    return 'nemotron';
  }

  getStatus(): AIProviderStatus {
    return this.status;
  }

  getHealth(): ProviderHealth {
    return this.health;
  }

  getCapabilities(): AIProviderCapabilities {
    return {
      text: true,
      vision: true,
      audio: false,
      videoAnalysis: true,
      structuredOutput: true,
      toolCalling: false,
      streaming: true,
      maxTokens: 128000,
      supportedModels: ['nemotron-3-ultra', 'nemotron-3-ultra-550b'],
    };
  }

  getConfig(): ProviderConfig {
    return {
      model: this.modelName,
      temperature: this.config.defaultTemperature,
      maxTokens: this.config.defaultMaxTokens,
    };
  }

  isHealthy(): boolean {
    return this.health.status === 'healthy';
  }

  getMetrics() {
    return {
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      errorRate: this.requestCount > 0 ? this.errorCount / this.requestCount : 0,
      avgLatency: this.requestCount > 0 ? this.totalLatency / this.requestCount : 0,
      status: this.status,
      health: this.health,
    };
  }

  async disconnect(): Promise<void> {
    this.status = 'disconnected';
    this.emit('disconnected', 'user_requested');
  }

  getStatus(): AIProviderStatus {
    return this.status;
  }
}

// ============================================
// Factory Functions
// ============================================

export async function createNemotronProvider(config: NemotronConfig = {}): Promise<NemotronProvider> {
  const provider = new NemotronProvider(config);
  await provider.initialize(config.apiKey || process.env.NEMOTRON_API_KEY || '');
  return provider;
}

export { AIProviderName } from '@vince-ai/shared';