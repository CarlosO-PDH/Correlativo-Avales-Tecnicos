# Changelog - Correlativo Avales Técnicos

Registro de cambios por versión. Formato: `[FECHA] | v[VERSION] | CAMBIO | AUTOR | IMPACTO`

## v1.0.0 (Baseline) - 2026-04-08

- **Estado**: Versión funcional completa
- **Descripción**: Aplicación web para generar y gestionar "avales" técnicos
- **Backend**: Node.js + Express + SQLite (better-sqlite3)
- **Frontend**: Angular 19 Standalone + Material Design + Vite
- **Features principales**:
  - CRUD de avales con correlativo automático (DTI|DSST|AVAL|NNNN)
  - Filtrado por fecha, solicitante, estado, correlativo
  - Anulación de avales con motivo
  - Import de datos desde hojas de cálculo
  - responsive design básico

---

## v2.0 (En Desarrollo)

### Fase 1: Autenticación + Docker + Documentación ✅ COMPLETADA
- [x] Tabla de usuarios con password_hash (bcrypt)
- [x] JWT Authentication (access token + refresh token)
- [x] Endpoints: POST /auth/login, POST /auth/refresh
- [x] CORS diferenciado por ENVIRONMENT
- [x] Dockerfiles para backend y frontend
- [x] docker-compose.yml para desarrollo local
- [x] Postman collection con 9 endpoints
- [x] Documentación: endpoints.md, conexion-db.md, arquitectura.md
- [x] Frontend environment configs (development/staging/production)

**Cambios Implementados (2025-02-13):**
- Usuarios table: id, email (UNIQUE), password_hash (bcrypt), rol (admin/usuario), activo, timestamps
- JWT tokens: accessToken (15m expiresIn), refreshToken (7d expiresIn)
- Auth middleware: authenticateToken(), requireAdmin() for route protection
- Backend endpoints: POST /auth/login, POST /auth/refresh
- Protected routes: GET/POST/PATCH /api/avales require JWT token + admin for write operations
- Environment configs: Development (CORS '*'), Staging (CORS localhost:*), Production (CORS domain-specific)
- Docker: Multi-stage builds for backend (Node Alpine) and frontend (Node + Nginx Alpine)
- Frontend: environment.ts, environment.staging.ts, environment.prod.ts + api.config.ts
- Postman Collection: Complete with auth flow, CRUD operations, variables (BASE_URL, tokens)

### Fase 2: Despliegue en Producción
- [ ] Oracle VM + Ubuntu 22.04 LTS
- [ ] Caddy en Docker como reverse proxy
- [ ] DuckDNS integration para dominio dinámico
- [ ] docker-compose.prod.yml
- [ ] SSL/TLS automático (Let's Encrypt)
- [ ] Script deploy.sh

### Fase 3: Cambios de Diseño
- [ ] Actualizar UI con Material updates
- [ ] Mejorar responsive design
- [ ] Optimizar queries SQLite
- [ ] Validaciones frontend mejoradas

### Fase 4: Bugs y Features
- [ ] Pendiente de definir con el cliente

---

## Plantilla para Nuevos Cambios

```
[FECHA] | v[VERSION] | [TIPO: Feature/Bug/Refactor/Docs] | [DESCRIPCION] | [AUTOR] | [IMPACTO: alto/medio/bajo]
```

### Tipos de Cambio:
- **Feature**: Nueva funcionalidad
- **Bug**: Corrección de error
- **Refactor**: Mejora de código sin cambio de funcionalidad
- **Docs**: Actualización de documentación
- **Chore**: Cambios de dependencias o configuración
