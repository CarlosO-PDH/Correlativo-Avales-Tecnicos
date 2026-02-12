$ErrorActionPreference = 'Stop'

# Builds the Angular frontend for production.

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$frontendDir = Join-Path $repoRoot 'Correlativos Aval\frontend'

Set-Location $frontendDir

$volta = 'C:\Program Files\Volta\volta.exe'
if (-not (Test-Path $volta)) {
  throw "Volta not found at: $volta"
}

& $volta run --node 22.11.0 --npm 11.6.2 npm ci
& $volta run --node 22.11.0 --npm 11.6.2 npm run build
