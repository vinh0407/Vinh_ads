'use client';

import { Fragment, ReactNode } from 'react';
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
  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-4xl',
  };

  return (
    <Fragment>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className={cn(
            'w-full bg-white rounded-lg shadow-xl',
            sizes[size]
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {(title || description) && (
            <div className="flex items-start justify-between p-4 border-b">
              <div>
                {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
                {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}
          <div className="p-4">{children}</div>
        </div>
      </div>
    </Fragment>
  );
}