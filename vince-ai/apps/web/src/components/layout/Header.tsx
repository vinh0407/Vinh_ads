'use client';

import { useAuth } from '@/lib/auth';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown';
import { Bell, LogOut, User, Settings, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

export function Header() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const userMenuItems: DropdownItem[] = [
    { label: 'Hồ sơ', icon: <User className="h-4 w-4" />, onClick: () => {} },
    { label: 'Cài đặt', icon: <Settings className="h-4 w-4" />, onClick: () => {} },
    { label: 'Đăng xuất', icon: <LogOut className="h-4 w-4" />, onClick: logout, danger: true },
  ];

  const notifications: DropdownItem[] = [
    { label: 'Chưa có thông báo', disabled: true, onClick: () => {} },
  ];

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b bg-white px-4 shadow-sm lg:gap-6 lg:px-8">
      <div className="flex-1" />
      
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        <Dropdown
          trigger={
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] font-medium text-white flex items-center justify-center">
                3
              </span>
            </Button>
          }
          items={notifications}
        />

        <Dropdown
          trigger={
            <Button variant="ghost" className="flex items-center gap-2 p-1">
              <Avatar src={user?.avatarUrl || null} fallback={user?.name || 'U'} size="sm" />
              <span className="hidden sm:block text-sm font-medium">{user?.name}</span>
              <span className="hidden sm:block">▼</span>
            </Button>
          }
          items={userMenuItems}
        />
      </div>
    </header>
  );
}