# Session Log (2026-02-14)

High-level:

- Migrated and stabilized dependencies on Windows.
- Introduced Volta-pinned Node/npm.
- Deployed to a Windows LAN server with Express + SQLite.
- Split UI into Registro/Historial with server-side paging.
- Added import script to reseed DB from office CSV.
- Applied Angular Material + printing + CA date formatting.

Key decisions:

- Single-server deployment (backend serves Angular dist).
- SQLite stored locally on the server (never opened by clients).
- Same-origin API (`/api/...`) for easier LAN deployment.

Operational commands used:

- Frontend build:
  - `cd "Correlativos Aval/frontend" && npm run build`
- Backend service restart:
  - `Restart-Service Correlativos-Avales`
- DB import:
  - `cd "Correlativos Aval/backend" && npm run import:avales <csv>`

Notable fixes:

- Node version mismatch broke Angular and `better-sqlite3`.
- Date filtering required converting Date -> `YYYY-MM-DD`.
- Export needed to fetch all pages, not only visible rows.
