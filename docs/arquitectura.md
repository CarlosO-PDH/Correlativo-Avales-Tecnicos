# Arquitectura - Correlativo Avales Técnicos

Diagrama y descripción de la arquitectura del proyecto.

---

## 🏗️ **Diagrama General**

```
┌─────────────────────────────────────────────────────────────────┐
│                         USUARIO FINAL                            │
└────────────────────────┬────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
    ┌───▼────┐       ┌───▼────┐      ┌───▼─────┐
    │ Browser│       │ Mobile │      │ Postman │
    └───┬────┘       └───┬────┘      └───┬─────┘
        │                │                │
        └────────────────┼────────────────┘
                         │ HTTP/HTTPS
        ┌────────────────▼────────────────┐
        │     CADDY (Reverse Proxy)       │  ← Fase 2 (Producción)
        │  - SSL/TLS (Let's Encrypt)      │
        │  - DuckDNS Domain               │
        └────────────────┬────────────────┘
                         │
        ┌────────────────▼────────────────┐
        │   FRONTEND (Angular 19)         │
        │  - Standalone Components        │
        │  - Material Design              │
        │  - Environment configs          │
        └────────────────┬────────────────┘
                         │ /api/*
        ┌────────────────▼─────────────────┐
        │   BACKEND (Node.js + Express)    │
        │  - REST API endpoints            │
        │  - JWT Authentication            │
        │  - Business Logic                │
        └────────────┬──────────────────────┘
                     │
        ┌────────────▼──────────────────┐
        │  DATABASE (SQLite)            │
        │  - avales (records)           │
        │  - usuarios (auth - v2.0)     │
        │  - secuencias (sequences)     │
        └───────────────────────────────┘
```

---

## 📐 **Stack Tecnológico**

### Backend
```
Node.js 22.11.0 (Volta-managed)
├── Express 5.2.1 (HTTP Server)
├── better-sqlite3 12.6.2 (Database Driver)
├── jsonwebtoken (JWT Auth - Fase 1)
├── bcrypt (Password Hashing - Fase 1)
├── cors (Cross-Origin Requests)
└── dotenv (Environment Variables)
```

### Frontend
```
Angular 19.2.18 (Standalone)
├── Material 19.2.18 (UI Components)
├── TypeScript 5.8.0 (Language)
├── RxJS (Reactive Programming)
├── HttpClient (API Calls)
└── Vite (Dev Server - not webpack)
```

### Database
```
SQLite 3
├── avales (Technical endorsements)
├── secuencias (Auto-increment sequences)
└── usuarios (Users + Auth - Fase 1)
```

### DevOps (Fase 1+)
```
Docker
├── Dockerfile (Backend - Node)
├── Dockerfile (Frontend - Nginx)
└── docker-compose.yml (Orchestration)

Caddy (Fase 2)
├── Reverse Proxy
├── SSL/TLS Management
└── DuckDNS Integration
```

---

## 🔄 **Flujo de Datos**

### 1. Request desde Frontend
```
User Action
    ↓
Angular Component
    ↓
AvalesService (HttpClient)
    ↓
API Call: GET /api/avales?correlativo=DTI-001
    ↓
(with Bearer Token in header if authenticated)
```

### 2. Backend Processing
```
Express Route Handler
    ↓
JWT Middleware (valida token)
    ↓
Business Logic
    ↓
SQLite Query (prepared statement)
    ↓
Response (JSON)
```

### 3. Response a Frontend
```
JSON Response
    ↓
AvalesService (Observable)
    ↓
Component (subscribes)
    ↓
Update View (template binding)
```

---

## 📁 **Estructura de Carpetas**

```
Correlativo-Avales-Tecnicos/
│
├── Correlativos Aval/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── index.js (Express config)
│   │   │   ├── db.js (Database initialization)
│   │   │   ├── auth.js (JWT middleware - v2.0)
│   │   │   ├── auth-routes.js (Login endpoints - v2.0)
│   │   │   └── env-config.js (Environment detection - v2.0)
│   │   ├── package.json (Dependencies)
│   │   └── .env.* (Environment files)
│   │
│   ├── frontend/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── app.ts (Root component)
│   │   │   │   ├── app.routes.ts (Routing)
│   │   │   │   ├── avales.service.ts (API calls)
│   │   │   │   ├── api.config.ts (API config - v2.0)
│   │   │   │   ├── environments/
│   │   │   │   │   ├── environment.ts (dev)
│   │   │   │   │   ├── environment.staging.ts (pre - v2.0)
│   │   │   │   │   └── environment.prod.ts (prod - v2.0)
│   │   │   │   ├── registro/
│   │   │   │   └── historial/
│   │   │   └── main.ts (Bootstrap)
│   │   ├── package.json
│   │   └── angular.json
│   │
│   ├── database/
│   │   ├── avales.db (SQLite file)
│   │   └── schema.sql (Schema definition)
│   │
│   ├── Dockerfile.backend (v2.0)
│   └── Dockerfile.frontend (v2.0)
│
├── docs/
│   ├── changelog.md (Version history)
│   ├── problemas.md (Issue tracker)
│   ├── conexion-db.md (DB Connection Guide)
│   ├── endpoints.md (API Reference)
│   └── arquitectura.md (This file)
│
├── scripts/
│   └── sql/
│       ├── 00_init.sql (Initial schema)
│       ├── 01_usuarios.sql (Users table - v2.0)
│       └── CHANGELOG.sql.md (SQL migrations tracking)
│
├── docker-compose.yml (Local dev)
├── docker-compose.prod.yml (Production - Fase 2)
├── .dockerignore
├── .gitignore
│
├── caddy/
│   └── Caddyfile (Reverse proxy config - Fase 2)
│
├── ops/
│   ├── windows/
│   │   ├── start-backend.ps1 (v1.0.0 - Legacy)
│   │   └── update-server.ps1 (v1.0.0 - Legacy)
│   └── deploy.sh (Linux deployment - Fase 2)
│
└── README.md
```

---

## 🔐 **Seguridad**

### Autenticación (Fase 1+)
```
User enters email + password
    ↓
POST /auth/login
    ↓
Backend: bcrypt.verify(password, stored_hash)
    ↓
If valid: Generate JWT tokens
    - accessToken (15-30 min expiry)
    - refreshToken (7 days expiry, stored in DB)
    ↓
Response to frontend
    ↓
Frontend: Store tokens in localStorage/sessionStorage
    ↓
All subsequent requests: Bearer token in header
    ↓
Backend: JWT middleware validates token
    ↓
Continue or reject request
```

### CORS por Entorno
```
Development:
  - CORS: * (allow all origins)
  - Logs: verbose

Staging:
  - CORS: localhost:* (local testing)
  - Logs: normal

Production:
  - CORS: https://yourdomain.duckdns.org only
  - Logs: minimal (errors only)
```

### Database
```
- SQLite: Local file storage (no network exposure)
- Foreign Keys: ON (referential integrity)
- Transactions: Used for multi-step operations
- Prepared Statements: All queries use params (no SQL injection)
```

---

## 🚀 **Deployment Environments**

### Rama: `desa` (Development)
- Backend: `npm run dev` (nodemon auto-reload)
- Frontend: `ng serve` (Vite dev server, hot reload)
- Port: 3000 (backend), 4200 (frontend)
- ENVIRONMENT: development
- CORS: Permissive
- Logs: Verbose

### Rama: `pre` (Staging)
- Backend: `docker-compose up`
- Frontend: served by backend
- Port: 3000
- ENVIRONMENT: staging
- CORS: Local only
- Logs: Normal
- Testing: Manual QA

### Rama: `pro` (Production)
- Backend: Docker (Caddy + Backend + Frontend)
- Port: 80/443 (Caddy)
- ENVIRONMENT: production
- CORS: Domain-specific
- Logs: Minimal (errors only)
- Hosting: Oracle Cloud Free Tier
- Domain: DuckDNS (dynamic)
- SSL: Let's Encrypt (auto-renewal via Caddy)

---

## 📊 **Database Relationships**

```
┌──────────────┐
│   usuarios   │  (NEW - v2.0)
├──────────────┤
│ id (PK)      │
│ email        │
│ password_hash│
│ rol          │
│ activo       │
└──────────────┘
       │
       │ FK (user_id - future)
       ▼
┌──────────────┐
│    avales    │
├──────────────┤
│ id (PK)      │
│ correlativo  │
│ estado       │
│ created_at   │
│ updated_at   │
└──────────────┘
       │
       │ references
       ▼
┌──────────────┐
│ secuencias   │
├──────────────┤
│ nombre (PK)  │
│ ultimo_num   │
└──────────────┘
```

---

## 🔧 **Configuration Management**

### Environment Variables (per branch)

**Development (.env)**
```
ENVIRONMENT=development
NODE_ENV=development
PORT=3000
JWT_SECRET=dev-secret-change-in-production
BCRYPT_ROUNDS=10
DB_PATH=./database/avales.db
CORS_ORIGIN=*
LOG_LEVEL=verbose
```

**Staging (.env.pre)**
```
ENVIRONMENT=staging
NODE_ENV=staging
PORT=3000
JWT_SECRET=staging-secret-128-chars-min
BCRYPT_ROUNDS=12
DB_PATH=/data/avales.db
CORS_ORIGIN=http://localhost:*
LOG_LEVEL=normal
```

**Production (.env.pro)**
```
ENVIRONMENT=production
NODE_ENV=production
PORT=3000
JWT_SECRET=STRONG-RANDOM-GENERATED-SECRET-256-BIT
BCRYPT_ROUNDS=12
DB_PATH=/data/avales.db
CORS_ORIGIN=https://yourdomain.duckdns.org
LOG_LEVEL=error
```

---

## 📋 **Versioning Strategy**

- **Major**: Breaking changes (architecture shifts)
- **Minor**: New features (endpoints, tables)
- **Patch**: Bug fixes, documentation

Current: v1.0.0 (Baseline Milestone)  
Next: v2.0.0 (AUTH + Docker + Production-ready)

---

## 🔗 **Relacionados**

- [changelog.md](./changelog.md) - Version history
- [conexion-db.md](./conexion-db.md) - Database connection guide
- [endpoints.md](./endpoints.md) - API Reference
- [problemas.md](./problemas.md) - Issue tracking
