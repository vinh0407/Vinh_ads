# Master Smart Launcher — VinhAds SAAS v2.5 (Auto-Start Docker + Standalone Zero-Docker Mode)
$projectRoot = 'C:\VisualStudio\Modern SaaS Dashboard Design'
$backendPath = Join-Path $projectRoot 'backend'
$frontendPath = Join-Path $projectRoot 'frontend'
$cloudflared = 'C:\VisualStudio\ngrok\cloudflared.exe'
$dockerDesktopPath = 'C:\Program Files\Docker\Docker\Docker Desktop.exe'

Write-Host "🚀 Đang khởi động hệ thống VinhAds SaaS..." -ForegroundColor Cyan

# 1. Check & Auto-Start Docker Desktop if available, OR Fallback gracefully
$dockerRunning = $false
try {
    $dockerCheck = docker info 2>&1
    if ($LASTEXITCODE -eq 0) {
        $dockerRunning = $true
        Write-Host "✅ Docker Engine đang hoạt động!" -ForegroundColor Green
    }
} catch {}

if (-not $dockerRunning) {
    if (Test-Path $dockerDesktopPath) {
        Write-Host "⏳ Docker Desktop chưa chạy. Đang tự động kích hoạt Docker Desktop..." -ForegroundColor Yellow
        Start-Process -FilePath $dockerDesktopPath
        
        # Wait up to 15 seconds for Docker engine to initialize
        $waited = 0
        while ($waited -lt 15) {
            Start-Sleep -Seconds 2
            $waited += 2
            try {
                $check = docker info 2>&1
                if ($LASTEXITCODE -eq 0) {
                    $dockerRunning = $true
                    Write-Host "✅ Docker Desktop đã sẵn sàng sau ${waited}s!" -ForegroundColor Green
                    break
                }
            } catch {}
        }
    }
}

if ($dockerRunning) {
    Write-Host "⚡ Đang khởi chạy Docker Containers (Postgres & Redis)..." -ForegroundColor Cyan
    Set-Location $projectRoot
    Start-Process "docker-compose" -ArgumentList "up -d postgres redis" -WindowStyle Hidden
} else {
    Write-Host "💡 Docker không mở hoặc chưa cài đặt — Tự động chuyển sang chế độ Chạy Độc Lập Node.js / Local Storage (Không cần Docker)!" -ForegroundColor Magenta
}

# 2. Start NestJS Backend (if backend folder exists)
if (Test-Path $backendPath) {
    Write-Host "📦 Đang khởi chạy NestJS Backend API..." -ForegroundColor Gray
    Start-Process "cmd.exe" -ArgumentList "/c cd /d `"$backendPath`" && npm run start:dev" -WindowStyle Hidden
    Start-Process "cmd.exe" -ArgumentList "/c cd /d `"$backendPath`" && npm run start:worker" -WindowStyle Hidden
}

# 3. Start Next.js Frontend App
if (Test-Path $frontendPath) {
    Write-Host "🎨 Đang khởi chạy Next.js Frontend App (http://localhost:3001)..." -ForegroundColor Gray
    Start-Process "cmd.exe" -ArgumentList "/c cd /d `"$frontendPath`" && npm run dev" -WindowStyle Hidden
}

# 4. Start Cloudflare Tunnels (if installed)
if (Test-Path $cloudflared) {
    Start-Process -FilePath $cloudflared -ArgumentList 'tunnel --url http://127.0.0.1:3000' -WindowStyle Hidden
    Start-Process -FilePath $cloudflared -ArgumentList 'tunnel --url http://127.0.0.1:3001' -WindowStyle Hidden
}

# 5. Open App Window (Chrome / Edge App Mode)
Start-Sleep -Seconds 3

$appUrl = 'http://localhost:3001/dashboard'
$chromePath = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
$edgePath = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'

if (Test-Path $chromePath) {
    Start-Process -FilePath $chromePath -ArgumentList "--app=$appUrl"
} elseif (Test-Path $edgePath) {
    Start-Process -FilePath $edgePath -ArgumentList "--app=$appUrl"
} else {
    Start-Process $appUrl
}
