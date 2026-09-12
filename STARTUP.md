# ACCONTENT HUBAI VIDEO SAAS v2.5

**AI Video Automation, Shopee Affiliate Management, and Multi-Channel Publishing Platform**

ACCONTENT HUBAI is an AI-powered content automation system designed to streamline video creation, Shopee Affiliate product management, and multi-channel publishing across **Facebook, TikTok, YouTube Shorts, and Threads**.

This document describes the recommended local startup workflow and the `StartAll` master launcher.

---

## 1. StartAll Master Launcher

All previously scattered startup scripts have been consolidated into a single startup workflow located in the `StartAll` directory.

### Master Startup Script

```text
C:\VisualStudio\Modern SaaS Dashboard Design\StartAll\StartAll.bat
```

### Desktop Shortcut

```text
Desktop
└── StartAll - ACCONTENT HUBAI.lnk
```

The master launcher is responsible for starting the required services in the correct order.

---

## 2. Starting the System

### Method 1: Desktop Shortcut

Double-click:

```text
StartAll - ACCONTENT HUBAI.lnk
```

The startup process will automatically initialize the required services.

### Method 2: StartAll Directory

Open:

```text
C:\VisualStudio\Modern SaaS Dashboard Design\StartAll
```

Then run:

```text
StartAll.bat
```

The PowerShell version can also be executed when required:

```text
StartAll.ps1
```

---

## 3. Startup Workflow

When `StartAll` is executed, the system initializes the application stack in the following order:

```text
StartAll
   |
   +-- PostgreSQL
   |
   +-- Redis
   |
   +-- NestJS Backend
   |
   +-- BullMQ Worker
   |
   +-- Next.js Frontend
   |
   +-- Cloudflare Tunnels
   |
   +-- Browser
```

### Step 1: Database and Cache

Docker containers are started for:

| Service    |   Port |
| ---------- | -----: |
| PostgreSQL | `5432` |
| Redis      | `6379` |

PostgreSQL provides the primary application database while Redis is used for caching and background job processing.

### Step 2: Backend API

The NestJS backend is started on:

```text
http://localhost:3000
```

API base URL:

```text
http://localhost:3000/api
```

### Step 3: Background Worker

The BullMQ worker is started to process asynchronous tasks such as:

* Scheduled publishing
* Video processing
* Content automation
* Affiliate-related jobs
* Background synchronization
* Other queued operations

### Step 4: Frontend Dashboard

The Next.js application is started on:

```text
http://localhost:3001
```

Dashboard:

```text
http://localhost:3001/dashboard
```

### Step 5: Cloudflare Tunnels

Cloudflare Tunnel processes are initialized to provide HTTPS-accessible public endpoints for the configured web and API services.

The generated public URLs may change depending on the current tunnel configuration.

### Step 6: Browser Launch

After the required services are initialized, the default dashboard is opened automatically:

```text
http://localhost:3001/dashboard
```

---

## 4. Local Service Endpoints

| Service                 | Local URL                                   |
| ----------------------- | ------------------------------------------- |
| Web Dashboard           | `http://localhost:3001/dashboard`           |
| Backend REST API        | `http://localhost:3000/api`                 |
| Publishing & Scheduling | `http://localhost:3001/dashboard/schedules` |
| Facebook Posts          | `http://localhost:3001/dashboard/posts`     |

Additional dashboard routes may be available depending on the current application configuration.

---

## 5. System Architecture

The local development environment consists of the following components:

```text
ACCONTENT HUBAI
|
+-- Frontend
|   +-- Next.js
|   +-- Dashboard
|
+-- Backend
|   +-- NestJS
|   +-- REST API
|
+-- Background Processing
|   +-- BullMQ
|   +-- Redis
|
+-- Database
|   +-- PostgreSQL
|
+-- External Access
    +-- Cloudflare Tunnel
```

---

## 6. Core Platform Capabilities

The system is designed to support:

* AI-powered video generation
* AI content generation
* Shopee Affiliate product management
* Product-to-content association
* Video content management
* Facebook publishing
* TikTok publishing
* YouTube Shorts publishing
* Threads publishing
* Multi-channel scheduling
* Background job processing
* Automated content workflows
* Performance and publishing management

---

## 7. Startup Requirements

Before running `StartAll`, ensure the following services and tools are available:

| Requirement       | Purpose                         |
| ----------------- | ------------------------------- |
| Node.js           | Application runtime             |
| npm               | Dependency management           |
| Docker Desktop    | PostgreSQL and Redis containers |
| PostgreSQL        | Application database            |
| Redis             | Queue and cache                 |
| Cloudflare Tunnel | Public HTTPS access             |
| Next.js           | Web dashboard                   |
| NestJS            | Backend API                     |
| BullMQ            | Background job processing       |

Docker Desktop should be running before starting the application.

---

## 8. Troubleshooting

### Backend Is Not Available

Verify that port `3000` is not occupied:

```bat
netstat -ano | findstr :3000
```

### Frontend Is Not Available

Verify port `3001`:

```bat
netstat -ano | findstr :3001
```

### PostgreSQL or Redis Is Not Running

Check Docker containers:

```bash
docker ps
```

Start the required services:

```bash
docker compose up -d
```

### Worker Is Not Processing Jobs

Verify:

1. Redis is running.
2. The BullMQ worker is running.
3. The Redis configuration is correct.
4. Required queues are available.
5. The backend can connect to Redis.

### Cloudflare Tunnel Is Not Available

Verify that the Cloudflare tunnel configuration is valid and that the required tunnel process is running.

---

## 9. Recommended Startup Order

For manual startup, use the following order:

```text
1. Docker Desktop
       |
       v
2. PostgreSQL + Redis
       |
       v
3. NestJS Backend
       |
       v
4. BullMQ Worker
       |
       v
5. Next.js Frontend
       |
       v
6. Cloudflare Tunnel
       |
       v
7. Open Dashboard
```

Using `StartAll.bat` is recommended because it centralizes this workflow into a single startup process.

---

## 10. Quick Reference

### Start

```text
StartAll - ACCONTENT HUBAI.lnk
```

or:

```text
C:\VisualStudio\Modern SaaS Dashboard Design\StartAll\StartAll.bat
```

### Dashboard

```text
http://localhost:3001/dashboard
```

### API

```text
http://localhost:3000/api
```

### Scheduling

```text
http://localhost:3001/dashboard/schedules
```

### Facebook Posts

```text
http://localhost:3001/dashboard/posts
```

---

## ACCONTENT HUBAI

**AI-powered video automation, affiliate marketing, and multi-channel content publishing platform.**
