<# 
.SYNOPSIS
    Auto Content Hub - Complete Startup Script
.DESCRIPTION
    Starts PostgreSQL, Redis, Backend (NestJS), and Frontend (Next.js)
#>

param(
    [switch]$SkipDocker,
    [switch]$SkipInstall,
    [switch]$NoNewWindows
)

$ErrorActionPreference = "Stop"
$projectRoot = "C:\VisualStudio\Modern SaaS Dashboard Design"
$backendPath = Join-Path $projectRoot "backend"
$frontendPath = Join-Path $projectRoot "frontend"

function Write-Header {
    param($text)
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "  $text" -ForegroundColor Cyan
    Write-Host "========================================`n" -ForegroundColor Cyan
}

function Write-Step {
    param($step, $total, $text)
    Write-Host "[$step/$total] $text" -ForegroundColor Yellow
}

function Write-Success {
    param($text)
    Write-Host "  OK $text" -ForegroundColor Green
}

function Write-Error {
    param($text)
    Write-Host "  ERROR $text" -ForegroundColor Red
}

function Check-Command {
    param($command)
    try {
        & $command > $null 2>&1
        return $true
    } catch {
        return $false
    }
}

# Check prerequisites
Write-Header "AUTO CONTENT HUB - STARTUP"

# Check Docker
if (-not $SkipDocker) {
    Write-Step 1 5 "Checking Docker..."
    if (-not (Check-Command "docker version")) {
        Write-Error "Docker is not running. Please start Docker Desktop first."
        exit 1
    }
    Write-Success "Docker is running"
}

# Start PostgreSQL and Redis
if (-not $SkipDocker) {
    Write-Step 2 5 "Starting PostgreSQL and Redis..."
    Set-Location $projectRoot
    docker-compose up -d postgres redis
    Write-Success "Database services started"
    
    Write-Step 3 5 "Waiting for database..."
    Start-Sleep -Seconds 5
}

# Backend setup
Write-Step 4 5 "Setting up Backend..."
Set-Location $backendPath

if (-not $SkipInstall -and -not (Test-Path "node_modules")) {
    Write-Host "  Installing backend dependencies..." -NoNewline
    npm install | Out-Null
    Write-Success "Dependencies installed"
}

Write-Host "  Generating Prisma client..." -NoNewline
npx prisma generate | Out-Null
Write-Success "Prisma client generated"

Write-Host "  Running migrations..." -NoNewline
npx prisma migrate deploy | Out-Null
Write-Success "Migrations applied"

# Frontend setup
Write-Step 5 5 "Setting up Frontend..."
Set-Location $frontendPath

if (-not $SkipInstall -and -not (Test-Path "node_modules")) {
    Write-Host "  Installing frontend dependencies..." -NoNewline
    npm install | Out-Null
    Write-Success "Dependencies installed"
}

# Start servers
Write-Header "STARTING SERVERS"

if ($NoNewWindows) {
    Write-Host "Starting in current window (use Ctrl+C to stop)..."
    # Start backend in background
    $backendJob = Start-Job -ScriptBlock { 
        Set-Location $using:backendPath
        npm run start:dev
    }
    
    Start-Sleep -Seconds 3
    
    # Start frontend
    $frontendJob = Start-Job -ScriptBlock {
        Set-Location $using:frontendPath
        npm run dev
    }
    
    Write-Host "`nServers started in background jobs." -ForegroundColor Green
    Write-Host "Backend Job ID: $($backendJob.Id)" -ForegroundColor Cyan
    Write-Host "Frontend Job ID: $($frontendJob.Id)" -ForegroundColor Cyan
    Write-Host "`nUse 'Get-Job' to see status, 'Stop-Job -Id <id>' to stop." -ForegroundColor Yellow
} else {
    Write-Host "Starting servers in new windows..." -ForegroundColor Green
    
    if ($IsWindows) {
        Start-Process "cmd" -ArgumentList "/k", "cd /d `$backendPath && npm run start:dev" -WindowStyle Normal
        Start-Sleep -Seconds 3
        Start-Process "cmd" -ArgumentList "/k", "cd /d `$frontendPath && npm run dev" -WindowStyle Normal
    } else {
        Start-Process "powershell" -ArgumentList "-NoExit", "-Command", "cd `$backendPath; npm run start:dev"
        Start-Sleep -Seconds 3
        Start-Process "powershell" -ArgumentList "-NoExit", "-Command", "cd `$frontendPath; npm run dev"
    }
}

Write-Header "STARTUP COMPLETE!"
Write-Host "Backend API:  http://localhost:3000" -ForegroundColor Cyan
Write-Host "Frontend UI:  http://localhost:3001" -ForegroundColor Cyan
Write-Host "API Docs:     http://localhost:3000/api" -ForegroundColor Cyan
Write-Host "`nPress any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")