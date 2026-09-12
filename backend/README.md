# Auto Content Hub - Backend

Backend for Facebook Video Automation with Shopee Affiliate integration.

## Tech Stack

- **Framework**: NestJS 10
- **Database**: PostgreSQL with Prisma ORM
- **Cache/Queue**: Redis + BullMQ
- **Auth**: JWT with Refresh Tokens
- **Storage**: S3-compatible (Cloudflare R2, AWS S3, MinIO)
- **Video Processing**: FFmpeg

## Project Structure

```
src/
├── auth/           # Authentication (JWT, Register, Login)
├── users/          # User management
├── sources/        # Video source management
├── videos/         # Video library & processing
├── products/       # Shopee products & affiliate links
├── templates/      # Caption/Comment templates
├── posts/          # Post creation & management
├── schedules/      # Post scheduling
├── facebook/       # Facebook OAuth & Pages
├── analytics/      # Analytics & metrics
├── notifications/  # User notifications
├── logs/           # Activity logs
├── storage/        # File storage (signed URLs)
├── queue/          # BullMQ job queues
├── prisma/         # Prisma service & module
├── config/         # Configuration
└── common/         # Shared utilities, guards, filters
```

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 16+
- Redis 7+
- FFmpeg (for video processing)

### Installation

```bash
cd backend
cp .env.example .env
# Edit .env with your credentials
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run start:dev
```

### Docker

```bash
# From project root
docker-compose up -d
```

## API Endpoints

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Sources
- `GET /api/sources` - List sources
- `POST /api/sources` - Create source
- `GET /api/sources/:id` - Get source
- `PATCH /api/sources/:id` - Update source
- `DELETE /api/sources/:id` - Delete source
- `POST /api/sources/:id/toggle` - Toggle sync
- `POST /api/sources/:id/sync` - Manual sync

### Videos
- `GET /api/videos` - List videos (with filters)
- `POST /api/videos` - Create video record
- `GET /api/videos/:id` - Get video
- `PATCH /api/videos/:id` - Update video
- `DELETE /api/videos/:id` - Delete video
- `POST /api/videos/:id/archive` - Archive video

### Products
- `GET /api/products` - List products
- `POST /api/products` - Create product
- `GET /api/products/:id` - Get product
- `PATCH /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `POST /api/products/:id/affiliate-links` - Add affiliate link

### Templates
- `GET /api/templates/captions` - List caption templates
- `POST /api/templates/captions` - Create caption template
- `GET /api/templates/comments` - List comment templates
- `POST /api/templates/comments` - Create comment template
- `POST /api/templates/captions/:id/render` - Render with variables
- `POST /api/templates/comments/:id/render` - Render with variables

### Posts
- `GET /api/posts` - List posts
- `POST /api/posts` - Create post
- `GET /api/posts/:id` - Get post
- `PATCH /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post
- `POST /api/posts/:id/publish` - Publish now
- `POST /api/posts/:id/cancel` - Cancel scheduled post

### Schedules
- `GET /api/schedules` - List schedules
- `POST /api/schedules` - Create schedule
- `GET /api/schedules/:id` - Get schedule
- `PATCH /api/schedules/:id` - Update schedule
- `DELETE /api/schedules/:id` - Delete schedule

### Facebook
- `GET /api/facebook/connect` - Get OAuth URL
- `GET /api/facebook/callback` - OAuth callback
- `GET /api/facebook/pages` - List connected pages
- `DELETE /api/facebook/pages/:id` - Disconnect page

### Analytics
- `GET /api/analytics/overview` - Overview stats
- `GET /api/analytics/posts` - Post analytics
- `GET /api/analytics/products` - Product analytics
- `GET /api/analytics/pages` - Page analytics

### Notifications
- `GET /api/notifications` - List notifications
- `PATCH /api/notifications/:id/read` - Mark as read
- `PATCH /api/notifications/read-all` - Mark all as read

### Logs
- `GET /api/logs` - List activity logs

## Worker System

The worker processes background jobs:

- **Source Sync**: Fetches new videos from source pages
- **Video Import**: Downloads and stores videos
- **Video Processing**: FFmpeg processing (thumbnails, metadata, hashes)
- **Publish Post**: Publishes to Facebook via API
- **Analytics Sync**: Fetches metrics from Facebook
- **Notifications**: Sends user notifications

Run worker:
```bash
npm run start:worker
```

## Environment Variables

See `.env.example` for all required variables.

## Security

- Helmet.js for HTTP headers
- CORS configured for frontend
- Rate limiting (Throttler)
- JWT with short expiry + refresh tokens
- Encrypted OAuth tokens
- Input validation (class-validator)
- Global exception handling

## Video Processing Flow

1. Video uploaded → S3 storage
2. Queue `video-processing` job
3. Worker downloads video
4. FFmpeg extracts metadata, creates thumbnail, computes hashes
5. Video status → `READY`
6. Available for post creation

## Duplicate Detection

- SHA-256 hash for exact duplicates
- Perceptual hash (pHash) for near-duplicates
- Unique constraint on `source_page_id + external_video_id`

## License

MIT