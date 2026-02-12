param(
  [string]$ServiceName = 'Correlativos-Avales',
  [string]$RepoRoot = ''
)

$ErrorActionPreference = 'Stop'

# Updates code and dependencies, rebuilds the frontend, and restarts the backend service.
# Run in an elevated PowerShell (Admin) if you need to restart a Windows service.

if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
  $RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
}

$volta = 'C:\Program Files\Volta\volta.exe'
if (-not (Test-Path $volta)) {
  throw "Volta not found at: $volta"
}

$backendDir = Join-Path $RepoRoot 'Correlativos Aval\backend'
$frontendDir = Join-Path $RepoRoot 'Correlativos Aval\frontend'

Set-Location $RepoRoot
git pull

Set-Location $backendDir
& $volta run --node 22.11.0 --npm 11.6.2 npm ci

Set-Location $frontendDir
& $volta run --node 22.11.0 --npm 11.6.2 npm ci
& $volta run --node 22.11.0 --npm 11.6.2 npm run build

Restart-Service -Name $ServiceName
Get-Service -Name $ServiceName | Select-Object Name,Status,StartType
