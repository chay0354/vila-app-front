# GitHub Actions iOS Build Setup

This guide explains how to use GitHub Actions to automatically build your iOS app without needing a Mac.

## How It Works

1. **Push code to GitHub** - Any push to `main` branch triggers the build
2. **GitHub builds automatically** - Uses free macOS runners
3. **Download the archive** - Get the `.xcarchive` file from artifacts
4. **Export to IPA** - Open in Xcode on Mac (one-time) or use signing setup

## Current Setup

The workflow (`ios-build.yml`) will:
- ✅ Build your iOS app archive (`.xcarchive`)
- ✅ Upload it as an artifact
- ⚠️ IPA export requires code signing (needs Apple Developer account)

## Using the Build

### Step 1: Trigger the Build

**Option A: Automatic (on push)**
```bash
git add .
git commit -m "Update app"
git push origin main
```

**Option B: Manual trigger**
1. Go to: https://github.com/chay0354/vila-app-front/actions
2. Click "Build iOS App" workflow
3. Click "Run workflow" → "Run workflow"

### Step 2: Wait for Build

- Build takes ~10-15 minutes
- Watch progress at: https://github.com/chay0354/vila-app-front/actions

### Step 3: Download Archive

1. When build completes, click on the workflow run
2. Scroll down to "Artifacts"
3. Download "ios-archive"
4. Extract the `.xcarchive` file

### Step 4: Export to IPA

**Option A: Using Mac (one-time setup)**
1. Transfer `.xcarchive` to a Mac
2. Open Xcode → Window → Organizer
3. Drag the archive into Organizer
4. Click "Distribute App"
5. Choose "Ad Hoc" or "Development"
6. Export as `.ipa`

**Option B: Set up automated signing (advanced)**
- Add Apple Developer credentials to GitHub Secrets
- Update workflow to export IPA automatically

## Setting Up Code Signing (For Automatic IPA)

If you want the workflow to automatically create `.ipa` files:

### 1. Get Apple Developer Account
- Sign up at: https://developer.apple.com ($99/year)

### 2. Create Certificates and Profiles
- Follow Apple's guide for certificates
- Create provisioning profiles

### 3. Add Secrets to GitHub
1. Go to: https://github.com/chay0354/vila-app-front/settings/secrets/actions
2. Add these secrets:
   - `APPLE_ID` - Your Apple ID email
   - `APPLE_ID_PASSWORD` - App-specific password
   - `TEAM_ID` - Your Apple Developer Team ID
   - `CERTIFICATE_BASE64` - Base64 encoded certificate
   - `CERTIFICATE_PASSWORD` - Certificate password
   - `PROVISIONING_PROFILE_BASE64` - Base64 encoded profile

### 4. Update Workflow
The workflow can be updated to use these secrets for automatic signing.

## Benefits

✅ **Free** - GitHub provides macOS runners  
✅ **Automatic** - Builds on every push  
✅ **No Mac needed** - Build from Windows  
✅ **Always available** - Build anytime  

## Limitations

⚠️ **Code signing** - Still needs Apple Developer account for IPA  
⚠️ **Export to IPA** - Currently requires Mac for final export  
⚠️ **First time** - May need to set up signing manually  

## Next Steps

1. Push this workflow to GitHub
2. Test the build
3. Download the archive
4. Export to IPA on Mac (or set up automated signing)

---

## Troubleshooting

### Build fails
- Check the Actions tab for error messages
- Make sure all dependencies are in `package.json`
- Verify `ios/` folder structure is correct

### Archive not found
- Check build logs for errors
- Verify Xcode scheme name matches "FrontNative"
- Check that workspace file exists

### Need help?
- Check GitHub Actions logs
- Review Xcode build settings
- Verify React Native setup

