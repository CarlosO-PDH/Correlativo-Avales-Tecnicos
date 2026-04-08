-- ===================================================================
-- SCRIPT: 01_usuarios.sql
-- DESCRIPCIÓN: Tabla de usuarios para autenticación JWT (Fase 1 - v2.0)
-- FECHA CREACIÓN: 2026-04-08
-- VERSIÓN: 2.0 (Fase 1)
-- DEPENDENCIA: 00_init.sql debe ejecutarse primero
-- ===================================================================

-- Habilitar foreign keys
PRAGMA foreign_keys = ON;

-- ===================================================================
-- TABLA: usuarios
-- DESCRIPCIÓN: Registro de usuarios con credenciales (bcrypt hash)
-- ===================================================================

CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Credenciales
    email TEXT NOT NULL UNIQUE, -- Identificador único
    password_hash TEXT NOT NULL, -- bcrypt hash (rounds: 10-12)
    
    -- Rol y Permisos
    rol TEXT NOT NULL DEFAULT 'usuario' CHECK (rol IN ('admin', 'usuario')),
    -- admin: acceso total a todos los endpoints
    -- usuario: lectura y creación limitada
    
    -- Estado
    activo INTEGER NOT NULL DEFAULT 1, -- 1: activo, 0: inactivo/bloqueado
    
    -- Timestamps
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
    updated_at TEXT
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_activo ON usuarios(activo);

-- ===================================================================
-- TABLA: refresh_tokens (Pendiente para v2.0 completo)
-- DESCRIPCIÓN: Almacenamiento de refresh tokens para revocación
-- NOTA: Opcional - usar solo si requieres logout por revocación de token
-- ===================================================================

-- DESCOMENTAR cuando se implemente refresh token revocation
/*
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL UNIQUE, -- Hash del refresh token
    expira_at TEXT NOT NULL, -- YYYY-MM-DD HH:MM:SS
    revocado INTEGER DEFAULT 0, -- 1: revocado, 0: válido
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
    
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_usuario_id ON refresh_tokens(usuario_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expira_at ON refresh_tokens(expira_at);
*/

-- ===================================================================
-- DATA INICIAL: Usuario Admin por Defecto
-- ===================================================================

-- NOTA: Descomentar después de que bcrypt esté implementado en backend
-- En producción, usar el hash real del admin password
/*
INSERT OR IGNORE INTO usuarios (email, password_hash, rol, activo) VALUES
(
    'admin@avales-tecnicos.local',
    '$2b$10$...HASH_AQUI...',  -- Reemplazar con bcrypt hash real
    'admin',
    1
);
*/

-- ===================================================================
-- FIN DE SCRIPT
-- ===================================================================
-- Script aplicado exitosamente.
-- Próximos pasos:
--  1. Implementar endpoints POST /auth/login en backend
--  2. Crear usuario admin con hash bcrypt real
--  3. Implementar JWT middleware
-- ===================================================================
