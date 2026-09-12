'use client';

import { Fragment, useRef, useEffect, useState, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DropdownItem {
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

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
      
      {isOpen && (
        <Fragment>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div
            className={cn(
              'z-50 min-w-[160px] rounded-md border border-gray-200 bg-white py-1 shadow-lg',
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
                  'flex w-full items-center px-4 py-2 text-sm',
                  item.danger ? 'text-red-600' : 'text-gray-700',
                  'hover:bg-gray-100 focus:outline-none focus:bg-gray-100',
                  item.disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                {item.icon && <span className="mr-2 h-4 w-4">{item.icon}</span>}
                {item.label}
              </button>
            ))}
          </div>
        </Fragment>
      )}
    </div>
  );
}

export interface DropdownItem {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  disabled?: boolean;
  danger?: boolean;
}