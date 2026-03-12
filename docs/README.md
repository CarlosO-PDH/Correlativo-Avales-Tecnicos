# Control-Avales-DSST (Correlativos Aval)

This repo is an office-only web app to register, search, and manage "Avales Tecnicos" with an auto-generated correlativo.

The solution is intentionally simple:

- One Windows PC acts as the internal server.
- One SQLite database file is stored locally on that server.
- Users access the app from the LAN via a browser.

## Architecture (3 Layers)

1) Database (SQLite)

- File: `Correlativos Aval/database/avales.db`
- Schema: `Correlativos Aval/database/schema.sql`
- Migrations: `Correlativos Aval/backend/src/db.js`

2) Backend (Node.js + Express)

- Source: `Correlativos Aval/backend/src/index.js`
- DB access: `Correlativos Aval/backend/src/db.js`
- Listens on: `HOST=0.0.0.0`, `PORT=3000`
- Serves:
  - REST API under `/api/*`
  - Angular production build as static files (same server)

3) Frontend (Angular 19 + Angular Material)

- Source: `Correlativos Aval/frontend/src/*`
- Built output served by backend from:
  - `Correlativos Aval/frontend/dist/correlativos-aval-web/browser`
- Routes:
  - `/registro` (create/edit)
  - `/historial` (filters + pagination + export)

## Server Flow (LAN)

ASCII overview:

```text
Browser (LAN clients)
   |
   | http://<SERVER_IP>:3000/
   v
Windows Server PC
  Express (Node)
   |- GET /             -> serves Angular dist (static)
   |- /api/*            -> JSON API
   '- SQLite file       -> Correlativos Aval/database/avales.db
```

Important:

- The SQLite file must be accessed ONLY by the backend on the server.
- Clients should never open the `.db` over a file share.

Next docs:

- `docs/SETUP_WINDOWS_SERVER.md`
- `docs/DATABASE.md`
- `docs/API.md`
- `docs/FRONTEND.md`
- `docs/DEV_GUIDE.md`
- `docs/TROUBLESHOOTING.md`
