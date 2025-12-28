# View Full React Native Logs
# This script shows all React Native console logs including errors

$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"

if (!(Test-Path $adb)) {
    Write-Output "Error: adb.exe not found. Make sure Android SDK is installed."
    exit 1
}

Write-Output "=== Full React Native Console Logs ==="
Write-Output "Press Ctrl+C to stop"
Write-Output ""
Write-Output "Showing all logs (errors, warnings, and info)..."
Write-Output ""

# Show all React Native logs
& $adb logcat *:S ReactNative:V ReactNativeJS:V

