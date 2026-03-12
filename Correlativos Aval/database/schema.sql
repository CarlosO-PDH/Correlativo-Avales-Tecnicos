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

INSERT OR IGNORE INTO inventario_insumos (
  numero, insumo, presentacion, tamano_presentacion, stock, entrada,
  enero, febrero, marzo, abril, mayo, junio, julio, agosto, septiembre,
  octubre, noviembre, diciembre, egresos, total, requerir_2026
) VALUES
  (1, 'Aire Comprimido', 'Envase', '20 Onza', 104, 0, 0, 36, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 37, 67, 500),
  (2, 'Alcohol Isopropilico', 'Envase', '1 Litro', 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0),
  (3, 'Baterias Boton', 'Unidad', '1 Unidad(es)', 12, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 11, 25),
  (4, 'Baterias UPS', 'Unidad', '1 Unidad(es)', 75, 80, 0, 12, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 16, 139, 0),
  (5, 'Espuma Limpiadora', 'Envase', '20 Onza', 257, 0, 0, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 247, 0),
  (6, 'Kit de Limpieza', 'Unidad', '1 Unidad(es)', 42, 0, 0, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 9, 33, 36),
  (7, 'Limpia Contactos', 'Bote', '20 Onza', 72, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 69, 0),
  (8, 'Pano Limpiador', 'Unidad', '1 Unidad(es)', 30, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 25, 0),
  (9, 'Pasta Termica', 'Tubo', '4 Gramos', 17, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 16, 0),
  (10, 'Pasta Termica', 'Tubo', '2 Gramos', 0, 30, 0, 30, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 30, 0, 0),
  (11, 'Restaurador de Plasticos', 'Envase', '1 Galon', 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 0),
  (11, 'Restaurador de Plasticos', 'Envase', '720 Mililitro', 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6, 0),
  (12, 'Toallas Humedas Para Equipos Electronicos', 'Bote', '30 Unidad(es)', 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 50),
  (13, 'Wipe', 'Bola', '1 Libra', 40, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 40, 0);
