import { z } from 'zod';
import { Result, ok, err, VinceError } from '@vince-ai/shared';
import { GeminiProvider } from './provider';
import { GEMINI_MODELS, getRecommendedModel } from './models';
import { TaskType, AIProviderName } from '@vince-ai/shared';

/**
 * Gemini Task Router
 * Routes tasks to appropriate models based on type, constraints, and preferences
 */

export interface RoutingRule {
  task: TaskType;
  primaryModel: string;
  fallbackModels: string[];
  reasoning: string;
  preferredCapabilities: string[];
}

export const GEMINI_ROUTING_RULES: RoutingRule[] = [
  {
    task: 'script_generation',
    primaryModel: 'gemini-1.5-pro',
    fallbackModels: ['gemini-1.5-flash', 'gemini-1.0-pro'],
    reasoning: 'Script generation requires strong reasoning and creativity',
    preferredCapabilities: ['text', 'structuredOutput', 'toolCalling'],
  },
  {
    task: 'research',
    primaryModel: 'gemini-1.5-pro',
    fallbackModels: ['gemini-1.5-flash', 'gemini-1.0-pro'],
    reasoning: 'Research requires deep reasoning and large context',
    preferredCapabilities: ['text', 'vision', 'structuredOutput', 'toolCalling'],
  },
  {
    task: 'creative_content',
    primaryModel: 'gemini-1.5-pro',
    fallbackModels: ['gemini-1.5-flash'],
    reasoning: 'Creative content needs high-quality generation',
    preferredCapabilities: ['text', 'structuredOutput'],
  },
  {
    task: 'marketing_strategy',
    primaryModel: 'gemini-1.5-pro',
    fallbackModels: ['gemini-1.5-flash'],
    reasoning: 'Marketing strategy requires strategic reasoning',
    preferredCapabilities: ['text', 'reasoning', 'structuredOutput'],
  },
  {
    task: 'caption',
    primaryModel: 'gemini-1.5-flash',
    fallbackModels: ['gemini-1.5-pro', 'gemini-1.0-pro'],
    reasoning: 'Captions need creativity but speed matters',
    preferredCapabilities: ['text', 'structuredOutput'],
  },
  {
    task: 'product_analysis',
    primaryModel: 'gemini-1.5-pro',
    fallbackModels: ['gemini-1.5-flash'],
    reasoning: 'Product analysis requires deep understanding',
    preferredCapabilities: ['text', 'vision', 'structuredOutput'],
  },
  {
    task: 'visual_analysis',
    primaryModel: 'gemini-1.5-pro',
    fallbackModels: ['gemini-1.5-flash'],
    reasoning: 'Visual analysis requires vision capabilities',
    preferredCapabilities: ['vision', 'structuredOutput'],
  },
  {
    task: 'video_qa',
    primaryModel: 'gemini-1.5-pro',
    fallbackModels: ['gemini-1.5-flash'],
    reasoning: 'Video QA requires video analysis capabilities',
    preferredCapabilities: ['videoAnalysis', 'vision', 'structuredOutput'],
  },
  {
    task: 'translation',
    primaryModel: 'gemini-1.5-flash',
    fallbackModels: ['gemini-1.5-pro', 'gemini-1.0-pro'],
    reasoning: 'Translation needs speed and accuracy',
    preferredCapabilities: ['text'],
  },
  {
    task: 'summarization',
    primaryModel: 'gemini-1.5-flash',
    fallbackModels: ['gemini-1.5-pro', 'gemini-1.0-pro'],
    reasoning: 'Summarization needs speed and comprehension',
    preferredCapabilities: ['text', 'structuredOutput'],
  },
  {
    task: 'fact_check',
    primaryModel: 'gemini-1.5-pro',
    fallbackModels: ['gemini-1.5-flash'],
    reasoning: 'Fact checking requires accurate reasoning',
    preferredCapabilities: ['text', 'toolCalling', 'structuredOutput'],
  },
  {
    task: 'coding',
    primaryModel: 'gemini-1.5-pro',
    fallbackModels: ['gemini-1.5-flash'],
    reasoning: 'Coding requires strong reasoning and logic',
    preferredCapabilities: ['text', 'toolCalling', 'structuredOutput'],
  },
  {
    task: 'reasoning',
    primaryModel: 'gemini-1.5-pro',
    fallbackModels: ['gemini-1.5-flash'],
    reasoning: 'Complex reasoning requires most capable model',
    preferredCapabilities: ['text', 'reasoning', 'toolCalling'],
  },
  {
    task: 'planning',
    primaryModel: 'gemini-1.5-pro',
    fallbackModels: ['gemini-1.5-flash'],
    reasoning: 'Planning requires strategic thinking',
    preferredCapabilities: ['text', 'reasoning', 'toolCalling'],
  },
};

export interface RoutingConstraints {
  maxCost?: number;
  maxTime?: number;
  requiredCapabilities?: string[];
  excludedProviders?: AIProviderName[];
  preferredModel?: string;
  minQuality?: number;
}

export interface RoutingPreferences {
  preferSpeed?: boolean;
  preferQuality?: boolean;
  preferCost?: boolean;
}

export interface RoutingDecision {
  provider: AIProviderName;
  model: string;
  reasoning: string;
  confidence: number;
  estimatedCost: number;
  estimatedTime: number;
  fallbacks: string[];
  constraints: RoutingConstraints;
}

export class GeminiRouter {
  private routingRules: Map<TaskType, typeof GEMINI_ROUTING_RULES[0]> = new Map();

  constructor() {
    for (const rule of GEMINI_ROUTING_RULES) {
      this.routingRules.set(rule.task, rule);
    }
  }

  route(request: {
    task: TaskType;
    constraints?: RoutingConstraints;
    preferences?: RoutingPreferences;
  }): Result<RoutingDecision, VinceError> {
    const rule = this.routingRules.get(request.task);
    
    if (!rule) {
      return err(new VinceError(
        `No routing rule for task: ${request.task}`,
        'NO_ROUTING_RULE',
        400
      ));
    }

    // Start with primary model
    let selectedModel = rule.primaryModel;
    let reasoning = rule.reasoning;
    let confidence = 0.9;

    // Apply constraints
    if (request.constraints) {
      const constraints = request.constraints;
      
      // Check required capabilities
      if (constraints.requiredCapabilities) {
        // In a real implementation, check model capabilities
      }

      // Check excluded providers
      if (constraints.excludedProviders?.includes('gemini')) {
        return err(new VinceError('Gemini provider excluded', 'PROVIDER_EXCLUDED', 400));
      }

      // Check preferred model
      if (constraints.preferredModel && GEMINI_MODELS[constraints.preferredModel]) {
        selectedModel = constraints.preferredModel;
        reasoning += ` (User preferred: ${selectedModel})`;
      }

      // Apply preferences
      if (request.preferences) {
        if (request.preferences.preferSpeed && selectedModel !== 'gemini-1.5-flash') {
          selectedModel = 'gemini-1.5-flash';
          reasoning += ' (Optimized for speed)';
        }
        if (request.preferences.preferQuality && selectedModel !== 'gemini-1.5-pro') {
          selectedModel = 'gemini-1.5-pro';
          reasoning += ' (Optimized for quality)';
        }
        if (request.preferences.preferCost && selectedModel !== 'gemini-1.5-flash') {
          selectedModel = 'gemini-1.5-flash';
          reasoning += ' (Optimized for cost)';
        }
        if (request.preferences.preferredModel) {
          selectedModel = request.preferences.preferredModel;
          reasoning += ` (User preferred: ${selectedModel})`;
        }
      }
    }

    const modelConfig = {
      'gemini-1.5-pro': { costPer1kIn: 0.0035, costPer1kOut: 0.0105, latency: 'medium' },
      'gemini-1.5-flash': { costPer1kIn: 0.000075, costPer1kOut: 0.0003, latency: 'low' },
      'gemini-1.0-pro': { costPer1kIn: 0.0005, costPer1kOut: 0.0015, latency: 'low' },
    };

    const modelInfo = GEMINI_MODELS[selectedModel];
    const costInfo = {
      'gemini-1.5-pro': { costPer1kIn: 0.0035, costPer1kOut: 0.0105 },
      'gemini-1.5-flash': { costPer1kIn: 0.000075, costPer1kOut: 0.0003 },
      'gemini-1.0-pro': { costPer1kIn: 0.0005, costPer1kOut: 0.0015 },
    }[selectedModel];

    return ok({
      provider: 'gemini',
      model: selectedModel,
      reasoning,
      confidence,
      estimatedCost: (costInfo.costPer1kIn + costInfo.costPer1kOut) / 1000,
      estimatedTime: modelInfo?.latency === 'low' ? 2000 : modelInfo?.latency === 'medium' ? 5000 : 10000,
      fallbacks: rule.fallbackModels,
      constraints: request.constraints || {},
    });
  }

  getModelInfo(modelName: string) {
    return GEMINI_MODELS[modelName];
  }

  getAvailableModels() {
    return Object.entries(GEMINI_MODELS).map(([name, config]) => ({
      name,
      ...config,
    }));
  }

  getRecommendedModel(task: string): string {
    return getRecommendedModel(task as any);
  }

  addCustomRule(rule: typeof GEMINI_ROUTING_RULES[0]): void {
    this.routingRules.set(rule.task, rule);
  }

  removeRule(task: TaskType): void {
    this.routingRules.delete(task);
  }

  getRules(): typeof GEMINI_ROUTING_RULES {
    return Array.from(this.routingRules.values());
  }
}

export function createGeminiRouter(): GeminiRouter {
  return new GeminiRouter();
}

export { GEMINI_ROUTING_RULES };
export type { RoutingRule, RoutingConstraints, RoutingPreferences, RoutingDecision };