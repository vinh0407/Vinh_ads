import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

export function formatCurrency(amount: number, currency = 'VND'): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return formatDate(date);
}

const DEFAULT_STATUS_COLOR =
  'bg-slate-100 text-slate-700 border border-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';

const MUTED_STATUS_COLOR =
  'bg-slate-100 text-slate-600 border border-slate-200/80 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60',
  READY: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60',
  PUBLISHED: 'bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-950/40 dark:text-teal-400 dark:border-teal-800/60',
  IMPORTING: 'bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800/60',
  QUEUED: 'bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800/60',
  PROCESSING: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60',
  PUBLISHING: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60',
  SCHEDULED: 'bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-800/60',
  FAILED: 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/60',
  ERROR: 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/60',
  ARCHIVED: MUTED_STATUS_COLOR,
  CANCELLED: MUTED_STATUS_COLOR,
  INACTIVE: MUTED_STATUS_COLOR,
  DRAFT: DEFAULT_STATUS_COLOR,
  DISCOVERED: DEFAULT_STATUS_COLOR,
};

export function getStatusColor(status: string): string {
  return STATUS_COLORS[status] || DEFAULT_STATUS_COLOR;
}

export const getVideoStatusColor = getStatusColor;
export const getPostStatusColor = getStatusColor;
export const getSourceStatusColor = getStatusColor;

export function renderTemplate(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{${key}}`, 'g'), value);
  }
  return result;
}

export function safeSetLocalStorage<T>(key: string, data: T, maxItems = 50): boolean {
  if (typeof window === 'undefined') return false;

  try {
    let valueToStore: any = data;
    if (Array.isArray(data)) {
      valueToStore = data.slice(0, maxItems);
    }
    localStorage.setItem(key, JSON.stringify(valueToStore));
    return true;
  } catch (err: any) {
    console.warn(`LocalStorage setItem error for key "${key}":`, err);
    try {
      if (Array.isArray(data)) {
        const trimmed = data.slice(0, 30).map((item: any) => {
          if (item && typeof item === 'object') {
            const copy = { ...item };
            if (typeof copy.mediaUrl === 'string' && copy.mediaUrl.startsWith('data:')) {
              copy.mediaUrl = '';
            }
            if (typeof copy.thumbnailUrl === 'string' && copy.thumbnailUrl.startsWith('data:')) {
              copy.thumbnailUrl = '';
            }
            if (typeof copy.productImageUrl === 'string' && copy.productImageUrl.startsWith('data:')) {
              copy.productImageUrl = '';
            }
            return copy;
          }
          return item;
        });
        localStorage.setItem(key, JSON.stringify(trimmed));
        return true;
      }
    } catch (retryErr) {
      console.error(`Failed retry setItem for key "${key}":`, retryErr);
      try {
        if (Array.isArray(data)) {
          localStorage.setItem(key, JSON.stringify(data.slice(0, 10)));
          return true;
        }
      } catch {}
    }
    return false;
  }
}