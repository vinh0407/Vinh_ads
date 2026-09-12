# VinhAds - Frontend

Frontend dashboard for AI Video SaaS with Shopee Affiliate.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form + Zod
- **HTTP Client**: Axios
- **State**: React Context + Cookies
- **Notifications**: React Hot Toast
- **Icons**: Lucide React
- **Charts**: Recharts

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/             # Auth pages (login, register)
│   ├── (dashboard)/        # Dashboard pages (protected)
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home page (redirect)
│   ├── globals.css         # Global styles
│   └── middleware.ts       # Auth middleware
├── components/
│   ├── ui/                 # Reusable UI components
│   ├── layout/             # Layout components (Sidebar, Header)
│   └── providers.tsx       # Context providers
├── lib/
│   ├── api.ts              # API client with interceptors
│   ├── auth.tsx            # Auth context
│   └── utils.ts            # Utility functions
├── hooks/                  # Custom hooks
└── types/                  # TypeScript types
```

## Pages

### Auth
- `/login` - Đăng nhập
- `/register` - Đăng ký

### Dashboard (Protected)
- `/dashboard` - Tổng quan
- `/dashboard/sources` - Quản lý nguồn video
- `/dashboard/videos` - Thư viện video
- `/dashboard/products` - Sản phẩm & Affiliate
- `/dashboard/templates` - Template Caption/Comment
- `/dashboard/posts` - Tạo bài đăng
- `/dashboard/schedules` - Lịch đăng bài
- `/dashboard/facebook` - Facebook Pages
- `/dashboard/analytics` - Phân tích & Báo cáo
- `/dashboard/settings` - Cài đặt

## Getting Started

### Prerequisites
- Node.js 18+
- Backend API running on port 3000

### Installation

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

### Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

## Features

### Authentication
- JWT với Access Token (15min) + Refresh Token (7 ngày)
- Auto refresh token khi hết hạn
- Bảo vệ route bằng middleware

### Dashboard
- Responsive sidebar navigation
- Header với user menu, notifications, theme toggle
- Real-time stats

### Video Management
- Import video từ nguồn
- Xử lý video (FFmpeg worker)
- Phát hiện trùng lặp (SHA-256 + perceptual hash)
- Trạng thái: DISCOVERED → READY → PUBLISHED

### Product & Affiliate
- Quản lý sản phẩm Shopee
- Multiple affiliate networks (Shopee, Lazada, TikTok, Tiki, Sendo)
- Click tracking

### Templates
- Caption template với biến `{product_name}`, `{price}`, `{affiliate_url}`
- Comment template
- Render preview

### Post Creation
- Chọn video + sản phẩm + template + Facebook Page
- Tự động render caption/comment
- Đăng ngay hoặc lên lịch

### Scheduling
- Tạo lịch đăng bài
- Worker tự động publish

### Facebook Integration
- OAuth 2.0 flow
- Token encryption
- Page management

### Analytics
- Tổng quan metrics
- Chi tiết bài đăng, sản phẩm, page
- CTR, engagement rate

## API Client

Axios instance với:
- Base URL từ env
- Auto attach access token
- Auto refresh token khi 401
- Error handling chuẩn

## Deployment

```bash
npm run build
npm start
```

## Docker

```bash
docker build -t vinhads-frontend .
docker run -p 3001:3001 vinhads-frontend
```