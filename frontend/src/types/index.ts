export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  status: "ACTIVE" | "SUSPENDED" | "DELETED";
  role?: string;
  createdAt: string;
  updatedAt: string;
}

export type SourceStatus = "ACTIVE" | "INACTIVE" | "ERROR";

export type JobStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface SourcePage {
  id: string;
  userId: string;
  platform: "FACEBOOK" | "YOUTUBE" | "TIKTOK" | "INSTAGRAM";
  platformPageId: string;
  pageName: string;
  pageUrl: string;
  avatarUrl: string | null;
  syncEnabled: boolean;
  syncInterval: number;
  lastSyncedAt?: string | null;
  lastSyncAt?: string | null;
  status: SourceStatus;
  createdAt: string;
  updatedAt: string;
}

export type VideoStatus =
  | "DISCOVERED"
  | "IMPORTING"
  | "PROCESSING"
  | "READY"
  | "SCHEDULED"
  | "PUBLISHING"
  | "PUBLISHED"
  | "FAILED"
  | "ARCHIVED";

export interface Video {
  id: string;
  userId: string;
  sourceVideoId: string | null;
  title: string;
  description: string | null;
  duration: number | null;
  width: number | null;
  height: number | null;
  thumbnailUrl: string | null;
  storageKey: string | null;
  fileSize: number | null;
  mimeType: string | null;
  hashSha256: string | null;
  perceptualHash: string | null;
  status: VideoStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  shopeeUrl: string;
  imageUrl?: string | null;
  price: number;
  currency: string;
  category?: string | null;
  status?: string;
  createdAt: string;
  updatedAt: string;
  affiliateLinks: AffiliateLink[];
}

export type AffiliateNetwork =
  "SHOPEE" | "LAZADA" | "TIKTOK" | "TIKI" | "SENDO";

export interface AffiliateLink {
  id: string;
  productId: string;
  network: AffiliateNetwork;
  originalUrl: string;
  affiliateUrl: string;
  shortCode?: string;
  clicks?: number;
  conversions?: number;
  revenue?: number;
  clickCount: number;
  conversionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CaptionTemplate {
  id: string;
  userId: string;
  name: string;
  content: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommentTemplate {
  id: string;
  userId: string;
  name: string;
  content: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PostStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "QUEUED"
  | "PUBLISHING"
  | "PUBLISHED"
  | "FAILED"
  | "CANCELLED";

export interface Post {
  id: string;
  userId: string;
  videoId: string;
  facebookPageId: string;
  caption: string;
  firstComment: string | null;
  status: PostStatus;
  scheduledAt: string | null;
  publishedAt: string | null;
  externalPostId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  video?: Video;
  facebookPage?: FacebookPage;
  postProducts?: PostProduct[];
  schedule?: Schedule;
}

export interface PostProduct {
  postId: string;
  productId: string;
  product: Product;
}

export interface FacebookPage {
  id: string;
  userId: string;
  pageId: string;
  pageName: string;
  pageUrl: string;
  avatarUrl: string | null;
  accessToken?: string | null;  // Page Access Token dùng để đăng bài
  status?: string;
  isActive?: boolean;
  tokenExpiresAt?: string | null;
  connectedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Schedule {
  id: string;
  postId: string;
  scheduledAt: string;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  post?: Post;
}

export interface PostMetric {
  id: string;
  postId: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  affiliateClicks: number;
  ctr: number | null;
  revenue: number | null;
  recordedAt: string;
}

export interface AnalyticsOverview {
  counts: {
    posts: number;
    videos: number;
    products: number;
    pages: number;
  };
  totals: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    affiliateClicks: number;
  };
}

export interface Notification {
  id: string;
  userId: string;
  type:
    | "VIDEO_IMPORTED"
    | "POST_PUBLISHED"
    | "POST_FAILED"
    | "SOURCE_SYNC_FAILED"
    | "TOKEN_EXPIRING";
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  message: string | null;
  metadata: unknown;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

export interface AuthPayload {
  user: User;
}

export interface ApiError {
  success: false;
  code: string;
  message: string;
  details?: unknown;
  timestamp: string;
  path: string;
}

export interface CreateSourceInput {
  platform: SourcePage["platform"];
  platformPageId: string;
  pageName: string;
  pageUrl: string;
  avatarUrl?: string;
  syncEnabled?: boolean;
  syncInterval?: number;
}

export type UpdateSourceInput = Partial<CreateSourceInput>;

export interface CreateVideoInput {
  sourceVideoId?: string;
  title: string;
  description?: string;
  duration?: number;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
  storageKey?: string;
  fileSize?: number;
  mimeType?: string;
  hashSha256?: string;
  perceptualHash?: string;
  status?: VideoStatus;
}

export type UpdateVideoInput = Partial<CreateVideoInput>;

export interface CreateProductInput {
  name: string;
  description?: string;
  shopeeUrl: string;
  imageUrl?: string;
  price: number;
  currency?: string;
  category?: string;
}

export type UpdateProductInput = Partial<CreateProductInput>;

export interface AddAffiliateLinkInput {
  network: AffiliateNetwork;
  originalUrl: string;
  affiliateUrl: string;
}

export interface TemplateInput {
  name: string;
  content: string;
  isDefault?: boolean;
}

export type UpdateTemplateInput = Partial<TemplateInput>;

export interface CreatePostInput {
  videoId: string;
  facebookPageId: string;
  caption: string;
  firstComment?: string;
  productIds?: string[];
  scheduledAt?: string;
}

export type UpdatePostInput = Partial<CreatePostInput>;

export interface CreateScheduleInput {
  postId: string;
  scheduledAt: string;
}

export interface UpdateScheduleInput {
  scheduledAt: string;
}

export interface UpdateProfileInput {
  name?: string;
  email?: string;
  avatarUrl?: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface UserSettings {
  autoSync: boolean;
  defaultSyncInterval: number;
  defaultCaptionTemplateId?: string;
  defaultCommentTemplateId?: string;
  notificationEnabled: boolean;
}

export type UpdateSettingsInput = Partial<UserSettings>;

export interface UserStats {
  totalVideos: number;
  readyVideos?: number;
  scheduledPosts?: number;
  publishedPosts: number;
  totalProducts: number;
  connectedPages: number;
  totalViews?: number;
  totalLikes?: number;
  totalComments?: number;
  totalShares?: number;
  totalAffiliateClicks?: number;
}

export type PostAnalytics = PaginatedResponse<Post & { metrics: PostMetric[] }>;
export type ProductAnalytics = Product[];
export type PageAnalytics = Array<
  FacebookPage & {
    pageMetrics: Array<{ followers: number; engagement: number }>;
    posts?: Post[];
  }
>;

export interface PendingFacebookPage {
  id: string;
  name: string;
  link?: string;
  picture?: { data?: { url?: string } };
  tasks?: string[];
}

export interface FacebookConnectResponse {
  url: string;
}

export interface FacebookSelectionResponse {
  success: true;
  page: FacebookPage;
}
