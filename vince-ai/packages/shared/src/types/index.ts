/**
 * Core type definitions for Vince AI
 */

// ============================================
// Base Types
// ============================================

export type ID = string & { readonly __brand: unique symbol };
export type Timestamp = string & { readonly __brand: unique symbol };

export function createId(): ID {
  return crypto.randomUUID() as ID;
}

export function now(): Timestamp {
  return new Date().toISOString() as Timestamp;
}

// ============================================
// User & Authentication Types
// ============================================

export interface User {
  id: ID;
  email: string;
  name: string;
  avatarUrl?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  settings: UserSettings;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  language: 'vi' | 'en';
  autoSave: boolean;
  notifications: NotificationSettings;
  privacy: PrivacySettings;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  inApp: boolean;
  marketing: boolean;
  security: boolean;
}

export interface PrivacySettings {
  analytics: boolean;
  crashReports: boolean;
  usageData: boolean;
}

// ============================================
// AI Provider Types
// ============================================

export type AIProviderName = 'gemini' | 'nemotron' | 'opencode' | 'flow' | 'veo' | 'ffmpeg' | 'elevenlabs' | 'openai' | 'anthropic';

export type AIProviderStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'expired' | 'reauth_required';

export interface AIProviderCapabilities {
  text: boolean;
  vision: boolean;
  audio: boolean;
  videoAnalysis: boolean;
  structuredOutput: boolean;
  toolCalling: boolean;
  streaming: boolean;
  maxTokens: number;
  supportedModels: string[];
}

export interface AIProvider {
  name: AIProviderName;
  displayName: string;
  description: string;
  status: AIProviderStatus;
  capabilities: AIProviderCapabilities;
  health: ProviderHealth;
  authentication?: ProviderAuth;
  lastUsed?: Timestamp;
  lastError?: ProviderError;
  config?: ProviderConfig;
}

export interface ProviderHealth {
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
  latency?: number;
  errorRate: number;
  lastCheck: Timestamp;
  details?: Record<string, unknown>;
}

export interface ProviderAuth {
  type: 'oauth' | 'api_key' | 'session' | 'token';
  status: 'valid' | 'expired' | 'revoked' | 'invalid';
  scopes?: string[];
  expiresAt?: Timestamp;
  metadata?: Record<string, unknown>;
}

export interface ProviderError {
  code: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Timestamp;
  recoverable: boolean;
  suggestedAction?: string;
}

export interface ProviderConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  stopSequences?: string[];
  safetySettings?: SafetySetting[];
  customParameters?: Record<string, unknown>;
}

export interface SafetySetting {
  category: string;
  threshold: 'block_none' | 'block_few' | 'block_some' | 'block_most';
}

// ============================================
// AI Router Types
// ============================================

export type TaskType = 
  | 'script_generation'
  | 'research'
  | 'creative_content'
  | 'marketing_strategy'
  | 'caption'
  | 'product_analysis'
  | 'visual_analysis'
  | 'video_qa'
  | 'video_generation'
  | 'image_generation'
  | 'audio_generation'
  | 'translation'
  | 'summarization'
  | 'fact_check'
  | 'coding'
  | 'reasoning'
  | 'planning';

export interface TaskRouting {
  task: TaskType;
  primaryProvider: AIProviderName;
  fallbackProviders: AIProviderName[];
  reasoning: string;
  estimatedCost: number;
  estimatedTime: number;
  requiredCapabilities: string[];
}

export interface AIRouteRequest {
  task: TaskType;
  input: unknown;
  context?: Record<string, unknown>;
  constraints?: RoutingConstraints;
  preferences?: RoutingPreferences;
}

export interface RoutingConstraints {
  maxCost?: number;
  maxTime?: number;
  requiredProviders?: AIProviderName[];
  excludedProviders?: AIProviderName[];
  minQuality?: number;
}

export interface RoutingPreferences {
  preferSpeed?: boolean;
  preferQuality?: boolean;
  preferCost?: boolean;
  preferredProvider?: AIProviderName;
}

export interface AIRouteResponse {
  route: TaskRouting;
  provider: AIProviderName;
  confidence: number;
  alternatives: TaskRouting[];
}

// ============================================
// Tool & Agent Types
// ============================================

export type ToolPermissionLevel = 'read' | 'write' | 'expensive' | 'external' | 'high_risk';

export interface ToolPermission {
  tool: string;
  level: ToolPermissionLevel;
  description: string;
  requiresApproval: boolean;
  rateLimit?: {
    maxCalls: number;
    windowMs: number;
  };
  costEstimate?: number;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  returns: string;
  permission: ToolPermission;
  provider: AIProviderName;
  execute: (params: unknown, context: ToolContext) => Promise<ToolResult>;
}

export interface ToolContext {
  userId: ID;
  projectId?: ID;
  sessionId: ID;
  permissions: ToolPermission[];
  metadata: Record<string, unknown>;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  metadata?: Record<string, unknown>;
  cost?: number;
  duration: number;
}

export type AgentName = 'master' | 'research' | 'browser' | 'content' | 'video' | 'customer' | 'affiliate' | 'marketing' | 'qa';

export interface AgentDefinition {
  name: AgentName;
  description: string;
  capabilities: string[];
  tools: string[];
  model: string;
  systemPrompt: string;
  maxIterations: number;
  timeout: number;
}

// ============================================
// Video Factory Types
// ============================================

export type VideoStatus = 
  | 'draft'
  | 'planning'
  | 'scripting'
  | 'storyboarding'
  | 'generating_assets'
  | 'generating_video'
  | 'rendering'
  | 'qa'
  | 'fixing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type VideoPreset = 'tiktok' | 'youtube_shorts' | 'instagram_reels' | 'youtube' | 'square' | 'cinematic';

export interface VideoProject {
  id: ID;
  userId: ID;
  name: string;
  description?: string;
  preset: VideoPreset;
  status: VideoStatus;
  progress: number;
  currentStage: VideoStage;
  affiliateUrl?: string;
  productInfo?: ProductInfo;
  script?: Script;
  storyboard?: Storyboard;
  assets: VideoAsset[];
  scenes: Scene[];
  finalVideo?: VideoOutput;
  qaResults?: QAResult[];
  metadata: ProjectMetadata;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp;
}

export type VideoStage = 
  | 'idle'
  | 'research'
  | 'script'
  | 'storyboard'
  | 'prompts'
  | 'assets'
  | 'video'
  | 'voice'
  | 'subtitles'
  | 'render'
  | 'qa'
  | 'fix'
  | 'export';

export interface ProductInfo {
  name: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  images: string[];
  affiliateUrl: string;
  affiliateNetwork: string;
  features: string[];
  specifications: Record<string, string>;
}

export interface Script {
  id: ID;
  hooks: Hook[];
  title: string;
  angles: Angle[];
  recommendedConcept: Concept;
  caption: string;
  cta: string;
  hashtags: string[];
  disclosure: string;
  language: string;
  tone: string;
  targetAudience: string;
  duration: number;
  wordCount: number;
  createdAt: Timestamp;
}

export interface Hook {
  id: string;
  text: string;
  type: 'question' | 'statement' | 'statistic' | 'story' | 'problem';
  score: number;
}

export interface Angle {
  id: string;
  name: string;
  description: string;
  structure: string[];
  pros: string[];
  cons: string[];
  score: number;
}

export interface Concept {
  id: string;
  title: string;
  summary: string;
  structure: SceneStructure[];
  hooks: string[];
  reasoning: string;
  score: number;
}

export interface SceneStructure {
  sceneNumber: number;
  duration: number;
  visual: string;
  narration: string;
  purpose: string;
}

export interface Storyboard {
  id: ID;
  scenes: Scene[];
  totalDuration: number;
  aspectRatio: string;
  resolution: string;
  fps: number;
  style: string;
  music?: MusicTrack;
  createdAt: Timestamp;
}

export interface Scene {
  id: ID;
  projectId: ID;
  sceneNumber: number;
  duration: number;
  visualPrompt: string;
  negativePrompt?: string;
  narration: string;
  subtitle: string;
  camera: CameraSettings;
  lighting: LightingSettings;
  movement: MovementSettings;
  transition: TransitionSettings;
  voice: VoiceSettings;
  music?: MusicTrack;
  sfx?: SFXSettings;
  asset?: VideoAsset;
  generationStatus: GenerationStatus;
  qaStatus?: QAStatus;
  iterations: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CameraSettings {
  angle: 'eye_level' | 'low_angle' | 'high_angle' | 'bird_eye' | 'worm_eye' | 'dutch';
  distance: 'extreme_close' | 'close' | 'medium' | 'wide' | 'extreme_wide';
  movement: 'static' | 'pan_left' | 'pan_right' | 'tilt_up' | 'tilt_down' | 'zoom_in' | 'zoom_out' | 'dolly_in' | 'dolly_out' | 'truck_left' | 'truck_right' | 'pedestal_up' | 'pedestal_down';
  focus: 'auto' | 'manual' | 'rack_focus';
  aperture: string;
}

export interface LightingSettings {
  type: 'natural' | 'studio' | 'three_point' | 'rim' | 'silhouette' | 'high_key' | 'low_key' | 'motivated';
  direction: 'front' | 'side' | 'back' | 'top' | 'bottom' | '45_degree';
  intensity: 'low' | 'medium' | 'high';
  colorTemperature: number;
  mood: 'bright' | 'moody' | 'dramatic' | 'soft' | 'harsh';
}

export interface MovementSettings {
  type: 'static' | 'slow' | 'medium' | 'fast' | 'dynamic';
  direction?: string;
  speed?: number;
  easing?: 'linear' | 'ease_in' | 'ease_out' | 'ease_in_out';
}

export interface TransitionSettings {
  type: 'cut' | 'fade' | 'dissolve' | 'wipe' | 'slide' | 'zoom' | 'spin' | 'glitch' | 'morph';
  duration: number;
  easing?: string;
}

export interface VoiceSettings {
  provider: string;
  voiceId: string;
  language: string;
  speed: number;
  pitch: number;
  emotion: 'neutral' | 'happy' | 'sad' | 'excited' | 'calm' | 'energetic' | 'serious' | 'friendly';
  pronunciation?: Record<string, string>;
  emphasis?: string[];
}

export interface MusicTrack {
  id: string;
  name: string;
  url: string;
  genre: string;
  mood: string;
  duration: number;
  bpm: number;
  license: string;
  volume: number;
  fadeIn: number;
  fadeOut: number;
}

export interface SFXSettings {
  enabled: boolean;
  tracks: SFXTrack[];
  masterVolume: number;
}

export interface SFXTrack {
  id: string;
  name: string;
  url: string;
  startTime: number;
  duration: number;
  volume: number;
  loop: boolean;
}

export interface VideoAsset {
  id: ID;
  projectId: ID;
  sceneId?: ID;
  type: 'image' | 'video' | 'audio' | 'subtitle' | 'thumbnail';
  url: string;
  localPath?: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
  metadata: Record<string, unknown>;
  createdAt: Timestamp;
}

export interface VideoOutput {
  id: ID;
  projectId: ID;
  url: string;
  localPath: string;
  width: number;
  height: number;
  duration: number;
  fps: number;
  bitrate: number;
  codec: string;
  format: string;
  size: number;
  thumbnailUrl?: string;
  qaScore: number;
  iterations: number;
  renderTime: number;
  createdAt: Timestamp;
}

export interface GenerationStatus {
  stage: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  provider?: string;
  model?: string;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  error?: string;
  retryCount: number;
}

export interface QAStatus {
  score: number;
  passed: boolean;
  issues: QAIssue[];
  checkedAt: Timestamp;
  checkedBy: string;
}

export interface QAIssue {
  id: string;
  sceneId: ID;
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: 'composition' | 'framing' | 'subject_visibility' | 'consistency' | 'lighting' | 'continuity' | 'artifacts' | 'text' | 'subtitle' | 'composition' | 'crop' | 'aspect_ratio' | 'pacing' | 'sync';
  description: string;
  recommendedFix: string;
  frameTimestamp?: number;
}

export interface QAResult {
  id: ID;
  projectId: ID;
  iteration: number;
  overallScore: number;
  passed: boolean;
  issues: QAIssue[];
  fixedIssues: string[];
  renderTime: number;
  checkedAt: Timestamp;
}

export interface ProjectMetadata {
  source: 'affiliate' | 'manual' | 'template' | 'import';
  tags: string[];
  targetPlatforms: string[];
  targetAudience: string;
  language: string;
  estimatedRevenue?: number;
  actualRevenue?: number;
  version: number;
  parentProjectId?: ID;
}

// ============================================
// Research Types
// ============================================

export interface ResearchRequest {
  query: string;
  type: 'web' | 'news' | 'trends' | 'academic' | 'social' | 'product' | 'competitor';
  filters?: ResearchFilters;
  depth: 'quick' | 'standard' | 'deep';
  maxResults: number;
  language: string;
  region: string;
  timeRange?: TimeRange;
}

export interface ResearchFilters {
  domains?: string[];
  excludeDomains?: string[];
  dateFrom?: Timestamp;
  dateTo?: Timestamp;
  minCredibility?: number;
  language?: string[];
  safeSearch?: boolean;
}

export interface TimeRange {
  from: Timestamp;
  to: Timestamp;
}

export interface ResearchResult {
  id: ID;
  requestId: ID;
  sources: ResearchSource[];
  summary: string;
  keyFindings: KeyFinding[];
  trends: Trend[];
  entities: Entity[];
  sentiment: SentimentAnalysis;
  credibility: number;
  completedAt: Timestamp;
}

export interface ResearchSource {
  id: ID;
  url: string;
  title: string;
  snippet: string;
  content?: string;
  domain: string;
  credibility: number;
  publishedAt?: Timestamp;
  author?: string;
  type: 'article' | 'news' | 'blog' | 'video' | 'social' | 'academic' | 'government' | 'other';
  metadata: Record<string, unknown>;
}

export interface KeyFinding {
  id: string;
  claim: string;
  evidence: string[];
  sources: ID[];
  confidence: number;
  category: string;
}

export interface Trend {
  id: string;
  topic: string;
  volume: number;
  growth: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  relatedTopics: string[];
  timeRange: TimeRange;
  sources: ID[];
}

export interface Entity {
  id: string;
  name: string;
  type: 'person' | 'organization' | 'product' | 'location' | 'event' | 'concept';
  mentions: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  relevance: number;
}

export interface SentimentAnalysis {
  overall: 'positive' | 'negative' | 'neutral';
  score: number;
  distribution: {
    positive: number;
    negative: number;
    neutral: number;
  };
  keyDrivers: string[];
}

// ============================================
// Browser Automation Types
// ============================================

export type BrowserType = 'chrome' | 'coccoc' | 'firefox' | 'edge' | 'safari';

export interface BrowserProfile {
  id: ID;
  name: string;
  browser: BrowserType;
  userDataDir: string;
  extensions: string[];
  cookies: Cookie[];
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
  permissions: Permission[];
  viewport: Viewport;
  userAgent: string;
  locale: string;
  timezone: string;
  proxy?: ProxyConfig;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Cookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
}

export interface Viewport {
  width: number;
  height: number;
  deviceScaleFactor: number;
  isMobile: boolean;
  hasTouch: boolean;
  isLandscape: boolean;
}

export interface Permission {
  origin: string;
  permission: 'granted' | 'denied' | 'prompt';
  type: 'geolocation' | 'notifications' | 'camera' | 'microphone' | 'clipboard' | 'idle' | 'notifications';
}

export interface ProxyConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
  protocol: 'http' | 'https' | 'socks5';
}

export interface BrowserAction {
  type: 'navigate' | 'click' | 'type' | 'scroll' | 'wait' | 'screenshot' | 'extract' | 'evaluate' | 'wait_for' | 'hover' | 'drag' | 'select' | 'upload' | 'download' | 'keyboard' | 'mouse';
  selector?: string;
  url?: string;
  text?: string;
  x?: number;
  y?: number;
  waitFor?: string;
  timeout?: number;
  options?: Record<string, unknown>;
}

export interface BrowserResult {
  success: boolean;
  data?: unknown;
  error?: string;
  screenshot?: string;
  url?: string;
  title?: string;
  logs: BrowserLog[];
  performance: PerformanceMetrics;
  duration: number;
}

export interface BrowserLog {
  level: 'log' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: Timestamp;
  source: string;
}

export interface PerformanceMetrics {
  loadTime: number;
  domContentLoaded: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
  cumulativeLayoutShift: number;
  memoryUsed: number;
  cpuTime: number;
}

// ============================================
// Social Publishing Types
// ============================================

export interface FacebookPage {
  id: ID;
  userId: ID;
  pageId: string;
  name: string;
  category: string;
  accessToken: string;
  tokenExpiresAt: Timestamp;
  permissions: string[];
  avatarUrl?: string;
  coverUrl?: string;
  followers: number;
  engagement: number;
  category: PageCategory;
  audience: PageAudience;
  tone: string;
  visualStyle: string;
  allowedTopics: string[];
  postingRules: PostingRule[];
  performance: PagePerformance;
  status: 'active' | 'inactive' | 'error' | 'expired';
  connectedAt: Timestamp;
  lastSyncedAt: Timestamp;
}

export type PageCategory = 'technology' | 'fitness' | 'beauty' | 'home' | 'fashion' | 'gaming' | 'accessories' | 'education' | 'food' | 'travel' | 'finance' | 'health' | 'entertainment' | 'other';

export interface PageAudience {
  ageRange: { min: number; max: number };
  gender: 'male' | 'female' | 'all';
  locations: string[];
  interests: string[];
  languages: string[];
}

export interface PostingRule {
  id: string;
  name: string;
  condition: string;
  action: 'allow' | 'deny' | 'require_approval';
  priority: number;
}

export interface PagePerformance {
  totalPosts: number;
  totalReach: number;
  totalEngagement: number;
  averageEngagementRate: number;
  bestPostTime: string;
  topPerformingContent: string[];
  audienceGrowth: number;
  lastUpdated: Timestamp;
}

export interface SocialPost {
  id: ID;
  projectId: ID;
  pageId: ID;
  content: string;
  media: SocialMedia[];
  scheduledAt?: Timestamp;
  publishedAt?: Timestamp;
  status: 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed' | 'cancelled';
  externalId?: string;
  approvalRequired: boolean;
  approvedBy?: ID;
  approvedAt?: Timestamp;
  metrics?: PostMetrics;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SocialMedia {
  id: ID;
  type: 'image' | 'video' | 'carousel' | 'story' | 'reel';
  url: string;
  localPath?: string;
  thumbnail?: string;
  width?: number;
  height?: number;
  duration?: number;
  mimeType: string;
  size: number;
  alt?: string;
}

export interface PostMetrics {
  reach: number;
  impressions: number;
  engagement: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  videoViews?: number;
  videoCompletionRate?: number;
  ctr: number;
  cpc?: number;
  cpm?: number;
  roi?: number;
  lastUpdated: Timestamp;
}

// ============================================
// Affiliate Types
// ============================================

export interface AffiliateCampaign {
  id: ID;
  userId: ID;
  name: string;
  description: string;
  affiliateUrl: string;
  network: AffiliateNetwork;
  productId: ID;
  landingPage?: string;
  trackingParams: TrackingParams;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived';
  budget?: Budget;
  targets: CampaignTarget[];
  performance: CampaignPerformance;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  startedAt?: Timestamp;
  endedAt?: Timestamp;
}

export type AffiliateNetwork = 'shopee' | 'lazada' | 'tiktok_shop' | 'tiki' | 'sendo' | 'amazon' | 'clickbank' | 'cj' | 'shareasale' | 'impact' | 'awin' | 'custom';

export interface TrackingParams {
  source: string;
  medium: string;
  campaign: string;
  content?: string;
  term?: string;
  customParams: Record<string, string>;
}

export interface Budget {
  total: number;
  currency: string;
  spent: number;
  dailyLimit?: number;
  lifetimeLimit?: number;
}

export interface CampaignTarget {
  metric: 'clicks' | 'conversions' | 'revenue' | 'roas' | 'cpa';
  value: number;
  deadline?: Timestamp;
}

export interface CampaignPerformance {
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  spend: number;
  ctr: number;
  cpc: number;
  cpa: number;
  roas: number;
  roi: number;
  lastUpdated: Timestamp;
}

// ============================================
// Error Types
// ============================================

export class VinceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>,
    public recoverable: boolean = false,
    public suggestedAction?: string
  ) {
    super(message);
    this.name = 'VinceError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class AuthenticationError extends VinceError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'AUTHENTICATION_ERROR', 401, details, true, 'Please reconnect your account');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends VinceError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'AUTHORIZATION_ERROR', 403, details, false, 'Contact administrator');
    this.name = 'AuthorizationError';
  }
}

export class ValidationError extends VinceError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, details, true, 'Check input data');
    this.name = 'ValidationError';
  }
}

export class ProviderError extends VinceError {
  constructor(message: string, public provider: string, details?: Record<string, unknown>) {
    super(message, 'PROVIDER_ERROR', 502, details, true, 'Try again or switch provider');
    this.name = 'ProviderError';
  }
}

export class RateLimitError extends VinceError {
  constructor(message: string, public retryAfter: number, details?: Record<string, unknown>) {
    super(message, 'RATE_LIMIT_ERROR', 429, details, true, `Retry after ${retryAfter} seconds`);
    this.name = 'RateLimitError';
  }
}

export class NotFoundError extends VinceError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, 'NOT_FOUND', 404, { resource, id }, false, 'Check ID');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends VinceError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CONFLICT', 409, details, false, 'Resolve conflict');
    this.name = 'ConflictError';
  }
}

export class QuotaExceededError extends VinceError {
  constructor(resource: string, limit: number, details?: Record<string, unknown>) {
    super(`Quota exceeded for ${resource}: ${limit}`, 'QUOTA_EXCEEDED', 429, { resource, limit }, true, 'Upgrade plan or wait');
    this.name = 'QuotaExceededError';
  }
}

// ============================================
// Result Types
// ============================================

export type Result<T, E = VinceError> = 
  | { success: true; data: T }
  | { success: false; error: E };

export function ok<T>(data: T): Result<T, never> {
  return { success: true, data };
}

export function err<E extends VinceError>(error: E): Result<never, E> {
  return { success: false, error };
}

export function isOk<T, E>(result: Result<T, E>): result is { success: true; data: T } {
  return result.success;
}

export function isErr<T, E>(result: Result<T, E>): result is { success: false; error: E } {
  return !result.success;
}

export function unwrap<T, E>(result: Result<T, E>): T {
  if (result.success) return result.data;
  throw result.error;
}

export function unwrapErr<T, E>(result: Result<T, E>): E {
  if (!result.success) return result.error;
  throw new Error('Expected error result');
}