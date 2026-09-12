'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Video,
  Package,
  FileText,
  Send,
  Calendar,
  Facebook,
  BarChart3,
  Settings,
  Users,
  Bell,
  LogOut,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown';
import { Avatar } from '@/components/ui/Avatar';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Nguồn Video', href: '/dashboard/sources', icon: Video },
  { name: 'Thư viện Video', href: '/dashboard/videos', icon: Video },
  { name: 'Sản phẩm', href: '/dashboard/products', icon: Package },
  { name: 'Template', href: '/dashboard/templates', icon: FileText },
  { name: 'Tạo bài đăng', href: '/dashboard/posts', icon: Send },
  { name: 'Lịch đăng', href: '/dashboard/schedules', icon: Calendar },
  { name: 'Facebook Pages', href: '/dashboard/facebook', icon: Facebook },
  { name: 'Phân tích', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Cài đặt', href: '/dashboard/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        className="lg:hidden fixed top-4 left-4 z-50 bg-white p-2 rounded-lg shadow"
        onClick={() => setIsOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="h-6 w-6" />
      </button>

      <div
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 bg-white border-r lg:static lg:z-auto',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b lg:justify-start">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-primary-600 flex items-center justify-center">
              <Video className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl text-gray-900">Vince AI</span>
          </Link>
          <button
            className="lg:hidden p-1"
            onClick={() => setIsOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t">
          <div className="flex items-center space-x-3 px-3 py-2">
            <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setIsOpen(false)} />
      )}
    </>
  );
}