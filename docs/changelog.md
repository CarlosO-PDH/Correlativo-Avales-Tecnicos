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

### Fase 1: Autenticación + Docker + Documentación
- [ ] Tabla de usuarios con password_hash (bcrypt)
- [ ] JWT Authentication (access token + refresh token)
- [ ] Endpoints: POST /auth/login, POST /auth/refresh
- [ ] CORS diferenciado por ENVIRONMENT
- [ ] Dockerfiles para backend y frontend
- [ ] docker-compose.yml para desarrollo local
- [ ] Postman collection con 9 endpoints
- [ ] Documentación: endpoints.md, conexion-db.md, arquitectura.md

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
