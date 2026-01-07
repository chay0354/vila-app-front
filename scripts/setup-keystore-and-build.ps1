# Setup keystore.properties and rebuild AAB with release signing

$ErrorActionPreference = "Stop"

Write-Host "`n=== Setting up Release Keystore and Building AAB ===" -ForegroundColor Cyan
Write-Host ""

Push-Location (Split-Path $PSScriptRoot -Parent)

try {
    $keystorePropsPath = "android\keystore.properties"
    
    # Step 1: Create keystore.properties
    if (-not (Test-Path $keystorePropsPath)) {
        Write-Host "Step 1: Creating keystore.properties..." -ForegroundColor Yellow
        Write-Host "Enter the password you used when creating the keystore." -ForegroundColor Cyan
        Write-Host ""
        
        $storePassword = Read-Host "Enter keystore password" -AsSecureString
        $keyPasswordInput = Read-Host "Enter key password (or press Enter to use same as keystore)" -AsSecureString
        
        $storePasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
            [Runtime.InteropServices.Marshal]::SecureStringToBSTR($storePassword)
        )
        
        if ($keyPasswordInput.Length -eq 0) {
            $keyPasswordPlain = $storePasswordPlain
        } else {
            $keyPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
                [Runtime.InteropServices.Marshal]::SecureStringToBSTR($keyPasswordInput)
            )
        }
        
        $propsContent = @"
storePassword=$storePasswordPlain
keyPassword=$keyPasswordPlain
keyAlias=release-key
storeFile=app/release.keystore
"@
        
        Set-Content -Path $keystorePropsPath -Value $propsContent
        Write-Host "✅ keystore.properties created!" -ForegroundColor Green
    } else {
        Write-Host "✅ keystore.properties already exists" -ForegroundColor Green
    }
    
    # Step 2: Build AAB
    Write-Host "`nStep 2: Building AAB file with release signing..." -ForegroundColor Yellow
    Write-Host "This will take a few minutes...`n" -ForegroundColor Cyan
    
    Set-Location android
    .\gradlew clean
    .\gradlew bundleRelease
    
    $aabPath = "app\build\outputs\bundle\release\app-release.aab"
    
    if (Test-Path $aabPath) {
        $fullPath = (Resolve-Path $aabPath).Path
        Write-Host ""
        Write-Host "✅ SUCCESS! AAB file ready with release signing!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📦 AAB Location: $fullPath" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "📤 Now upload this file to Google Play Console!" -ForegroundColor Yellow
    } else {
        Write-Host "❌ Build failed - AAB not found" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    exit 1
} finally {
    Pop-Location
}









