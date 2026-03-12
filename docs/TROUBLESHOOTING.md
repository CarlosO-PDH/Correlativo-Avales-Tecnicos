# Troubleshooting

## Angular says "Unsupported Node" / weird build errors

Cause: wrong Node version.

Fix:

- Use Volta and verify:
  - `node -v` (should be v22.x)
  - `npm -v`

## better-sqlite3 NODE_MODULE_VERSION mismatch

Cause: native module compiled for different Node version.

Fix:

- Ensure Node 22.
- Reinstall backend deps:

```powershell
cd "Correlativos Aval/backend"
rm -r node_modules  # or delete folder
npm ci
```

## Frontend changes not visible on http://<ip>:3000

Cause: deployed UI uses `dist/` build.

Fix:

- `npm run build` in frontend
- restart backend service

## Date filter stuck loading

Cause: UI datepicker returns a Date object; must convert to `YYYY-MM-DD`.

Fix: use `toYmd()` from `date-utils.ts`.

## Printing shows buttons/filters

Fix:

- Use `.no-print` and global print CSS (`styles.scss`).
