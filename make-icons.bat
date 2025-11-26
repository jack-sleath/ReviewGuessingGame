@echo off
setlocal

REM Folder this script is in
set "BASEDIR=%~dp0"
set "SRC=%BASEDIR%logo.png"

REM guessing-game and icons paths
set "GAMEDIR=%BASEDIR%guessing-game"
set "ICONDIR=%GAMEDIR%\icons"

REM Check logo.png exists
if not exist "%SRC%" (
    echo logo.png not found next to make-icons.bat
    echo Put logo.png in the same folder and run again
    exit /b 1
)

REM Ensure guessing-game and icons folders exist
if not exist "%GAMEDIR%" (
    mkdir "%GAMEDIR%"
)
if not exist "%ICONDIR%" (
    mkdir "%ICONDIR%"
)

echo Creating icons from logo.png into %ICONDIR%...

powershell -NoProfile -Command ^
  "$src = '%SRC%';" ^
  "$outDir = '%ICONDIR%';" ^
  "$sizes = 16,32,48,128;" ^
  "Add-Type -AssemblyName System.Drawing;" ^
  "$img = [System.Drawing.Image]::FromFile($src);" ^
  "foreach ($s in $sizes) {" ^
  "  Write-Host ('Creating icon{0}.png' -f $s);" ^
  "  $bmp = New-Object System.Drawing.Bitmap($s, $s);" ^
  "  $g = [System.Drawing.Graphics]::FromImage($bmp);" ^
  "  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic;" ^
  "  $g.DrawImage($img, 0, 0, $s, $s);" ^
  "  $g.Dispose();" ^
  "  $outFile = Join-Path $outDir ('icon{0}.png' -f $s);" ^
  "  $bmp.Save($outFile, [System.Drawing.Imaging.ImageFormat]::Png);" ^
  "  $bmp.Dispose();" ^
  "}" ^
  "$img.Dispose();"

echo Done.
endlocal
