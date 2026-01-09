# Simple APK Upload Script
# Uploads APK to transfer.sh (14 days) or provides manual instructions

$ErrorActionPreference = "Stop"

Write-Output "Uploading APK..."
Write-Output ""

$apkPath = "android\app\build\outputs\apk\release\app-release.apk"

if (-not (Test-Path $apkPath)) {
    Write-Output "[ERROR] APK not found at: $apkPath"
    Write-Output "Please build the APK first using: .\scripts\build-release-apk.ps1"
    exit 1
}

$fullPath = (Resolve-Path $apkPath).Path
$fileName = Split-Path $fullPath -Leaf
$fileSize = (Get-Item $fullPath).Length / 1MB

Write-Output "APK found: $fullPath"
Write-Output "File size: $([math]::Round($fileSize, 2)) MB"
Write-Output ""

# Try transfer.sh with curl
Write-Output "Attempting upload to transfer.sh..."
try {
    $response = curl.exe -T $fullPath "https://transfer.sh/$fileName" 2>&1
    
    if ($LASTEXITCODE -eq 0 -and $response -and $response.Trim() -and $response.Trim().StartsWith("https://")) {
        $downloadLink = $response.Trim()
        Write-Output ""
        Write-Output "[SUCCESS] Upload successful!"
        Write-Output "=========================================="
        Write-Output "Download Link: $downloadLink"
        Write-Output "=========================================="
        Write-Output ""
        Write-Output "⚠️  Note: This link expires in 14 days"
        Write-Output ""
        
        # Copy to clipboard
        try {
            Set-Clipboard -Value $downloadLink
            Write-Output "✅ Link copied to clipboard!"
        } catch {
            # Clipboard not available
        }
        
        # Open in browser
        Start-Process $downloadLink
        exit 0
    } else {
        Write-Output "[INFO] Transfer.sh upload failed"
    }
} catch {
    Write-Output "[INFO] Transfer.sh upload failed: $_"
}

# If transfer.sh failed, provide manual instructions
Write-Output ""
Write-Output "=========================================="
Write-Output "Manual Upload Options:"
Write-Output "=========================================="
Write-Output ""
Write-Output "APK Location: $fullPath"
Write-Output ""
Write-Output "Option 1: Diawi (Recommended)"
Write-Output "  1. Go to: https://www.diawi.com"
Write-Output "  2. Drag and drop the APK file"
Write-Output "  3. Wait for upload (1-2 minutes)"
Write-Output "  4. Copy the download link"
Write-Output ""
Write-Output "Option 2: Google Drive"
Write-Output "  1. Upload APK to Google Drive"
Write-Output "  2. Right-click → 'Get link' → 'Anyone with link'"
Write-Output "  3. Replace '/file/d/FILE_ID/view?usp=sharing'"
Write-Output "     with '/uc?export=download&id=FILE_ID'"
Write-Output ""
Write-Output "Opening Diawi in browser..."
Start-Process "https://www.diawi.com"




