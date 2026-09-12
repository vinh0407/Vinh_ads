export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  status: 'ACTIVE' | 'SUSPENDED' | 'DELETED';
  createdAt: string;
  updatedAt: string;
}

export interface SourcePage {
  id: string;
  userId: string;
  platform: 'FACEBOOK' | 'YOUTUBE' | 'TIKTOK' | 'INSTAGRAM';
  platformPageId: string;
  pageName: string;
  pageUrl: string;
  avatarUrl: string | null;
  syncEnabled: boolean;
  syncInterval: number;
  lastSyncedAt: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'ERROR';
  createdAt: string;
  updatedAt: string;
}

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
  status: 'DISCOVERED' | 'IMPORTING' | 'PROCESSING' | 'READY' | 'SCHEDULED' | 'PUBLISHING' | 'PUBLISHED' | 'FAILED' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  shopeeUrl: string;
  imageUrl: string | null;
  price: number;
  currency: string;
  category: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  affiliateLinks: AffiliateLink[];
}

export interface AffiliateLink {
  id: string;
  productId: string;
  network: 'SHOPEE' | 'LAZADA' | 'TIKTOK' | 'TIKI' | 'SENDO';
  originalUrl: string;
  affiliateUrl: string;
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

export interface Post {
  id: string;
  userId: string;
  videoId: string;
  facebookPageId: string;
  caption: string;
  firstComment: string | null;
  status: 'DRAFT' | 'SCHEDULED' | 'QUEUED' | 'PUBLISHING' | 'PUBLISHED' | 'FAILED' | 'CANCELLED';
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
  status: string;
  connectedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Schedule {
  id: string;
  postId: string;
  scheduledAt: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  updatedAt: string;
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
  type: 'VIDEO_IMPORTED' | 'POST_PUBLISHED' | 'POST_FAILED' | 'SOURCE_SYNC_FAILED' | 'TOKEN_EXPIRING';
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
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  message: string | null;
  metadata: any;
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

export interface ApiError {
  success: false;
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  path: string;
}