'use client';

import { forwardRef, HTMLAttributes, useState, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ImageOff } from 'lucide-react';

import Image from 'next/image';

interface ThumbnailProps extends HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  fallbackIcon?: ReactNode;
  aspect?: 'square' | 'video';
  size?: 'sm' | 'md' | 'lg';
}

export const Thumbnail = forwardRef<HTMLDivElement, ThumbnailProps>(
  ({ className, src, alt, fallbackIcon, aspect = 'square', size = 'md', ...props }, ref) => {
    const [imageError, setImageError] = useState(false);

    const sizes = {
      sm: aspect === 'square' ? 'h-10 w-10' : 'h-10 w-16',
      md: aspect === 'square' ? 'h-14 w-14' : 'h-14 w-24',
      lg: aspect === 'square' ? 'h-20 w-20' : 'h-20 w-32',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'relative shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-500',
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
            alt={alt || 'Thumbnail'}
            className="object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          fallbackIcon || <ImageOff className="h-5 w-5 opacity-60" />
        )}
      </div>
    );
  }
);

Thumbnail.displayName = 'Thumbnail';

