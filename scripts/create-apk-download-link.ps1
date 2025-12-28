# Create Download Link for APK
# This script helps you create a shareable download link for your APK

$ErrorActionPreference = "Stop"

Write-Output "Creating APK Download Link..."
Write-Output ""

Push-Location (Split-Path $PSScriptRoot -Parent)

try {
    $apkPath = "android\app\build\outputs\apk\release\app-release.apk"
    
    if (-not (Test-Path $apkPath)) {
        Write-Output "[ERROR] APK not found at: $apkPath"
        Write-Output "Please build the APK first using: .\scripts\build-release-apk.ps1"
        exit 1
    }
    
    $fullPath = (Resolve-Path $apkPath).Path
    $fileSize = (Get-Item $fullPath).Length / 1MB
    
    Write-Output "APK found: $fullPath"
    Write-Output "File size: $([math]::Round($fileSize, 2)) MB"
    Write-Output ""
    Write-Output "=========================================="
    Write-Output "Choose an upload method:"
    Write-Output "=========================================="
    Write-Output ""
    Write-Output "Option 1: Diawi (Recommended - Easiest)"
    Write-Output "  1. Go to: https://www.diawi.com"
    Write-Output "  2. Click 'Choose file' or drag and drop"
    Write-Output "  3. Select: $fullPath"
    Write-Output "  4. Click 'Send'"
    Write-Output "  5. Copy the download link (e.g., https://i.diawi.com/xxxxx)"
    Write-Output ""
    Write-Output "Option 2: Google Drive (Direct Download)"
    Write-Output "  1. Upload APK to Google Drive"
    Write-Output "  2. Right-click file → 'Get link' → Set to 'Anyone with link'"
    Write-Output "  3. Copy the link"
    Write-Output "  4. Replace '/file/d/FILE_ID/view?usp=sharing' with '/uc?export=download&id=FILE_ID'"
    Write-Output ""
    Write-Output "Option 3: Transfer.sh (Temporary - 14 days)"
    Write-Output "  Uploading now..."
    Write-Output ""
    
    # Try transfer.sh
    try {
        $fileName = Split-Path $fullPath -Leaf
        $transferUrl = "https://transfer.sh/$fileName"
        
        $response = Invoke-RestMethod -Uri $transferUrl -Method Put -InFile $fullPath -ContentType "application/vnd.android.package-archive" -ErrorAction Stop
        
        if ($response -and $response.Trim()) {
            $downloadLink = $response.Trim()
            Write-Output ""
            Write-Output "[SUCCESS] Upload successful!"
            Write-Output "=========================================="
            Write-Output "Download Link: $downloadLink"
            Write-Output "=========================================="
            Write-Output ""
            Write-Output "⚠️  Note: This link expires in 14 days"
            Write-Output ""
            Write-Output "You can now share this link. Users can click it on Android to download and install the app."
            Write-Output ""
            
            # Copy to clipboard if possible
            try {
                Set-Clipboard -Value $downloadLink
                Write-Output "✅ Link copied to clipboard!"
            } catch {
                # Clipboard not available, that's okay
            }
            
            # Open in browser
            Write-Output "Opening link in browser..."
            Start-Process $downloadLink
            
            exit 0
        }
    } catch {
        Write-Output "[INFO] Transfer.sh upload failed, use manual method above"
        Write-Output ""
    }
    
    # If transfer.sh failed, show manual instructions
    Write-Output "=========================================="
    Write-Output "Manual Upload Instructions:"
    Write-Output "=========================================="
    Write-Output ""
    Write-Output "APK Location: $fullPath"
    Write-Output ""
    Write-Output "Quick Upload to Diawi:"
    Write-Output "  1. Open: https://www.diawi.com"
    Write-Output "  2. Drag and drop the APK file"
    Write-Output "  3. Wait for upload (1-2 minutes)"
    Write-Output "  4. Copy the download link"
    Write-Output ""
    Write-Output "Opening Diawi in browser..."
    Start-Process "https://www.diawi.com"
    
} catch {
    Write-Output "[ERROR] Script failed: $_"
    exit 1
} finally {
    Pop-Location
}

