# Simple script to prepare app for Google Play Store upload
# This will create keystore and build AAB file

$ErrorActionPreference = "Stop"

Write-Host "`n=== Preparing App for Google Play Store ===" -ForegroundColor Cyan
Write-Host ""

Push-Location (Split-Path $PSScriptRoot -Parent)

try {
    $androidAppDir = "android\app"
    $keystorePath = "$androidAppDir\release.keystore"
    $keystorePropsPath = "android\keystore.properties"
    
    # Step 1: Create keystore if it doesn't exist
    if (-not (Test-Path $keystorePath)) {
        Write-Host "Step 1: Creating release keystore..." -ForegroundColor Yellow
        Write-Host "You'll be prompted to enter:" -ForegroundColor Cyan
        Write-Host "  - Keystore password (save this!)" -ForegroundColor White
        Write-Host "  - Key password (can be same)" -ForegroundColor White
        Write-Host "  - Your name, organization, etc." -ForegroundColor White
        Write-Host ""
        Write-Host "Press Enter to continue..." -ForegroundColor Yellow
        Read-Host
        
        Set-Location $androidAppDir
        keytool -genkeypair -v -storetype PKCS12 -keystore release.keystore -alias release-key -keyalg RSA -keysize 2048 -validity 10000
        
        if (-not (Test-Path "release.keystore")) {
            Write-Host "❌ Keystore creation failed!" -ForegroundColor Red
            exit 1
        }
        
        Write-Host "✅ Keystore created!" -ForegroundColor Green
        Set-Location (Split-Path $PSScriptRoot -Parent)
    } else {
        Write-Host "✅ Release keystore already exists" -ForegroundColor Green
    }
    
    # Step 2: Create keystore.properties if it doesn't exist
    if (-not (Test-Path $keystorePropsPath)) {
        Write-Host "`nStep 2: Creating keystore.properties..." -ForegroundColor Yellow
        Write-Host "You need to enter the passwords you used when creating the keystore." -ForegroundColor Cyan
        Write-Host ""
        
        $storePassword = Read-Host "Enter keystore password" -AsSecureString
        $keyPassword = Read-Host "Enter key password (or press Enter to use same as keystore)" -AsSecureString
        
        $storePasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
            [Runtime.InteropServices.Marshal]::SecureStringToBSTR($storePassword)
        )
        
        if ($keyPassword.Length -eq 0) {
            $keyPasswordPlain = $storePasswordPlain
        } else {
            $keyPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
                [Runtime.InteropServices.Marshal]::SecureStringToBSTR($keyPassword)
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
    
    # Step 3: Build AAB
    Write-Host "`nStep 3: Building AAB file for Google Play Store..." -ForegroundColor Yellow
    Write-Host "This will take a few minutes...`n" -ForegroundColor Cyan
    
    Set-Location android
    .\gradlew clean
    .\gradlew bundleRelease
    
    $aabPath = "app\build\outputs\bundle\release\app-release.aab"
    
    if (Test-Path $aabPath) {
        $fullPath = (Resolve-Path $aabPath).Path
        Write-Host ""
        Write-Host "✅ SUCCESS! AAB file ready for Google Play Store!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📦 AAB Location: $fullPath" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "📱 Next Steps:" -ForegroundColor Yellow
        Write-Host "1. Go to: https://play.google.com/console" -ForegroundColor White
        Write-Host "2. Create a new app (or select existing)" -ForegroundColor White
        Write-Host "3. Go to 'Production' → 'Create new release'" -ForegroundColor White
        Write-Host "4. Upload the AAB file from above location" -ForegroundColor White
        Write-Host "5. Fill in release notes and submit" -ForegroundColor White
        Write-Host ""
        Write-Host "💡 For detailed instructions, see: GOOGLE_PLAY_UPLOAD.md" -ForegroundColor Cyan
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












