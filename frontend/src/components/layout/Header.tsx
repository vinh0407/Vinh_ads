'use client';

import { useAuth } from '@/lib/auth';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown';
import { Bell, LogOut, User, Settings, Moon, Sun, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';

export function Header() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const userMenuItems: DropdownItem[] = [
    { label: 'Ho so', icon: <User className="h-4 w-4" />, onClick: () => router.push('/dashboard/settings') },
    { label: 'Cai dat', icon: <Settings className="h-4 w-4" />, onClick: () => router.push('/dashboard/settings') },
    { label: 'Dang xuat', icon: <LogOut className="h-4 w-4" />, onClick: logout, danger: true },
  ];

  const notifications: DropdownItem[] = [
    { label: 'Chua co thong bao moi', disabled: true, onClick: () => {} },
  ];

  return (
    <header
      role="banner"
      className="sticky top-0 z-20 flex h-14 items-center justify-between gap-4 border-b border-white/[0.06] dark:border-white/[0.06] bg-white/90 dark:bg-[#0a0a0f]/90 backdrop-blur-md px-4 transition-colors lg:px-8"
    >
      {/* Left: status pills */}
      <div className="flex items-center gap-2">
        <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-white/[0.04] border border-zinc-200 dark:border-white/[0.06] text-[11px] font-mono font-medium text-zinc-500 dark:text-zinc-500 uppercase tracking-widest">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Online
        </span>
        <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-[11px] font-mono font-bold text-red-500 uppercase tracking-widest">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
          AI Ready
        </span>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label="Toggle theme"
          className="h-8 w-8 flex items-center justify-center rounded-lg border border-zinc-200 dark:border-white/[0.06] text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-all"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* Notifications */}
        <Dropdown
          trigger={
            <button
              className="h-8 w-8 flex items-center justify-center rounded-lg border border-zinc-200 dark:border-white/[0.06] text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-all"
              aria-label="Thong bao"
            >
              <Bell className="h-4 w-4" />
            </button>
          }
          items={notifications}
        />

        {/* User menu */}
        <Dropdown
          trigger={
            <button
              aria-label="User menu"
              className="flex items-center gap-2 h-8 px-2.5 rounded-lg border border-zinc-200 dark:border-white/[0.06] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-all"
            >
              <Avatar
                src={user?.avatarUrl || null}
                fallback={user?.name || 'A'}
                size="sm"
                className="rounded-md border border-red-600/40"
              />
              <span className="hidden sm:block text-xs font-bold uppercase tracking-wider">{user?.name || 'ADMIN'}</span>
              <ChevronDown className="hidden sm:block h-3 w-3 text-zinc-400" />
            </button>
          }
          items={userMenuItems}
        />
      </div>
    </header>
  );
}