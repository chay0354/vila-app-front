# Viewing React Native Console Logs

There are several ways to view console logs in React Native, similar to a web browser's developer console.

## Method 1: Metro Bundler Terminal (Easiest)

The Metro bundler terminal (where you run `npm start`) already shows `console.log()` output. Just look at the terminal where Metro is running.

## Method 2: Chrome DevTools (Best for Debugging)

This gives you a full browser-like debugging experience:

1. **Enable Remote Debugging:**
   - Shake your device/emulator (or press `Ctrl+M` in Android emulator)
   - Select **"Debug"** from the menu
   - Chrome will open automatically at `http://localhost:8081/debugger-ui/`

2. **Open Chrome DevTools:**
   - Press `F12` or right-click → "Inspect"
   - Go to the **Console** tab
   - You'll see all `console.log()`, `console.error()`, etc.

3. **Features:**
   - Full console with filtering
   - Network tab for API calls
   - Sources tab for breakpoints
   - React DevTools support

## Method 3: ADB Logcat (For Android)

View logs directly from Android:

### Quick Command:
```powershell
npm run console:js
```

### Or manually:
```powershell
# Set Android SDK path
$env:ANDROID_HOME = "C:\Users\$env:USERNAME\AppData\Local\Android\Sdk"
$env:PATH = "$env:ANDROID_HOME\platform-tools;$env:PATH"

# View React Native logs only
adb logcat *:S ReactNativeJS:V ReactNative:V

# View all logs
adb logcat
```

## Method 4: Interactive Script

Run the interactive script:
```powershell
npm run console
```

This will give you options to:
- View filtered React Native logs
- View all Android logs
- Clear and view logs
- Open Chrome DevTools

## Tips

- **console.log()** appears in Metro terminal and Chrome DevTools
- **console.error()** appears in red in Metro terminal
- **console.warn()** appears in yellow in Metro terminal
- Use Chrome DevTools for breakpoints and step debugging
- Filter logs in Chrome DevTools using the filter box

## Troubleshooting

If Chrome DevTools doesn't open:
1. Make sure Metro is running (`npm start`)
2. Make sure the app is in debug mode (shake device → Debug)
3. Try opening manually: `http://localhost:8081/debugger-ui/`

If adb is not found:
1. Make sure Android SDK is installed
2. Check that `ANDROID_HOME` is set correctly
3. The script should set it automatically, but you can set it manually if needed


