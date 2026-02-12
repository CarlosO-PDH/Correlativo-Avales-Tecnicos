PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS avales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha_registro TEXT NOT NULL,
  fecha_solicitud TEXT,
  correlativo TEXT NOT NULL UNIQUE,
  direccion_administrativa TEXT NOT NULL,
  unidad_institucion TEXT NOT NULL,
  nombre_solicitante TEXT NOT NULL,
  cargo TEXT NOT NULL,
  responsable TEXT,
  memorando_solicitud TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'ACTIVO',
  motivo_anulacion TEXT,
  anulado_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS secuencias (
  nombre TEXT PRIMARY KEY,
  ultimo_numero INTEGER NOT NULL
);

INSERT OR IGNORE INTO secuencias (nombre, ultimo_numero)
VALUES ('AVAL', 0);
