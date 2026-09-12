import { GoogleGenerativeAI, GenerativeModel, GenerativeContentBlob, SafetySetting } from '@google/generative-ai';
import { EventEmitter } from 'eventemitter3';
import {
  ID,
  Timestamp,
  AIProvider,
  AIProviderCapabilities,
  AIProviderName,
  ProviderAuth,
  ProviderHealth,
  ProviderError,
  ProviderConfig,
  AIProviderStatus,
  TaskType,
  TaskRouting,
  AIRouteRequest,
  AIRouteResponse,
  ToolDefinition,
  ToolContext,
  ToolResult,
  ToolPermission,
  Result,
  ok,
  err,
  ProviderError as ProviderErrorClass,
  ValidationError,
  logger,
  AIProviderCapabilities as SharedCapabilities,
} from '@vince-ai/shared';
import { logger as sharedLogger } from '@vince-ai/shared/logger';
import { Result as SharedResult, ok as sharedOk, err as sharedErr } from '@vince-ai/shared';

// ============================================
// Types
// ============================================

export interface GeminiConfig {
  apiKey?: string;
  accessToken?: string;
  projectId?: string;
  location?: string;
  model?: string;
  defaultTemperature?: number;
  defaultMaxTokens?: number;
}

export interface GeminiGenerationConfig {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  candidateCount?: number;
  stopSequences?: string[];
}

export interface GeminiSafetySettings {
  category: 'HARM_CATEGORY_HARASSMENT' | 'HARM_CATEGORY_HATE_SPEECH' | 'HARM_CATEGORY_SEXUALLY_EXPLICIT' | 'HARM_CATEGORY_DANGEROUS_CONTENT';
  threshold: 'BLOCK_NONE' | 'BLOCK_LOW_AND_ABOVE' | 'BLOCK_MEDIUM_AND_ABOVE' | 'BLOCK_ONLY_HIGH';
}

export interface GenerateTextRequest {
  prompt: string;
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  stopSequences?: string[];
  safetySettings?: GeminiSafetySettings[];
}

export interface GenerateStructuredOutputRequest {
  prompt: string;
  schema: object;
  systemPrompt?: string;
  model?: string;
  temperature?: number;
}

export interface AnalyzeContentRequest {
  content: string;
  analysisType: 'sentiment' | 'entities' | 'categories' | 'summarize' | 'extract' | 'classify';
  schema?: object;
}

export interface BatchGenerateRequest {
  prompts: string[];
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

// ============================================
// Gemini Provider
// ============================================

export class GeminiProvider extends EventEmitter<{
  connected: [];
  disconnected: [reason: string];
  error: [error: Error];
  request_started: [task: string];
  request_completed: [task: string; duration: number];
  request_failed: [task: string; error: Error];
}> {
  private genAI: GoogleGenerativeAI | null = null;
  private model: GenerativeModel | null = null;
  private config: GeminiConfig;
  private status: AIProviderStatus = 'disconnected';
  private accessToken: string | null = null;
  private apiKey: string | null = null;
  private health: ProviderHealth = {
    status: 'unknown',
    errorRate: 0,
    lastCheck: new Date().toISOString(),
  };
  private requestCount = 0;
  private errorCount = 0;
  private totalLatency = 0;
  private modelName: string;

  constructor(config: GeminiConfig = {}) {
    super();
    this.config = config;
    this.modelName = config.model || 'gemini-1.5-pro';
  }

  /**
   * Initializes the Gemini provider with authentication
   */
  async initialize(auth: { accessToken?: string; apiKey?: string }): Promise<void> {
    try {
      if (auth.apiKey) {
        this.apiKey = auth.apiKey;
        this.genAI = new GoogleGenerativeAI(auth.apiKey);
      } else if (auth.accessToken) {
        // For OAuth-based authentication, we'd use a different client
        // For now, we'll use API key approach as fallback
        this.accessToken = auth.accessToken;
        // Note: GoogleGenerativeAI doesn't directly support OAuth tokens
        // Would need to use REST API directly or use Vertex AI
        this.apiKey = process.env.GEMINI_API_KEY;
        if (!this.apiKey) {
          throw new Error('Gemini API key required when using access token');
        }
        this.genAI = new GoogleGenerativeAI(this.apiKey);
      } else {
        this.apiKey = process.env.GEMINI_API_KEY;
        if (!this.apiKey) {
          throw new Error('Gemini API key or access token required');
        }
        this.genAI = new GoogleGenerativeAI(this.apiKey);
      }

      this.model = this.genAI.getGenerativeModel({
        model: this.modelName,
        generationConfig: {
          temperature: this.config.defaultTemperature ?? 0.7,
          maxOutputTokens: this.config.defaultMaxTokens ?? 8192,
          topP: 0.95,
          topK: 40,
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        ],
      });

      await this.healthCheck();
      this.status = 'connected';
      this.emit('connected');
      sharedLogger.info({ module: 'gemini' }, 'Gemini provider connected');
    } catch (error) {
      this.status = 'error';
      this.emit('error', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async healthCheck(): Promise<ProviderHealth> {
    const start = Date.now();
    try {
      if (!this.model) {
        throw new Error('Model not initialized');
      }

      const result = await this.model.generateContent('ping');
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

  async generateText(request: GenerateTextRequest): Promise<string> {
    const start = Date.now();
    this.requestCount++;

    try {
      if (!this.model) {
        throw new Error('Model not initialized');
      }

      const model = request.model 
        ? this.genAI!.getGenerativeModel({ model: request.model })
        : this.model!;

      const prompt = request.systemPrompt 
        ? `${request.systemPrompt}\n\n${request.prompt}`
        : request.prompt;

      const generationConfig = {
        temperature: request.temperature ?? this.config.defaultTemperature ?? 0.7,
        maxOutputTokens: request.maxTokens ?? this.config.defaultMaxTokens ?? 8192,
        topP: request.topP ?? 0.95,
        topK: request.topK ?? 40,
        stopSequences: request.stopSequences,
      };

      const safetySettings = request.safetySettings ?? [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      ];

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig,
        safetySettings,
      });

      const response = await result.response;
      const text = response.text();

      this.emit('request_completed', 'generateText', Date.now() - start);
      return text;
    } catch (error) {
      this.errorCount++;
      this.emit('request_failed', 'generateText', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async generateTextStream(request: GenerateTextRequest): Promise<AsyncIterable<string>> {
    if (!this.model) {
      throw new Error('Model not initialized');
    }

    const model = request.model 
      ? this.genAI!.getGenerativeModel({ model: request.model })
      : this.model!;

    const prompt = request.systemPrompt 
      ? `${request.systemPrompt}\n\n${request.prompt}`
      : request.prompt;

    const generationConfig = {
      temperature: request.temperature ?? this.config.defaultTemperature ?? 0.7,
      maxOutputTokens: request.maxTokens ?? this.config.defaultMaxTokens ?? 8192,
      topP: request.topP ?? 0.95,
      topK: request.topK ?? 40,
    };

    const result = await model.generateContentStream({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            controller.enqueue(encoder.encode(text));
          }
        }
        controller.close();
      }
    });

    return {
      [Symbol.asyncIterator]() {
        return stream.getReader();
      }
    } as AsyncIterable<string>;
  }

  // ============================================
  // Structured Output
  // ============================================

  async generateStructuredOutput<T>(request: GenerateStructuredOutputRequest): Promise<T> {
    const start = Date.now();
    this.requestCount++;

    try {
      if (!this.model) {
        throw new Error('Model not initialized');
      }

      const schema = JSON.stringify(request.schema, null, 2);
      const prompt = `${request.systemPrompt || ''}\n\n${request.prompt}\n\nReturn the result as valid JSON matching this schema:\n${schema}\n\nOutput only the JSON, no additional text.`;

      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: request.temperature ?? 0.1,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json',
        },
      });

      const response = await result.response;
      const text = response.text();

      try {
        const parsed = JSON.parse(text);
        this.emit('request_completed', 'generateStructuredOutput', Date.now() - start);
        return parsed as T;
      } catch (parseError) {
        throw new Error(`Failed to parse structured output: ${parseError}`);
      }
    } catch (error) {
      this.errorCount++;
      this.emit('request_failed', 'generateStructuredOutput', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  // ============================================
  // Content Analysis
  // ============================================

  async analyzeContent(request: AnalyzeContentRequest): Promise<unknown> {
    const start = Date.now();
    this.requestCount++;

    try {
      if (!this.model) {
        throw new Error('Model not initialized');
      }

      const analysisPrompts: Record<string, string> = {
        sentiment: 'Analyze the sentiment of this content. Return: overall sentiment (positive/negative/neutral), confidence score (0-1), and key emotional drivers.',
        entities: 'Extract all named entities (people, organizations, locations, products, dates). Return as JSON array with entity name, type, and context.',
        categories: 'Classify this content into relevant categories. Return as JSON array with category names and confidence scores.',
        summarize: 'Provide a concise summary of this content in 3-5 sentences.',
        extract: 'Extract key facts, numbers, dates, and actionable insights. Return as structured JSON.',
        classify: 'Classify this content into predefined categories. Return category and confidence.',
      };

      const prompt = `${request.systemPrompt || ''}\n\nAnalyze the following content:\n\n${request.content}\n\n${analysisPrompts[request.analysisType] || analysisPrompts.summarize}`;

      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 4096,
          responseMimeType: request.schema ? 'application/json' : 'text/plain',
        },
      });

      const response = await result.response;
      const text = response.text();

      if (request.schema) {
        return JSON.parse(text);
      }

      this.emit('request_completed', 'analyzeContent', Date.now() - start);
      return text;
    } catch (error) {
      this.errorCount++;
      this.emit('request_failed', 'analyzeContent', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  // ============================================
  // Batch Generation
  // ============================================

  async batchGenerate(request: BatchGenerateRequest): Promise<string[]> {
    const results: string[] = [];

    for (const prompt of request.prompts) {
      const result = await this.generateText({
        prompt,
        systemPrompt: request.systemPrompt,
        model: request.model,
        temperature: request.temperature,
        maxTokens: request.maxTokens,
      });
      results.push(result);
    }

    return results;
  }

  // ============================================
  // Provider Interface
  // ============================================

  getName(): AIProviderName {
    return 'gemini';
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
      audio: true,
      videoAnalysis: false,
      structuredOutput: true,
      toolCalling: true,
      streaming: true,
      maxTokens: 2048000,
      supportedModels: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro', 'gemini-pro-vision'],
    };
  }

  getConfig(): ProviderConfig {
    return {
      model: this.modelName,
      temperature: this.config.defaultTemperature,
      maxTokens: this.config.defaultMaxTokens,
    };
  }

  getCapabilities(): SharedCapabilities {
    return {
      text: true,
      vision: true,
      audio: true,
      videoAnalysis: false,
      structuredOutput: true,
      toolCalling: true,
      streaming: true,
      maxTokens: 2048000,
      supportedModels: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro', 'gemini-pro-vision'],
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
    this.genAI = null;
    this.model = null;
    this.emit('disconnected', 'user_requested');
  }

  getStatus(): AIProviderStatus {
    return this.status;
  }
}

// ============================================
// Factory Functions
// ============================================

export async function createGeminiProvider(config: GeminiConfig = {}): Promise<GeminiProvider> {
  const provider = new GeminiProvider(config);
  await provider.initialize({});
  return provider;
}

export { GoogleGenerativeAI } from '@google/generative-ai';
export type { GenerateTextRequest, GenerateStructuredOutputRequest, AnalyzeContentRequest, BatchGenerateRequest };