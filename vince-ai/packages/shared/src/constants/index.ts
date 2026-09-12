/**
 * Constants for Vince AI
 */

export const APP_NAME = 'Vince AI';
export const APP_VERSION = '1.0.0';
export const APP_DESCRIPTION = 'Local-First AI Video Factory with Google/Gemini/OpenCode Integration';

export const API_VERSION = 'v1';
export const API_PREFIX = `/api/${API_VERSION}`;

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'vince_ai_auth_token',
  REFRESH_TOKEN: 'vince_ai_refresh_token',
  USER_PREFERENCES: 'vince_ai_user_preferences',
  PROJECT_CACHE: 'vince_ai_project_cache',
  PROVIDER_CACHE: 'vince_ai_provider_cache',
  SESSION_DATA: 'vince_ai_session_data',
} as const;

export const AI_PROVIDERS = {
  GEMINI: 'gemini',
  NEMOTRON: 'nemotron',
  OPENCODE: 'opencode',
  FLOW: 'flow',
  VEO: 'veo',
  FFMPEG: 'ffmpeg',
  ELEVENLABS: 'elevenlabs',
} as const;

export const AI_TASK_TYPES = {
  SCRIPT_GENERATION: 'script_generation',
  RESEARCH: 'research',
  CREATIVE_CONTENT: 'creative_content',
  MARKETING_STRATEGY: 'marketing_strategy',
  CAPTION: 'caption',
  PRODUCT_ANALYSIS: 'product_analysis',
  VISUAL_ANALYSIS: 'visual_analysis',
  VIDEO_QA: 'video_qa',
  VIDEO_GENERATION: 'video_generation',
  IMAGE_GENERATION: 'image_generation',
  AUDIO_GENERATION: 'audio_generation',
  TRANSLATION: 'translation',
  SUMMARIZATION: 'summarization',
  FACT_CHECK: 'fact_check',
  CODING: 'coding',
  REASONING: 'reasoning',
  PLANNING: 'planning',
} as const;

export const VIDEO_PRESETS = {
  TIKTOK: { name: 'TikTok', aspectRatio: '9:16', resolution: '1080x1920', fps: 30, maxDuration: 180 },
  YOUTUBE_SHORTS: { name: 'YouTube Shorts', aspectRatio: '9:16', resolution: '1080x1920', fps: 30, maxDuration: 60 },
  INSTAGRAM_REELS: { name: 'Instagram Reels', aspectRatio: '9:16', resolution: '1080x1920', fps: 30, maxDuration: 90 },
  YOUTUBE: { name: 'YouTube', aspectRatio: '16:9', resolution: '1920x1080', fps: 30, maxDuration: 3600 },
  SQUARE: { name: 'Square', aspectRatio: '1:1', resolution: '1080x1080', fps: 30, maxDuration: 60 },
  CINEMATIC: { name: 'Cinematic', aspectRatio: '21:9', resolution: '2560x1080', fps: 24, maxDuration: 3600 },
} as const;

export const VIDEO_STATUSES = {
  DRAFT: 'draft',
  PLANNING: 'planning',
  SCRIPTING: 'scripting',
  STORYBOARDING: 'storyboarding',
  GENERATING_ASSETS: 'generating_assets',
  GENERATING_VIDEO: 'generating_video',
  RENDERING: 'rendering',
  QA: 'qa',
  FIXING: 'fixing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

export const PROVIDER_STATUSES = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  ERROR: 'error',
  EXPIRED: 'expired',
  REAUTH_REQUIRED: 'reauth_required',
} as const;

export const VIDEO_STAGES = {
  IDLE: 'idle',
  RESEARCH: 'research',
  SCRIPT: 'script',
  STORYBOARD: 'storyboard',
  PROMPTS: 'prompts',
  ASSETS: 'assets',
  VIDEO: 'video',
  VOICE: 'voice',
  SUBTITLES: 'subtitles',
  RENDER: 'render',
  QA: 'qa',
  FIX: 'fix',
  EXPORT: 'export',
} as const;

export const PROVIDER_CAPABILITIES = {
  GEMINI: {
    text: true,
    vision: true,
    audio: true,
    videoAnalysis: false,
    structuredOutput: true,
    toolCalling: true,
    streaming: true,
    maxTokens: 2048000,
    supportedModels: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro'],
  },
  NEMOTRON: {
    text: true,
    vision: true,
    audio: false,
    videoAnalysis: true,
    structuredOutput: true,
    toolCalling: false,
    streaming: false,
    maxTokens: 128000,
    supportedModels: ['nemotron-3-ultra', 'nemotron-3-ultra-550b'],
  },
  OPENCODE: {
    text: true,
    vision: false,
    audio: false,
    videoAnalysis: false,
    structuredOutput: false,
    toolCalling: true,
    streaming: true,
    maxTokens: 128000,
    supportedModels: ['opencode'],
  },
} as const;

export const TOOL_PERMISSION_LEVELS = {
  READ: 'read',
  WRITE: 'write',
  EXPENSIVE: 'expensive',
  EXTERNAL: 'external',
  HIGH_RISK: 'high_risk',
} as const;

export const AI_TASK_TYPES = {
  SCRIPT_GENERATION: 'script_generation',
  RESEARCH: 'research',
  CREATIVE_CONTENT: 'creative_content',
  MARKETING_STRATEGY: 'marketing_strategy',
  CAPTION: 'caption',
  PRODUCT_ANALYSIS: 'product_analysis',
  VISUAL_ANALYSIS: 'visual_analysis',
  VIDEO_QA: 'video_qa',
  VIDEO_GENERATION: 'video_generation',
  IMAGE_GENERATION: 'image_generation',
  AUDIO_GENERATION: 'audio_generation',
  TRANSLATION: 'translation',
  SUMMARIZATION: 'summarization',
  FACT_CHECK: 'fact_check',
  CODING: 'coding',
  REASONING: 'reasoning',
  PLANNING: 'planning',
} as const;

export const VIDEO_PRESETS = {
  TIKTOK: { name: 'TikTok', aspectRatio: '9:16', resolution: '1080x1920', fps: 30, maxDuration: 180 },
  YOUTUBE_SHORTS: { name: 'YouTube Shorts', aspectRatio: '9:16', resolution: '1080x1920', fps: 30, maxDuration: 60 },
  INSTAGRAM_REELS: { name: 'Instagram Reels', aspectRatio: '9:16', resolution: '1080x1920', fps: 30, maxDuration: 90 },
  YOUTUBE: { name: 'YouTube', aspectRatio: '16:9', resolution: '1920x1080', fps: 30, maxDuration: 3600 },
  SQUARE: { name: 'Square', aspectRatio: '1:1', resolution: '1080x1080', fps: 30, maxDuration: 60 },
  CINEMATIC: { name: 'Cinematic', aspectRatio: '21:9', resolution: '2560x1080', fps: 24, maxDuration: 3600 },
} as const;

export const PAGE_CATEGORIES = {
  TECHNOLOGY: 'technology',
  FITNESS: 'fitness',
  BEAUTY: 'beauty',
  HOME: 'home',
  FASHION: 'fashion',
  GAMING: 'gaming',
  ACCESSORIES: 'accessories',
  EDUCATION: 'education',
  FOOD: 'food',
  TRAVEL: 'travel',
  FINANCE: 'finance',
  HEALTH: 'health',
  ENTERTAINMENT: 'entertainment',
  OTHER: 'other',
} as const;

export const AFFILIATE_NETWORKS = {
  SHOPEE: 'shopee',
  LAZADA: 'lazada',
  TIKTOK_SHOP: 'tiktok_shop',
  TIKI: 'tiki',
  SENDO: 'sendo',
  AMAZON: 'amazon',
  CLICKBANK: 'clickbank',
  CJ: 'cj',
  SHAREASALE: 'shareasale',
  IMPACT: 'impact',
  AWIN: 'awin',
  CUSTOM: 'custom',
} as const;

export const POST_STATUSES = {
  DRAFT: 'draft',
  SCHEDULED: 'scheduled',
  PUBLISHING: 'publishing',
  PUBLISHED: 'published',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

export const VIDEO_STATUSES = {
  DRAFT: 'draft',
  PLANNING: 'planning',
  SCRIPTING: 'scripting',
  STORYBOARDING: 'storyboarding',
  GENERATING_ASSETS: 'generating_assets',
  GENERATING_VIDEO: 'generating_video',
  RENDERING: 'rendering',
  QA: 'qa',
  FIXING: 'fixing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

export const RESEARCH_TYPES = {
  WEB: 'web',
  NEWS: 'news',
  TRENDS: 'trends',
  ACADEMIC: 'academic',
  SOCIAL: 'social',
  PRODUCT: 'product',
  COMPETITOR: 'competitor',
} as const;

export const RESEARCH_DEPTHS = {
  QUICK: 'quick',
  STANDARD: 'standard',
  DEEP: 'deep',
} as const;

export const DEFAULT_PAGINATION = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const RATE_LIMITS = {
  LOGIN: { max: 5, windowMs: 60000 },
  API: { max: 100, windowMs: 60000 },
  UPLOAD: { max: 10, windowMs: 60000 },
  AI_GENERATION: { max: 30, windowMs: 60000 },
} as const;

export const FILE_LIMITS = {
  MAX_FILE_SIZE: 500 * 1024 * 1024, // 500MB
  MAX_VIDEO_DURATION: 3600, // 1 hour
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/webm', 'video/quicktime'],
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  ALLOWED_AUDIO_TYPES: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4'],
} as const;

export const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  BASE_DELAY: 1000,
  MAX_DELAY: 30000,
  FACTOR: 2,
} as const;

export const QA_CONFIG = {
  TARGET_SCORE: 8.0,
  MAX_ITERATIONS: 10,
  CRITICAL_THRESHOLD: 0,
  MIN_SCORE_TO_PROCEED: 6.0,
} as const;

export const CACHE_TTL = {
  SHORT: 60 * 1000, // 1 minute
  MEDIUM: 5 * 60 * 1000, // 5 minutes
  LONG: 60 * 60 * 1000, // 1 hour
  VERY_LONG: 24 * 60 * 60 * 1000, // 24 hours
} as const;

export const SECURITY = {
  BCRYPT_ROUNDS: 12,
  JWT_EXPIRY: '15m',
  REFRESH_TOKEN_EXPIRY: '7d',
  SESSION_EXPIRY: '24h',
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
  ENCRYPTION_ALGORITHM: 'aes-256-gcm',
  PBKDF2_ITERATIONS: 100000,
} as const;

export const STORAGE_PATHS = {
  PROJECTS: 'projects',
  VIDEOS: 'videos',
  IMAGES: 'images',
  AUDIO: 'audio',
  SUBTITLES: 'subtitles',
  THUMBNAILS: 'thumbnails',
  RENDERS: 'renders',
  METADATA: 'metadata',
  TEMP: 'temp',
  LOGS: 'logs',
  BACKUPS: 'backups',
} as const;

export const FFMPEG_PRESETS = {
  TIKTOK: { codec: 'libx264', preset: 'fast', crf: 23, profile: 'high', level: '4.0' },
  YOUTUBE_SHORTS: { codec: 'libx264', preset: 'fast', crf: 23, profile: 'high', level: '4.0' },
  INSTAGRAM_REELS: { codec: 'libx264', preset: 'fast', crf: 23, profile: 'high', level: '4.0' },
  YOUTUBE: { codec: 'libx264', preset: 'medium', crf: 20, profile: 'high', level: '4.2' },
  SQUARE: { codec: 'libx264', preset: 'fast', crf: 23, profile: 'high', level: '4.0' },
  CINEMATIC: { codec: 'libx264', preset: 'slow', crf: 18, profile: 'high', level: '4.2' },
} as const;

export const SUBTITLE_STYLES = {
  DEFAULT: { fontSize: 24, color: '#FFFFFF', outline: 2, outlineColor: '#000000', position: 'bottom', margin: 50 },
  TIKTOK: { fontSize: 28, color: '#FFFFFF', outline: 3, outlineColor: '#000000', position: 'bottom', margin: 80, animation: 'pop' },
  YOUTUBE: { fontSize: 22, color: '#FFFF00', outline: 2, outlineColor: '#000000', position: 'bottom', margin: 50 },
  CINEMATIC: { fontSize: 20, color: '#FFFFFF', outline: 1, outlineColor: '#000000', position: 'bottom', margin: 60, font: 'serif' },
} as const;

export const HOOK_TYPES = ['question', 'statement', 'statistic', 'story', 'problem'] as const;
export const ANGLE_TYPES = ['educational', 'entertainment', 'inspirational', 'controversial', 'practical', 'emotional'] as const;
export const CONCEPT_TYPES = ['tutorial', 'review', 'comparison', 'storytelling', 'demonstration', 'transformation'] as const;
export const TRANSITION_TYPES = ['cut', 'fade', 'dissolve', 'wipe', 'slide', 'zoom', 'spin', 'glitch', 'morph'] as const;
export const CAMERA_ANGLES = ['eye_level', 'low_angle', 'high_angle', 'bird_eye', 'worm_eye', 'dutch'] as const;
export const CAMERA_MOVEMENTS = ['static', 'pan_left', 'pan_right', 'tilt_up', 'tilt_down', 'zoom_in', 'zoom_out', 'dolly_in', 'dolly_out', 'truck_left', 'truck_right', 'pedestal_up', 'pedestal_down'] as const;
export const LIGHTING_TYPES = ['natural', 'studio', 'three_point', 'rim', 'silhouette', 'high_key', 'low_key', 'motivated'] as const;
export const VOICE_EMOTIONS = ['neutral', 'happy', 'sad', 'excited', 'calm', 'energetic', 'serious', 'friendly'] as const;
export const MUSIC_MOODS = ['upbeat', 'calm', 'energetic', 'emotional', 'epic', 'mysterious', 'happy', 'sad', 'inspiring'] as const;