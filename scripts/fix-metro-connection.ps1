# Script to fix Metro bundler connection issues
Write-Host "Fixing Metro Bundler Connection..." -ForegroundColor Cyan
Write-Host ""

# Set Android SDK path
$env:ANDROID_HOME = "C:\Users\$env:USERNAME\AppData\Local\Android\Sdk"
$env:PATH = "$env:ANDROID_HOME\platform-tools;$env:PATH"

# Step 1: Set up port forwarding
Write-Host "Step 1: Setting up ADB port forwarding..." -ForegroundColor Yellow
& "$env:ANDROID_HOME\platform-tools\adb.exe" reverse tcp:8081 tcp:8081
if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] Port forwarding configured" -ForegroundColor Green
} else {
    Write-Host "  [WARN] Port forwarding may have failed" -ForegroundColor Yellow
}

# Step 2: Check if Metro is running
Write-Host "`nStep 2: Checking Metro bundler..." -ForegroundColor Yellow
$metroProcess = Get-Process | Where-Object {$_.ProcessName -eq "node" -and $_.CommandLine -like "*metro*"}
if ($metroProcess) {
    Write-Host "  [OK] Metro bundler is running" -ForegroundColor Green
} else {
    Write-Host "  [INFO] Metro bundler is not running" -ForegroundColor Yellow
    Write-Host "  Starting Metro bundler..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\..'; npx react-native start --reset-cache"
    Start-Sleep -Seconds 3
    Write-Host "  [OK] Metro bundler started in new window" -ForegroundColor Green
}

# Step 3: Clear cache
Write-Host "`nStep 3: Clearing cache..." -ForegroundColor Yellow
Remove-Item -Path "node_modules\.cache" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "android\app\build" -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "  [OK] Cache cleared" -ForegroundColor Green

# Step 4: Reload app
Write-Host "`nStep 4: Reloading app..." -ForegroundColor Yellow
& "$env:ANDROID_HOME\platform-tools\adb.exe" shell am force-stop com.frontnative
Start-Sleep -Seconds 1
& "$env:ANDROID_HOME\platform-tools\adb.exe" shell am start -n com.frontnative/.MainActivity
Write-Host "  [OK] App reloaded" -ForegroundColor Green

Write-Host "`nDone! Try reloading the app (press R, R or shake device -> Reload)" -ForegroundColor Cyan

