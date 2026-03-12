# Backend API (Express)

Base URL:

- `http://<SERVER_IP>:3000/api`

## Health

- `GET /api/health` -> `{ ok: true }`

## Avales

### List with filters (+ pagination)

`GET /api/avales`

Query params:

- `correlativo` (partial match)
- `solicitante` (partial match)
- `fecha` (`YYYY-MM-DD` exact match against `fecha_registro`)
- `estado` (`ACTIVO` | `ANULADO`)
- `limit` (optional; enables paging)
- `offset` (optional)

Pagination:

- When `limit` is provided, API uses `LIMIT ? OFFSET ?`.
- Total results are returned in header:
  - `X-Total-Count: <number>`

### Get by id

- `GET /api/avales/:id`

### Create

- `POST /api/avales`

Body (JSON):

```json
{
  "fecha_registro": "YYYY-MM-DD",
  "fecha_solicitud": "YYYY-MM-DD",
  "direccion_administrativa": "...",
  "unidad_institucion": "...",
  "nombre_solicitante": "...",
  "cargo": "...",
  "responsable": "...",
  "memorando_solicitud": "..."
}
```

Backend generates:

- `correlativo = DTI|DSST|AVAL|NNNN` inside a DB transaction.

### Update

- `PATCH /api/avales/:id`

Edits only allowed fields (correlativo is immutable).

### Cancel/Anular

- `PATCH /api/avales/:id/anular`

Body:

```json
{ "motivo": "..." }
```

Sets:

- `estado = ANULADO`
- `motivo_anulacion`
- `anulado_at`
