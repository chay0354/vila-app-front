# iOS Push Notifications Setup Guide

## iPhone Settings Required

### 1. Enable Notifications in iPhone Settings

1. Open **Settings** on your iPhone
2. Scroll down and tap on **bola villa** (or your app name)
3. Tap on **Notifications**
4. Make sure **Allow Notifications** is **ON** (green)
5. Choose your notification style:
   - **Lock Screen** - Show notifications on lock screen
   - **Notification Center** - Show in notification center
   - **Banners** - Show temporary banners at top of screen
6. Enable **Sounds** and **Badges** if desired

### 2. First Time App Launch

When you first open the app:
- The app will automatically request notification permission
- Tap **"Allow"** when prompted
- This is a one-time permission request

### 3. If You Denied Permissions

If you accidentally denied notifications:
1. Go to **Settings** → **bola villa** → **Notifications**
2. Turn on **Allow Notifications**
3. Restart the app

## Technical Requirements

### For Development (Current Setup)
- ✅ Notifee library installed
- ✅ Background modes configured in Info.plist
- ✅ Permission request code in app

### For Production (Additional Steps Needed)
To receive push notifications when the app is **completely closed**, you'll need:

1. **Apple Developer Account** with Push Notifications capability enabled
2. **APNs (Apple Push Notification service) Certificate or Key** configured
3. **Xcode Project Settings**:
   - Open project in Xcode
   - Select your target
   - Go to **Signing & Capabilities**
   - Add **Push Notifications** capability
   - Add **Background Modes** capability with **Remote notifications** enabled

4. **Backend Configuration**:
   - Update backend to use APNs instead of device tokens
   - Send notifications via APNs API

## Current Status

✅ **Works when app is open or in background** - Fully functional
⚠️ **Works when app is closed** - Requires APNs setup for production

The app will request notification permissions automatically on first launch. Make sure to allow them!

