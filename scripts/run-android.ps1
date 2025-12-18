$ErrorActionPreference = "Stop"

$sdk = "$env:LOCALAPPDATA\Android\Sdk"
if (!(Test-Path $sdk)) {
  throw "Android SDK not found at: $sdk"
}

$adb = Join-Path $sdk "platform-tools\adb.exe"
$emu = Join-Path $sdk "emulator\emulator.exe"

if (!(Test-Path $adb)) {
  throw "adb.exe not found at: $adb"
}
if (!(Test-Path $emu)) {
  throw "emulator.exe not found at: $emu"
}

# Ensure PATH has adb + emulator for child processes (react-native CLI)
$env:ANDROID_SDK_ROOT = $sdk
$env:ANDROID_HOME = $sdk
$env:Path = (Join-Path $sdk "platform-tools") + ";" + (Join-Path $sdk "emulator") + ";" + $env:Path

Write-Output "--- adb version ---"
& $adb version

Write-Output "--- checking connected devices ---"
$devices = & $adb devices
Write-Output $devices

$deviceId = ($devices | Select-String -Pattern "^(emulator-\d+)\s+device$" | ForEach-Object { $_.Matches[0].Groups[1].Value } | Select-Object -First 1)

if (-not $deviceId) {
  Write-Output "--- no emulator device found. Starting AVD... ---"
  $avds = & $emu -list-avds
  if (-not $avds -or $avds.Count -eq 0) {
    throw "No AVDs found. Open Android Studio -> Device Manager and create an emulator."
  }

  # Prefer Pixel_9a if present, otherwise pick the first
  $avdName = ($avds | Where-Object { $_ -eq "Pixel_9a" } | Select-Object -First 1)
  if (-not $avdName) { $avdName = $avds | Select-Object -First 1 }

  Write-Output "Starting emulator: $avdName"
  Start-Process -FilePath $emu -ArgumentList @("-avd", $avdName, "-netdelay", "none", "-netspeed", "full", "-no-snapshot-load")

  Write-Output "Waiting for emulator to boot..."
  for ($i=0; $i -lt 90; $i++) {
    $out = & $adb devices
    $deviceId = ($out | Select-String -Pattern "^(emulator-\d+)\s+device$" | ForEach-Object { $_.Matches[0].Groups[1].Value } | Select-Object -First 1)
    if ($deviceId) { break }
    Start-Sleep -Seconds 2
  }

  if (-not $deviceId) {
    throw "Timed out waiting for emulator device."
  }
}

Write-Output "Using device: $deviceId"

# Run react-native install targeting the found device
Push-Location (Split-Path $PSScriptRoot -Parent)
try {
  npx react-native run-android --deviceId $deviceId
} finally {
  Pop-Location
}


