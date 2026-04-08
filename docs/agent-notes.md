# Control-Avales-DSST (Correlativos Aval)

This repository contains a small office-only web app to generate and manage technical "avales" correlatives.

## Tech Stack

- Backend: Node.js (Express) + SQLite (better-sqlite3)
- Frontend: Angular 19 (standalone app, Vite-based dev server)
- DB: SQLite file stored on the server machine

## Runtime Versions (Important)

- Required Node: `22.11.0`
- Required npm: `11.6.2`

Versions are pinned via Volta in:

- `Correlativos Aval/backend/package.json`
- `Correlativos Aval/frontend/package.json`

On Windows, ensure `C:\Users\<user>\AppData\Local\Volta\bin` is first in PATH.

## Project Layout

- `Correlativos Aval/backend/`
  - `src/index.js`: Express REST API
  - `src/db.js`: SQLite connection + schema init + lightweight migrations
- `Correlativos Aval/frontend/`
  - `angular.json`: Angular workspace config
  - `src/main.ts`: bootstrap
  - `src/app/app.ts`: main UI (standalone component)
  - `src/app/avales.service.ts`: API client
  - `proxy.conf.json`: dev proxy (`/api` -> backend)
- `Correlativos Aval/database/`
  - `schema.sql`: base schema
  - `avales.db`: SQLite database file (runtime data)

## Database Standard (SQLite)

Schema source: `Correlativos Aval/database/schema.sql`

Tables:

1) `avales`

- `id` INTEGER PK AUTOINCREMENT
- `fecha_registro` TEXT NOT NULL (format expected: `YYYY-MM-DD`)
- `correlativo` TEXT NOT NULL UNIQUE (format: `DTI|DSST|AVAL|0001`)
- `direccion_administrativa` TEXT NOT NULL
- `unidad_institucion` TEXT NOT NULL
- `nombre_solicitante` TEXT NOT NULL
- `cargo` TEXT NOT NULL
- `fecha_solicitud` TEXT NULL (format: `YYYY-MM-DD`)
- `responsable` TEXT NULL
- `memorando_solicitud` TEXT NOT NULL
- `estado` TEXT NOT NULL DEFAULT `ACTIVO` (values: `ACTIVO` | `ANULADO`)
- `motivo_anulacion` TEXT NULL
- `anulado_at` TEXT NULL (datetime string)
- `created_at` TEXT NOT NULL DEFAULT `datetime('now','localtime')`
- `updated_at` TEXT NULL

2) `secuencias`

- `nombre` TEXT PK (current usage: `AVAL`)
- `ultimo_numero` INTEGER NOT NULL

Migrations:

- Implemented in `Correlativos Aval/backend/src/db.js` by checking columns with `PRAGMA table_info` and adding missing columns.

## Data Import (From Office Spreadsheet)

When you need to wipe and re-seed the database from an exported spreadsheet (CSV/TSV):

- Script: `Correlativos Aval/backend/scripts/reset-and-import-avales.js`
- NPM entry: `npm run import:avales <file>` (run inside `Correlativos Aval/backend`)

What it does:

- Ensures schema/migrations are applied
- Deletes all rows from `avales`
- Resets `avales` autoincrement
- Imports rows from the file
- Sets `secuencias.ultimo_numero` to the highest correlativo imported

Column mapping (spreadsheet -> DB):

- `Fecha` -> `fecha_registro`
- `Fecha de Solicitud` -> `fecha_solicitud`
- `Dirección` -> `direccion_administrativa`
- `Unidad Administrativa` -> `unidad_institucion`
- `Solicitante` -> `nombre_solicitante`
- `Cargo` -> `cargo`
- `Responsable` -> `responsable`
- `Memorando de Solicitud` -> `memorando_solicitud`
- `Correlativo Aval` -> `correlativo`

Notes:

- Locale exports often use semicolon `;` as delimiter; the script auto-detects it.
- Some exports include title rows and placeholder empty rows; the script skips those.

Recommended safety:

- Stop the Windows service before import (avoid file locks).
- Backup `Correlativos Aval/database/avales.db` before import.

## Backend API (Express)

Entry: `Correlativos Aval/backend/src/index.js`

- Default bind: `HOST=0.0.0.0`, `PORT=3000`
- Health: `GET /api/health`
- Avales:
  - `GET /api/avales` (filters: `correlativo`, `solicitante`, `fecha`, `estado`)
  - `GET /api/avales/:id`
  - `POST /api/avales` (creates; correlativo is auto-generated)
  - `PATCH /api/avales/:id` (edits only allowed fields)
  - `PATCH /api/avales/:id/anular` (body `{ motivo }`)

Correlativo generation:

- Uses a transaction that increments `secuencias.ultimo_numero` for `AVAL` and builds `DTI|DSST|AVAL|{NNNN}`.

## Frontend (Angular)

Dev proxy:

- `Correlativos Aval/frontend/proxy.conf.json` proxies `/api` to `http://localhost:3000`.
- Frontend code should call the API using relative URLs (same-origin) like `/api/avales`.

Main UI:

- `Correlativos Aval/frontend/src/app/app.ts` contains the form + list + actions.

## Local Development

Backend:

- `cd "Correlativos Aval/backend"`
- `npm ci`
- `npm run dev`

Frontend:

- `cd "Correlativos Aval/frontend"`
- `npm ci`
- `npm start`

## Office LAN Deployment (Centralized)

- Run backend + SQLite ONLY on the server PC.
- Clients must never open the SQLite file directly over a file share.
- Expose backend on LAN and open inbound firewall port `3000` on the server.
- Serve the frontend as a static build (recommended) from the same host so the API stays same-origin.

### LAN IP and Port Notes

- The server PC will have a LAN IPv4 address assigned by the router/DHCP (example from this setup: `192.168.200.48`).
- Other PCs in the same network can reach services running on the server by using `http://<SERVER_IP>:<PORT>/...`.
- In this project the backend API listens on port `3000` by default, so health check is:
  - `http://192.168.200.48:3000/api/health`
- If the server IP changes, clients must use the new IP. To avoid that, reserve the IP in the router (DHCP reservation) or set a static IP.
- The port must be allowed inbound in Windows Firewall for the Private/Domain profile.

## Update Process (Simple)

On the server PC:

1) `git pull`
2) `npm ci` in `backend/`
3) `npm ci` in `frontend/`
4) `npm run build` in `frontend/`
5) restart backend service

## Update Flows (How changes become visible)

The deployed UI at `http://<SERVER_IP>:3000/` is the Angular production build served from:

- `Correlativos Aval/frontend/dist/correlativos-aval-web/browser`

So:

- `git pull` only updates source code.
- You must run `npm run build` (frontend) to regenerate `dist/`.
- Restart the backend service to pick up backend changes and/or start serving the newest `dist/`.

### Flow A: You committed and pushed on the SERVER PC

No `git pull` is needed because your working copy already has the new code.

1) If backend code changed:

- `cd "Correlativos Aval/backend"`
- `npm ci` (only if dependencies changed)
- `Restart-Service Correlativos-Avales`

2) If frontend code changed:

- `cd "Correlativos Aval/frontend"`
- `npm ci` (only if dependencies changed)
- `npm run build`
- `Restart-Service Correlativos-Avales`

Fast-path (recommended):

- Run `ops/windows/update-server.ps1` but skip `git pull` mentally (it will still work even if already up to date).

### Flow B: You pushed from a DEV PC, then update the SERVER PC

1) On server, fetch latest code:

- `cd <repo root>`
- `git pull`

2) Reinstall deps as needed:

- `npm ci` in backend (if `backend/package-lock.json` changed)
- `npm ci` in frontend (if `frontend/package-lock.json` changed)

3) Rebuild frontend (if frontend source changed):

- `npm run build` in `Correlativos Aval/frontend`

4) Restart the service:

- `Restart-Service Correlativos-Avales`

Fast-path (recommended):

- Run: `ops/windows/update-server.ps1 -ServiceName "Correlativos-Avales"`

## Windows Service (Recommended)

Use NSSM to run the backend as a Windows service.

### What is NSSM and why

- NSSM (Non-Sucking Service Manager) wraps a normal command (Node/PowerShell/etc.) and runs it as a Windows Service.
- Benefits vs leaving a terminal open:
  - Auto-start on boot
  - Easy start/stop/restart via Services / `Start-Service` / `Restart-Service`
  - Can be configured to restart on failures
  - Can write stdout/stderr to log files

### When to run PowerShell as Administrator

You typically need an elevated (Admin) PowerShell for:

- Installing tools via Chocolatey (`choco install ...`)
- Creating firewall rules
- Creating/updating/restarting Windows Services

Running the backend manually (`npm start`) does not require Admin.

### Install NSSM (one-time)

In an elevated PowerShell:

- `choco install nssm -y`

Verify:

- `nssm --version`

### Create the service

There are two ways:

1) Interactive UI:

- `nssm install Correlativos-Avales`
- Configure:
  - Path: `powershell.exe`
  - Startup directory: repo root
  - Arguments: `-NoProfile -ExecutionPolicy Bypass -File "...\ops\windows\start-backend.ps1"`

2) Commands (recommended):

Run these lines in an elevated PowerShell (working directory does not matter because absolute paths are used):

```powershell
$service = 'Correlativos-Avales'
$ps = "$env:WINDIR\System32\WindowsPowerShell\v1.0\powershell.exe"
$script = 'D:\Carlos Orozco DTI\Documents\Control-Avales-DSST\ops\windows\start-backend.ps1'

nssm install $service $ps "-NoProfile -ExecutionPolicy Bypass -File `"$script`""
nssm set $service Start SERVICE_AUTO_START
nssm start $service
Get-Service $service | Select-Object Name,Status,StartType
```

### What the start script does

`ops/windows/start-backend.ps1`:

- `cd` to `Correlativos Aval/backend`
- Starts the backend using Volta pinned Node/npm
- Ensures LAN binding via `HOST=0.0.0.0` and default `PORT=3000`

- Service command: `C:\Program Files\Volta\volta.exe`
- Arguments: `run --node 22.11.0 --npm 11.6.2 npm start`
- Startup directory: `...\Correlativos Aval\backend`
- Environment: `HOST=0.0.0.0`, `PORT=3000`

Helper scripts (repo):

- `ops/windows/start-backend.ps1`
- `ops/windows/build-frontend.ps1`
- `ops/windows/update-server.ps1`
