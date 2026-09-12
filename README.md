# VinhAds - Video SaaS Automation Platform

> **Hệ thống tự động hóa tạo video AI, quản lý sản phẩm Shopee Affiliate và xuất bản đa kênh Facebook, TikTok, Shorts & Threads.**

[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10-red.svg)](https://nestjs.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue.svg)](https://postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-red.svg)](https://redis.io/)
[![Prisma](https://img.shields.io/badge/Prisma-5-2D3748.svg)](https://prisma.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://docker.com/)

---

## 📖 Tổng quan

**VinhAds** là nền tảng SaaS tự động hóa quy trình content marketing video hoàn chỉnh:

1. **🔄 Ingestion** - Tự động sync video từ Facebook Pages, YouTube, TikTok
2. **🤖 AI Content Factory** - Gemini AI tạo script TikTok, video quảng cáo, bài viết social, match sản phẩm Shopee
3. **💰 Affiliate Monetization** - Quản lý sản phẩm Shopee, chèn link affiliate vào first comment, track clicks/conversions
4. **📤 Multi-channel Publishing** - Đăng video lên Facebook Reels (chunked upload), lên lịch tự động qua BullMQ
5. **📊 Analytics Loop** - Theo dõi metrics, revenue attribution, product performance

---

## 🏗️ Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────────────────┐
│                        MONOREPO STRUCTURE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  apps/                                                           │
│  ├── web/              # Next.js 14 Dashboard (port 3001)       │
│  └── desktop-agent/    # Electron app (planned)                 │
│                                                                  │
│  backend/              # NestJS API Server (port 3000)          │
│  ├── src/                                                          
│  │   ├── auth/         # JWT + Google OAuth + PKCE               │
│  │   ├── sources/      # Video source management                 │
│  │   ├── videos/       # Video CRUD + processing pipeline        │
│  │   ├── posts/        # Post creation + templates               │
│  │   ├── schedules/    # Cron scheduling + dispatch              │
│  │   ├── products/     # Shopee affiliate products               │
│  │   ├── templates/    # Caption/Comment templates               │
│  │   ├── facebook/     # OAuth + Graph API publishing            │
│  │   ├── queue/        # BullMQ + Redis job queues               │
│  │   ├── workers/      # Background workers (5 workers)          │
│  │   ├── ai/           # Gemini Service (6 AI capabilities)      │
│  │   ├── storage/      # S3-compatible storage                   │
│  │   ├── analytics/    # Metrics + revenue tracking              │
│  │   └── ...                                                    │
│  └── prisma/           # Database schema (23 models)            │
│                                                                  │
│  vince-ai/             # Shared packages monorepo (TurboRepo)    │
│  ├── packages/shared/  # Types, utils, logger, events, crypto    │
│  ├── packages/ai/                                                         
│  │   ├── gemini/       # Google GenAI provider                  │
│  │   ├── nemotron/     # NVIDIA Nemotron provider               │
│  │   ├── router/       # AI Task Router (keyword-based)         │
│  │   ├── orchestrator/ # Multi-step AI orchestration            │
│  │   └── opencode/     # OpenCode provider                      │
│  ├── packages/auth/google/  # Google OAuth + PKCE               │
│  └── packages/browser/playwright/  # Browser automation         │
│                                                                  │
│  StartAll/             # 1-click startup scripts                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Khởi động nhanh (1-Click)

### Cách 1: Script Master (Khuyến nghị)

```bash
# Double-click file shortcut trên Desktop:
# Desktop → "StartAll - VinhAds.lnk"

# Hoặc chạy trực tiếp:
cd StartAll
StartAll.bat
```

**Tiến trình tự động:**
1. 🐳 Khởi động Docker (PostgreSQL 5432 + Redis 6379)
2. 🚀 Backend NestJS API Server (port 3000)
3. ⚙️ Worker Queue (BullMQ - 5 workers)
4. 🌐 Frontend Next.js Dashboard (port 3001)
5. 🔗 Cloudflare Tunnels (public HTTPS)
6. 🌍 Mở browser tại `http://localhost:3001/dashboard`

### Cách 2: Manual (Development)

```bash
# 1. Start Database
docker-compose up -d postgres redis

# 2. Backend
cd backend
npm install
npx prisma migrate dev
npm run start:dev

# 3. Worker (terminal riêng)
cd backend
npm run start:worker

# 4. Frontend (terminal riêng)
cd apps/web  # hoặc vince-ai/apps/web ở root
npm install
npm run dev
```

---

## 🔗 Truy cập hệ thống

| Dịch vụ | Local URL | Mô tả |
|---------|-----------|-------|
| **Web Dashboard** | `http://localhost:3001/dashboard` | Giao diện quản trị chính |
| **Backend API** | `http://localhost:3000/api` | REST API + Swagger |
| **Quản lý bài đăng** | `http://localhost:3001/dashboard/posts` | Tạo/sửa/lên lịch bài |
| **Video Library** | `http://localhost:3001/dashboard/videos` | Import, xử lý, archive |
| **Nguồn Video** | `http://localhost:3001/dashboard/sources` | Kết nối Facebook Pages |
| **Sản phẩm Affiliate** | `http://localhost:3001/dashboard/products` | Shopee products + links |
| **Lịch đăng bài** | `http://localhost:3001/dashboard/schedules` | Calendar view |
| **Analytics** | `http://localhost:3001/dashboard/analytics` | Metrics, revenue, CTR |

---

## ⚙️ Cấu hình môi trường

### Backend (`backend/.env`)

```env
# App
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3001

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/accontent_hub

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT (THAY ĐỔI TRONG PRODUCTION!)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars

# Encryption (32 chars exactly)
ENCRYPTION_KEY=32-char-encryption-key-for-tokens!!

# Facebook OAuth
FACEBOOK_APP_ID=your-app-id
FACEBOOK_APP_SECRET=your-app-secret
FACEBOOK_CALLBACK_URL=http://localhost:3000/api/facebook/callback

# Storage (S3-compatible: MinIO, AWS S3, Cloudflare R2)
STORAGE_ENDPOINT=http://localhost:9000
STORAGE_BUCKET=vinhads
STORAGE_ACCESS_KEY=minioadmin
STORAGE_SECRET_KEY=minioadmin
STORAGE_REGION=auto

# AI Providers
GEMINI_API_KEY=your-gemini-api-key
NEMOTRON_API_KEY=your-nemotron-api-key
OPENCODE_API_KEY=your-opencode-api-key
```

### Frontend (`apps/web/.env.local` hoặc `vince-ai/apps/web/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

---

## 🤖 AI Capabilities (Gemini Service)

Backend tích hợp **Gemini 1.5 Pro/Flash** với 6 khả năng chính:

| Capability | Mô tả | Input | Output |
|------------|-------|-------|--------|
| **News Summary** | Tóm tắt, phân loại, impact analysis bài báo | Title, content, URL | Structured JSON (category, sentiment, keyFacts) |
| **TikTok Script** | Kịch bản 45-60s vertical video (hook/context/analysis/opinion/CTA) | News article | Full script + hashtags + visual suggestions |
| **Customer Reply** | Phân loại intent + trả lời tự động cho chat Facebook/Zalo | Message, channel, product catalog | Intent + suggested reply + confidence |
| **Social Draft** | Bài viết Threads/Facebook viral + affiliate mềm | Topic, platform, affiliate product | Headline, body, hashtags, CTA |
| **Product Ad Video** | 15-20s ad script theo Google Flow spec (voiceover, subtitles, timeline) | Product info + image | Complete ad spec JSON |
| **Shopee Match** | Đối chiếu video content → sản phẩm Shopee cao chuyển đổi | Video title/content, catalog | Matched product + search queries + repurpose angle |

---

## 👷 Background Workers (BullMQ + Redis)

| Worker | Concurrency | Trigger | Chức năng |
|--------|-------------|---------|-----------|
| **SyncWorker** | 2 | Cron (mỗi phút) | Sync video từ Facebook Pages → download → store S3 |
| **PublishWorker** | 1 | Queue `publish-post` | Upload video lên Facebook Reels (chunked 4MB) |
| **SchedulerWorker** | 5 | Cron (mỗi phút) | Dispatch bài đăng scheduled → publish queue |
| **VideoProcessorWorker** | - | Queue `video-processing` | Download, thumbnail, transcode, validate, hash |
| **AnalyticsWorker** | - | Queue `analytics` | Fetch post/page metrics, affiliate clicks |
| **NotificationWorker** | - | Queue `notifications` | Real-time notifications |

---

## 🗄️ Database Schema (Prisma)

**23 Models** với quan hệ chặt chẽ:

```
User (1) ─────< SourcePage (N) ─────< SourceVideo (N) ─────< Video (N) ─────< Post (N) ─────< Schedule (1)
     │                               │                      │                  │
     │                               │                      │                  └─< PostProduct (N) >── Product (N)
     │                               │                      │                                         └─< AffiliateLink (N)
     └─< FacebookPage (N) ──────────┘                      └─< VideoFile (N)
           └─< FacebookPageToken (1) (encrypted)
```

**Key Enums:** `VideoStatus`, `PostStatus`, `JobStatus`, `Platform`, `AffiliateNetwork`, `VideoProcessingJobType`, `NotificationType`, `ActivityAction`

---

## 📦 Scripts hữu ích

```bash
# Root level
npm run dev                 # Chạy tất cả (backend + worker + frontend)
npm run build               # Build production
npm run docker:up           # Docker compose up
npm run docker:down         # Docker compose down
npm run db:up               # Chỉ start DB + Redis
npm run db:down             # Stop DB + Redis

# Backend
cd backend
npm run start:dev           # Dev với hot reload
npm run start:worker        # Chạy worker queue
npm run prisma:studio       # Prisma Studio UI
npm run prisma:migrate      # Migration
npm run test                # Jest tests
npm run lint                # ESLint

# Frontend (apps/web hoặc vince-ai/apps/web)
npm run dev                 # Next.js dev (port 3001)
npm run build               # Production build
npm run lint                # Next.js lint
npm run typecheck           # TypeScript check
```

---

## 🔐 Facebook Page đã cấu hình

- **Fanpage:** **Loài mèo gắn link** (Page ID: `1282948524895927`)
- **Token permissions:** `pages_manage_posts`, `pages_read_engagement`, `pages_show_list`
- **Meta Threads App ID:** `1400119534865638`

---

## 🐳 Docker Production

```bash
# Build images
docker-compose build

# Start production
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Logs
docker-compose logs -f backend
docker-compose logs -f worker
docker-compose logs -f frontend
```

**Docker services:**
- `postgres:15` - Database
- `redis:7-alpine` - Queue + Cache
- `backend` - NestJS API (multi-stage build)
- `worker` - Background workers (shared image)
- `frontend` - Next.js standalone output

---

## 🔧 Troubleshooting

### Port đã bị chiếm
```bash
# Kill process on port 3000/3001/5432/6379
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Prisma migration failed
```bash
cd backend
npx prisma migrate reset --force
npx prisma migrate dev
```

### Node modules issues
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

### Redis connection refused
```bash
# Check Redis running
docker ps | grep redis
# Restart
docker-compose restart redis
```

---

## 📁 Cấu trúc thư mục quan trọng

```
C:\VisualStudio\Modern SaaS Dashboard Design\
├── backend/                    # NestJS API (MAIN)
│   ├── src/
│   │   ├── ai/gemini.service.ts    # 6 AI capabilities (666 lines)
│   │   ├── workers/*.worker.ts     # 5 BullMQ workers
│   │   ├── queue/                  # Job contracts + QueueService
│   │   └── prisma/schema.prisma    # 23 models
│   ├── prisma/migrations/          # DB migrations
│   └── Dockerfile / Dockerfile.worker
│
├── vince-ai/                     # TurboRepo monorepo (SHARED PACKAGES - internal @vince-ai/* scopes)
│   ├── apps/web/                 # Next.js Dashboard (duplicate)
│   ├── packages/
│   │   ├── shared/               # Types, crypto, logger, events
│   │   ├── ai/                   # Router, Orchestrator, Providers
│   │   ├── auth/google/          # OAuth + PKCE
│   │   └── browser/playwright/   # Browser automation
│   └── turbo.json
│
├── apps/web/                     # Next.js Dashboard (ROOT LEVEL)
│   └── src/app/(dashboard)/      # Route groups
│
├── StartAll/                     # 1-Click startup
│   ├── StartAll.bat / .ps1 / .vbs
│   └── StopAll.bat
│
├── docker-compose.yml
├── package.json                  # Root scripts
└── README.md
```

---

## 🤝 Contributing

1. Fork repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push branch: `git push origin feature/amazing-feature`
5. Open Pull Request

**Code Style:**
- ESLint + Prettier (run `npm run lint` và `npm run format`)
- TypeScript strict mode
- Conventional commits

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- **NestJS** - Progressive Node.js framework
- **Next.js** - React framework for production
- **Prisma** - Next-gen ORM
- **BullMQ** - Redis-based queue
- **Google Gemini** - Generative AI
- **Radix UI** - Accessible component primitives
- **TailwindCSS** - Utility-first CSS
- **Cloudflare Tunnel** - Secure public access

---

## 📞 Support

- **Issues:** [GitHub Issues](https://github.com/vinh0407/ads-tool/issues)
- **Email:** vinh0407@example.com

---

*Built with ❤️ for content creators and affiliate marketers*