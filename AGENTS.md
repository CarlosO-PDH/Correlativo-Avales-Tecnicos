# AGENTS.md - Correlativos Avales Tecnicos

## Project Overview

A small office web app to generate and manage technical "avales" correlativos.

- **Backend**: Node.js (Express) + SQLite (better-sqlite3)
- **Frontend**: Angular 19 (standalone, Vite-based dev server)
- **Database**: SQLite file stored on server

---

## Runtime Requirements

- **Node**: `22.11.0`
- **npm**: `11.6.2`

Versions are pinned via Volta in each `package.json`. On Windows, ensure `C:\Users\<user>\AppData\Local\Volta\bin` is first in PATH.

---

## Build / Lint / Test Commands

### Backend (`Correlativos Aval/backend/`)

```bash
# Install dependencies
npm ci

# Development (with nodemon auto-reload)
npm run dev

# Start production server
npm start

# Import data from spreadsheet
npm run import:avales <file>
```

### Frontend (`Correlativos Aval/frontend/`)

```bash
# Install dependencies
npm ci

# Development server (http://localhost:4200)
npm start
# or: ng serve

# Production build
npm run build
# or: ng build

# Watch mode (development build with auto-reload)
npm run watch
# or: ng build --watch --configuration development

# Run all tests
npm test
# or: ng test

# Run a single test file
ng test --include="**/app.spec.ts"

# Run tests with coverage
ng test --coverage

# Run tests in watch mode (default behavior with ng test)
# Press 'a' to run all tests
# Press 'f' to run only failed tests
```

### Karma Single Test Options

Angular Karma supports these flags for single test execution:
- `--include="**/filename.spec.ts"` - Run specific test file
- `--browsers=Chrome` - Specify browser
- `--watch=false` - Run once and exit
- `--code-coverage=true` - Generate coverage report

---

## Code Style Guidelines

### General

- **Language**: Spanish comments and variable names are used in this codebase
- **No lint tool configured** - Follow existing code patterns manually
- **Always add comments to changes** - When modifying code, add a comment describing what was changed and why (e.g., `// CAMBIO: Ahora muestra modal en lugar de mensaje simple`)

### Backend (JavaScript/Express)

#### Imports
```javascript
// Use CommonJS require
const express = require("express");
const cors = require("cors");
const path = require("node:path");
const { db, initDatabase } = require("./db");
```

#### Error Handling
- Use try-catch blocks for database operations
- Return appropriate HTTP status codes:
  - `400` for bad request / validation errors
  - `404` for not found
  - `500` for server errors
- Include error message in response: `{ error: "description" }`

#### Database
- Use prepared statements with parameterized queries (no string concatenation)
- Use transactions (`db.transaction()`) for multi-step operations
- Validate input before database operations

#### Route Handlers
```javascript
// Validate ID parameters
const id = Number(req.params.id);
if (!Number.isInteger(id) || id <= 0) {
  return res.status(400).json({ error: "ID inválido" });
}
```

#### Naming
- `camelCase` for variables and functions
- `CONSTANT_CASE` for configuration constants
- `snake_case` for database columns

---

### Frontend (Angular 19)

#### File Structure
```
src/app/
├── app.ts              # Root component (shell)
├── app.routes.ts       # Route definitions
├── app.config.ts       # App configuration
├── app.spec.ts         # Root component tests
├── avales.service.ts   # API service
├── aval.model.ts       # TypeScript interfaces
├── date-utils.ts      # Date utilities
├── registro/          # Registration feature
└── historial/         # History feature
```

#### Component Structure
```typescript
import { Component, inject } from '@angular/core';
import { SomeModule } from '@angular/material/some';

@Component({
  selector: 'app-example',
  imports: [SomeModule, RouterOutlet],
  templateUrl: './example.html',
  styleUrl: './example.css'
})
export class Example {
  private readonly service = inject(SomeService);
}
```

#### Naming Conventions
- **Components**: `PascalCase` (e.g., `App`, `RegistroComponent`)
- **Services**: `PascalCase` ending in `Service` (e.g., `AvalesService`)
- **Files**: `kebab-case` (e.g., `avales.service.ts`, `app.spec.ts`)
- **Interfaces/Types**: `PascalCase` (e.g., `Aval`, `AvalFilters`)

#### Angular Best Practices
- Use `inject()` instead of constructor injection
- Use standalone components (no NgModules)
- Use Angular Material components
- Use signals or RxJS Observables for reactive state

#### HTTP/API
- Use relative URLs (`/api/avales`) for same-origin deployment
- Always type HTTP responses with interfaces
- Use `HttpClient` from `@angular/common/http`

#### Testing
```typescript
import { TestBed } from '@angular/core/testing';
import { SomeService } from './some.service';

describe('SomeService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SomeService]
    });
  });

  it('should be created', () => {
    const service = TestBed.inject(SomeService);
    expect(service).toBeTruthy();
  });
});
```

---

## Database Schema

Tables defined in `Correlativos Aval/database/schema.sql`:

### `avales`
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| fecha_registro | TEXT | YYYY-MM-DD |
| correlativo | TEXT | Unique (DTI\|DSST\|AVAL\|NNNN) |
| direccion_administrativa | TEXT | |
| unidad_institucion | TEXT | |
| nombre_solicitante | TEXT | |
| cargo | TEXT | |
| fecha_solicitud | TEXT | NULL, YYYY-MM-DD |
| responsable | TEXT | NULL |
| memorando_solicitud | TEXT | |
| estado | TEXT | ACTIVO or ANULADO |
| motivo_anulacion | TEXT | NULL |
| anulado_at | TEXT | NULL |
| created_at | TEXT | Default now |
| updated_at | TEXT | NULL |

### `secuencias`
| Column | Type | Notes |
|--------|------|-------|
| nombre | TEXT PK | e.g., "AVAL" |
| ultimo_numero | INTEGER | Current sequence value |

---

## API Endpoints

Base URL: `/api`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check |
| GET | /avales | List with optional filters |
| GET | /avales/:id | Get single aval |
| POST | /avales | Create new aval |
| PATCH | /avales/:id | Update fields |
| PATCH | /avales/:id/anular | Cancel aval |

Query params for `/avales`: `correlativo`, `solicitante`, `fecha`, `estado`, `limit`, `offset`

---

## Common Development Tasks

### Running both frontend and backend

Terminal 1 (backend):
```bash
cd "Correlativos Aval/backend"
npm run dev
```

Terminal 2 (frontend):
```bash
cd "Correlativos Aval/frontend"
npm start
```

### Making a production deployment

```bash
# Backend
cd "Correlativos Aval/backend"
npm ci

# Frontend
cd "Correlativos Aval/frontend"
npm ci
npm run build

# Restart backend service (Windows)
Restart-Service Correlativos-Avales
```

---

## Notes for AI Agents

- Always verify Node/npm versions match 22.11.0/11.6.2 before running commands
- Use relative API URLs in frontend code (works for centralized deployment)
- Database file is at `Correlativos Aval/database/avales.db`
- Frontend build output served by backend from `frontend/dist/correlativos-aval-web/browser`
- No ESLint or Prettier configured - follow existing code style
