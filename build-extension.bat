@echo off
setlocal

rem Go to the folder this script lives in (your extension root)
cd /d "%~dp0/guessing-game"

rem Run PowerShell to:
rem  - generate version YY.MM.DD.HHMM
rem  - update manifest.json
rem  - zip the folder to ../dist/guessing-game-<version>.zip
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
  "$zipPath = Join-Path $zipDir ('guessing-game-' + $padded + '.zip');" ^
  "if (Test-Path $zipPath) { Remove-Item $zipPath };" ^
  "Compress-Archive -Path * -DestinationPath $zipPath;" ^
  "Write-Host 'Created zip:' $zipPath"

endlocal
