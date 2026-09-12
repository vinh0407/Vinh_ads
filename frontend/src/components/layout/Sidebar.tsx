'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Bot, Sparkles, Video, Package, Send, Calendar,
  Facebook, BarChart3, Settings, Menu, X, Layers, Radio, Share2,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';

const navigationGroups = [
  {
    title: 'Overview',
    items: [
      { name: 'Console Overview', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'AI Engine',
    items: [
      { name: 'Studio Video AI', href: '/dashboard/videos/create', icon: Sparkles },
      { name: 'Kho Link Aff Shopee', href: '/dashboard/products', icon: Package },
      { name: 'Radar Tin & Viral', href: '/dashboard/news', icon: Radio },
      { name: 'Len Lich Da Kenh', href: '/dashboard/schedules', icon: Calendar },
      { name: 'AI Missions (1-Click)', href: '/dashboard/missions', icon: Bot },
      { name: 'Kho Media Album Post', href: '/dashboard/albumpost', icon: Video },
    ],
  },
  {
    title: 'Distribution',
    items: [
      { name: 'Quản Lý Mạng Xã Hội', href: '/dashboard/Socialmedia', icon: Share2 },
      { name: 'AutoSpy', href: '/dashboard/sources', icon: Share2 },
      { name: 'Captions & Templates', href: '/dashboard/templates', icon: Layers },
    ],
  },
  {
    title: 'System',
    items: [
      { name: 'System Settings', href: '/dashboard/settings', icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname() || '';
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        className="lg:hidden fixed top-3.5 left-4 z-50 flex items-center justify-center h-9 w-9 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-300 hover:text-white hover:border-zinc-500 transition-all shadow-lg"
        onClick={() => setIsOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="h-4 w-4" />
      </button>

      <div
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 flex flex-col transition-transform duration-200 ease-in-out',
          'bg-[#0a0a0f] border-r border-white/[0.06]',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex h-16 items-center justify-between px-5 border-b border-white/[0.06] flex-shrink-0">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="relative h-8 w-8 flex items-center justify-center">
              <div className="absolute inset-0 bg-red-600 rounded-lg opacity-90 group-hover:opacity-100 transition-opacity" />
              <span className="relative font-black text-white text-xs tracking-tighter z-10">AC</span>
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-extrabold text-[13px] tracking-widest uppercase text-white font-mono flex items-center gap-1.5">
                CONTENT HUB
                <span className="h-1.5 w-1.5 bg-red-500 rounded-full animate-pulse" />
              </span>
              <span className="text-[9px] font-mono tracking-widest text-zinc-600 uppercase mt-0.5">AI VIDEO SAAS v2.4</span>
            </div>
          </Link>
          <button
            className="lg:hidden h-7 w-7 flex items-center justify-center rounded-md text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
            onClick={() => setIsOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav aria-label="Main navigation" className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {navigationGroups.map((group) => (
            <div key={group.title}>
              <p className="px-3 mb-2 text-[10px] font-semibold tracking-[0.12em] text-zinc-600 uppercase font-mono">
                {group.title}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive =
                    item.href === '/dashboard'
                      ? pathname === '/dashboard'
                      : pathname === item.href || pathname.startsWith(item.href + '/');
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all duration-100',
                        isActive
                          ? 'bg-red-600/15 text-white ring-1 ring-inset ring-red-600/30'
                          : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.05]'
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-3.5 w-3.5 flex-shrink-0 transition-colors',
                          isActive ? 'text-red-400' : 'text-zinc-600'
                        )}
                      />
                      <span className="truncate">{item.name}</span>
                      {isActive && (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-red-500 flex-shrink-0" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-white/[0.06] flex-shrink-0">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors cursor-pointer group">
            <div className="relative h-7 w-7 flex-shrink-0">
              <div className="h-7 w-7 rounded-lg bg-red-950/80 border border-red-800/60 flex items-center justify-center font-bold text-[11px] text-red-300 font-mono">
                {user?.name?.[0]?.toUpperCase() || 'A'}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 bg-emerald-500 rounded-full border-2 border-[#0a0a0f]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-200 truncate">{user?.name || 'ADMINISTRATOR'}</p>
              <p className="text-[10px] text-zinc-600 font-mono truncate">{user?.email || 'PRO SUBSCRIBER'}</p>
            </div>
            <Settings className="h-3.5 w-3.5 text-zinc-700 group-hover:text-zinc-400 transition-colors flex-shrink-0" />
          </div>
        </div>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}