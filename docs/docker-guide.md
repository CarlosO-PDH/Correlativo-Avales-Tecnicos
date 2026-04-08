# Docker Setup Guide - Correlativos Avales Técnicos

Guía completa para construir, ejecutar y testear la aplicación con Docker Compose.

---

## 📋 Requisitos Previos

- **Docker**: >= 20.10 ([instalar](https://docs.docker.com/install/))
- **Docker Compose**: >= 2.0 ([instalar](https://docs.docker.com/compose/install/))
- **Node.js**: 22.11.0 (para desarrollo local sin Docker)

### Verificar instalación

```bash
docker --version
docker-compose --version
```

---

## 🚀 Arrancar la Aplicación Completa

### Opción 1: Inicial - Build desde cero

```bash
cd "/home/ceorozcom/Documents/Proyecto-Avales-Tecnicos/Correlativo-Avales-Tecnicos"

# Build de imágenes y arrancar servicios
docker-compose up --build

# Output esperado:
# backend    | 🎯 Servidor escuchando en puerto 3000
# frontend   | nginx: master process started
```

**CTRL+C** para detener servicios.

### Opción 2: Rápida - Sin rebuild (si ya existen imágenes)

```bash
docker-compose up

# Solo inicia servicios, no rebuilds
```

### Opción 3: Background mode (sin logs en terminal)

```bash
docker-compose up -d

# Los servicios corren en background
docker-compose logs -f    # Ver logs en tiempo real
docker-compose logs -f backend  # Solo logs del backend
```

---

## 🔌 Acceder a la Aplicación

Después de ejecutar `docker-compose up`, accede a:

| Servicio | URL | Puerto |
|----------|-----|--------|
| **Frontend** | http://localhost | 80 |
| **Backend API** | http://localhost:3000/api | 3000 |
| **Health Check** | http://localhost:3000/api/health | - |

---

## 🧪 Testing con Postman

### 1. Importar Colección

- Abrir **Postman**
- `File` → `Import` → Seleccionar `Postman_Collection_2025.json`
- Variables automáticas: `BASE_URL` = `http://localhost:3000/api`

### 2. Flujo de Testing Completo

**Paso 1: Health Check (sin autenticación)**
```
GET http://localhost:3000/api/health
```
Esperado: `Status 200 OK`

**Paso 2: Login**
```
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "password123"
}
```

**Nota**: El usuario `admin@example.com` debe existir en DB. Primero agreguemos un usuario de prueba:

### 3. Crear Usuario de Prueba (SQL directo)

```bash
# Acceder al contenedor de backend
docker-compose exec backend sh

# Dentro del contenedor, ir a la carpeta de backend
cd /app

# Ejecutar node repl
node

# En el repl:
> const db = require('better-sqlite3')('./database/avales.db');
> const bcrypt = require('bcrypt');
> const hash = bcrypt.hashSync('password123', 10);
> db.prepare('INSERT INTO usuarios (email, password_hash, rol, activo, created_at) VALUES (?, ?, ?, 1, datetime("now"))').run('admin@example.com', hash, 'admin');
> console.log('Usuario admin creado');
> .exit
```

**Paso 3: Login nuevamente (debe retornar tokens)**

En Postman, ejecutar:
```
POST /auth/login
Body: { "email": "admin@example.com", "password": "password123" }
```

**Esperado Response:**
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "expiresIn": 900,
  "rol": "admin"
}
```

**Paso 4: Copiar accessToken**

- Copiar valor de `accessToken` desde respuesta
- En Postman: Variables → `accessToken` = [pegar valor]

**Paso 5: Listar Avales (con JWT)**

```
GET /avales
Header: Authorization: Bearer {{accessToken}}
```

Esperado: `Status 200` + array de avales

**Paso 6: Crear Aval**

```
POST /avales
Header: Authorization: Bearer {{accessToken}}
Body: {
  "fecha_registro": "2025-02-13",
  "direccion_administrativa": "Dirección de Sistemas",
  "unidad_institucion": "INSTITUCIÓN A",
  "nombre_solicitante": "Juan Pérez",
  "cargo": "Analista",
  "fecha_solicitud": "2025-02-13",
  "responsable": "Carlos García",
  "memorando_solicitud": "MEMO-2025-001"
}
```

Esperado: `Status 201 Created`

---

## 🛑 Detener Servicios

### Detener sin remover contenedores

```bash
docker-compose stop

# Reiniciar después:
docker-compose start
```

### Detener y remover contenedores

```bash
docker-compose down

# También remover volúmenes (CUIDADO: borra datos DB):
docker-compose down -v
```

---

## 📊 Ver Logs y Status

### Logs en tiempo real (todos los servicios)

```bash
docker-compose logs -f
```

### Logs solo del backend

```bash
docker-compose logs -f backend
```

### Logs solo del frontend

```bash
docker-compose logs -f frontend
```

### Ver estado de contenedores

```bash
docker-compose ps

# Output esperado:
# NAME                     IMAGE                          STATUS
# correlativos-backend     correlativos-tecnicos_backend  Up ...
# correlativos-frontend    correlativos-tecnicos_frontend Up ...
```

---

## 🔧 Detalle de Contenedores

### Backend Container

- **Imagen**: Node 22 Alpine (base: node:22-alpine)
- **Puerto**: 3000
- **Volumen**: `./Correlativos Aval/database` → `/app/database` (compartido)
- **Comando**: `node src/index.js`
- **Health Check**: GET `/api/health` (cada 30s)

### Frontend Container

- **Imagen**: Nginx Alpine (base: nginx:stable-alpine)
- **Puerto**: 80
- **Comando**: `nginx -g 'daemon off;'`
- **Health Check**: wget http://localhost/ (cada 30s)

---

## 📁 Estructura de Volúmenes

```yaml
services:
  backend:
    volumes:
      - ./Correlativos\ Aval/database:/app/database  # Datos persistentes DB
      - ./Correlativos\ Aval/backend/src:/app/src    # Código (reload en desarrollo)

  frontend:
    # Sin volúmenes - usa dist de build
```

**Nota**: El código está mapeado en volúmenes, así que cambios en `/src` se reflejan sin rebuild.

---

## 🐛 Troubleshooting

### Error: "Port 80 already in use"

```bash
# Buscar qué usa el puerto 80
sudo lsof -i :80

# O cambiar puerto en docker-compose.yml:
# ports:
#   - "8080:80"  # Nuevo puerto
```

### Error: "Port 3000 already in use"

```bash
# Similar al anterior, pero puerto 3000
sudo lsof -i :3000

# O en docker-compose.yml:
# ports:
#   - "3001:3000"
```

### Error de conexión a la BD

```bash
# Verificar que el volumen se montó correctamente
docker-compose exec backend ls -la /app/database/

# Si no existe, crear:
docker-compose exec backend node -e "require('better-sqlite3')('./database/avales.db')"
```

### Frontend no carga (nginx error)

```bash
# Ver logs del frontend
docker-compose logs frontend

# Reiniciar el contenedor
docker-compose restart frontend
```

### Backend muestra errores de autenticación

```bash
# Verificar usuarios en la BD
docker-compose exec backend node -e "
  const db = require('better-sqlite3')('./database/avales.db');
  const users = db.prepare('SELECT id, email, rol, activo FROM usuarios').all();
  console.table(users);
"
```

---

## 🔄 Workflow Desarrollo Local

### Con Docker (recomendado)

```bash
# 1. Arrancar servicios
docker-compose up

# 2. En otra terminal - hacer cambios en código
# (Los cambios se reflejan automáticamente en los volúmenes)

# 3. Testear en http://localhost

# 4. Ver logs
docker-compose logs -f backend
```

### Sin Docker (desarrollo nativo)

```bash
# Terminal 1 - Backend
cd "Correlativos Aval/backend"
npm run dev

# Terminal 2 - Frontend
cd "Correlativos Aval/frontend"
npm start

# Accede a http://localhost:4200 (ng serve)
```

---

## 📈 Próximos Pasos (Fase 2)

- [ ] Docker para Staging (.env.pre)
- [ ] Caddy como reverse proxy (SSL/TLS)
- [ ] docker-compose.prod.yml para Oracle VM
- [ ] DuckDNS integration para dominio dinámico

---

## 📚 Referencias

- [Docker Compose Docs](https://docs.docker.com/compose/)
- [Node Alpine Images](https://hub.docker.com/_/node)
- [Nginx Docker Docs](https://docs.docker.com/samples/nginx/)
- [Better-sqlite3 Docs](https://github.com/WiseLibs/better-sqlite3)
