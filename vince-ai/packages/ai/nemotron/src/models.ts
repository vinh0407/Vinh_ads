/**
 * Nemotron Models Configuration
 */

export interface ModelConfig {
  name: string;
  displayName: string;
  description: string;
  maxTokens: number;
  supportsVision: boolean;
  supportsAudio: boolean;
  supportsVideo: boolean;
  supportsStreaming: boolean;
  supportsTools: boolean;
  supportsStructuredOutput: boolean;
  contextWindow: number;
  latency: 'low' | 'medium' | 'high';
  quality: 'standard' | 'high' | 'premium';
}

export const NEMOTRON_MODELS: Record<string, ModelConfig> = {
  'nemotron-3-ultra': {
    name: 'nemotron-3-ultra',
    displayName: 'Nemotron 3 Ultra',
    description: 'Most capable Nemotron model for complex reasoning and vision tasks',
    maxTokens: 128000,
    supportsVision: true,
    supportsAudio: false,
    supportsVideo: false,
    supportsStreaming: true,
    supportsTools: false,
    supportsStructuredOutput: true,
    contextWindow: 128000,
    latency: 'medium',
    quality: 'premium',
  },
  'nemotron-3-ultra-550b': {
    name: 'nemotron-3-ultra-550b',
    displayName: 'Nemotron 3 Ultra 550B',
    description: 'Largest Nemotron model with 550B parameters',
    maxTokens: 128000,
    supportsVision: true,
    supportsAudio: false,
    supportsVideo: false,
    supportsStreaming: true,
    supportsTools: false,
    supportsStructuredOutput: true,
    contextWindow: 128000,
    latency: 'high',
    quality: 'premium',
  },
  'nemotron-3-chat': {
    name: 'nemotron-3-chat',
    displayName: 'Nemotron 3 Chat',
    description: 'Optimized for chat and conversational tasks',
    maxTokens: 32768,
    supportsVision: false,
    supportsAudio: false,
    supportsVideo: false,
    supportsStreaming: true,
    supportsTools: false,
    supportsStructuredOutput: true,
    contextWindow: 32768,
    latency: 'low',
    quality: 'high',
  },
} as const;

export const NEMOTRON_DEFAULT_MODEL = 'nemotron-3-ultra';
export const NEMOTRON_VISION_MODEL = 'nemotron-3-ultra';

export function getModelConfig(modelName: string) {
  return NEMOTRON_MODELS[modelName] || null;
}

export function getModelsByCapability(capability: keyof typeof NEMOTRON_MODELS[string]) {
  return Object.entries(NEMOTRON_MODELS)
    .filter(([_, config]) => config[capability] === true)
    .map(([name]) => name);
}

export function getRecommendedModel(task: 'reasoning' | 'chat' | 'vision' | 'analysis'): string {
  switch (task) {
    case 'reasoning':
    case 'analysis':
      return 'nemotron-3-ultra';
    case 'chat':
      return 'nemotron-3-chat';
    case 'vision':
      return 'nemotron-3-ultra';
    default:
      return 'nemotron-3-ultra';
  }
}

export function getModelList() {
  return Object.entries(NEMOTRON_MODELS).map(([name, config]) => ({
    name,
    displayName: config.displayName,
    description: config.description,
  }));
}