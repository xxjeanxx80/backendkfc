# Script để start backend và hiển thị logs
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting Backend Server..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Kiểm tra xem dist/main.js có tồn tại không
if (-not (Test-Path "dist\main.js")) {
    Write-Host "❌ File dist/main.js không tồn tại. Đang build..." -ForegroundColor Red
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Build failed!" -ForegroundColor Red
        exit 1
    }
}

# Kill các process cũ trên port 3001
Write-Host "`nĐang dọn dẹp port 3001..." -ForegroundColor Yellow
$connections = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
if ($connections) {
    $connections | ForEach-Object {
        Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 2
    Write-Host "✅ Đã dọn dẹp port 3001" -ForegroundColor Green
}

# Start backend
Write-Host "`nĐang start backend..." -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
node dist/main.js

