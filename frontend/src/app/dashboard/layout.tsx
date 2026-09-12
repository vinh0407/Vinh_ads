'use client';

import { ReactNode, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';

const DATA_VERSION = 'v2.5-clean'; // Tăng version khi cần reset lại

export default function DashboardLayout({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Chỉ chạy 1 lần khi version thay đổi
    if (localStorage.getItem('data_version') === DATA_VERSION) return;

    // Xóa dữ liệu fake cũ
    localStorage.removeItem('custom_posts');
    localStorage.removeItem('custom_schedules');

    // Lưu 1 Fanpage thật với token đã xác minh
    const realPages = [{
      id: '1282948524895927',
      userId: 'usr-1',
      pageId: '1282948524895927',
      pageName: 'Loài mèo gắn link',
      pageUrl: 'https://www.facebook.com/1282948524895927',
      avatarUrl: null,
      accessToken: 'EAAvBZA9TFH30BSby9A8fhOy8oiE3W0VehGIKuqflrOTN7H9ZCqk9KmoDcqUVQERvyJnyQZAusZBkKDMHZAf6gV3fKkbO5hblGFBVPfXDQrbntfYfkkdaja7gzx1OuhGdG3qUVZAbTgqfZAJ57m6Nitjpo1T57iEZAPfFvbT0bUkmi3xSqZBzxfUKkRe9YBYmI4Si0ZC1dhpKVW',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }];
    localStorage.setItem('custom_facebook_pages', JSON.stringify(realPages));

    // Đánh dấu đã cleanup
    localStorage.setItem('data_version', DATA_VERSION);
    console.info('[ACCONTENT] ✅ Dữ liệu đã được làm sạch — phiên bản', DATA_VERSION);
  }, []);

  return (
    <div className="min-h-screen bg-[#060608] dark:bg-[#060608] text-zinc-100 transition-colors">
      <Sidebar />
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}