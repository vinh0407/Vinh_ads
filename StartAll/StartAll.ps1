# Master Silent Launcher — VinhAds SAAS v2.5 (App Mode)
$projectRoot = 'C:\VisualStudio\Modern SaaS Dashboard Design'
$backendPath = Join-Path $projectRoot 'backend'
$frontendPath = Join-Path $projectRoot 'frontend'
$cloudflared = 'C:\VisualStudio\ngrok\cloudflared.exe'

# 1. Start Docker Containers
Set-Location $projectRoot
Start-Process "docker-compose" -ArgumentList "up -d postgres redis" -WindowStyle Hidden

# 2. Start NestJS Backend
Start-Process "cmd.exe" -ArgumentList "/c cd /d `"$backendPath`" && npm run start:dev" -WindowStyle Hidden

# 3. Start BullMQ Queue Worker
Start-Process "cmd.exe" -ArgumentList "/c cd /d `"$backendPath`" && npm run start:worker" -WindowStyle Hidden

# 4. Start Next.js Frontend App
Start-Process "cmd.exe" -ArgumentList "/c cd /d `"$frontendPath`" && npm run dev" -WindowStyle Hidden

# 5. Start Cloudflare Tunnels
if (Test-Path $cloudflared) {
    Start-Process -FilePath $cloudflared -ArgumentList 'tunnel --url http://127.0.0.1:3000' -WindowStyle Hidden
    Start-Process -FilePath $cloudflared -ArgumentList 'tunnel --url http://127.0.0.1:3001' -WindowStyle Hidden
}

# 6. Open in Standalone App Window Mode (No browser UI)
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