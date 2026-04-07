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

CREATE TABLE IF NOT EXISTS inventario_insumos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero INTEGER NOT NULL,
  insumo TEXT NOT NULL,
  presentacion TEXT NOT NULL,
  tamano_presentacion TEXT NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  entrada INTEGER NOT NULL DEFAULT 0,
  enero INTEGER NOT NULL DEFAULT 0,
  febrero INTEGER NOT NULL DEFAULT 0,
  marzo INTEGER NOT NULL DEFAULT 0,
  abril INTEGER NOT NULL DEFAULT 0,
  mayo INTEGER NOT NULL DEFAULT 0,
  junio INTEGER NOT NULL DEFAULT 0,
  julio INTEGER NOT NULL DEFAULT 0,
  agosto INTEGER NOT NULL DEFAULT 0,
  septiembre INTEGER NOT NULL DEFAULT 0,
  octubre INTEGER NOT NULL DEFAULT 0,
  noviembre INTEGER NOT NULL DEFAULT 0,
  diciembre INTEGER NOT NULL DEFAULT 0,
  egresos INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  requerir_2026 INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT,
  UNIQUE (insumo, presentacion, tamano_presentacion)
);

CREATE TABLE IF NOT EXISTS inventario_movimientos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  inventario_id INTEGER NOT NULL,
  tipo TEXT NOT NULL,
  responsable TEXT NOT NULL,
  mes TEXT,
  cantidad INTEGER NOT NULL,
  detalle TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (inventario_id) REFERENCES inventario_insumos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS inventario_responsables (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- CAMBIO: Se elimina la siembra automatica de inventario para evitar reinserciones no deseadas
-- en cada reinicio del backend. El inventario se carga ahora solo por operaciones de usuario.
