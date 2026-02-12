// Importar módulos necesarios
const fs = require("node:fs");        // Sistema de archivos
const path = require("node:path");    // Utilidades de rutas
const Database = require("better-sqlite3"); // Base de datos SQLite síncrona

// Ruta a la base de datos SQLite
const dbPath = path.resolve(__dirname, "../../database/avales.db");
// Ruta al archivo de esquema SQL
const schemaPath = path.resolve(__dirname, "../../database/schema.sql");

// Crear o conectar a la base de datos SQLite
const db = new Database(dbPath);

// FUNCIÓN AUXILIAR: Verificar si una tabla tiene una columna específica
function hasColumn(tableName, columnName) {
  // PRAGMA table_info retorna información sobre las columnas de una tabla
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  // Buscar si existe el nombre de la columna
  return columns.some((column) => column.name === columnName);
}

// FUNCIÓN: Ejecutar migraciones de base de datos
// Las migraciones agregan nuevas columnas si no existen (evolución segura del esquema)
function runMigrations() {
  // Migración 1: Agregar columna 'estado' si no existe
  // Estado puede ser 'ACTIVO' o 'ANULADO'
  if (!hasColumn("avales", "estado")) {
    db.exec("ALTER TABLE avales ADD COLUMN estado TEXT NOT NULL DEFAULT 'ACTIVO'");
  }

  // Migración 2: Agregar columna 'motivo_anulacion' para registrar por qué se anuló
  if (!hasColumn("avales", "motivo_anulacion")) {
    db.exec("ALTER TABLE avales ADD COLUMN motivo_anulacion TEXT");
  }

  // Migración 3: Agregar columna 'anulado_at' para registrar cuándo se anuló
  if (!hasColumn("avales", "anulado_at")) {
    db.exec("ALTER TABLE avales ADD COLUMN anulado_at TEXT");
  }

  // Limpiar datos: asegurar que todos los estados sean ACTIVO
  db.exec("UPDATE avales SET estado = 'ACTIVO' WHERE estado IS NULL OR TRIM(estado) = ''");
}

// FUNCIÓN: Inicializar la base de datos
function initDatabase() {
  // Leer el archivo SQL con las definiciones de tablas
  const schemaSql = fs.readFileSync(schemaPath, "utf8");
  // Ejecutar el esquema (crea las tablas si no existen)
  db.exec(schemaSql);
  // Ejecutar las migraciones para actualizar la estructura si es necesario
  runMigrations();
}

// Exportar la instancia de BD y la función de inicialización
module.exports = {
  db,              // Objeto de conexión a la base de datos
  initDatabase,    // Función para inicializar e ejecutar migraciones
};
