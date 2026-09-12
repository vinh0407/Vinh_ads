'use client';

import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface TableProps extends HTMLAttributes<HTMLTableElement> {}

export const Table = forwardRef<HTMLTableElement, TableProps>(
  ({ className, children, ...props }, ref) => (
    <div className="relative w-full overflow-auto">
      <table
        ref={ref}
        className={cn('w-full caption-bottom text-sm', className)}
        {...props}
      >
        {children}
      </table>
    </div>
  )
);

Table.displayName = 'Table';

export const TableHeader = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, children, ...props }, ref) => (
    <thead ref={ref} className={cn('[&_tr]:border-b [&_tr]:border-zinc-200 dark:[&_tr]:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40', className)} {...props}>
      {children}
    </thead>
  )
);

TableHeader.displayName = 'TableHeader';

export const TableBody = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, children, ...props }, ref) => (
    <tbody ref={ref} className={cn('[&_tr:last-child]:border-0 divide-y divide-zinc-100 dark:divide-zinc-900', className)} {...props}>
      {children}
    </tbody>
  )
);

TableBody.displayName = 'TableBody';

export const TableRow = forwardRef<HTMLTableRowElement, HTMLAttributes<HTMLTableRowElement>>(
  ({ className, children, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        'border-b border-zinc-100 dark:border-zinc-900 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/50 data-[state=selected]:bg-red-950/20',
        className
      )}
      {...props}
    >
      {children}
    </tr>
  )
);

TableRow.displayName = 'TableRow';

export const TableHead = forwardRef<HTMLTableCellElement, HTMLAttributes<HTMLTableCellElement>>(
  ({ className, children, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        'h-10 px-4 text-left align-middle font-bold text-[11px] uppercase tracking-widest font-mono text-zinc-500 dark:text-zinc-400 [&:has([role=checkbox])]:pr-0',
        className
      )}
      {...props}
    >
      {children}
    </th>
  )
);

TableHead.displayName = 'TableHead';

export const TableCell = forwardRef<HTMLTableCellElement, HTMLAttributes<HTMLTableCellElement>>(
  ({ className, children, ...props }, ref) => (
    <td
      ref={ref}
      className={cn('p-4 align-middle text-sm text-zinc-800 dark:text-zinc-200 [&:has([role=checkbox])]:pr-0', className)}
      {...props}
    >
      {children}
    </td>
  )
);

TableCell.displayName = 'TableCell';

export const TableCaption = forwardRef<HTMLTableCaptionElement, HTMLAttributes<HTMLTableCaptionElement>>(
  ({ className, children, ...props }, ref) => (
    <caption ref={ref} className={cn('mt-4 text-xs text-slate-500 dark:text-slate-400', className)} {...props}>
      {children}
    </caption>
  )
);

TableCaption.displayName = 'TableCaption';