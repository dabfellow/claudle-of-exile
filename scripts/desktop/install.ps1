$ErrorActionPreference = 'Stop'
$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$packagePath = Join-Path $repoRoot 'tmp/desktop/Path of Idle Balance Lab-win32-x64'
$installPath = Join-Path $env:LOCALAPPDATA 'Programs/Path of Idle Balance Lab'
if (-not (Test-Path -LiteralPath (Join-Path $packagePath 'Path of Idle Balance Lab.exe'))) {
  throw 'Build the desktop application with npm run simulator:package first.'
}
if (Get-Process -Name 'Path of Idle Balance Lab' -ErrorAction SilentlyContinue) {
  throw 'Close Path of Idle Balance Lab before installing an update.'
}
New-Item -ItemType Directory -Path $installPath -Force | Out-Null
Copy-Item -Path (Join-Path $packagePath '*') -Destination $installPath -Recurse -Force
$desktopPath = [Environment]::GetFolderPath('Desktop')
$startMenuPath = [Environment]::GetFolderPath('Programs')
$shortcutShell = New-Object -ComObject WScript.Shell
foreach ($shortcutFolder in @($desktopPath, $startMenuPath)) {
  $shortcut = $shortcutShell.CreateShortcut((Join-Path $shortcutFolder 'Path of Idle Balance Lab.lnk'))
  $shortcut.TargetPath = Join-Path $installPath 'Path of Idle Balance Lab.exe'
  $shortcut.WorkingDirectory = $installPath
  $shortcut.Description = 'Character simulations using current Path of Idle game values'
  $shortcut.Save()
}
Write-Output "Installed: $installPath"
Write-Output 'Created desktop and Start menu shortcuts: Path of Idle Balance Lab'
