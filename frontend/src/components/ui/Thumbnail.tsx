'use client';

import { forwardRef, HTMLAttributes, useState, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface ThumbnailProps extends HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  fallbackIcon?: ReactNode;
  aspect?: 'square' | 'video';
  size?: 'sm' | 'md' | 'lg';
}

function getFallbackImage(altText = ''): string {
  const n = altText.toLowerCase();
  if (n.includes('quạt')) return 'https://images.unsplash.com/photo-1618941716939-553df3c6c276?w=600&q=80';
  if (n.includes('giá đỡ') || n.includes('kẹp') || n.includes('motowolf') || n.includes('lamicall')) return 'https://images.unsplash.com/photo-1586105251261-72a756497a11?w=600&q=80';
  if (n.includes('giấy') || n.includes('khăn') || n.includes('topgia') || n.includes('pio')) return 'https://images.unsplash.com/photo-1584556812952-905ffd0c611a?w=600&q=80';
  if (n.includes('sữa tắm') || n.includes('dove') || n.includes('serum') || n.includes('torriden')) return 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&q=80';
  if (n.includes('sốt') || n.includes('phô mai') || n.includes('tanzy')) return 'https://images.unsplash.com/photo-1585238342024-78d387f4a707?w=600&q=80';
  return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80';
}

export const Thumbnail = forwardRef<HTMLDivElement, ThumbnailProps>(
  ({ className, src, alt, fallbackIcon, aspect = 'square', size = 'md', ...props }, ref) => {
    const [imageError, setImageError] = useState(false);

    const sizes = {
      sm: aspect === 'square' ? 'h-10 w-10' : 'h-10 w-16',
      md: aspect === 'square' ? 'h-14 w-14' : 'h-14 w-24',
      lg: aspect === 'square' ? 'h-20 w-20' : 'h-20 w-32',
    };

    const effectiveSrc = (src && !imageError) ? src : getFallbackImage(alt);

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
        <Image
          fill
          unoptimized
          src={effectiveSrc}
          alt={alt || 'Thumbnail'}
          className="object-cover"
          onError={() => setImageError(true)}
        />
      </div>
    );
  }
);

Thumbnail.displayName = 'Thumbnail';
