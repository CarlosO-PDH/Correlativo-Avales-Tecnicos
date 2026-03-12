# Database Layer (SQLite)

## Files

- Schema: `Correlativos Aval/database/schema.sql`
- DB file: `Correlativos Aval/database/avales.db`
- Init + migrations: `Correlativos Aval/backend/src/db.js`

## Tables

### `avales`

Core record with correlativo generation on backend.

- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `fecha_registro` TEXT NOT NULL (stored as `YYYY-MM-DD`)
- `fecha_solicitud` TEXT NULL (stored as `YYYY-MM-DD`)
- `correlativo` TEXT NOT NULL UNIQUE (format: `DTI|DSST|AVAL|0001`)
- `direccion_administrativa` TEXT NOT NULL (Direccion / raiz)
- `unidad_institucion` TEXT NOT NULL (Unidad Administrativa / rama)
- `nombre_solicitante` TEXT NOT NULL
- `cargo` TEXT NOT NULL
- `responsable` TEXT NULL
- `memorando_solicitud` TEXT NOT NULL
- `estado` TEXT NOT NULL DEFAULT `ACTIVO` (`ACTIVO` | `ANULADO`)
- `motivo_anulacion` TEXT NULL
- `anulado_at` TEXT NULL
- `created_at` TEXT NOT NULL DEFAULT `datetime('now','localtime')`
- `updated_at` TEXT NULL

### `secuencias`

- `nombre` TEXT PRIMARY KEY (current: `AVAL`)
- `ultimo_numero` INTEGER NOT NULL

Used to generate the next correlativo.

## Migrations

Migrations are lightweight and performed at startup:

- `PRAGMA table_info(...)` is used to check missing columns.
- Missing columns are added via `ALTER TABLE ... ADD COLUMN ...`.

See: `Correlativos Aval/backend/src/db.js`.

## Import / Reseed (from office CSV)

Script:

- `Correlativos Aval/backend/scripts/reset-and-import-avales.js`

Command:

```powershell
cd "Correlativos Aval\backend"
npm run import:avales "D:\path\to\avales.csv"
```

What it does:

- Applies schema + migrations
- Deletes all rows from `avales`
- Resets AUTOINCREMENT
- Imports rows from CSV/TSV (auto-detect delimiter; supports `;`)
- Sets `secuencias.ultimo_numero` to the highest imported correlativo

Safety checklist:

- Stop service before import (prevents file locks)
- Backup `avales.db`

## Backup

Recommended:

- Daily copy of `Correlativos Aval/database/avales.db` with timestamp
- Store backups on another disk/network location if possible
