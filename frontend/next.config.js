const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'https', hostname: 'graph.facebook.com' },
      { protocol: 'https', hostname: '**.fbcdn.net' },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
  async rewrites() {
    const rawApi = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
    const baseApi = rawApi.replace(/\/api\/?$/, '');
    return [
      {
        source: '/api/backend/:path*',
        destination: `${baseApi}/api/:path*`,
      },
    ];
  },
};

module.exports = withBundleAnalyzer(nextConfig);