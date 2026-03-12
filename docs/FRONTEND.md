# Frontend (Angular 19 + Material)

## Routes

- `/registro`: create/edit form
- `/historial`: filters + pagination + export + print

Routing config:

- `Correlativos Aval/frontend/src/app/app.routes.ts`

## API base URL

Frontend calls API using a relative path:

- `/api/avales`

This allows same-origin calls when deployed centrally.

See:

- `Correlativos Aval/frontend/src/app/avales.service.ts`

## Dates

Storage vs display:

- Backend/DB store dates as `YYYY-MM-DD`.
- UI displays dates as `dd/MM/yyyy` (Central America).

Utilities:

- `Correlativos Aval/frontend/src/app/date-utils.ts`

## Pagination

Historial uses server-side pagination:

- UI sends `limit/offset`.
- API returns `X-Total-Count`.

## Export Excel

In Historial:

- Export fetches ALL rows that match current filters, not only the visible page.
- It paginates internally in batches of 200.

## Printing

- Elements with `no-print` class are hidden during print.
- Global print CSS is in `Correlativos Aval/frontend/src/styles.scss`.
