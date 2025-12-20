# Script to view React Native console logs
# Usage: .\scripts\view-console.ps1

Write-Host "React Native Console Viewer" -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan
Write-Host ""

# Set Android SDK path
$env:ANDROID_HOME = "C:\Users\$env:USERNAME\AppData\Local\Android\Sdk"
$env:PATH = "$env:ANDROID_HOME\platform-tools;$env:PATH"

Write-Host "Choose an option:" -ForegroundColor Yellow
Write-Host "1. View React Native JS logs (filtered)" -ForegroundColor White
Write-Host "2. View all Android logs" -ForegroundColor White
Write-Host "3. Clear logcat and show React Native logs" -ForegroundColor White
Write-Host "4. Open Chrome DevTools (requires app to be in debug mode)" -ForegroundColor White
Write-Host ""
$choice = Read-Host "Enter choice (1-4)"

switch ($choice) {
    "1" {
        Write-Host "`nShowing React Native JavaScript logs..." -ForegroundColor Green
        Write-Host "Press Ctrl+C to stop`n" -ForegroundColor Yellow
        & "$env:ANDROID_HOME\platform-tools\adb.exe" logcat *:S ReactNativeJS:V ReactNative:V
    }
    "2" {
        Write-Host "`nShowing all Android logs..." -ForegroundColor Green
        Write-Host "Press Ctrl+C to stop`n" -ForegroundColor Yellow
        & "$env:ANDROID_HOME\platform-tools\adb.exe" logcat
    }
    "3" {
        Write-Host "`nClearing logcat..." -ForegroundColor Green
        & "$env:ANDROID_HOME\platform-tools\adb.exe" logcat -c
        Write-Host "Now showing React Native logs (press Ctrl+C to stop):`n" -ForegroundColor Yellow
        & "$env:ANDROID_HOME\platform-tools\adb.exe" logcat *:S ReactNativeJS:V ReactNative:V
    }
    "4" {
        Write-Host "`nTo use Chrome DevTools:" -ForegroundColor Yellow
        Write-Host "1. Shake your device/emulator (or press Ctrl+M in emulator)" -ForegroundColor White
        Write-Host "2. Select 'Debug' from the menu" -ForegroundColor White
        Write-Host "3. Chrome will open automatically at http://localhost:8081/debugger-ui/" -ForegroundColor White
        Write-Host "4. Open Chrome DevTools (F12) to see console" -ForegroundColor White
        Write-Host ""
        Write-Host "Opening Chrome DevTools URL..." -ForegroundColor Green
        Start-Process "http://localhost:8081/debugger-ui/"
    }
    default {
        Write-Host "Invalid choice" -ForegroundColor Red
    }
}


