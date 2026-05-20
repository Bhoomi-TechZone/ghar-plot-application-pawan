# Quick Reload Script for Gharplot App
# Run this when you need to reload the app on device

Write-Host "🔄 Reloading Gharplot App..." -ForegroundColor Cyan

# Get device ID
$device = (adb devices | Select-String "device$" | Select-Object -First 1).ToString().Split()[0]

if ($device) {
    Write-Host "📱 Device found: $device" -ForegroundColor Green
    
    # Force stop the app
    Write-Host "⏹️  Stopping app..." -ForegroundColor Yellow
    adb -s $device shell am force-stop com.bhoomitechzone.gharplot.app
    
    # Wait a moment
    Start-Sleep -Seconds 2
    
    # Restart the app
    Write-Host "▶️  Starting app..." -ForegroundColor Yellow
    adb -s $device shell am start -n com.bhoomitechzone.gharplot.app/.MainActivity
    
    Write-Host "✅ App reloaded successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ No device found. Please connect your device." -ForegroundColor Red
}
