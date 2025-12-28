# PowerShell script to convert app-icon.jpg to PNG and resize for Android
# Requires .NET Framework

$iconPath = "app-icon.jpg"
$outputDirs = @(
    "android\app\src\main\res\mipmap-mdpi",
    "android\app\src\main\res\mipmap-hdpi",
    "android\app\src\main\res\mipmap-xhdpi",
    "android\app\src\main\res\mipmap-xxhdpi",
    "android\app\src\main\res\mipmap-xxxhdpi"
)

$sizes = @{
    "mipmap-mdpi" = 48
    "mipmap-hdpi" = 72
    "mipmap-xhdpi" = 96
    "mipmap-xxhdpi" = 144
    "mipmap-xxxhdpi" = 192
}

Add-Type -AssemblyName System.Drawing

if (!(Test-Path $iconPath)) {
    Write-Output "Error: $iconPath not found"
    exit 1
}

try {
    $originalImage = [System.Drawing.Image]::FromFile((Resolve-Path $iconPath))
    
    foreach ($dir in $outputDirs) {
        $size = $sizes[$dir.Split('\')[-1]]
        
        if (!(Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
        }
        
        # Create square bitmap
        $bitmap = New-Object System.Drawing.Bitmap($size, $size)
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        
        # Draw image to fill square
        $graphics.DrawImage($originalImage, 0, 0, $size, $size)
        
        # Save as PNG (regular and round)
        $bitmap.Save("$dir\ic_launcher.png", [System.Drawing.Imaging.ImageFormat]::Png)
        $bitmap.Save("$dir\ic_launcher_round.png", [System.Drawing.Imaging.ImageFormat]::Png)
        
        $graphics.Dispose()
        $bitmap.Dispose()
        
        Write-Output "Created icons for $dir ($size x $size)"
    }
    
    $originalImage.Dispose()
    Write-Output "Icon conversion completed successfully!"
} catch {
    Write-Output "Error: $_"
    exit 1
}

