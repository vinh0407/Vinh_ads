'use client';

import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'outline';
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variants = {
      default: 'bg-zinc-100 text-zinc-800 border border-zinc-300 dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700',
      secondary: 'bg-zinc-50 text-zinc-600 border border-zinc-200 dark:bg-zinc-900/50 dark:text-zinc-400 dark:border-zinc-700',
      success: 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/80',
      warning: 'bg-amber-950/40 text-amber-400 border border-amber-800/80',
      danger: 'bg-red-950/60 text-red-400 border border-red-800',
      info: 'bg-zinc-900 text-red-400 border border-red-900/50',
      outline: 'border border-current bg-transparent',
    };

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-none px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider font-mono gap-1',
          variants[variant],
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';