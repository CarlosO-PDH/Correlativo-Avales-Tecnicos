# Dev Guide (Local Development)

## Prereqs

- Node 22.11.0 + npm 11.6.2 (Volta recommended)

## Backend

```powershell
cd "Correlativos Aval/backend"
npm ci
npm run dev
```

Health:

- `http://localhost:3000/api/health`

## Frontend

Dev server:

```powershell
cd "Correlativos Aval/frontend"
npm ci
npm start
```

Dev proxy:

- `Correlativos Aval/frontend/proxy.conf.json` proxies `/api` -> `http://localhost:3000`

## Production build

```powershell
cd "Correlativos Aval/frontend"
npm run build
```

Backend serves the build from:

- `Correlativos Aval/frontend/dist/correlativos-aval-web/browser`

## Common scripts

- Import/reseed DB:
  - `cd "Correlativos Aval/backend"`
  - `npm run import:avales <csv>`
