/**
 * Gemini Models Configuration
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
  costPer1kInputTokens: number;
  costPer1kOutputTokens: number;
  latency: 'low' | 'medium' | 'high';
  quality: 'standard' | 'high' | 'premium';
}

export const GEMINI_MODELS: Record<string, ModelConfig> = {
  'gemini-1.5-pro': {
    name: 'gemini-1.5-pro',
    displayName: 'Gemini 1.5 Pro',
    description: 'Most capable model for complex reasoning and multimodal tasks',
    maxTokens: 2048000,
    supportsVision: true,
    supportsAudio: true,
    supportsVideo: true,
    supportsStreaming: true,
    supportsTools: true,
    supportsStructuredOutput: true,
    costPer1kInputTokens: 0.0035,
    costPer1kOutputTokens: 0.0105,
    latency: 'medium',
    quality: 'premium',
  },
  'gemini-1.5-pro-latest': {
    name: 'gemini-1.5-pro-latest',
    displayName: 'Gemini 1.5 Pro (Latest)',
    description: 'Latest version of Gemini 1.5 Pro with improved capabilities',
    maxTokens: 2048000,
    supportsVision: true,
    supportsAudio: true,
    supportsVideo: true,
    supportsStreaming: true,
    supportsTools: true,
    supportsStructuredOutput: true,
    costPer1kInputTokens: 0.0035,
    costPer1kOutputTokens: 0.0105,
    latency: 'medium',
    quality: 'premium',
  },
  'gemini-1.5-flash': {
    name: 'gemini-1.5-flash',
    displayName: 'Gemini 1.5 Flash',
    description: 'Fast and efficient model for high-volume tasks',
    maxTokens: 1048576,
    supportsVision: true,
    supportsAudio: true,
    supportsVideo: true,
    supportsStreaming: true,
    supportsTools: true,
    supportsStructuredOutput: true,
    costPer1kInputTokens: 0.000075,
    costPer1kOutputTokens: 0.0003,
    latency: 'low',
    quality: 'high',
  },
  'gemini-1.5-flash-latest': {
    name: 'gemini-1.5-flash-latest',
    displayName: 'Gemini 1.5 Flash (Latest)',
    description: 'Latest version of Gemini 1.5 Flash',
    maxTokens: 1048576,
    supportsVision: true,
    supportsAudio: true,
    supportsVideo: true,
    supportsStreaming: true,
    supportsTools: true,
    supportsStructuredOutput: true,
    costPer1kInputTokens: 0.000075,
    costPer1kOutputTokens: 0.0003,
    latency: 'low',
    quality: 'high',
  },
  'gemini-1.0-pro': {
    name: 'gemini-1.0-pro',
    displayName: 'Gemini 1.0 Pro',
    description: 'Legacy model for general purpose tasks',
    maxTokens: 32768,
    supportsVision: false,
    supportsAudio: false,
    supportsVideo: false,
    supportsStreaming: true,
    supportsTools: true,
    supportsStructuredOutput: true,
    costPer1kInputTokens: 0.0005,
    costPer1kOutputTokens: 0.0015,
    latency: 'low',
    quality: 'standard',
  },
  'gemini-1.0-pro-vision': {
    name: 'gemini-1.0-pro-vision',
    displayName: 'Gemini 1.0 Pro Vision',
    description: 'Legacy vision model',
    maxTokens: 16384,
    supportsVision: true,
    supportsAudio: false,
    supportsVideo: false,
    supportsStreaming: true,
    supportsTools: false,
    supportsStructuredOutput: false,
    costPer1kInputTokens: 0.0005,
    costPer1kOutputTokens: 0.0015,
    latency: 'medium',
    quality: 'standard',
  },
  'text-embedding-004': {
    name: 'text-embedding-004',
    displayName: 'Text Embedding 004',
    description: 'Embedding model for semantic search and retrieval',
    maxTokens: 8192,
    supportsVision: false,
    supportsAudio: false,
    supportsVideo: false,
    supportsStreaming: false,
    supportsTools: false,
    supportsStructuredOutput: false,
    costPer1kInputTokens: 0.0001,
    costPer1kOutputTokens: 0,
    latency: 'low',
    quality: 'standard',
  },
  'embedding-001': {
    name: 'embedding-001',
    displayName: 'Embedding 001',
    description: 'Legacy embedding model',
    maxTokens: 2048,
    supportsVision: false,
    supportsAudio: false,
    supportsVideo: false,
    supportsStreaming: false,
    supportsTools: false,
    supportsStructuredOutput: false,
    costPer1kInputTokens: 0.0001,
    costPer1kOutputTokens: 0,
    latency: 'low',
    quality: 'standard',
  },
} as const;

export const GEMINI_DEFAULT_MODEL = 'gemini-1.5-pro';
export const GEMINI_FAST_MODEL = 'gemini-1.5-flash';
export const GEMINI_EMBEDDING_MODEL = 'text-embedding-004';

export function getModelConfig(modelName: string): ModelConfig | null {
  return GEMINI_MODELS[modelName] || null;
}

export function getModelsByCapability(capability: keyof ModelConfig): ModelConfig[] {
  return Object.values(GEMINI_MODELS).filter(model => model[capability] === true);
}

export function getRecommendedModel(
  task: 'reasoning' | 'creative' | 'coding' | 'analysis' | 'speed' | 'cost' | 'vision' | 'audio' | 'video'
): string {
  switch (task) {
    case 'reasoning':
    case 'creative':
      return 'gemini-1.5-pro';
    case 'coding':
      return 'gemini-1.5-pro';
    case 'analysis':
      return 'gemini-1.5-pro';
    case 'speed':
      return 'gemini-1.5-flash';
    case 'cost':
      return 'gemini-1.5-flash';
    case 'vision':
      return 'gemini-1.5-pro';
    case 'audio':
      return 'gemini-1.5-pro';
    case 'video':
      return 'gemini-1.5-pro';
    default:
      return GEMINI_DEFAULT_MODEL;
  }
}

export function estimateCost(
  modelName: string,
  inputTokens: number,
  outputTokens: number
): { inputCost: number; outputCost: number; totalCost: number } | null {
  const model = GEMINI_MODELS[modelName];
  if (!model) return null;

  const inputCost = (inputTokens / 1000) * model.costPer1kInputTokens;
  const outputCost = (outputTokens / 1000) * model.costPer1kOutputTokens;
  
  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
  };
}

export function getModelList(): Array<{ name: string; displayName: string; description: string }> {
  return Object.entries(GEMINI_MODELS).map(([name, config]) => ({
    name,
    displayName: config.displayName,
    description: config.description,
  }));
}