# 🚀 Simple Guide: Upload to Google Play Store

## Quick 3-Step Process

### Step 1: Prepare Your App (5 minutes)

Run this script to create keystore and build AAB:

```powershell
cd front
.\scripts\prepare-for-playstore.ps1
```

This will:
- ✅ Create a release keystore (you'll enter passwords)
- ✅ Configure signing
- ✅ Build the AAB file for Play Store

**Important**: Save the keystore passwords! You'll need them for future updates.

---

### Step 2: Create Google Play Developer Account (10 minutes)

1. Go to: **https://play.google.com/console**
2. Sign in with your Google account
3. Pay **$25 one-time fee** (lifetime account)
4. Complete your developer profile

---

### Step 3: Upload Your App (15 minutes)

1. **Create New App**:
   - Click "Create app" in Play Console
   - Enter app name: "Vila App" (or your choice)
   - Select "App" (not game)
   - Select "Free"
   - Click "Create"

2. **Complete Required Sections** (left menu):
   - ✅ **Store presence** → Main store listing
     - Upload app icon (512x512 PNG)
     - Add at least 2 screenshots
     - Write short description (80 chars)
     - Write full description
   
   - ✅ **App content** → Privacy Policy
     - Add privacy policy URL (required)
     - Can use: GitHub Pages, Google Sites, or your website
   
   - ✅ **App content** → Content rating
     - Complete questionnaire (usually "Everyone")
   
   - ✅ **Pricing and distribution**
     - Select "Free"
     - Select countries (or "All countries")
     - Save

3. **Upload Your AAB**:
   - Go to **"Production"** (left menu)
   - Click **"Create new release"**
   - Click **"Upload"**
   - Select: `front\android\app\build\outputs\bundle\release\app-release.aab`
   - Add release notes (e.g., "Initial release")
   - Click **"Save"**

4. **Submit for Review**:
   - Review all sections (should show green checkmarks)
   - Click **"Review release"**
   - Click **"Start rollout to Production"**
   - Wait 1-3 days for Google's review

---

## What You Need

- ✅ Google account
- ✅ $25 USD (one-time)
- ✅ App icon (512x512 PNG)
- ✅ 2+ screenshots
- ✅ Privacy policy URL
- ✅ AAB file (built in Step 1)

---

## File Locations

- **AAB file**: `front\android\app\build\outputs\bundle\release\app-release.aab`
- **Keystore**: `front\android\app\release.keystore` (keep this safe!)
- **Config**: `front\android\keystore.properties`

---

## Troubleshooting

**"Missing privacy policy"**
→ Add privacy policy URL in App content → Privacy Policy

**"Missing screenshots"**
→ Upload at least 2 screenshots in Store listing

**"AAB upload failed"**
→ Make sure you're uploading `.aab` file, not `.apk`

**"Content rating incomplete"**
→ Complete the questionnaire in App content → Content rating

---

## That's It! 🎉

Once approved (1-3 days), your app will be live on Google Play Store!

For detailed instructions, see: [GOOGLE_PLAY_UPLOAD.md](./GOOGLE_PLAY_UPLOAD.md)











