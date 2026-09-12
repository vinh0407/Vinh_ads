'use client';

import { Fragment, ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export function Modal({ isOpen, onClose, title, description, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement;
    const focusable = "a, button, textarea, input, select, [tabindex]:not([tabindex='-1'])";
    const modalNode = document.getElementById('modal-root');
    const firstFocusable = modalNode?.querySelector(focusable) as HTMLElement;
    firstFocusable?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      // trap focus within modal
      if (e.key === 'Tab') {
        const focusables = Array.from(modalNode?.querySelectorAll(focusable) || []);
        if (focusables.length === 0) return;
        const currentIndex = focusables.indexOf(document.activeElement as HTMLElement);
        let nextIndex = e.shiftKey ? currentIndex - 1 : currentIndex + 1;
        if (nextIndex < 0) nextIndex = focusables.length - 1;
        if (nextIndex >= focusables.length) nextIndex = 0;
        e.preventDefault();
        (focusables[nextIndex] as HTMLElement).focus();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-6xl',
  };

  return (
    <Fragment>
      <div 
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs transition-opacity" 
        onClick={onClose} 
        aria-hidden="true"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div
          id="modal-root"
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title' : undefined}
          aria-describedby={description ? 'modal-description' : undefined}
          className={cn(
            'w-full bg-white dark:bg-[#09090b] rounded-none border border-zinc-300 dark:border-zinc-800 shadow-2xl transition-all my-8',
            sizes[size]
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {(title || description) && (
            <div className="flex items-start justify-between p-5 md:p-6 border-b border-zinc-200 dark:border-zinc-850">
              <div>
                {title && (
                  <h3 id="modal-title" className="text-base font-bold uppercase tracking-wider text-zinc-950 dark:text-zinc-50">
                    {title}
                  </h3>
                )}
                {description && (
                  <p id="modal-description" className="text-xs uppercase tracking-wide font-mono text-zinc-500 dark:text-zinc-400 mt-1">
                    {description}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="rounded-none border border-zinc-300 dark:border-zinc-800 p-1.5 text-zinc-500 hover:text-white hover:bg-red-600 transition-colors ml-4"
                aria-label="Đóng"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          <div className="p-5 md:p-6">{children}</div>
        </div>
      </div>
    </Fragment>
  );
}