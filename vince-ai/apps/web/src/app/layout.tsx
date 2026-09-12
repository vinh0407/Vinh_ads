import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Vince AI - AI Video Factory',
  description: 'Local-First AI Video Factory with Google/Gemini/OpenCode Integration',
  keywords: ['AI', 'Video Generation', 'Gemini', 'OpenCode', 'Automation'],
  authors: [{ name: 'Vince AI Team' }],
  creator: 'Vince AI',
  publisher: 'Vince AI',
  robots: 'noindex, nofollow',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'http://localhost:3001',
    siteName: 'Vince AI',
    title: 'Vince AI - AI Video Factory',
    description: 'Local-First AI Video Factory with Google/Gemini/OpenCode Integration',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Vince AI Dashboard',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vince AI',
    description: 'Local-First AI Video Factory',
    images: ['/og-image.png'],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`${inter.variable} font-sans antialiased bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}