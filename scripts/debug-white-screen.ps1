# Debug White Screen Issue
# Common causes and fixes

Write-Output "=========================================="
Write-Output "  DEBUGGING WHITE SCREEN ISSUE"
Write-Output "=========================================="
Write-Output ""

# Check 1: .env file exists
Write-Output "1. Checking .env file..."
if (Test-Path ".env") {
    Write-Output "   [✓] .env file exists"
    $envContent = Get-Content ".env" -Raw
    if ($envContent -match "VITE_API_BASE_URL") {
        $url = ($envContent -split "`n" | Where-Object { $_ -match "VITE_API_BASE_URL" }) -replace ".*=", ""
        Write-Output "   [✓] VITE_API_BASE_URL found: $url"
    } else {
        Write-Output "   [✗] VITE_API_BASE_URL NOT found in .env"
        Write-Output "   [FIX] Add this line to .env:"
        Write-Output "         VITE_API_BASE_URL=https://vila-app-back.vercel.app"
    }
} else {
    Write-Output "   [✗] .env file NOT found"
    Write-Output "   [FIX] Create .env file with:"
    Write-Output "         VITE_API_BASE_URL=https://vila-app-back.vercel.app"
}

Write-Output ""
Write-Output "2. Checking Metro bundler..."
Write-Output "   [INFO] Make sure Metro bundler is running"
Write-Output "   [INFO] Run: npm start (in front/ directory)"

Write-Output ""
Write-Output "3. Common fixes:"
Write-Output "   a) Rebuild the app (not just reload):"
Write-Output "      cd front"
Write-Output "      npm run android:win"
Write-Output ""
Write-Output "   b) Clear Metro cache:"
Write-Output "      npm start -- --reset-cache"
Write-Output ""
Write-Output "   c) Clear app data on device:"
Write-Output "      Settings → Apps → Your App → Clear Data"
Write-Output ""
Write-Output "   d) Check console logs:"
Write-Output "      Run: .\scripts\view-logs.ps1"
Write-Output "      Or: npx react-native log-android"
Write-Output ""

Write-Output "4. Viewing logs now..."
Write-Output "   (Press Ctrl+C to stop)"
Write-Output ""
Start-Sleep -Seconds 2

# Try to view logs
try {
    npx react-native log-android
} catch {
    Write-Output "   [INFO] Could not run log viewer automatically"
    Write-Output "   [INFO] Run manually: npx react-native log-android"
}


