# Changelog de Migraciones SQL - Correlativo Avales Técnicos

Registro de todos los cambios en el schema de la base de datos SQLite. Usado para auditoría y reproducción de estado en diferentes ambientes.

---

## Schema Migration Tracking

| Script | Versión | Fecha | Descripción | Ejecutado en | Estado |
|--------|---------|-------|-------------|--------------|--------|
| 00_init.sql | 1.0.0 | 2026-04-08 | Schema inicial: avales, secuencias | desarrollo | ✅ |
| 01_usuarios.sql | 2.0 (Fase 1) | 2026-04-08 | Tabla usuarios + password_hash | pending | ⏳ |
| (futuro) | 2.0 (Fase 1) | TBD | Tabla refresh_tokens (opcional) | pending | ⏳ |
| (futuro) | 2.1 | TBD | Auditoría logs | pending | ⏳ |

---

## v1.0.0 - Baseline (2026-04-08)

### Script: `00_init.sql`

**Cambios:**
- ✅ CREATE TABLE `avales` con campos completos
- ✅ CREATE TABLE `secuencias` para control de correlativo
- ✅ Índices optimizados para queries comunes
- ✅ PRAGMA foreign_keys = ON

**Tablas Creadas:**
1. `avales` (13 columnas)
   - PK: id (auto-increment)
   - UNIQUE: correlativo
   - CHECK: estado IN ('ACTIVO', 'ANULADO')

2. `secuencias` (2 columnas)
   - PK: nombre (DTI, DSST, AVAL)
   - Initial values: 0 for each

**Índices:**
- idx_avales_estado
- idx_avales_correlativo
- idx_avales_fecha_registro
- idx_avales_nombre_solicitante

**Ejecutado por:** Automated during first run  
**Ambiente:** Todos (dev, staging, prod)

---

## v2.0 - Fase 1 (Pending - 2026-04-08)

### Script: `01_usuarios.sql`

**Cambios:**
- 🔄 CREATE TABLE `usuarios` con autenticación
- 🔄 Campos: id, email, password_hash, rol, activo, timestamps
- 🔄 Índices para email y activo
- 🔄 Row-level security via rol (admin/usuario)

**Tablas Creadas:**
1. `usuarios` (7 columnas)
   - PK: id (auto-increment)
   - UNIQUE: email
   - CHECK: rol IN ('admin', 'usuario')
   - FK: (future) a autres tables

2. `refresh_tokens` (COMMENTED - optional)
   - For token revocation feature
   - Uncomment when implementing logout

**Índices:**
- idx_usuarios_email
- idx_usuarios_activo

**Estado:** Pending (await JWT implementation)  
**Ejecutado por:** Manual / CI-CD during Fase 1  
**Ambiente:** Todos (dev, staging, prod)

**Bloqueadores:**
- JWT authentication endpoints (backend/src/auth.js)
- Bcrypt password hashing (npm package)
- Initial admin user seeding

---

## Procedimiento para Aplicar Migraciones

### Opción 1: SQLite CLI

```bash
# Aplicar schema inicial (v1.0.0)
sqlite3 "Correlativos Aval/database/avales.db" < "scripts/sql/00_init.sql"

# Aplicar usuarios (v2.0 - cuando esté listo)
sqlite3 "Correlativos Aval/database/avales.db" < "scripts/sql/01_usuarios.sql"
```

### Opción 2: Node.js Script (Future)

```bash
# Script automático aplicaría todas las migraciones de forma ordenada
node scripts/apply-migrations.js
```

### Opción 3: Docker

```bash
# En docker-compose, los scripts se aplican al primer run
docker-compose up --build
```

---

## Rollback Procedure

Si necesitas revertir cambios:

```bash
# 1. Backup actual
cp Correlativos\ Aval/database/avales.db Correlativos\ Aval/database/avales.db.backup-$(date +%s)

# 2. Restaurar desde backup anterior
sqlite3 Correlativos\ Aval/database/avales.db < /ruta/al/backup.sql

# 3. Aplicar migraciones de nuevo (si aplica)
```

---

## Validación de State

Después de cada migración, verificar:

```bash
sqlite3 "Correlativos Aval/database/avales.db"

# Dentro de sqlite3:
.tables                    # Ver todas las tablas
.schema avales             # Ver estructura de avales
.schema usuarios           # Ver estructura de usuarios (Fase 1)
SELECT COUNT(*) FROM avales;  # Verificar que tabla está vacía (a menos que tengas data)
```

---

## Notas de Seguridad

1. **password_hash**: Siempre usar bcrypt (rounds ≥ 10)
   - NUNCA guardar passwords en plain text
   - Validar hash en backend antes de almacenar

2. **Transacciones**: Usar para operaciones multi-tabla
   ```sql
   BEGIN TRANSACTION;
   INSERT INTO usuarios ...;
   INSERT INTO audit_log ...;
   COMMIT;
   ```

3. **Auditoría**: Futuro table `audit_logs` para tracking de cambios

4. **Backups**: Weekly backups a storage externo (fase 2+)

---

## Versioning Rules

- **Major.Minor**: Cambio de schema (new tables/columns)
- **Patch**: Índices, constraints, data fixes

Ejemplo:
- v1.0.0 → Initial schema
- v1.1.0 → Add new column (backward compatible)
- v2.0.0 → Breaking changes (new table, restructure)

---

## Links Relacionados

- [00_init.sql](./00_init.sql) - Initial schema
- [01_usuarios.sql](./01_usuarios.sql) - Users table (v2.0)
- [conexion-db.md](../docs/conexion-db.md) - Connection guide
- [changelog.md](../docs/changelog.md) - Application version history
