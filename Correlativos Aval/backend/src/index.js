// Importar dependencias necesarias para la API REST
const express = require("express");
const cors = require("cors"); // Permite solicitudes desde diferentes dominios
const { db, initDatabase } = require("./db"); // Sistema de base de datos SQLite

// Crear instancia del servidor Express
const app = express();
// Puerto en el que escucha la API (por defecto 3000)
const PORT = process.env.PORT || 3000;
// Host/dirección donde se vincula el servidor
const HOST = process.env.HOST || "0.0.0.0";

// Middleware: permitir solicitudes CORS (desde el frontend)
app.use(cors());
// Middleware: parsear JSON en las solicitudes
app.use(express.json());

// Inicializar base de datos (crear tablas si no existen)
initDatabase();

// Campos que DEBEN estar presentes al crear un nuevo aval
const requiredCreateFields = [
  "fecha_registro",             // Fecha del registro del aval
  "direccion_administrativa",   // Dirección/departamento
  "unidad_institucion",          // Unidad dentro de la institución
  "nombre_solicitante",          // Nombre de quien solicita
  "cargo",                       // Cargo del solicitante
  "memorando_solicitud",         // Referencia del memorando
];

const editableFields = [
  "fecha_registro",
  "direccion_administrativa",
  "unidad_institucion",
  "nombre_solicitante",
  "cargo",
  "memorando_solicitud",
];

// Función auxiliar: limpiar y validar parámetros de búsqueda
// Retorna null si el valor está vacío, de lo contrario retorna el valor limpio
function cleanQueryParam(value) {
  if (typeof value !== "string") {
    return null; // No es texto
  }

  const trimmed = value.trim(); // Elimina espacios al inicio y final
  return trimmed === "" ? null : trimmed; // Retorna null si está vacío
}

// TRANSACCIÓN: Crear un aval con correlativo único generado automáticamente
// Una transacción asegura que se completen TODOS los pasos o NINGUNO
const createAvalTx = db.transaction((payload) => {
  // Obtener el último número de la secuencia AVAL
  const seq = db
    .prepare("SELECT ultimo_numero FROM secuencias WHERE nombre = ?")
    .get("AVAL");

  // Validar que la secuencia existe
  if (!seq) {
    throw new Error("No existe la secuencia AVAL");
  }

  // Calcular el siguiente número consecutivo
  const nextNumber = seq.ultimo_numero + 1;
  // Generar el correlativo en formato: DTI|DSST|AVAL|0001
  const correlativo = `DTI|DSST|AVAL|${String(nextNumber).padStart(4, "0")}`;

  // Actualizar el contador en la tabla secuencias
  db.prepare("UPDATE secuencias SET ultimo_numero = ? WHERE nombre = ?").run(
    nextNumber,
    "AVAL"
  );

  // Insertar el nuevo aval en la base de datos
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

  // Retornar el ID del aval creado y su correlativo
  return {
    id: result.lastInsertRowid,
    correlativo,
  };
});

// ENDPOINT: Verificar si el servidor está activo
app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// ENDPOINT GET: Obtener lista de avales con filtros opcionales
app.get("/api/avales", (req, res) => {
  // Extraer y limpiar parámetros de búsqueda de la URL
  const correlativo = cleanQueryParam(req.query.correlativo); // Filtro: número de correlativo
  const solicitante = cleanQueryParam(req.query.solicitante);  // Filtro: nombre del solicitante
  const fecha = cleanQueryParam(req.query.fecha);              // Filtro: fecha del registro
  const estado = cleanQueryParam(req.query.estado);            // Filtro: estado (ACTIVO/ANULADO)

  // Construir dinámicamente la consulta SQL según los filtros proporcionados
  const where = []; // Condiciones WHERE
  const values = []; // Valores para los parámetros preparados

  // Si hay búsqueda de correlativo, agregar a la consulta
  if (correlativo) {
    where.push("correlativo LIKE ?");     // LIKE permite búsquedas parciales
    values.push(`%${correlativo}%`);       // % es comodín (contiene)
  }

  // Si hay búsqueda por nombre de solicitante
  if (solicitante) {
    where.push("nombre_solicitante LIKE ?");
    values.push(`%${solicitante}%`);
  }

  // Filtro por fecha exacta
  if (fecha) {
    where.push("fecha_registro = ?");
    values.push(fecha);
  }

  // Filtro por estado: solo permite ACTIVO o ANULADO para evitar inyecciones SQL
  if (estado && ["ACTIVO", "ANULADO"].includes(estado.toUpperCase())) {
    where.push("estado = ?");
    values.push(estado.toUpperCase());
  }

  // Construir la consulta SQL completa
  const sql = `SELECT * FROM avales${where.length > 0 ? ` WHERE ${where.join(" AND ")}` : ""} ORDER BY id DESC`;
  // Ejecutar la consulta con los parámetros preparados
  const rows = db.prepare(sql).all(...values);
  // Retornar los resultados como JSON
  res.json(rows);
});

// ENDPOINT GET: Obtener detalles de un aval específico por ID
app.get("/api/avales/:id", (req, res) => {
  // Convertir el ID de URL a número
  const id = Number(req.params.id);
  // Validar que sea un número entero positivo
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "ID inválido" });
  }

  // Buscar el aval en la base de datos
  const row = db.prepare("SELECT * FROM avales WHERE id = ?").get(id);
  // Si no existe retornar 404
  if (!row) {
    return res.status(404).json({ error: "Aval no encontrado" });
  }

  // Retornar el aval encontrado
  return res.json(row);
});

// ENDPOINT POST: Crear un nuevo aval
app.post("/api/avales", (req, res) => {
  // Verificar que todos los campos requeridos estén presentes y no sean vacíos
  const missing = requiredCreateFields.filter((field) => {
    const value = req.body[field];
    return typeof value !== "string" || value.trim() === "";
  });

  // Si faltan campos, retornar error 400
  if (missing.length > 0) {
    return res.status(400).json({
      error: "Campos obligatorios incompletos",
      fields: missing,
    });
  }

  // Ejecutar la transacción para crear el aval
  try {
    // Ejecutar la transacción que crea el aval y genera el correlativo
    const created = createAvalTx(req.body);
    // Obtener todos los datos del aval recién creado
    const fullRow = db.prepare("SELECT * FROM avales WHERE id = ?").get(created.id);
    // Retornar el aval completo con estado 201 (creado)
    return res.status(201).json(fullRow);
  } catch (error) {
    // Si hay error, retornar 500 con detalles
    return res.status(500).json({
      error: "No se pudo crear el aval",
      detail: error.message,
    });
  }
});

// ENDPOINT PATCH: Actualizar campos específicos de un aval existente
app.patch("/api/avales/:id", (req, res) => {
  // Validar que el ID sea válido
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "ID inválido" });
  }

  // Proteger campos que NO pueden ser editados por el usuario
  // (correlativo y campos de anulación se gestionen a través de endpoints específicos)
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

  // Preparar los campos a actualizar
  const updates = [];         // Partes de la consulta UPDATE
  const values = [];          // Valores para los campos
  const invalidFields = [];   // Campos con valores inválidos

  // Iterar sobre los campos editables permitidos
  editableFields.forEach((field) => {
    // Si el usuario envía este campo en la solicitud
    if (Object.hasOwn(req.body, field)) {
      const value = req.body[field];
      // Validar que sea texto no vacío
      if (typeof value !== "string" || value.trim() === "") {
        invalidFields.push(field);
        return;
      }
      // Agregar a la actualización
      updates.push(`${field} = ?`);
      values.push(value.trim());
    }
  });

  // Validar que no haya campos inválidos
  if (invalidFields.length > 0) {
    return res.status(400).json({
      error: "Campos inválidos para actualizar",
      fields: invalidFields,
    });
  }

  // Validar que haya al menos un campo válido para actualizar
  if (updates.length === 0) {
    return res.status(400).json({
      error: "No hay campos válidos para actualizar",
    });
  }

  // Verificar que el aval existe
  const exists = db.prepare("SELECT id FROM avales WHERE id = ?").get(id);
  if (!exists) {
    return res.status(404).json({ error: "Aval no encontrado" });
  }

  // Agregar timestamp de actualización y el ID a los valores
  updates.push("updated_at = datetime('now', 'localtime')");
  values.push(id);

  // Ejecutar la actualización
  try {
    // Ejecutar la consulta UPDATE con todos los campos preparados
    db.prepare(`UPDATE avales SET ${updates.join(", ")} WHERE id = ?`).run(...values);
    // Obtener el aval actualizado para retornarlo
    const updated = db.prepare("SELECT * FROM avales WHERE id = ?").get(id);
    return res.json(updated);
  } catch (error) {
    return res.status(400).json({
      error: "No se pudo actualizar el aval",
      detail: error.message,
    });
  }
});

// ENDPOINT PATCH: Anular un aval existente (marca como inactivo)
app.patch("/api/avales/:id/anular", (req, res) => {
  // Validar ID
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "ID inválido" });
  }

  // Extraer y validar el motivo de anulación (requerido)
  const motivo = typeof req.body?.motivo === "string" ? req.body.motivo.trim() : "";
  if (motivo === "") {
    return res.status(400).json({ error: "Debes indicar el motivo de anulacion" });
  }

  // Obtener el aval
  const aval = db.prepare("SELECT * FROM avales WHERE id = ?").get(id);
  if (!aval) {
    return res.status(404).json({ error: "Aval no encontrado" });
  }

  // Validar que no esté ya anulado
  if (aval.estado === "ANULADO") {
    return res.status(400).json({ error: "El aval ya fue anulado" });
  }

  // Actualizar el aval a estado ANULADO con los detalles de la anulación
  db.prepare(
    "UPDATE avales SET estado = 'ANULADO', motivo_anulacion = ?, anulado_at = datetime('now', 'localtime'), updated_at = datetime('now', 'localtime') WHERE id = ?"
  ).run(motivo, id);

  // Retornar el aval actualizado
  const updated = db.prepare("SELECT * FROM avales WHERE id = ?").get(id);
  return res.json(updated);
});

// INICIAR EL SERVIDOR: Escuchar en el puerto y host configurados
app.listen(PORT, HOST, () => {
  const address = HOST === "0.0.0.0" ? "localhost" : HOST;
  console.log(`Backend listo en http://${address}:${PORT}`);
});
