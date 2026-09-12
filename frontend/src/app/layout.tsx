import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  title: 'VinhAds — AI Video SaaS',
  description: 'Hệ thống tự động tạo video AI, quản lý sản phẩm Shopee Affiliate và đăng đa kênh',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className={`${GeistSans.className} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
