@echo off
setlocal

rem Go to the folder this script lives in (your extension root)
cd /d "%~dp0/guessing-game"

rem Run PowerShell to:
rem  - generate version YY.MM.DD.HHMM
rem  - update manifest.json
rem  - zip a Chrome/Edge build to ../dist/guessing-game-<version>.zip
rem  - stage a Firefox build with browser_specific_settings.gecko injected
rem    and zip it to ../dist/guessing-game-firefox-<version>.zip
powershell -NoProfile -Command ^
  "$now = Get-Date;" ^
  "$padded = '{0:yy}.{0:MM}.{0:dd}.{0:HHmm}' -f $now;" ^
  "$version = ($padded -split '\.' | ForEach-Object { [int]$_ }) -join '.';" ^
  "Write-Host 'Version:' $version '(zip:' $padded ')';" ^
  "$manifestPath = 'manifest.json';" ^
  "$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json;" ^
  "$manifest.version = $version;" ^
  "$manifest | ConvertTo-Json -Depth 10 | Set-Content $manifestPath -Encoding UTF8;" ^
  "$zipDir = Join-Path (Split-Path -Parent $PWD) 'dist';" ^
  "New-Item -ItemType Directory -Force -Path $zipDir | Out-Null;" ^
  "$chromeZip = Join-Path $zipDir ('guessing-game-' + $padded + '.zip');" ^
  "if (Test-Path $chromeZip) { Remove-Item $chromeZip };" ^
  "Compress-Archive -Path * -DestinationPath $chromeZip;" ^
  "Write-Host 'Chrome/Edge zip:' $chromeZip;" ^
  "$ffStage = Join-Path $env:TEMP ('gg-firefox-' + [guid]::NewGuid().ToString());" ^
  "New-Item -ItemType Directory -Force -Path $ffStage | Out-Null;" ^
  "Copy-Item -Recurse -Force -Path (Join-Path $PWD '*') -Destination $ffStage;" ^
  "$ffManifestPath = Join-Path $ffStage 'manifest.json';" ^
  "$ffManifest = Get-Content $ffManifestPath -Raw | ConvertFrom-Json;" ^
  "$ffManifest | Add-Member -NotePropertyName browser_specific_settings -NotePropertyValue (@{ gecko = @{ id = 'letterboxd-review-guesser@jack-sleath.github.io'; strict_min_version = '109.0' } }) -Force;" ^
  "$ffManifest | ConvertTo-Json -Depth 10 | Set-Content $ffManifestPath -Encoding UTF8;" ^
  "$firefoxZip = Join-Path $zipDir ('guessing-game-firefox-' + $padded + '.zip');" ^
  "if (Test-Path $firefoxZip) { Remove-Item $firefoxZip };" ^
  "Compress-Archive -Path (Join-Path $ffStage '*') -DestinationPath $firefoxZip;" ^
  "Remove-Item -Recurse -Force $ffStage;" ^
  "Write-Host 'Firefox zip: ' $firefoxZip"

endlocal
