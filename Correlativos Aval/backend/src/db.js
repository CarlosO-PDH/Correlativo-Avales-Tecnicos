const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");

const dbPath = path.resolve(__dirname, "../../database/avales.db");
const schemaPath = path.resolve(__dirname, "../../database/schema.sql");

const db = new Database(dbPath);

function hasColumn(tableName, columnName) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  return columns.some((column) => column.name === columnName);
}

function runMigrations() {
  if (!hasColumn("avales", "estado")) {
    db.exec("ALTER TABLE avales ADD COLUMN estado TEXT NOT NULL DEFAULT 'ACTIVO'");
  }

  if (!hasColumn("avales", "motivo_anulacion")) {
    db.exec("ALTER TABLE avales ADD COLUMN motivo_anulacion TEXT");
  }

  if (!hasColumn("avales", "anulado_at")) {
    db.exec("ALTER TABLE avales ADD COLUMN anulado_at TEXT");
  }

  db.exec("UPDATE avales SET estado = 'ACTIVO' WHERE estado IS NULL OR TRIM(estado) = ''");
}

function initDatabase() {
  const schemaSql = fs.readFileSync(schemaPath, "utf8");
  db.exec(schemaSql);
  runMigrations();
}

module.exports = {
  db,
  initDatabase,
};
