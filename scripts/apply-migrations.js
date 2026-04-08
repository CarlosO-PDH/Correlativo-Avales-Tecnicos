#!/usr/bin/env node

/**
 * Script: apply-migrations.js
 * Descripción: Aplica migraciones SQL de forma ordenada
 * Uso: node scripts/apply-migrations.js
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'Correlativos Aval', 'database', 'avales.db');
const MIGRATIONS_DIR = path.join(__dirname, 'sql');

console.log('📦 Aplicando migraciones SQL...\n');

try {
  // Conectar a BD
  const db = new Database(DB_PATH);
  db.pragma('foreign_keys = ON');

  // Leer migraciones en orden
  const migrationFiles = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`Migraciones encontradas: ${migrationFiles.length}`);
  console.log(`Directorio: ${MIGRATIONS_DIR}\n`);

  migrationFiles.forEach(file => {
    const filePath = path.join(MIGRATIONS_DIR, file);
    const sql = fs.readFileSync(filePath, 'utf-8');

    // Comentar si solo quieres ver sin ejecutar
    try {
      db.exec(sql);
      console.log(`✅ ${file}`);
    } catch (err) {
      console.error(`❌ ${file}: ${err.message}`);
      process.exit(1);
    }
  });

  // Verificar tablas
  console.log('\n📋 Tablas creadas:');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  tables.forEach(t => console.log(`  - ${t.name}`));

  db.close();
  console.log('\n✅ Migraciones completadas exitosamente\n');
} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}
