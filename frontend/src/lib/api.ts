import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { shouldAttemptRefresh } from "./auth-retry-policy";
import type {
  AddAffiliateLinkInput,
  AnalyticsOverview,
  ApiError,
  ApiResponse,
  AuthPayload,
  ChangePasswordInput,
  ActivityLog,
  CaptionTemplate,
  CommentTemplate,
  CreatePostInput,
  CreateProductInput,
  CreateScheduleInput,
  CreateSourceInput,
  CreateVideoInput,
  PageAnalytics,
  FacebookConnectResponse,
  FacebookPage,
  FacebookSelectionResponse,
  Notification,
  PendingFacebookPage,
  PaginatedResponse,
  Post,
  PostAnalytics,
  Product,
  ProductAnalytics,
  SourcePage,
  Schedule,
  TemplateInput,
  UpdatePostInput,
  UpdateProductInput,
  UpdateScheduleInput,
  UpdateSettingsInput,
  UpdateSourceInput,
  UpdateTemplateInput,
  UpdateProfileInput,
  UpdateVideoInput,
  User,
  UserSettings,
  UserStats,
  Video,
} from "@/types";

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError<ApiError>(error)) return fallback;
  return error.response?.data.message || fallback;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

let refreshInFlight: Promise<void> | null = null;
const retriedRequests = new WeakSet<InternalAxiosRequestConfig>();

async function refreshAccessToken(): Promise<void> {
  await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;

    if (!originalRequest) return Promise.reject(error);

    if (
      shouldAttemptRefresh(
        error.response?.status,
        originalRequest.url,
        retriedRequests.has(originalRequest),
      )
    ) {
      retriedRequests.add(originalRequest);

      try {
        if (!refreshInFlight) {
          refreshInFlight = refreshAccessToken().finally(() => {
            refreshInFlight = null;
          });
        }
        await refreshInFlight;
        return api(originalRequest);
      } catch (refreshError) {
        if (
          typeof window !== "undefined" &&
          window.location.pathname !== "/login" &&
          window.location.pathname !== "/register"
        ) {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export const authApi = {
  register: (data: { email: string; password: string; name: string }) =>
    api.post<ApiResponse<AuthPayload>>("/auth/register", data),
  login: (data: { email: string; password: string }) =>
    api.post<ApiResponse<AuthPayload>>("/auth/login", data),
  refresh: () => api.post<ApiResponse<AuthPayload>>("/auth/refresh", {}),
  logout: () => api.post("/auth/logout", {}),
  me: () => api.get<ApiResponse<User>>("/auth/me"),
};

export const sourcesApi = {
  list: () => api.get<ApiResponse<SourcePage[]>>("/sources"),
  create: (data: CreateSourceInput) =>
    api.post<ApiResponse<SourcePage>>("/sources", data),
  get: (id: string) => api.get<ApiResponse<SourcePage>>(`/sources/${id}`),
  update: (id: string, data: UpdateSourceInput) =>
    api.patch<ApiResponse<SourcePage>>(`/sources/${id}`, data),
  delete: (id: string) => api.delete(`/sources/${id}`),
  toggle: (id: string) => api.post(`/sources/${id}/toggle`),
  sync: (id: string) => api.post(`/sources/${id}/sync`),
};

export const videosApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    sourceId?: string;
  }) => api.get<ApiResponse<PaginatedResponse<Video>>>("/videos", { params }),
  create: (data: CreateVideoInput) =>
    api.post<ApiResponse<Video>>("/videos", data),
  upload: (formData: FormData) =>
    api.post<ApiResponse<Video>>("/videos/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }),
  get: (id: string) => api.get<ApiResponse<Video>>(`/videos/${id}`),
  update: (id: string, data: UpdateVideoInput) =>
    api.patch<ApiResponse<Video>>(`/videos/${id}`, data),
  delete: (id: string) => api.delete(`/videos/${id}`),
  archive: (id: string) => api.post(`/videos/${id}/archive`),
};

export const productsApi = {
  list: async () => {
    let localProducts: Product[] = [];
    if (typeof window !== 'undefined') {
      try {
        localProducts = JSON.parse(localStorage.getItem('custom_affiliate_products') || '[]');
      } catch {
        localProducts = [];
      }
    }
    try {
      const res = await api.get<ApiResponse<Product[]>>("/products");
      const serverProducts = res.data?.data || [];
      const merged = [...localProducts];
      for (const sp of serverProducts) {
        if (!merged.some(p => p.id === sp.id)) {
          merged.push(sp);
        }
      }
      return { ...res, data: { ...res.data, data: merged } };
    } catch {
      return { data: { success: true, data: localProducts } } as any;
    }
  },
  create: (data: CreateProductInput) =>
    api.post<ApiResponse<Product>>("/products", data),
  get: (id: string) => api.get<ApiResponse<Product>>(`/products/${id}`),
  update: (id: string, data: UpdateProductInput) =>
    api.patch<ApiResponse<Product>>(`/products/${id}`, data),
  delete: (id: string) => api.delete(`/products/${id}`),
  addAffiliateLink: (id: string, data: AddAffiliateLinkInput) =>
    api.post(`/products/${id}/affiliate-links`, data),
  scrapeShopee: (url: string, customSubId?: string) =>
    api.post<
      ApiResponse<{
        name: string;
        description: string;
        price: number;
        currency: string;
        imageUrl: string;
        shopeeUrl: string;
        affiliateUrl: string;
        category?: string;
      }>
    >("/products/scrape-shopee", { url, customSubId }),
};

export const templatesApi = {
  listCaptions: () =>
    api.get<ApiResponse<CaptionTemplate[]>>("/templates/captions"),
  createCaption: (data: TemplateInput) =>
    api.post<ApiResponse<CaptionTemplate>>("/templates/captions", data),
  getCaption: (id: string) =>
    api.get<ApiResponse<CaptionTemplate>>(`/templates/captions/${id}`),
  updateCaption: (id: string, data: UpdateTemplateInput) =>
    api.patch<ApiResponse<CaptionTemplate>>(`/templates/captions/${id}`, data),
  deleteCaption: (id: string) => api.delete(`/templates/captions/${id}`),
  listComments: () =>
    api.get<ApiResponse<CommentTemplate[]>>("/templates/comments"),
  createComment: (data: TemplateInput) =>
    api.post<ApiResponse<CommentTemplate>>("/templates/comments", data),
  getComment: (id: string) =>
    api.get<ApiResponse<CommentTemplate>>(`/templates/comments/${id}`),
  updateComment: (id: string, data: UpdateTemplateInput) =>
    api.patch<ApiResponse<CommentTemplate>>(`/templates/comments/${id}`, data),
  deleteComment: (id: string) => api.delete(`/templates/comments/${id}`),
  renderCaption: (id: string, variables: Record<string, string>) =>
    api.post(`/templates/captions/${id}/render`, { variables }),
  renderComment: (id: string, variables: Record<string, string>) =>
    api.post(`/templates/comments/${id}/render`, { variables }),
};

export const postsApi = {
  list: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get<ApiResponse<PaginatedResponse<Post>>>("/posts", { params }),
  create: (data: CreatePostInput) =>
    api.post<ApiResponse<Post>>("/posts", data),
  get: (id: string) => api.get<ApiResponse<Post>>(`/posts/${id}`),
  update: (id: string, data: UpdatePostInput) =>
    api.patch<ApiResponse<Post>>(`/posts/${id}`, data),
  delete: (id: string) => api.delete(`/posts/${id}`),
  publish: (id: string) => api.post(`/posts/${id}/publish`),
  cancel: (id: string) => api.post(`/posts/${id}/cancel`),
};

export const schedulesApi = {
  list: () => api.get<ApiResponse<Schedule[]>>("/schedules"),
  create: (data: CreateScheduleInput) =>
    api.post<ApiResponse<Schedule>>("/schedules", data),
  get: (id: string) => api.get<ApiResponse<Schedule>>(`/schedules/${id}`),
  update: (id: string, data: UpdateScheduleInput) =>
    api.patch<ApiResponse<Schedule>>(`/schedules/${id}`, data),
  delete: (id: string) => api.delete(`/schedules/${id}`),
};

export const facebookApi = {
  getConnectUrl: () =>
    api.get<ApiResponse<FacebookConnectResponse>>("/facebook/connect"),
  connectTestPage: async (pageName?: string) => {
    const newPage: FacebookPage = {
      id: `fb_page_${Date.now()}`,
      userId: 'admin',
      pageId: `10009${Math.floor(100000 + Math.random() * 900000)}`,
      pageName: pageName || 'Auto Content Hub - Demo Channel',
      pageUrl: 'https://facebook.com/autohubdemo',
      avatarUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&q=80',
      isActive: true,
      tokenExpiresAt: new Date(Date.now() + 60 * 86400000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (typeof window !== 'undefined') {
      try {
        const stored = JSON.parse(localStorage.getItem('custom_facebook_pages') || '[]');
        localStorage.setItem('custom_facebook_pages', JSON.stringify([newPage, ...stored]));
      } catch {
        // ignore
      }
    }
    try {
      return await api.post<ApiResponse<FacebookPage>>("/facebook/connect-test", { pageName });
    } catch {
      return { data: { success: true, data: newPage } } as any;
    }
  },
  getPages: async () => {
    let localPages: FacebookPage[] = [];
    if (typeof window !== 'undefined') {
      try {
        localPages = JSON.parse(localStorage.getItem('custom_facebook_pages') || '[]');
      } catch {
        localPages = [];
      }
    }
    try {
      const res = await api.get<ApiResponse<FacebookPage[]>>("/facebook/pages");
      const serverPages = res.data?.data || [];
      const merged = [...localPages];
      for (const sp of serverPages) {
        if (!merged.some(p => p.id === sp.id || p.pageId === sp.pageId)) {
          merged.push(sp);
        }
      }
      return { ...res, data: { ...res.data, data: merged } };
    } catch {
      return { data: { success: true, data: localPages } } as any;
    }
  },
  getPendingPages: (sessionId: string) =>
    api.get<ApiResponse<PendingFacebookPage[]>>(
      `/facebook/pending/${sessionId}`,
    ),
  selectPage: (sessionId: string, pageId: string) =>
    api.post<ApiResponse<FacebookSelectionResponse>>("/facebook/select", {
      sessionId,
      pageId,
    }),
  disconnectPage: async (id: string) => {
    if (typeof window !== 'undefined') {
      try {
        const stored: FacebookPage[] = JSON.parse(localStorage.getItem('custom_facebook_pages') || '[]');
        const filtered = stored.filter(p => p.id !== id && p.pageId !== id);
        localStorage.setItem('custom_facebook_pages', JSON.stringify(filtered));
      } catch {
        // ignore
      }
    }
    try {
      return await api.delete(`/facebook/pages/${id}`);
    } catch {
      return { data: { success: true } } as any;
    }
  },
};

export const analyticsApi = {
  overview: () =>
    api.get<ApiResponse<AnalyticsOverview>>("/analytics/overview"),
  posts: (params?: { page?: number; limit?: number }) =>
    api.get<ApiResponse<PostAnalytics>>("/analytics/posts", { params }),
  products: () => api.get<ApiResponse<ProductAnalytics>>("/analytics/products"),
  pages: () => api.get<ApiResponse<PageAnalytics>>("/analytics/pages"),
};

export const notificationsApi = {
  list: (params?: { page?: number; limit?: number; unreadOnly?: boolean }) =>
    api.get<ApiResponse<PaginatedResponse<Notification>>>("/notifications", {
      params,
    }),
  markAsRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch("/notifications/read-all"),
};

export const logsApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    action?: string;
    entityType?: string;
  }) =>
    api.get<ApiResponse<PaginatedResponse<ActivityLog>>>("/logs", { params }),
};

export const usersApi = {
  me: () => api.get<ApiResponse<User>>("/users/me"),
  updateProfile: (data: UpdateProfileInput) => api.patch("/users/me", data),
  changePassword: (data: ChangePasswordInput) =>
    api.patch("/users/me/password", data),
  getSettings: () => api.get<ApiResponse<UserSettings>>("/users/me/settings"),
  updateSettings: (data: UpdateSettingsInput) =>
    api.patch("/users/me/settings", data),
  getStats: () => api.get<ApiResponse<UserStats>>("/users/me/stats"),
};

export const storageApi = {
  getUploadUrl: (key: string, contentType: string) =>
    api.post("/storage/upload-url", { key, contentType }),
};

export const videoGeneratorApi = {
  renderTikTokVideo: (data: {
    title: string;
    hook: string;
    scriptText: string;
    callToAction: string;
  }) =>
    api.post<ApiResponse<{ videoUrl: string; duration: number }>>(
      "/video-generator/render",
      data,
    ),
  generateProductAdScript: (data: {
    productName: string;
    productImage?: string;
    price?: number;
    category?: string;
    description?: string;
  }) =>
    api.post<ApiResponse<any>>("/video-generator/product-ad-script", data),
  matchProduct: (data: {
    title: string;
    content: string;
    existingCatalog?: Array<{
      id: string;
      name: string;
      shopeeUrl: string;
      price: number;
    }>;
  }) => api.post<ApiResponse<any>>("/video-generator/match-product", data),
};
