#!/usr/bin/env node

/**
 * Script: apply-migrations.js
 * Descripción: Aplica migraciones SQL de forma ordenada
 * Ubicación: backend/scripts/
 * Uso: node scripts/apply-migrations.js (desde backend/)
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Rutas relativas desde backend/scripts/
const DB_PATH = path.resolve(__dirname, '../database/avales.db');
const MIGRATIONS_DIR = path.resolve(__dirname, '../../scripts/sql');

console.log('📦 Aplicando migraciones SQL...\n');
console.log(`Base de datos: ${DB_PATH}`);
console.log(`Migraciones dir: ${MIGRATIONS_DIR}\n`);

try {
  // Verificar que el directorio de migraciones existe
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    throw new Error(`❌ Directorio de migraciones no encontrado: ${MIGRATIONS_DIR}`);
  }

  // Conectar a BD (crear si no existe)
  const db = new Database(DB_PATH);
  db.pragma('foreign_keys = ON');

  // Leer migraciones en orden
  const migrationFiles = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`Migraciones encontradas: ${migrationFiles.length}`);
  console.log(`\n📝 Ejecutando...`);

  migrationFiles.forEach(file => {
    const filePath = path.join(MIGRATIONS_DIR, file);
    const sql = fs.readFileSync(filePath, 'utf-8');

    try {
      db.exec(sql);
      console.log(`  ✅ ${file}`);
    } catch (err) {
      console.error(`  ❌ ${file}: ${err.message}`);
      throw err;
    }
  });

  // Verificar tablas
  console.log('\n📋 Tablas creadas:');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  tables.forEach(t => console.log(`  - ${t.name}`));

  // Verificar datos iniciales
  console.log('\n📊 Datos iniciales:');
  const seqCount = db.prepare('SELECT COUNT(*) as count FROM secuencias').get().count;
  const awalCount = db.prepare('SELECT COUNT(*) as count FROM avales').get().count;
  const userCount = db.prepare('SELECT COUNT(*) as count FROM usuarios').get().count || 0;
  console.log(`  - Secuencias: ${seqCount}`);
  console.log(`  - Avales: ${awalCount}`);
  console.log(`  - Usuarios: ${userCount}`);

  db.close();
  console.log('\n✅ Migraciones completadas exitosamente\n');
} catch (err) {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
}
