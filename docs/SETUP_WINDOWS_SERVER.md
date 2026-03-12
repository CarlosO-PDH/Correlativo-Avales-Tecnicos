# Windows Server Setup (Volta + NSSM + LAN)

This guide explains the "single PC server" deployment used in the office.

## Goals

- A centralized app accessible only inside the office LAN.
- Centralized data in one SQLite DB file.
- Easy updates: pull code, rebuild frontend, restart service.
- Stable Node/npm versions across machines.

## 1) Install and pin Node with Volta

Why Volta:

- Ensures the same Node/npm versions are used (prevents Angular and native addon issues like `better-sqlite3`).

Install Volta:

```powershell
winget install -e --id Volta.Volta
```

Install toolchain:

```powershell
volta install node@22.11.0 npm@11.6.2
volta list
```

PATH (Windows):

- Put `C:\Users\<user>\AppData\Local\Volta\bin` before `C:\Program Files\nodejs\`.
- Verify in a NEW terminal:

```bat
where node
node -v
where npm
npm -v
```

Expected: Node `v22.11.0`, npm `11.6.2`.

## 2) Clone repo on server

Choose a stable path (avoid spaces if possible; if not, always quote paths).

Example:

```powershell
git clone <repo-url>
```

## 3) Open firewall port (LAN)

Backend runs on port `3000` by default.

Run in elevated PowerShell (Admin):

```powershell
netsh advfirewall firewall add rule name="Correlativos Avales API (3000)" dir=in action=allow protocol=TCP localport=3000 profile=Private
```

## 4) Run as a Windows Service (NSSM)

Why NSSM:

- Auto-start on boot
- Easy restart and monitoring
- No need to keep a terminal window open

Install NSSM (Admin):

```powershell
choco install nssm -y
nssm --version
```

Create the service using the repo script:

- Script: `ops/windows/start-backend.ps1`

Commands (Admin):

```powershell
$service = "Correlativos-Avales"
$ps = "$env:WINDIR\System32\WindowsPowerShell\v1.0\powershell.exe"
$script = "<repo-root>\ops\windows\start-backend.ps1"

nssm install $service $ps "-NoProfile -ExecutionPolicy Bypass -File `"$script`""
nssm set $service Start SERVICE_AUTO_START
nssm start $service
Get-Service $service | Select-Object Name,Status,StartType
```

Check health:

- `http://localhost:3000/api/health`
- `http://<SERVER_IP>:3000/api/health`

## 5) Build frontend for deployment

The server exposes the Angular production build as static files.

```powershell
cd "<repo-root>\Correlativos Aval\frontend"
npm ci
npm run build
```

Then restart the service so the backend serves the latest build:

```powershell
Restart-Service Correlativos-Avales
```

## 6) Update flows (how changes become visible)

Key concept:

- `ng serve` is development-only.
- Deployed UI (`http://<SERVER_IP>:3000/`) uses `dist/` build.
- Therefore, frontend changes require `npm run build`.

Flow A: commit/push on the SERVER PC

- No `git pull` needed.
- Frontend change: `npm run build` then `Restart-Service`.
- Backend change: `Restart-Service`.

Flow B: push from DEV PC, then update SERVER PC

```powershell
cd <repo-root>
git pull
cd "Correlativos Aval\backend" && npm ci
cd "..\frontend" && npm ci && npm run build
Restart-Service Correlativos-Avales
```

Or use:

- `ops/windows/update-server.ps1`

## LAN IP notes

- Office clients use: `http://<SERVER_IP>:3000/`
- `192.168.x.x` is a private LAN range, so it will NOT load from mobile data/Internet.
- Reserve the server IP in the router (DHCP reservation) to avoid IP changes.
