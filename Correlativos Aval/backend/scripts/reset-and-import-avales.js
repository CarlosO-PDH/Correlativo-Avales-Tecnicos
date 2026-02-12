/*
  One-time (or repeatable) import helper for office deployments.

  Usage:
    node scripts/reset-and-import-avales.js <path-to-tsv-or-csv>

  Expected columns (header names are flexible):
    - Fecha / Fecha de registro
    - Correlativo Aval / Correlativo
    - Solicitante
    - Cargo
    - Unidad Administrativa / Unidad
    - Direccion / Dirección
    - Memorando de Solicitud / Memorando
    - Fecha de Solicitud
    - Responsable

  Notes:
    - Deletes all rows from `avales` and re-imports.
    - Sets `secuencias.ultimo_numero` based on the highest correlativo imported.
    - Date input accepted: dd/mm/yyyy or yyyy-mm-dd. Stored as yyyy-mm-dd.
*/

const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

function hasColumn(db, tableName, columnName) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  return columns.some((c) => c.name === columnName);
}

function ensureSchemaAndMigrations(db, repoRoot) {
  const schemaPath = path.resolve(repoRoot, 'database/schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schemaSql);

  // Keep these in sync with backend/src/db.js migrations.
  if (!hasColumn(db, 'avales', 'fecha_solicitud')) {
    db.exec('ALTER TABLE avales ADD COLUMN fecha_solicitud TEXT');
  }
  if (!hasColumn(db, 'avales', 'responsable')) {
    db.exec('ALTER TABLE avales ADD COLUMN responsable TEXT');
  }
  if (!hasColumn(db, 'avales', 'estado')) {
    db.exec("ALTER TABLE avales ADD COLUMN estado TEXT NOT NULL DEFAULT 'ACTIVO'");
  }
  if (!hasColumn(db, 'avales', 'motivo_anulacion')) {
    db.exec('ALTER TABLE avales ADD COLUMN motivo_anulacion TEXT');
  }
  if (!hasColumn(db, 'avales', 'anulado_at')) {
    db.exec('ALTER TABLE avales ADD COLUMN anulado_at TEXT');
  }

  db.exec("UPDATE avales SET estado = 'ACTIVO' WHERE estado IS NULL OR TRIM(estado) = ''");
}

function normalizeHeader(h) {
  return String(h || '')
    .trim()
    .toLowerCase()
    .replace(/\uFFFD/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function readTextSmart(filePath) {
  const buf = fs.readFileSync(filePath);
  // Prefer utf8, but fall back to latin1 if it contains replacement chars.
  let text = buf.toString('utf8');
  if (text.includes('\uFFFD')) {
    text = buf.toString('latin1');
  }
  return text;
}

function parseDate(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;

  // yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  // dd/mm/yyyy
  const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const dd = m[1].padStart(2, '0');
    const mm = m[2].padStart(2, '0');
    const yyyy = m[3];
    return `${yyyy}-${mm}-${dd}`;
  }

  return raw;
}

function detectDelimiter(sampleLine) {
  if (sampleLine.includes('\t')) return '\t';
  if (sampleLine.includes(';')) return ';';
  return ',';
}

function splitLine(line, delim) {
  // Very small parser. Assumes no embedded newlines.
  // Supports quoted fields for CSV/semicolon.
  if (delim === '\t') {
    return line.split('\t');
  }

  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && ch === delim) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function getArgFilePath() {
  const file = process.argv[2];
  if (!file) {
    console.error('Missing input file.');
    console.error('Usage: node scripts/reset-and-import-avales.js <path-to-tsv-or-csv>');
    process.exit(2);
  }
  return path.resolve(process.cwd(), file);
}

function main() {
  const inputPath = getArgFilePath();
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  const repoDbPath = path.resolve(__dirname, '../../database/avales.db');
  const repoRoot = path.resolve(__dirname, '../..');
  const db = new Database(repoDbPath);
  ensureSchemaAndMigrations(db, repoRoot);

  const text = readTextSmart(inputPath);
  const rawLines = text.split(/\r?\n/).map((l) => l.trimEnd());

  const headerIndex = rawLines.findIndex((l) => {
    const n = normalizeHeader(l);
    return n.includes('correlativo') && n.includes('solicitante');
  });

  if (headerIndex < 0) {
    throw new Error('Could not find a header line containing "Correlativo" and "Solicitante".');
  }

  const headerLine = rawLines[headerIndex];
  const delim = detectDelimiter(headerLine);
  // Keep header positions aligned with data columns; do not filter empty headers.
  const headers = splitLine(headerLine, delim).map((h) => normalizeHeader(h));

  const lines = rawLines
    .slice(headerIndex + 1)
    .filter((l) => {
      const trimmed = String(l || '').trim();
      if (trimmed === '') return false;
      // Skip separator rows like ";;;;;;"
      const withoutDelims = trimmed.replace(/[;\t,\s]+/g, '');
      return withoutDelims !== '';
    });

  if (lines.length < 1) {
    throw new Error('Input file must contain at least one data row after the header.');
  }

  const col = (nameOptions) => {
    for (const opt of nameOptions) {
      const idx = headers.indexOf(normalizeHeader(opt));
      if (idx >= 0) return idx;
    }
    return -1;
  };

  const idxFechaRegistro = col(['fecha', 'fecha de registro', 'fecha registro']);
  const idxCorrelativo = col(['correlativo aval', 'correlativo']);
  const idxSolicitante = col(['solicitante', 'nombre del solicitante', 'nombre solicitante']);
  const idxCargo = col(['cargo']);
  const idxUnidad = col(['unidad administrativa', 'unidad', 'unidad institucion', 'unidad de la institucion']);
  const idxDireccion = col(['direccion', 'dirección', 'direccion administrativa', 'direccion_administrativa']);
  const idxMemorando = col(['memorando de solicitud', 'memorando', 'memorando_solicitud']);
  const idxFechaSolicitud = col(['fecha de solicitud', 'fecha solicitud']);
  const idxResponsable = col(['responsable']);

  const requiredIdx = [
    ['fecha_registro', idxFechaRegistro],
    ['correlativo', idxCorrelativo],
    ['nombre_solicitante', idxSolicitante],
    ['cargo', idxCargo],
    ['unidad_institucion', idxUnidad],
    ['direccion_administrativa', idxDireccion],
    ['memorando_solicitud', idxMemorando],
    ['fecha_solicitud', idxFechaSolicitud],
    ['responsable', idxResponsable],
  ];

  const missingCols = requiredIdx.filter(([, idx]) => idx < 0).map(([n]) => n);
  if (missingCols.length) {
    throw new Error(`Missing required columns in header: ${missingCols.join(', ')}`);
  }

  const rows = [];
  let maxSeq = 0;
  let skipped = 0;

  for (let i = 0; i < lines.length; i++) {
    const parts = splitLine(lines[i], delim);
    const get = (idx) => (idx >= 0 ? String(parts[idx] ?? '').trim() : '');

    const correlativo = get(idxCorrelativo);

    const fecha_registro = parseDate(get(idxFechaRegistro));
    const fecha_solicitud = parseDate(get(idxFechaSolicitud));
    const direccion_administrativa = get(idxDireccion);
    const unidad_institucion = get(idxUnidad);
    const nombre_solicitante = get(idxSolicitante);
    const cargo = get(idxCargo);
    const responsable = get(idxResponsable);
    const memorando_solicitud = get(idxMemorando);

    const missing = [];
    if (!fecha_registro) missing.push('fecha_registro');
    if (!fecha_solicitud) missing.push('fecha_solicitud');
    if (!correlativo) missing.push('correlativo');
    if (!direccion_administrativa) missing.push('direccion_administrativa');
    if (!unidad_institucion) missing.push('unidad_institucion');
    if (!nombre_solicitante) missing.push('nombre_solicitante');
    if (!cargo) missing.push('cargo');
    if (!responsable) missing.push('responsable');
    if (!memorando_solicitud) missing.push('memorando_solicitud');

    // Skip trailing placeholder rows that contain almost no data.
    // (Some exports include an extra "next row" with only correlativo/no.)
    if (
      !fecha_registro &&
      !fecha_solicitud &&
      !direccion_administrativa &&
      !unidad_institucion &&
      !nombre_solicitante &&
      !cargo &&
      !responsable &&
      !memorando_solicitud
    ) {
      skipped++;
      continue;
    }

    if (missing.length) {
      const lineNumber = headerIndex + 2 + i; // 1-based, first data row is headerIndex+2
      throw new Error(
        `Row ${i} (file line ${lineNumber}) is missing required fields: ${missing.join(', ')}. Raw: ${lines[i]}`
      );
    }

    const m = correlativo.match(/\|(\d{4,})$/);
    if (m) {
      maxSeq = Math.max(maxSeq, Number(m[1]));
    }

    rows.push({
      fecha_registro,
      fecha_solicitud,
      correlativo,
      direccion_administrativa,
      unidad_institucion,
      nombre_solicitante,
      cargo,
      responsable,
      memorando_solicitud,
    });
  }

  const tx = db.transaction(() => {
    db.prepare('DELETE FROM avales').run();
    db.prepare("DELETE FROM sqlite_sequence WHERE name = 'avales'").run();
    db.prepare("UPDATE secuencias SET ultimo_numero = ? WHERE nombre = 'AVAL'").run(0);

    const insert = db.prepare(
      `INSERT INTO avales (
        fecha_registro,
        fecha_solicitud,
        correlativo,
        direccion_administrativa,
        unidad_institucion,
        nombre_solicitante,
        cargo,
        responsable,
        memorando_solicitud,
        estado,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVO', datetime('now','localtime'), NULL)`
    );

    for (const r of rows) {
      insert.run(
        r.fecha_registro,
        r.fecha_solicitud,
        r.correlativo,
        r.direccion_administrativa,
        r.unidad_institucion,
        r.nombre_solicitante,
        r.cargo,
        r.responsable,
        r.memorando_solicitud
      );
    }

    db.prepare("UPDATE secuencias SET ultimo_numero = ? WHERE nombre = 'AVAL'").run(maxSeq);
  });

  tx();

  console.log(`Imported ${rows.length} avales.`);
  console.log(`Sequence AVAL set to: ${maxSeq}`);
  if (skipped > 0) {
    console.log(`Skipped ${skipped} empty placeholder row(s).`);
  }
}

main();
