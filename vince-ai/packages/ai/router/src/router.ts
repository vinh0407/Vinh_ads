import { EventEmitter } from 'eventemitter3';
import {
  AIProviderName,
  AIProviderStatus,
  AIProviderCapabilities,
  ProviderHealth,
  AIProvider,
  TaskType,
  TaskRouting,
  AIRouteRequest,
  AIRouteResponse,
  RoutingConstraints,
  RoutingPreferences,
  Result,
  ok,
  err,
  VinceError,
  ValidationError,
} from '@vince-ai/shared';
import { logger } from '@vince-ai/shared/logger';
import { GeminiProvider } from '@vince-ai/ai-gemini';
import { NemotronProvider } from '@vince-ai/ai-nemotron';
import { OpenCodeProvider } from '@vince-ai/ai-opencode';

// ============================================
// Types
// ============================================

export interface RoutingRule {
  task: string;
  primaryProvider: AIProviderName;
  fallbackProviders: AIProviderName[];
  requiredCapabilities: string[];
  preferredModels?: Record<AIProviderName, string>;
  reasoning: string;
  costWeight: number;
  speedWeight: number;
  qualityWeight: number;
}

export interface RoutingContext {
  task: TaskType;
  input: unknown;
  constraints?: RoutingConstraints;
  preferences?: RoutingPreferences;
  userId?: string;
  projectId?: string;
}

export interface ProviderOption {
  provider: AIProviderName;
  model?: string;
  score: number;
  reasoning: string;
  estimatedCost: number;
  estimatedTime: number;
  capabilities: AIProviderCapabilities;
}

export interface RoutingDecision {
  primary: ProviderOption;
  fallbacks: ProviderOption[];
  reasoning: string;
  confidence: number;
  estimatedTotalCost: number;
  estimatedTotalTime: number;
}

// ============================================
// Task Classifier
// ============================================

export class TaskClassifier {
  private classifierPrompt = `Classify the following user request into one of these task types:

TASK TYPES:
- script_generation: Creating video scripts, content scripts, marketing copy
- research: Information gathering, fact-finding, data collection
- creative_content: Creative writing, storytelling, ideation
- marketing_strategy: Marketing plans, campaigns, positioning
- caption: Social media captions, short descriptions
- product_analysis: Analyzing products, features, reviews
- visual_analysis: Analyzing images, charts, diagrams
- video_qa: Quality checking videos, finding issues
- video_generation: Creating videos from prompts/assets
- image_generation: Creating images from prompts
- audio_generation: Text-to-speech, voice generation
- translation: Language translation
- summarization: Summarizing content
- fact_check: Verifying facts, claims
- coding: Programming, debugging, code generation
- reasoning: Complex logical reasoning
- planning: Project planning, task breakdown

Respond with ONLY the task type, nothing else.`;

  async classify(prompt: string, context?: string): Promise<string> {
    // In a real implementation, this would use a small/fast model
    // For now, use keyword-based classification
    return this.classifyByKeywords(prompt.toLowerCase());
  }

  private classifyByKeywords(prompt: string): string {
    const keywords: Record<string, string[]> = {
      script_generation: ['script', 'video script', 'screenplay', 'dialogue', 'scene'],
      research: ['research', 'find', 'search', 'investigate', 'analyze data', 'study'],
      creative_content: ['creative', 'story', 'write', 'brainstorm', 'ideas', 'imagine'],
      marketing_strategy: ['marketing', 'campaign', 'strategy', 'promote', 'advertise', 'brand'],
      caption: ['caption', 'hashtag', 'instagram', 'tiktok', 'social media post'],
      product_analysis: ['product', 'review', 'analyze product', 'compare', 'vs', 'versus'],
      visual_analysis: ['analyze image', 'describe image', 'what is in this image', 'look at'],
      video_qa: ['check video', 'video quality', 'video issues', 'check quality'],
      video_generation: ['generate video', 'create video', 'make video', 'produce video'],
      image_generation: ['generate image', 'create image', 'make image', 'draw'],
      audio_generation: ['voice', 'speech', 'tts', 'text to speech', 'narration'],
      translation: ['translate', 'in english', 'in vietnamese', 'convert to'],
      summarization: ['summarize', 'summary', 'tldr', 'brief'],
      fact_check: ['fact check', 'verify', 'true or false', 'accurate'],
      coding: ['code', 'program', 'function', 'debug', 'api', 'script', 'algorithm'],
      reasoning: ['why', 'how', 'explain', 'reason', 'logic', 'analyze'],
      planning: ['plan', 'schedule', 'roadmap', 'timeline', 'strategy', 'steps'],
    };

    const lowerPrompt = prompt.toLowerCase();
    
    for (const [task, keywords] of Object.entries(keywords)) {
      if (keywords.some(keyword => lowerPrompt.includes(keyword))) {
        return task;
      }
    }

    return 'reasoning'; // Default fallback
  }
}

// ============================================
// AI Router
// ============================================

export interface RoutingRule {
  taskPattern: string[];
  primaryProvider: 'gemini' | 'nemotron' | 'opencode';
  fallbackProviders: ('gemini' | 'nemotron' | 'opencode')[];
  requiredCapabilities: string[];
  preferredModels?: Record<string, string>;
  reasoning: string;
  costWeight: number;
  speedWeight: number;
  qualityWeight: number;
}

export interface RoutingContext {
  task: string;
  input: unknown;
  constraints?: {
    maxCost?: number;
    maxTime?: number;
    requiredCapabilities?: string[];
    excludedProviders?: string[];
    preferredModel?: string;
    minQuality?: number;
  };
  preferences?: {
    preferSpeed?: boolean;
    preferQuality?: boolean;
    preferCost?: boolean;
  };
}

export interface ProviderOption {
  provider: 'gemini' | 'nemotron' | 'opencode';
  model?: string;
  score: number;
  reasoning: string;
  estimatedCost: number;
  estimatedTime: number;
  capabilities: any;
}

export interface RoutingDecision {
  primary: {
    provider: 'gemini' | 'nemotron' | 'opencode';
    model?: string;
    score: number;
    reasoning: string;
    estimatedCost: number;
    estimatedTime: number;
  };
  fallbacks: Array<{
    provider: 'gemini' | 'nemotron' | 'opencode';
    model?: string;
    score: number;
  }>;
  reasoning: string;
  confidence: number;
  estimatedTotalCost: number;
  estimatedTotalTime: number;
}

export class AIRouter {
  private providers: Map<string, any> = new Map();
  private routingRules: Map<string, RoutingRule> = new Map();
  private providerInstances: Map<string, any> = new Map();

  constructor() {
    this.initializeDefaultRules();
  }

  private initializeDefaultRules(): void {
    const rules: RoutingRule[] = [
      {
        taskPattern: ['script_generation', 'creative_content', 'marketing_strategy'],
        primaryProvider: 'gemini',
        fallbackProviders: ['nemotron'],
        requiredCapabilities: ['text', 'structuredOutput', 'toolCalling'],
        preferredModels: { gemini: 'gemini-1.5-pro', nemotron: 'nemotron-3-ultra' },
        reasoning: 'Gemini excels at creative writing and structured content generation',
        costWeight: 0.3,
        speedWeight: 0.3,
        qualityWeight: 0.4,
      },
      {
        taskPattern: ['research', 'fact_check', 'reasoning', 'planning'],
        primaryProvider: 'gemini',
        fallbackProviders: ['nemotron'],
        requiredCapabilities: ['text', 'reasoning', 'toolCalling'],
        preferredModels: { gemini: 'gemini-1.5-pro', nemotron: 'nemotron-3-ultra' },
        reasoning: 'Gemini excels at research and complex reasoning',
        costWeight: 0.3,
        speedWeight: 0.2,
        qualityWeight: 0.5,
      },
      {
        taskPattern: ['visual_analysis', 'video_qa'],
        primaryProvider: 'nemotron',
        fallbackProviders: ['gemini'],
        requiredCapabilities: ['vision', 'videoAnalysis'],
        preferredModels: { nemotron: 'nemotron-3-ultra', gemini: 'gemini-1.5-pro' },
        reasoning: 'Nemotron excels at visual and video analysis',
        costWeight: 0.2,
        speedWeight: 0.2,
        qualityWeight: 0.6,
      },
      {
        taskPattern: ['coding', 'code_review', 'debugging'],
        primaryProvider: 'opencode',
        fallbackProviders: ['gemini'],
        requiredCapabilities: ['toolCalling', 'coding'],
        preferredModels: { opencode: 'opencode', gemini: 'gemini-1.5-pro' },
        reasoning: 'OpenCode specializes in code operations',
        costWeight: 0.4,
        speedWeight: 0.3,
        qualityWeight: 0.3,
      },
      {
        taskPattern: ['caption', 'translation', 'summarization'],
        primaryProvider: 'gemini',
        fallbackProviders: ['nemotron'],
        requiredCapabilities: ['text'],
        preferredModels: { gemini: 'gemini-1.5-flash', nemotron: 'nemotron-3-ultra' },
        reasoning: 'Fast models sufficient for short-form content',
        costWeight: 0.5,
        speedWeight: 0.3,
        qualityWeight: 0.2,
      },
    ];

    for (const rule of this.routingRules) {
      for (const pattern of rule.taskPattern) {
        this.routingRules.set(pattern, rule);
      }
    }
  }

  registerProvider(name: string, provider: any): void {
    this.providers.set(name, provider);
  }

  getProvider(name: string): any {
    return this.providers.get(name);
  }

  async route(context: RoutingContext): Promise<RoutingDecision> {
    // Classify task
    const task = await this.classifyTask(context.input);
    
    // Get routing rule
    const rule = this.routingRules.get(task);
    if (!rule) {
      // Default to gemini for unknown tasks
      return this.createDefaultDecision('gemini', 'gemini-1.5-pro', 'Default routing to Gemini');
    }

    // Score providers
    const scoredProviders = this.scoreProviders(rule, context);
    
    // Select primary
    const primary = scoredProviders[0];
    const fallbacks = scoredProviders.slice(1, 3);

    return {
      primary: {
        provider: primary.provider,
        model: primary.model,
        score: primary.score,
        reasoning: primary.reasoning,
        estimatedCost: primary.estimatedCost,
        estimatedTime: primary.estimatedTime,
      },
      fallbacks,
      reasoning: primary.reasoning,
      confidence: primary.score,
      estimatedTotalCost: primary.estimatedCost,
      estimatedTotalTime: primary.estimatedTime,
    };
  }

  private async classifyTask(input: unknown): Promise<string> {
    const prompt = typeof input === 'string' ? input : JSON.stringify(input);
    // Use keyword-based classification for speed
    const classifier = new TaskClassifier();
    return classifier.classify(prompt);
  }

  private scoreProviders(rule: RoutingRule, context: RoutingContext): Array<{
    provider: 'gemini' | 'nemotron' | 'opencode';
    model: string;
    score: number;
    reasoning: string;
    estimatedCost: number;
    estimatedTime: number;
  }> {
    const scores: Array<{
      provider: 'gemini' | 'nemotron' | 'opencode';
      model: string;
      score: number;
      reasoning: string;
      estimatedCost: number;
      estimatedTime: number;
    }> = [];

    // Score primary provider
    const primaryModel = rule.preferredModels?.[rule.primaryProvider] || this.getDefaultModel(rule.primaryProvider);
    scores.push({
      provider: rule.primaryProvider,
      model: primaryModel,
      score: 0.9,
      reasoning: rule.reasoning,
      estimatedCost: this.estimateCost(rule.primaryProvider, primaryModel),
      estimatedTime: this.estimateTime(rule.primaryProvider, primaryModel),
    });

    // Score fallbacks
    for (const fallback of rule.fallbackProviders) {
      const fallbackModel = rule.preferredModels?.[fallback] || this.getDefaultModel(fallback);
      scores.push({
        provider: fallback,
        model: fallbackModel,
        score: 0.7,
        reasoning: `Fallback: ${rule.reasoning}`,
        estimatedCost: this.estimateCost(fallback, fallbackModel),
        estimatedTime: this.estimateTime(fallback, fallbackModel),
      });
    }

    // Sort by score
    return scores.sort((a, b) => b.score - a.score);
  }

  private getDefaultModel(provider: string): string {
    const defaults: Record<string, string> = {
      gemini: 'gemini-1.5-pro',
      nemotron: 'nemotron-3-ultra',
      opencode: 'opencode',
    };
    return defaults[provider] || '';
  }

  private estimateCost(provider: string, model: string): number {
    const costs: Record<string, number> = {
      'gemini-1.5-pro': 0.0035,
      'gemini-1.5-flash': 0.000075,
      'gemini-1.0-pro': 0.0005,
      'nemotron-3-ultra': 0.005,
      'opencode': 0,
    };
    return costs[model] || 0.001;
  }

  private estimateTime(provider: string, model: string): number {
    const times: Record<string, number> = {
      'gemini-1.5-pro': 5000,
      'gemini-1.5-flash': 2000,
      'gemini-1.0-pro': 3000,
      'nemotron-3-ultra': 8000,
      'opencode': 10000,
    };
    return times[model] || 5000;
  }

  private createDefaultDecision(provider: string, model: string, reasoning: string): RoutingDecision {
    return {
      primary: {
        provider: provider as any,
        model,
        score: 0.8,
        reasoning,
        estimatedCost: 0.001,
        estimatedTime: 5000,
      },
      fallbacks: [],
      reasoning,
      confidence: 0.8,
      estimatedTotalCost: 0.001,
      estimatedTotalTime: 5000,
    };
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  getProviderStatus(provider: string): AIProviderStatus | null {
    const instance = this.providerInstances.get(provider);
    return instance?.getStatus?.() || null;
  }
}

export function createAIRouter(): AIRouter {
  return new AIRouter();
}

export { TaskType } from '@vince-ai/shared';