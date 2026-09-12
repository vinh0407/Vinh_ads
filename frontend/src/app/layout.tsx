import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  title: 'ACCONTENT HUBAI — AI Video SaaS v2.4',
  description: 'He thong tu dong tao video AI, quan ly san pham Shopee Affiliate va dang da kenh',
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
