'use client';

import { Fragment, useRef, useEffect, useState, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface DropdownItem {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  disabled?: boolean;
  danger?: boolean;
}

interface DropdownProps {
  trigger: ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
}

export function Dropdown({ trigger, items, align = 'right' }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
      
      {isOpen && (
        <Fragment>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div
            className={cn(
              'absolute z-50 min-w-[180px] rounded-xl border border-slate-200/80 bg-white/95 backdrop-blur-md p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900/95 transition-all',
              align === 'right' ? 'right-0' : 'left-0'
            )}
            style={{ marginTop: '8px' }}
          >
            {items.map((item, index) => (
              <button
                key={index}
                onClick={() => {
                  item.onClick();
                  setIsOpen(false);
                }}
                disabled={item.disabled}
                className={cn(
                  'flex w-full items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left',
                  item.danger
                    ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100',
                  item.disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent dark:hover:bg-transparent'
                )}
              >
                {item.icon && <span className="h-4 w-4 flex-shrink-0 opacity-75">{item.icon}</span>}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </Fragment>
      )}
    </div>
  );
}