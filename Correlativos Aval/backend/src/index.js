const express = require("express");
const cors = require("cors");
const { db, initDatabase } = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

initDatabase();

const requiredCreateFields = [
  "fecha_registro",
  "direccion_administrativa",
  "unidad_institucion",
  "nombre_solicitante",
  "cargo",
  "memorando_solicitud",
];

const editableFields = [
  "fecha_registro",
  "direccion_administrativa",
  "unidad_institucion",
  "nombre_solicitante",
  "cargo",
  "memorando_solicitud",
];

function cleanQueryParam(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

const createAvalTx = db.transaction((payload) => {
  const seq = db
    .prepare("SELECT ultimo_numero FROM secuencias WHERE nombre = ?")
    .get("AVAL");

  if (!seq) {
    throw new Error("No existe la secuencia AVAL");
  }

  const nextNumber = seq.ultimo_numero + 1;
  const correlativo = `DTI|DSST|AVAL|${String(nextNumber).padStart(4, "0")}`;

  db.prepare("UPDATE secuencias SET ultimo_numero = ? WHERE nombre = ?").run(
    nextNumber,
    "AVAL"
  );

  const result = db
    .prepare(
      `INSERT INTO avales (
        fecha_registro,
        correlativo,
        direccion_administrativa,
        unidad_institucion,
        nombre_solicitante,
        cargo,
        memorando_solicitud
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      payload.fecha_registro,
      correlativo,
      payload.direccion_administrativa,
      payload.unidad_institucion,
      payload.nombre_solicitante,
      payload.cargo,
      payload.memorando_solicitud
    );

  return {
    id: result.lastInsertRowid,
    correlativo,
  };
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/avales", (req, res) => {
  const correlativo = cleanQueryParam(req.query.correlativo);
  const solicitante = cleanQueryParam(req.query.solicitante);
  const fecha = cleanQueryParam(req.query.fecha);
  const estado = cleanQueryParam(req.query.estado);

  const where = [];
  const values = [];

  if (correlativo) {
    where.push("correlativo LIKE ?");
    values.push(`%${correlativo}%`);
  }

  if (solicitante) {
    where.push("nombre_solicitante LIKE ?");
    values.push(`%${solicitante}%`);
  }

  if (fecha) {
    where.push("fecha_registro = ?");
    values.push(fecha);
  }

  if (estado && ["ACTIVO", "ANULADO"].includes(estado.toUpperCase())) {
    where.push("estado = ?");
    values.push(estado.toUpperCase());
  }

  const sql = `SELECT * FROM avales${where.length > 0 ? ` WHERE ${where.join(" AND ")}` : ""} ORDER BY id DESC`;
  const rows = db.prepare(sql).all(...values);
  res.json(rows);
});

app.get("/api/avales/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "ID inválido" });
  }

  const row = db.prepare("SELECT * FROM avales WHERE id = ?").get(id);
  if (!row) {
    return res.status(404).json({ error: "Aval no encontrado" });
  }

  return res.json(row);
});

app.post("/api/avales", (req, res) => {
  const missing = requiredCreateFields.filter((field) => {
    const value = req.body[field];
    return typeof value !== "string" || value.trim() === "";
  });

  if (missing.length > 0) {
    return res.status(400).json({
      error: "Campos obligatorios incompletos",
      fields: missing,
    });
  }

  try {
    const created = createAvalTx(req.body);
    const fullRow = db.prepare("SELECT * FROM avales WHERE id = ?").get(created.id);
    return res.status(201).json(fullRow);
  } catch (error) {
    return res.status(500).json({
      error: "No se pudo crear el aval",
      detail: error.message,
    });
  }
});

app.patch("/api/avales/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "ID inválido" });
  }

  if (
    Object.hasOwn(req.body, "correlativo") ||
    Object.hasOwn(req.body, "estado") ||
    Object.hasOwn(req.body, "motivo_anulacion") ||
    Object.hasOwn(req.body, "anulado_at")
  ) {
    return res.status(400).json({
      error: "No puedes editar correlativo ni campos de anulacion",
    });
  }

  const updates = [];
  const values = [];
  const invalidFields = [];

  editableFields.forEach((field) => {
    if (Object.hasOwn(req.body, field)) {
      const value = req.body[field];
      if (typeof value !== "string" || value.trim() === "") {
        invalidFields.push(field);
        return;
      }
      updates.push(`${field} = ?`);
      values.push(value.trim());
    }
  });

  if (invalidFields.length > 0) {
    return res.status(400).json({
      error: "Campos inválidos para actualizar",
      fields: invalidFields,
    });
  }

  if (updates.length === 0) {
    return res.status(400).json({
      error: "No hay campos válidos para actualizar",
    });
  }

  const exists = db.prepare("SELECT id FROM avales WHERE id = ?").get(id);
  if (!exists) {
    return res.status(404).json({ error: "Aval no encontrado" });
  }

  updates.push("updated_at = datetime('now', 'localtime')");
  values.push(id);

  try {
    db.prepare(`UPDATE avales SET ${updates.join(", ")} WHERE id = ?`).run(...values);
    const updated = db.prepare("SELECT * FROM avales WHERE id = ?").get(id);
    return res.json(updated);
  } catch (error) {
    return res.status(400).json({
      error: "No se pudo actualizar el aval",
      detail: error.message,
    });
  }
});

app.patch("/api/avales/:id/anular", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "ID inválido" });
  }

  const motivo = typeof req.body?.motivo === "string" ? req.body.motivo.trim() : "";
  if (motivo === "") {
    return res.status(400).json({ error: "Debes indicar el motivo de anulacion" });
  }

  const aval = db.prepare("SELECT * FROM avales WHERE id = ?").get(id);
  if (!aval) {
    return res.status(404).json({ error: "Aval no encontrado" });
  }

  if (aval.estado === "ANULADO") {
    return res.status(400).json({ error: "El aval ya fue anulado" });
  }

  db.prepare(
    "UPDATE avales SET estado = 'ANULADO', motivo_anulacion = ?, anulado_at = datetime('now', 'localtime'), updated_at = datetime('now', 'localtime') WHERE id = ?"
  ).run(motivo, id);

  const updated = db.prepare("SELECT * FROM avales WHERE id = ?").get(id);
  return res.json(updated);
});

app.listen(PORT, () => {
  console.log(`Backend listo en http://localhost:${PORT}`);
});
