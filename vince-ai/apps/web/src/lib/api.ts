import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getCookie, setCookie, deleteCookie } from 'cookies-next';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const accessToken = getCookie('access_token');
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = getCookie('refresh_token');
        if (!refreshToken) throw new Error('No refresh token');

        const response = await axios.post(
          `${API_URL}/auth/refresh`,
          { refreshToken },
          { withCredentials: true }
        );

        const { accessToken, refreshToken: newRefreshToken } = response.data.data;
        
        document.cookie = `access_token=${accessToken}; path=/; max-age=900; SameSite=Lax`;
        document.cookie = `refresh_token=${newRefreshToken}; path=/; max-age=604800; SameSite=Lax`;

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        deleteCookie('access_token', { path: '/' });
        deleteCookie('refresh_token', { path: '/' });
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const authApi = {
  register: (data: { email: string; password: string; name: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),
  logout: (refreshToken?: string) =>
    api.post('/auth/logout', { refreshToken }),
  me: () => api.get('/auth/me'),
};

export const sourcesApi = {
  list: () => api.get('/sources'),
  create: (data: any) => api.post('/sources', data),
  get: (id: string) => api.get(`/sources/${id}`),
  update: (id: string, data: any) => api.patch(`/sources/${id}`, data),
  delete: (id: string) => api.delete(`/sources/${id}`),
  toggle: (id: string) => api.post(`/sources/${id}/toggle`),
  sync: (id: string) => api.post(`/sources/${id}/sync`),
};

export const videosApi = {
  list: (params?: { page?: number; limit?: number; status?: string; sourceId?: string }) =>
    api.get('/videos', { params }),
  create: (data: any) => api.post('/videos', data),
  get: (id: string) => api.get(`/videos/${id}`),
  update: (id: string, data: any) => api.patch(`/videos/${id}`, data),
  delete: (id: string) => api.delete(`/videos/${id}`),
  archive: (id: string) => api.post(`/videos/${id}/archive`),
};

export const productsApi = {
  list: () => api.get('/products'),
  create: (data: any) => api.post('/products', data),
  get: (id: string) => api.get(`/products/${id}`),
  update: (id: string, data: any) => api.patch(`/products/${id}`, data),
  delete: (id: string) => api.delete(`/products/${id}`),
  addAffiliateLink: (id: string, data: { network: string; originalUrl: string; affiliateUrl: string }) =>
    api.post(`/products/${id}/affiliate-links`, data),
};

export const templatesApi = {
  listCaptions: () => api.get('/templates/captions'),
  createCaption: (data: any) => api.post('/templates/captions', data),
  getCaption: (id: string) => api.get(`/templates/captions/${id}`),
  updateCaption: (id: string, data: any) => api.patch(`/templates/captions/${id}`, data),
  deleteCaption: (id: string) => api.delete(`/templates/captions/${id}`),
  listComments: () => api.get('/templates/comments'),
  createComment: (data: any) => api.post('/templates/comments', data),
  getComment: (id: string) => api.get(`/templates/comments/${id}`),
  updateComment: (id: string, data: any) => api.patch(`/templates/comments/${id}`, data),
  deleteComment: (id: string) => api.delete(`/templates/comments/${id}`),
  renderCaption: (id: string, variables: Record<string, string>) =>
    api.post(`/templates/captions/${id}/render`, { variables }),
  renderComment: (id: string, variables: Record<string, string>) =>
    api.post(`/templates/comments/${id}/render`, { variables }),
};

export const postsApi = {
  list: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get('/posts', { params }),
  create: (data: any) => api.post('/posts', data),
  get: (id: string) => api.get(`/posts/${id}`),
  update: (id: string, data: any) => api.patch(`/posts/${id}`, data),
  delete: (id: string) => api.delete(`/posts/${id}`),
  publish: (id: string) => api.post(`/posts/${id}/publish`),
  cancel: (id: string) => api.post(`/posts/${id}/cancel`),
};

export const schedulesApi = {
  list: () => api.get('/schedules'),
  create: (data: any) => api.post('/schedules', data),
  get: (id: string) => api.get(`/schedules/${id}`),
  update: (id: string, data: any) => api.patch(`/schedules/${id}`, data),
  delete: (id: string) => api.delete(`/schedules/${id}`),
};

export const facebookApi = {
  getConnectUrl: () => api.get('/facebook/connect'),
  getPages: () => api.get('/facebook/pages'),
  disconnectPage: (id: string) => api.delete(`/facebook/pages/${id}`),
};

export const analyticsApi = {
  overview: () => api.get('/analytics/overview'),
  posts: (params?: { page?: number; limit?: number }) =>
    api.get('/analytics/posts', { params }),
  products: () => api.get('/analytics/products'),
  pages: () => api.get('/analytics/pages'),
};

export const notificationsApi = {
  list: (params?: { page?: number; limit?: number; unreadOnly?: boolean }) =>
    api.get('/notifications', { params }),
  markAsRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/notifications/read-all'),
};

export const logsApi = {
  list: (params?: { page?: number; limit?: number; action?: string; entityType?: string }) =>
    api.get('/logs', { params }),
};

export const usersApi = {
  me: () => api.get('/users/me'),
  updateProfile: (data: any) => api.patch('/users/me', data),
  changePassword: (data: any) => api.patch('/users/me/password', data),
  getSettings: () => api.get('/users/me/settings'),
  updateSettings: (data: any) => api.patch('/users/me/settings', data),
  getStats: () => api.get('/users/me/stats'),
};