# 🚀 Quick Demo Start Script for Windows
# This script will start all required services for the live demo

Write-Host "🎯 Starting NOMU Security Demo Services..." -ForegroundColor Magenta
Write-Host "================================================" -ForegroundColor Magenta

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Check if MongoDB is running
try {
    $mongoStatus = mongosh --eval "db.runCommand('ping')" --quiet
    if ($mongoStatus -match "ok") {
        Write-Host "✅ MongoDB is running" -ForegroundColor Green
    } else {
        Write-Host "⚠️  MongoDB might not be running. Starting MongoDB..." -ForegroundColor Yellow
        Start-Process -FilePath "mongod" -WindowStyle Minimized
        Start-Sleep -Seconds 3
    }
} catch {
    Write-Host "⚠️  MongoDB not found. Please start MongoDB manually." -ForegroundColor Yellow
}

# Function to start a service
function Start-Service {
    param(
        [string]$ServiceName,
        [string]$WorkingDirectory,
        [string]$Command
    )
    
    Write-Host "🚀 Starting $ServiceName..." -ForegroundColor Cyan
    $process = Start-Process -FilePath "cmd" -ArgumentList "/c", $Command -WorkingDirectory $WorkingDirectory -WindowStyle Normal
    Start-Sleep -Seconds 2
    Write-Host "✅ $ServiceName started (PID: $($process.Id))" -ForegroundColor Green
    return $process
}

# Start Mobile Client Backend
$clientBackend = Start-Service -ServiceName "Mobile Client Backend" -WorkingDirectory "02-mobile-client/mobile-backend" -Command "npm start"

# Start Mobile Barista Backend
$baristaBackend = Start-Service -ServiceName "Mobile Barista Backend" -WorkingDirectory "03-mobile-barista/mobile-barista-backend" -Command "npm start"

# Wait for services to start
Write-Host "⏳ Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check if services are running
Write-Host "🔍 Checking service health..." -ForegroundColor Cyan

try {
    $clientHealth = Invoke-RestMethod -Uri "http://localhost:5000/api/health" -Method Get -TimeoutSec 5
    Write-Host "✅ Mobile Client Backend is healthy" -ForegroundColor Green
} catch {
    Write-Host "❌ Mobile Client Backend is not responding" -ForegroundColor Red
}

try {
    $baristaHealth = Invoke-RestMethod -Uri "http://localhost:5002/api/health" -Method Get -TimeoutSec 5
    Write-Host "✅ Mobile Barista Backend is healthy" -ForegroundColor Green
} catch {
    Write-Host "❌ Mobile Barista Backend is not responding" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎉 Demo services are ready!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Magenta
Write-Host "📱 Mobile Client Backend: http://localhost:5000" -ForegroundColor Blue
Write-Host "👨‍💼 Mobile Barista Backend: http://localhost:5002" -ForegroundColor Blue
Write-Host ""
Write-Host "🎬 To run the demos:" -ForegroundColor Yellow
Write-Host "   Client Demo: cd 02-mobile-client/mobile-backend && node demo-security-live.js" -ForegroundColor White
Write-Host "   Barista Demo: cd 03-mobile-barista/mobile-barista-backend && node demo-security-live.js" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to continue or Ctrl+C to stop all services..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Cleanup function
function Stop-AllServices {
    Write-Host "🛑 Stopping all services..." -ForegroundColor Red
    try {
        Stop-Process -Id $clientBackend.Id -Force -ErrorAction SilentlyContinue
        Stop-Process -Id $baristaBackend.Id -Force -ErrorAction SilentlyContinue
        Write-Host "✅ All services stopped" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Some services may still be running" -ForegroundColor Yellow
    }
}

# Register cleanup on exit
Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action { Stop-AllServices }

Write-Host "Demo setup complete! Services are running in separate windows." -ForegroundColor Green
