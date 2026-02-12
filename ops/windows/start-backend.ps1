$ErrorActionPreference = 'Stop'

# Starts the backend using Volta-pinned Node/npm.
# Intended for interactive use or as the command target for a Windows service (NSSM).

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$backendDir = Join-Path $repoRoot 'Correlativos Aval\backend'

Set-Location $backendDir

$volta = 'C:\Program Files\Volta\volta.exe'
if (-not (Test-Path $volta)) {
  throw "Volta not found at: $volta"
}

# Bind to all interfaces for LAN access.
$env:HOST = $env:HOST ?? '0.0.0.0'
$env:PORT = $env:PORT ?? '3000'

& $volta run --node 22.11.0 --npm 11.6.2 npm start
