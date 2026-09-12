'use client';

import { forwardRef, HTMLAttributes, useState } from 'react';
import { cn } from '@/lib/utils';

import Image from 'next/image';

interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, alt, fallback, size = 'md', ...props }, ref) => {
    const [imageError, setImageError] = useState(false);
    const sizes = {
      sm: 'h-8 w-8 text-xs',
      md: 'h-10 w-10 text-sm',
      lg: 'h-12 w-12 text-base',
      xl: 'h-16 w-16 text-lg',
    };

    const initials = fallback
      ? fallback
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)
      : '?';

    return (
      <div
        ref={ref}
        className={cn(
          'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700',
          sizes[size],
          className
        )}
        {...props}
      >
        {src && !imageError ? (
          <Image
            fill
            unoptimized
            src={src}
            alt={alt || initials}
            className="aspect-square object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <span className="font-semibold text-slate-700 dark:text-slate-200">{initials}</span>
        )}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';