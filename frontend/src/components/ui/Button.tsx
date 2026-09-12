'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-bold uppercase tracking-wider transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-yellow-400 disabled:opacity-40 disabled:pointer-events-none active:scale-[0.98] active:-translate-y-[1px] select-none rounded-none border border-transparent';
    
    const variants = {
      primary: 'bg-red-600 text-white hover:bg-red-500 active:bg-red-700 border-red-600 shadow-none',
      secondary: 'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 border-zinc-900 dark:border-zinc-100 shadow-none',
      outline: 'border-zinc-300 dark:border-zinc-700 bg-transparent text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-white/[0.05] shadow-none',
      ghost: 'bg-transparent text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.05] border-transparent dark:border-white/[0.08] shadow-none',
      danger: 'bg-red-700 text-white hover:bg-red-600 active:bg-red-800 border-red-700 shadow-none',
    };
    
    const sizes = {
      sm: 'h-8 px-3 text-xs gap-1.5 font-semibold',
      md: 'h-10 px-5 py-2 text-xs tracking-widest gap-2',
      lg: 'h-12 px-7 text-sm tracking-widest gap-2.5',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
