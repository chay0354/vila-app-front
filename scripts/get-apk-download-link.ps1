# Quick helper to get APK download link
# Opens the APK file location and Diawi upload page

$ErrorActionPreference = "Stop"

Push-Location (Split-Path $PSScriptRoot -Parent)

$apkPath = "android\app\build\outputs\apk\release\app-release.apk"

if (-not (Test-Path $apkPath)) {
    Write-Output "[ERROR] APK not found. Building now..."
    .\scripts\build-release-apk.ps1
}

$fullPath = (Resolve-Path $apkPath).Path
$fileSize = [math]::Round((Get-Item $fullPath).Length / 1MB, 2)

Write-Output ""
Write-Output "=========================================="
Write-Output "APK Ready for Upload"
Write-Output "=========================================="
Write-Output "Location: $fullPath"
Write-Output "Size: $fileSize MB"
Write-Output ""
Write-Output "Opening Diawi upload page..."
Write-Output "After upload, you'll get a link like: https://i.diawi.com/xxxxx"
Write-Output ""

# Open the folder containing the APK
Start-Process explorer.exe -ArgumentList "/select,`"$fullPath`""

# Open Diawi in browser
Start-Sleep -Seconds 1
Start-Process "https://www.diawi.com"

Write-Output ""
Write-Output "Instructions:"
Write-Output "1. Drag the APK file from the opened folder to the Diawi page"
Write-Output "2. Click 'Send'"
Write-Output "3. Wait 1-2 minutes for upload"
Write-Output "4. Copy the download link provided"
Write-Output "5. Share the link - users can click it on Android to install"
Write-Output ""

Pop-Location

