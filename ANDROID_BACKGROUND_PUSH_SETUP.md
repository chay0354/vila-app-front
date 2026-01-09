# Android Background Push Notifications Setup

## ✅ What's Already Done

- ✅ Firebase Messaging library installed (`@react-native-firebase/messaging`)
- ✅ Notifee library installed (`@notifee/react-native`)
- ✅ Background message handler configured in `index.js`
- ✅ Google Services plugin added to `build.gradle`
- ✅ Android permissions configured in `AndroidManifest.xml`

## 🔧 What You Need to Do

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or select existing project
3. Follow the setup wizard

### Step 2: Add Android App to Firebase

1. In Firebase Console, click **"Add app"** → Select **Android**
2. Enter your app details:
   - **Android package name**: `com.bolavilla` (check `android/app/build.gradle` to confirm)
   - **App nickname**: `bola villa` (optional)
   - **Debug signing certificate SHA-1**: (optional, for now)
3. Click **"Register app"**

### Step 3: Download google-services.json

1. After registering, Firebase will show you a download button
2. Click **"Download google-services.json"**
3. **IMPORTANT**: Place the file in:
   ```
   front/android/app/google-services.json
   ```
4. Make sure the file is named exactly `google-services.json` (lowercase)

### Step 4: Configure Backend

You need to add Firebase credentials to your backend so it can send push notifications.

#### Option A: Firebase Admin SDK (Recommended)

1. In Firebase Console, go to **Project Settings** → **Service Accounts**
2. Click **"Generate new private key"**
3. Download the JSON file
4. Add to your backend `.env` file:
   ```bash
   FIREBASE_CREDENTIALS='{"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}'
   ```
   (Paste the entire JSON content as a single-line string)

#### Option B: Legacy FCM Server Key (Simpler)

1. In Firebase Console, go to **Project Settings** → **Cloud Messaging**
2. Copy the **"Server key"**
3. Add to your backend `.env` file:
   ```bash
   FCM_SERVER_KEY=your-server-key-here
   ```

### Step 5: Rebuild Android App

After adding `google-services.json`, you **must rebuild** the app:

```powershell
cd front
npm run android:win
# OR
cd android
.\gradlew clean
.\gradlew assembleRelease
```

**Important**: You cannot just reload - you need a full rebuild because `google-services.json` is processed at build time.

## 🧪 Testing

### 1. Test FCM Token Registration

1. Open the app
2. Sign in
3. Check backend logs - you should see FCM token being registered
4. Or check app console logs for: `FCM token obtained: ...`

### 2. Test Push Notification

Send a test notification from backend:
```powershell
cd back
python -c "
import requests
import json
response = requests.post('http://127.0.0.1:4000/api/push/send', 
  json={'title': 'Test', 'body': 'Hello from FCM!', 'username': 'your_username'})
print(response.json())
"
```

### 3. Test with App Closed

1. **Close the app completely** (swipe away from recent apps)
2. Send a push notification
3. **Notification should appear** even though app is closed! ✅

## 📱 How It Works

### When App is Open or in Background

- FCM message arrives
- `messaging().onMessage()` handler in `App.tsx` receives it
- Notifee displays notification

### When App is Completely Closed

- FCM message arrives
- **Background message handler** in `index.js` receives it
- Notifee displays notification
- **This works automatically!** ✅

## 🔍 Troubleshooting

### "FCM not available" in logs

- ✅ Check `google-services.json` is in `front/android/app/`
- ✅ Rebuild the app (not just reload)
- ✅ Check Firebase project is set up correctly

### "FCM background handler not available"

- This is normal if Firebase isn't configured yet
- Once you add `google-services.json` and rebuild, it will work

### Notifications not appearing when app is closed

- ✅ Check backend has `FIREBASE_CREDENTIALS` or `FCM_SERVER_KEY` set
- ✅ Check backend logs show "FCM sent successfully"
- ✅ Check Android notification permissions are granted
- ✅ Check `google-services.json` is correct

### Build errors after adding google-services.json

- ✅ Make sure file is in `front/android/app/google-services.json`
- ✅ Make sure Google Services plugin is in `build.gradle` (already added)
- ✅ Try: `cd android && .\gradlew clean`

## ✅ Checklist

- [ ] Firebase project created
- [ ] Android app added to Firebase
- [ ] `google-services.json` downloaded and placed in `front/android/app/`
- [ ] Backend has `FIREBASE_CREDENTIALS` or `FCM_SERVER_KEY` configured
- [ ] App rebuilt (not just reloaded)
- [ ] FCM token registered in backend
- [ ] Test notification sent
- [ ] Notification appears when app is closed ✅

## 🎯 Once Setup is Complete

Your Android app will:
- ✅ Receive push notifications when app is **open**
- ✅ Receive push notifications when app is in **background**
- ✅ Receive push notifications when app is **completely closed** 🎉
- ✅ Display notifications using Notifee (beautiful, native Android notifications)

The background handler in `index.js` automatically handles all of this!













