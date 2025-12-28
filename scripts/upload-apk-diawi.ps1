# Upload APK to Diawi and get download link
# Diawi is a free service that hosts APK files and provides direct download links

$ErrorActionPreference = "Stop"

Write-Output "Uploading APK to Diawi..."
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
    Write-Output "APK found: $fullPath"
    Write-Output ""
    
    # Diawi upload endpoint
    $diawiUrl = "https://i.diawi.com/upload"
    
    Write-Output "Uploading to Diawi..."
    Write-Output "This may take a few minutes..."
    Write-Output ""
    
    # Upload using multipart form data
    $fileBytes = [System.IO.File]::ReadAllBytes($fullPath)
    $boundary = [System.Guid]::NewGuid().ToString()
    $LF = "`r`n"
    
    $bodyLines = @(
        "--$boundary",
        "Content-Disposition: form-data; name=`"file`"; filename=`"app-release.apk`"",
        "Content-Type: application/vnd.android.package-archive$LF",
        [System.Text.Encoding]::GetEncoding("iso-8859-1").GetString($fileBytes),
        "--$boundary--$LF"
    ) -join $LF
    
    try {
        $response = Invoke-RestMethod -Uri $diawiUrl -Method Post -Body $bodyLines -ContentType "multipart/form-data; boundary=$boundary" -ErrorAction Stop
        
        if ($response.hash) {
            $downloadLink = "https://i.diawi.com/$($response.hash)"
            Write-Output ""
            Write-Output "[SUCCESS] Upload successful!"
            Write-Output "=========================================="
            Write-Output "Download Link: $downloadLink"
            Write-Output "=========================================="
            Write-Output ""
            Write-Output "You can now share this link. Users can click it on Android to download and install the app."
            Write-Output ""
            
            # Copy to clipboard if possible
            try {
                Set-Clipboard -Value $downloadLink
                Write-Output "Link copied to clipboard!"
            } catch {
                # Clipboard not available, that's okay
            }
            
            # Open in browser
            Start-Process $downloadLink
        } else {
            Write-Output "[ERROR] Upload failed - no hash received"
            Write-Output "Response: $($response | ConvertTo-Json)"
        }
    } catch {
        Write-Output "[ERROR] Upload failed: $_"
        Write-Output ""
        Write-Output "Alternative: Upload manually at https://www.diawi.com"
        Write-Output "1. Go to https://www.diawi.com"
        Write-Output "2. Click 'Choose file' and select: $fullPath"
        Write-Output "3. Click 'Send'"
        Write-Output "4. Copy the download link provided"
        exit 1
    }
} catch {
    Write-Output "[ERROR] Script failed: $_"
    exit 1
} finally {
    Pop-Location
}

