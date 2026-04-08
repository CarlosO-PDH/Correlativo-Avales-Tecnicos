# Conexión a Base de Datos - Correlativo Avales Técnicos

Guía completa para conectar y trabajar con la base de datos SQLite del proyecto.

---

## 🗄️ **Base de Datos Actual**

### Información General
- **Motor**: SQLite 3
- **Archivo**: `Correlativos Aval/database/avales.db`
- **Librería Node**: `better-sqlite3` (versión ^12.6.2)
- **Ubicación**: Almacenada en servidor (no en repositorio .git)

### Tablas

#### **1. `avales`** - Registro de avales técnicos

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| `id` | INTEGER | NO | PK, auto-increment |
| `fecha_registro` | TEXT | NO | Formato: YYYY-MM-DD |
| `correlativo` | TEXT | NO | UNIQUE, Formato: DTI\|DSST\|AVAL\|NNNN |
| `direccion_administrativa` | TEXT | NO | Ej: "Dirección de Tecnología" |
| `unidad_institucion` | TEXT | NO | Ej: "Unidad Central" |
| `nombre_solicitante` | TEXT | NO | Nombre del solicitante |
| `cargo` | TEXT | NO | Cargo del solicitante |
| `fecha_solicitud` | TEXT | YES | Formato: YYYY-MM-DD |
| `responsable` | TEXT | YES | Persona responsable |
| `memorando_solicitud` | TEXT | NO | Referencia del memorando |
| `estado` | TEXT | NO | ENUM: "ACTIVO", "ANULADO" |
| `motivo_anulacion` | TEXT | YES | Razón de anulación |
| `anulado_at` | TEXT | YES | Timestamp: YYYY-MM-DD HH:MM:SS |
| `created_at` | TEXT | NO | Default: CURRENT_TIMESTAMP |
| `updated_at` | TEXT | YES | Actualización manual |

#### **2. `secuencias`** - Control de correlativo

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| `nombre` | TEXT | NO | PK, Ej: "AVAL", "DTI", "DSST" |
| `ultimo_numero` | INTEGER | NO | Número correlativo actual |

#### **3. `usuarios`** - Nueva tabla (Fase 1)

| Columna | Tipo | Nullable | Descripción |
|---------|------|----------|-------------|
| `id` | INTEGER | NO | PK, auto-increment |
| `email` | TEXT | NO | UNIQUE, identificador del usuario |
| `password_hash` | TEXT | NO | bcrypt hash (no guardar plain password) |
| `rol` | TEXT | NO | ENUM: "admin", "usuario" |
| `activo` | INTEGER | NO | 1=activo, 0=inactivo |
| `created_at` | TEXT | NO | Default: CURRENT_TIMESTAMP |
| `updated_at` | TEXT | YES | Actualización manual |

---

## 🛠️ **Herramientas para Conectar**

### Opción 1: SQLite CLI (línea de comandos)

```bash
# Abrir DB en terminal
sqlite3 "Correlativos Aval/database/avales.db"

# Dentro de sqlite3:
# Ver todas las tablas
.tables

# Ver estructura de tabla
.schema avales

# Ejecutar query
SELECT * FROM avales LIMIT 5;

# Salir
.exit
```

### Opción 2: DB Browser for SQLite (GUI)

**Descarga**: https://sqlitebrowser.org/

Pasos:
1. Abre la aplicación
2. File → Open → `Correlativos Aval/database/avales.db`
3. Explora tablas, ejecuta queries en pestaña "Execute SQL"

### Opción 3: VS Code SQLite Extension

**Extensión**: "SQLite" por alexcvzz

1. Instala desde VS Code Extensions
2. Ctrl+Shift+P → "SQLite: Open Database"
3. Selecciona `avales.db`
4. Click derecho en tabla para ver datos

### Opción 4: Conectar desde Node.js (código)

```javascript
const Database = require('better-sqlite3');
const db = new Database('Correlativos Aval/database/avales.db');

// Query
const result = db.prepare('SELECT * FROM avales WHERE estado = ?').all('ACTIVO');
console.log(result);

db.close();
```

---

## 📝 **Scripts de Migración**

Los scripts SQL versionados están en: `scripts/sql/`

### Aplicar migraciones manualmente

```bash
# Con sqlite3 CLI
sqlite3 Correlativos Aval/database/avales.db < scripts/sql/00_init.sql
sqlite3 Correlativos Aval/database/avales.db < scripts/sql/01_usuarios.sql

# O crear un script Node que las aplique
node scripts/apply-migrations.js
```

---

## 🔑 **Credenciales y Seguridad**

### Producción
- **DB File Location**: `/var/lib/avales/avales.db` (en servidor Oracle)
- **Usuario**: No aplica (SQLite es local)
- **Permisos**: El usuario de `docker` debe tener acceso a lectura/escritura
- **Backups**: Replicar `avales.db` periodicamente a storage externo

### Desarrollo Local
- **DB File Location**: Proyecto local
- **Usuario**: El que ejecute `npm run dev`
- **Permisos**: Full access

---

## ⚡ **Queries Comunes**

### Ver todos los avales activos
```sql
SELECT id, correlativo, nombre_solicitante, fecha_registro
FROM avales
WHERE estado = 'ACTIVO'
ORDER BY fecha_registro DESC;
```

### Ver usuario por email (Fase 1+)
```sql
SELECT id, email, rol, activo
FROM usuarios
WHERE email = 'admin@example.com';
```

### Contar avales por dirección
```sql
SELECT direccion_administrativa, COUNT(*) as total
FROM avales
WHERE estado = 'ACTIVO'
GROUP BY direccion_administrativa;
```

### Ver next correlativo
```sql
SELECT ultimo_numero + 1 as next_correlative
FROM secuencias
WHERE nombre = 'AVAL';
```

---

## 🔧 **Inicializar DB desde cero**

Si necesitas reiniciar la DB:

```bash
# 1. Backup actual
cp Correlativos\ Aval/database/avales.db Correlativos\ Aval/database/avales.db.bak

# 2. Elimina archivo actual
rm Correlativos\ Aval/database/avales.db

# 3. Ejecuta migraciones
node Correlativos\ Aval/backend/src/db.js
# O manualmente:
sqlite3 Correlativos\ Aval/database/avales.db < scripts/sql/00_init.sql
sqlite3 Correlativos\ Aval/database/avales.db < scripts/sql/01_usuarios.sql
```

---

## 📊 **Troubleshooting**

| Problema | Causa | Solución |
|----------|-------|----------|
| "database is locked" | Múltiples conexiones simultáneas | Usar transacciones, aumentar timeout |
| "UNIQUE constraint failed" | Email/correlativo duplicado | Verificar datos antes de insert |
| "no such table" | Tabla no creada | Ejecutar migraciones SQL |
| Archivo DB corrupto | Interrupción durante write | Restaurar desde backup |

---

## 📚 **Referencias**

- SQLite Docs: https://www.sqlite.org/docs.html
- better-sqlite3: https://github.com/WiseLibs/better-sqlite3
- DB Browser: https://sqlitebrowser.org/
