-- ===================================================================
-- SCRIPT: 00_init.sql
-- DESCRIPCIÓN: Schema inicial de Correlativos Avales Técnicos v1.0.0
-- FECHA CREACIÓN: 2026-04-08
-- VERSIÓN: 1.0.0
-- ===================================================================

-- Habilitar foreign keys (importante para integridad referencial)
PRAGMA foreign_keys = ON;

-- ===================================================================
-- TABLA: avales
-- DESCRIPCIÓN: Registro principal de avales técnicos
-- ===================================================================

CREATE TABLE IF NOT EXISTS avales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Metadata
    fecha_registro TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d', 'now')),
    correlativo TEXT NOT NULL UNIQUE, -- Formato: DTI|DSST|AVAL|NNNN
    
    -- Información General
    direccion_administrativa TEXT NOT NULL,
    unidad_institucion TEXT NOT NULL,
    nombre_solicitante TEXT NOT NULL,
    cargo TEXT NOT NULL,
    
    -- Información de Solicitud
    fecha_solicitud TEXT, -- YYYY-MM-DD
    responsable TEXT,
    memorando_solicitud TEXT NOT NULL,
    
    -- Estado
    estado TEXT NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'ANULADO')),
    motivo_anulacion TEXT,
    anulado_at TEXT, -- YYYY-MM-DD HH:MM:SS
    
    -- Timestamps
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
    updated_at TEXT
);

-- Índices para queries comunes
CREATE INDEX IF NOT EXISTS idx_avales_estado ON avales(estado);
CREATE INDEX IF NOT EXISTS idx_avales_correlativo ON avales(correlativo);
CREATE INDEX IF NOT EXISTS idx_avales_fecha_registro ON avales(fecha_registro);
CREATE INDEX IF NOT EXISTS idx_avales_nombre_solicitante ON avales(nombre_solicitante);

-- ===================================================================
-- TABLA: secuencias
-- DESCRIPCIÓN: Control de números correlativo por prefijo
-- ===================================================================

CREATE TABLE IF NOT EXISTS secuencias (
    nombre TEXT PRIMARY KEY, -- DTI, DSST, AVAL
    ultimo_numero INTEGER NOT NULL DEFAULT 0
);

-- Inicializar secuencias
INSERT OR IGNORE INTO secuencias (nombre, ultimo_numero) VALUES
    ('DTI', 0),
    ('DSST', 0),
    ('AVAL', 0);

-- ===================================================================
-- FIN DE SCRIPT
-- ===================================================================
-- Script aplicado exitosamente.
-- Próximo paso: Ejecutar 01_usuarios.sql (Fase 2)
