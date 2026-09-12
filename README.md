# VinhAds

**AI-Powered Content Automation & Affiliate Marketing Platform**

[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js\&logoColor=white)](https://nodejs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10-E0234E?logo=nestjs\&logoColor=white)](https://nestjs.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=next.js\&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react\&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript\&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql\&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis\&logoColor=white)](https://redis.io/)
[![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma\&logoColor=white)](https://www.prisma.io/)
[![BullMQ](https://img.shields.io/badge/BullMQ-Queue-CB3837)](https://bullmq.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker\&logoColor=white)](https://www.docker.com/)
[![Playwright](https://img.shields.io/badge/Playwright-Automation-2EAD33?logo=playwright\&logoColor=white)](https://playwright.dev/)
[![Turborepo](https://img.shields.io/badge/Turborepo-Monorepo-EF4444?logo=turborepo\&logoColor=white)](https://turbo.build/)

VinhAds is an AI-powered platform for automating **content creation, video processing, affiliate marketing, multi-channel publishing, and performance analytics**.

The platform combines AI services, background workers, media processing, scheduling, affiliate management, and publishing workflows into a unified system.

---

## Table of Contents

* [Overview](#overview)
* [Features](#features)
* [Technology Stack](#technology-stack)
* [Architecture](#architecture)
* [AI System](#ai-system)
* [Background Processing](#background-processing)
* [Database](#database)
* [Project Structure](#project-structure)
* [Getting Started](#getting-started)
* [Environment Configuration](#environment-configuration)
* [Docker](#docker)
* [Testing](#testing)
* [Security](#security)
* [Troubleshooting](#troubleshooting)
* [Contributing](#contributing)
* [License](#license)

---

## Overview

VinhAds provides an end-to-end content automation workflow:

```text
Content Sources
      |
      v
Video Synchronization
      |
      v
Media Processing
      |
      v
AI Content Generation
      |
      v
Content Review
      |
      v
Affiliate Products
      |
      v
Scheduling
      |
      v
Publishing
      |
      v
Analytics
```

---

## Features

### AI Content Generation

* News and article summarization
* Short-form video scripts
* Product advertising scripts
* Social media content
* Customer response suggestions
* Affiliate product matching
* Content repurposing

### Video Management

* Video source synchronization
* Video library management
* Metadata management
* Thumbnail generation
* Media validation and processing
* Video status tracking

### Affiliate Marketing

* Product catalog
* Affiliate links
* Product-content relationships
* Product matching
* Click tracking
* Conversion tracking
* Performance analysis

### Publishing

* Content creation and editing
* Publishing schedules
* Background publishing jobs
* Platform integrations
* Publishing status tracking
* Platform-specific workflows

### Analytics

* Publishing metrics
* Engagement metrics
* Affiliate clicks
* Conversion metrics
* Product performance
* Revenue attribution where supported

---

## Technology Stack

| Layer          | Technology                                 |
| -------------- | ------------------------------------------ |
| Runtime        | Node.js 20+                                |
| Backend        | NestJS 10                                  |
| Frontend       | Next.js 14 / React                         |
| Language       | TypeScript                                 |
| Database       | PostgreSQL 15                              |
| ORM            | Prisma 5                                   |
| Queue          | BullMQ                                     |
| Cache          | Redis 7                                    |
| Authentication | JWT / Google OAuth / PKCE                  |
| AI             | Google Gemini / NVIDIA Nemotron / OpenCode |
| Automation     | Playwright                                 |
| Storage        | S3-compatible storage                      |
| Monorepo       | Turborepo                                  |
| Deployment     | Docker / Docker Compose                    |

---

## Architecture

```text
VinhAds
|
+-- Web Dashboard
|   +-- Next.js
|   +-- Content Management
|   +-- Video Library
|   +-- Products
|   +-- Publishing
|   +-- Analytics
|
+-- Backend API
|   +-- NestJS
|   +-- Authentication
|   +-- Videos
|   +-- Posts
|   +-- Products
|   +-- Schedules
|   +-- AI
|   +-- Analytics
|
+-- Background Workers
|   +-- Sync Worker
|   +-- Video Worker
|   +-- Publish Worker
|   +-- Scheduler Worker
|   +-- Analytics Worker
|   +-- Notification Worker
|
+-- Shared Packages
|   +-- Shared Types
|   +-- AI Router
|   +-- AI Orchestrator
|   +-- Authentication
|   +-- Browser Automation
|
+-- Infrastructure
    +-- PostgreSQL
    +-- Redis
    +-- Object Storage
    +-- Docker
```

---

## AI System

VinhAds provides a unified AI layer for different content operations.

### AI Providers

* Google Gemini
* NVIDIA Nemotron
* OpenCode

### AI Components

```text
AI Request
    |
    v
AI Task Router
    |
    v
Provider Selection
    |
    v
AI Model
    |
    v
AI Orchestrator
    |
    v
Structured Result
```

### Supported Tasks

| Task                | Output                               |
| ------------------- | ------------------------------------ |
| News Analysis       | Summary, facts, categories           |
| Video Scripts       | Script, hashtags, visual suggestions |
| Product Advertising | Script, voiceover, scenes            |
| Social Content      | Caption, hashtags, CTA               |
| Customer Support    | Intent and response                  |
| Product Matching    | Relevant products                    |
| Content Repurposing | Platform-specific content            |

AI-generated content should be reviewed before publication.

---

## Background Processing

VinhAds uses **Redis and BullMQ** for asynchronous processing.

```text
Application
     |
     v
BullMQ
     |
     v
Redis
     |
     v
Worker
     |
     v
Processing
     |
     v
PostgreSQL
```

Workers handle:

* Video synchronization
* Media processing
* Publishing
* Scheduling
* Analytics
* Notifications

---

## Database

VinhAds uses PostgreSQL with Prisma.

```text
User
 |
 +-- Video Sources
 |    |
 |    +-- Videos
 |         |
 |         +-- Media Files
 |         |
 |         +-- Posts
 |              |
 |              +-- Schedules
 |              +-- Products
 |
 +-- Platform Connections

Products
 |
 +-- Affiliate Links
```

Core entities include:

* Users
* Authentication
* Video sources
* Videos
* Media files
* Posts
* Schedules
* Products
* Affiliate links
* Platform connections
* Jobs
* Analytics
* Notifications

Database changes are managed through Prisma migrations.

---

## Project Structure

```text
project-root/
|
+-- apps/
|   +-- web/
|
+-- backend/
|   +-- src/
|   |   +-- auth/
|   |   +-- sources/
|   |   +-- videos/
|   |   +-- posts/
|   |   +-- schedules/
|   |   +-- products/
|   |   +-- ai/
|   |   +-- queue/
|   |   +-- workers/
|   |   +-- analytics/
|   |   +-- storage/
|   |
|   +-- prisma/
|
+-- packages/
|   +-- shared/
|   +-- ai/
|   +-- auth/
|   +-- browser/
|
+-- StartAll/
+-- docker-compose.yml
+-- package.json
+-- README.md
```

---

## Getting Started

### Requirements

* Node.js 20+
* npm
* Git
* Docker
* Docker Compose
* PostgreSQL
* Redis

### Clone

```bash
git clone <YOUR_REPOSITORY_URL>
cd <YOUR_PROJECT_DIRECTORY>
```

### Install

```bash
npm install
```

### Start Infrastructure

```bash
docker-compose up -d postgres redis
```

### Database Migration

```bash
cd backend
npx prisma migrate dev
```

### Start Backend

```bash
npm run start:dev
```

### Start Worker

```bash
npm run start:worker
```

### Start Frontend

```bash
cd apps/web
npm run dev
```

---

## Environment Configuration

### Backend

Create `backend/.env`:

```env
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3001

DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/DATABASE

REDIS_HOST=localhost
REDIS_PORT=6379

JWT_SECRET=YOUR_JWT_SECRET
JWT_REFRESH_SECRET=YOUR_REFRESH_SECRET
ENCRYPTION_KEY=YOUR_ENCRYPTION_KEY

GEMINI_API_KEY=YOUR_GEMINI_KEY
NEMOTRON_API_KEY=YOUR_NEMOTRON_KEY
OPENCODE_API_KEY=YOUR_OPENCODE_KEY

STORAGE_ENDPOINT=YOUR_STORAGE_ENDPOINT
STORAGE_BUCKET=YOUR_BUCKET
STORAGE_ACCESS_KEY=YOUR_ACCESS_KEY
STORAGE_SECRET_KEY=YOUR_SECRET_KEY
```

### Frontend

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

Never commit real credentials or secrets to source control.

---

## Local Development

| Service   | Address                                     |
| --------- | ------------------------------------------- |
| Web       | `http://localhost:3001`                     |
| API       | `http://localhost:3000/api`                 |
| Dashboard | `http://localhost:3001/dashboard`           |
| Videos    | `http://localhost:3001/dashboard/videos`    |
| Products  | `http://localhost:3001/dashboard/products`  |
| Schedules | `http://localhost:3001/dashboard/schedules` |
| Analytics | `http://localhost:3001/dashboard/analytics` |

---

## Docker

Build:

```bash
docker-compose build
```

Start:

```bash
docker-compose up -d
```

Logs:

```bash
docker-compose logs -f backend
docker-compose logs -f worker
docker-compose logs -f frontend
```

Stop:

```bash
docker-compose down
```

---

## Testing

Run the available validation commands:

```bash
npm run lint
npm run test
npm run build
npm run typecheck
```

Before merging changes, ensure the relevant tests and builds pass.

---

## Security

VinhAds handles authentication credentials, social platform connections, AI APIs, affiliate data, and customer-related content.

Security requirements:

* Never commit secrets
* Use environment variables
* Encrypt sensitive tokens
* Validate external input
* Protect API endpoints
* Apply authorization checks
* Avoid logging credentials
* Rotate compromised credentials
* Keep production secrets outside source control

External integrations must comply with the respective platform APIs and policies.

---

## Troubleshooting

### Port Already in Use

```bat
netstat -ano | findstr :3000
netstat -ano | findstr :3001
```

### Database

```bash
docker ps
npx prisma migrate status
```

### Redis

```bash
docker-compose logs redis
docker-compose restart redis
```

### Worker

Verify:

* Redis is running
* Worker is running
* Queue configuration is correct
* Jobs are being created
* External services are available

---

## Contributing

```bash
git checkout -b feature/your-feature
git add .
git commit -m "feat: describe your change"
git push origin feature/your-feature
```

Pull requests should include:

* Description of changes
* Reason for changes
* Testing information
* Screenshots for UI changes
* Required configuration changes

---

## License

This project is licensed under the **MIT License**.

See [`LICENSE`](LICENSE) for details.

---

## Acknowledgments

VinhAds is built with:

* [Node.js](https://nodejs.org/)
* [NestJS](https://nestjs.com/)
* [Next.js](https://nextjs.org/)
* [React](https://react.dev/)
* [PostgreSQL](https://www.postgresql.org/)
* [Redis](https://redis.io/)
* [Prisma](https://www.prisma.io/)
* [BullMQ](https://bullmq.io/)
* [Google Gemini](https://ai.google.dev/)
* [NVIDIA](https://www.nvidia.com/)
* [Playwright](https://playwright.dev/)
* [Turborepo](https://turbo.build/)
* [Docker](https://www.docker.com/)

---

**VinhAds**

AI-powered content automation and affiliate marketing platform.
