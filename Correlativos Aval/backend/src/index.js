// Importar dependencias necesarias para la API REST
const express = require("express");
const cors = require("cors"); // Permite solicitudes desde diferentes dominios
const path = require("node:path");
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

// Serve Angular production build (single-server deployment).
// Build output: ../frontend/dist/<project>/browser
const frontendDistPath = path.resolve(
  __dirname,
  "../../frontend/dist/correlativos-aval-web/browser"
);
app.use(express.static(frontendDistPath));

// Inicializar base de datos (crear tablas si no existen)
initDatabase();

// Campos que DEBEN estar presentes al crear un nuevo aval
const requiredCreateFields = [
  "fecha_registro",             // Fecha del registro del aval
  "fecha_solicitud",            // Fecha en que ingresa la solicitud
  "direccion_administrativa",   // Dirección/departamento
  "unidad_institucion",          // Unidad dentro de la institución
  "nombre_solicitante",          // Nombre de quien solicita
  "cargo",                       // Cargo del solicitante
  "responsable",                // Responsable (lista interna)
  "memorando_solicitud",         // Referencia del memorando
];

const editableFields = [
  "fecha_registro",
  "fecha_solicitud",
  "direccion_administrativa",
  "unidad_institucion",
  "nombre_solicitante",
  "cargo",
  "responsable",
  "memorando_solicitud",
];

// CAMBIO: Campos de meses permitidos para registrar salidas por periodo en inventario.
const inventarioMeses = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
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
        fecha_solicitud,
        correlativo,
        direccion_administrativa,
        unidad_institucion,
        nombre_solicitante,
        cargo,
        responsable,
        memorando_solicitud
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      payload.fecha_registro,
      payload.fecha_solicitud,
      correlativo,
      payload.direccion_administrativa,
      payload.unidad_institucion,
      payload.nombre_solicitante,
      payload.cargo,
      payload.responsable,
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

  // Paginación opcional
  const rawLimit = cleanQueryParam(req.query.limit);
  const rawOffset = cleanQueryParam(req.query.offset);
  const limit = rawLimit ? Number.parseInt(rawLimit, 10) : null;
  const offset = rawOffset ? Number.parseInt(rawOffset, 10) : null;
  const usePaging = Number.isInteger(limit) && limit > 0;
  const safeLimit = usePaging ? Math.min(limit, 200) : null;
  const safeOffset = Number.isInteger(offset) && offset >= 0 ? offset : 0;

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

  const whereSql = where.length > 0 ? ` WHERE ${where.join(" AND ")}` : "";
  const baseSql = `FROM avales${whereSql}`;

  // Total (para UI/paginación). Se expone como header.
  const total = db.prepare(`SELECT COUNT(*) as total ${baseSql}`).get(...values)?.total ?? 0;
  res.setHeader("X-Total-Count", String(total));

  // Construir la consulta SQL completa
  const sql = `SELECT * ${baseSql} ORDER BY id DESC${usePaging ? " LIMIT ? OFFSET ?" : ""}`;
  // Ejecutar la consulta con los parámetros preparados
  const rows = usePaging
    ? db.prepare(sql).all(...values, safeLimit, safeOffset)
    : db.prepare(sql).all(...values);

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

const inventarioBaseSelect = `SELECT
  id,
  printf('INS-%04d', id) AS correlativo,
  numero,
  insumo,
  presentacion,
  tamano_presentacion,
  stock,
  entrada,
  enero,
  febrero,
  marzo,
  abril,
  mayo,
  junio,
  julio,
  agosto,
  septiembre,
  octubre,
  noviembre,
  diciembre,
  egresos,
  total,
  requerir_2026,
  created_at,
  updated_at
FROM inventario_insumos`;

function getInventarioById(id) {
  return db.prepare(`${inventarioBaseSelect} WHERE id = ?`).get(id);
}

function validateInventarioItemPayload(payload) {
  const insumo = typeof payload?.insumo === "string" ? payload.insumo.trim() : "";
  const presentacion = typeof payload?.presentacion === "string" ? payload.presentacion.trim() : "";
  const tamano =
    typeof payload?.tamano_presentacion === "string" ? payload.tamano_presentacion.trim() : "";
  const stock = Number(payload?.stock ?? 0);
  const requerir = Number(payload?.requerir_2026 ?? 0);

  if (!insumo || !presentacion || !tamano) {
    return {
      error: "Campos obligatorios incompletos",
      fields: ["insumo", "presentacion", "tamano_presentacion"],
    };
  }

  if (!Number.isInteger(stock) || stock < 0 || !Number.isInteger(requerir) || requerir < 0) {
    return { error: "Stock y requerir_2026 deben ser enteros positivos" };
  }

  return {
    value: {
      insumo,
      presentacion,
      tamano,
      stock,
      requerir,
    },
  };
}

function ensureResponsable(nombre) {
  db.prepare("INSERT OR IGNORE INTO inventario_responsables (nombre) VALUES (?)").run(nombre);
}

const registrarMovimientoTx = db.transaction(({ id, tipo, cantidad, mes, detalle, responsable }) => {
  const item = getInventarioById(id);
  if (!item) {
    throw new Error("Insumo no encontrado");
  }

  if (tipo === "SALIDA" && item.total < cantidad) {
    throw new Error("No hay stock suficiente para registrar la salida");
  }

  if (tipo === "ENTRADA") {
    // CAMBIO: Entrada incrementa acumulado de entradas y total del insumo.
    db.prepare(
      "UPDATE inventario_insumos SET entrada = entrada + ?, total = total + ?, updated_at = datetime('now', 'localtime') WHERE id = ?"
    ).run(cantidad, cantidad, id);
  } else {
    // CAMBIO: Salida incrementa el mes, egresos y reduce total disponible.
    db.prepare(
      `UPDATE inventario_insumos
       SET ${mes} = ${mes} + ?,
           egresos = egresos + ?,
           total = total - ?,
           updated_at = datetime('now', 'localtime')
       WHERE id = ?`
    ).run(cantidad, cantidad, cantidad, id);
  }

  ensureResponsable(responsable);

  // CAMBIO: Registro auditable del movimiento aplicado al inventario.
  db.prepare(
    `INSERT INTO inventario_movimientos (
      inventario_id,
      tipo,
      responsable,
      mes,
      cantidad,
      detalle
    ) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, tipo, responsable, tipo === "SALIDA" ? mes : null, cantidad, detalle || null);

  return getInventarioById(id);
});

const corregirMovimientoTx = db.transaction(({ id, tipo, cantidad, mes, detalle, responsable }) => {
  const item = getInventarioById(id);
  if (!item) {
    throw new Error("Insumo no encontrado");
  }

  if (tipo === "ENTRADA") {
    if (item.entrada < cantidad || item.total < cantidad) {
      throw new Error("No se puede revertir esa entrada por falta de saldo");
    }

    // CAMBIO: Correccion de entrada revierte acumulado y total.
    db.prepare(
      "UPDATE inventario_insumos SET entrada = entrada - ?, total = total - ?, updated_at = datetime('now', 'localtime') WHERE id = ?"
    ).run(cantidad, cantidad, id);
  } else {
    if (item[mes] < cantidad || item.egresos < cantidad) {
      throw new Error("No se puede revertir esa salida por falta de saldo en mes o egresos");
    }

    // CAMBIO: Correccion de salida revierte mes, egresos y repone total.
    db.prepare(
      `UPDATE inventario_insumos
       SET ${mes} = ${mes} - ?,
           egresos = egresos - ?,
           total = total + ?,
           updated_at = datetime('now', 'localtime')
       WHERE id = ?`
    ).run(cantidad, cantidad, cantidad, id);
  }

  const tipoCorreccion = tipo === "ENTRADA" ? "CORRECCION_ENTRADA" : "CORRECCION_SALIDA";
  ensureResponsable(responsable);
  // CAMBIO: Se registra la correccion para conservar trazabilidad del ajuste manual.
  db.prepare(
    `INSERT INTO inventario_movimientos (
      inventario_id,
      tipo,
      responsable,
      mes,
      cantidad,
      detalle
    ) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, tipoCorreccion, responsable, tipo === "SALIDA" ? mes : null, cantidad, detalle || null);

  return getInventarioById(id);
});

// ENDPOINT GET: Obtener inventario con filtro opcional por texto
app.get("/api/inventario", (req, res) => {
  const q = cleanQueryParam(req.query.q);
  const where = [];
  const values = [];

  if (q) {
    where.push("(insumo LIKE ? OR presentacion LIKE ? OR tamano_presentacion LIKE ?)");
    values.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }

  const whereSql = where.length > 0 ? ` WHERE ${where.join(" AND ")}` : "";
  const rows = db
    .prepare(
      `${inventarioBaseSelect}${whereSql}
       ORDER BY numero ASC, insumo ASC, presentacion ASC, tamano_presentacion ASC`
    )
    .all(...values);

  return res.json(rows);
});

// ENDPOINT GET: Historial global de movimientos de inventario
app.get("/api/inventario/movimientos", (req, res) => {
  const tipo = cleanQueryParam(req.query.tipo);
  const responsable = cleanQueryParam(req.query.responsable);
  const q = cleanQueryParam(req.query.q);
  const where = [];
  const values = [];

  if (tipo) {
    where.push("m.tipo = ?");
    values.push(tipo.toUpperCase());
  }

  if (responsable) {
    where.push("m.responsable LIKE ?");
    values.push(`%${responsable}%`);
  }

  if (q) {
    where.push("(i.insumo LIKE ? OR i.presentacion LIKE ? OR i.tamano_presentacion LIKE ?)");
    values.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }

  const whereSql = where.length > 0 ? ` WHERE ${where.join(" AND ")}` : "";
  const rows = db
    .prepare(
      `SELECT
         m.id,
         m.inventario_id,
         m.tipo,
         m.responsable,
         m.mes,
         m.cantidad,
         m.detalle,
         m.created_at,
         i.insumo,
         i.presentacion,
         i.tamano_presentacion
       FROM inventario_movimientos m
       JOIN inventario_insumos i ON i.id = m.inventario_id${whereSql}
       ORDER BY m.id DESC`
    )
    .all(...values);

  return res.json(rows);
});

// ENDPOINT GET: Lista de responsables disponibles para movimientos
app.get("/api/inventario/responsables", (_req, res) => {
  const rows = db
    .prepare("SELECT id, nombre FROM inventario_responsables ORDER BY nombre COLLATE NOCASE ASC")
    .all();

  return res.json(rows);
});

// ENDPOINT POST: Crear un nuevo responsable para la lista de movimientos
app.post("/api/inventario/responsables", (req, res) => {
  const nombre = typeof req.body?.nombre === "string" ? req.body.nombre.trim() : "";

  if (!nombre) {
    return res.status(400).json({ error: "Nombre de responsable es obligatorio" });
  }

  try {
    const result = db.prepare("INSERT INTO inventario_responsables (nombre) VALUES (?)").run(nombre);
    const created = db.prepare("SELECT id, nombre FROM inventario_responsables WHERE id = ?").get(result.lastInsertRowid);
    return res.status(201).json(created);
  } catch (error) {
    return res.status(400).json({
      error: "No se pudo crear el responsable",
      detail: error.message,
    });
  }
});

// ENDPOINT GET: Obtener detalle de un item de inventario
app.get("/api/inventario/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "ID invalido" });
  }

  const item = getInventarioById(id);
  if (!item) {
    return res.status(404).json({ error: "Insumo no encontrado" });
  }

  return res.json(item);
});

// ENDPOINT GET: Historial de movimientos de un item
app.get("/api/inventario/:id/movimientos", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "ID invalido" });
  }

  const item = getInventarioById(id);
  if (!item) {
    return res.status(404).json({ error: "Insumo no encontrado" });
  }

  const rows = db
    .prepare(
      `SELECT id, inventario_id, tipo, responsable, mes, cantidad, detalle, created_at
       FROM inventario_movimientos
       WHERE inventario_id = ?
       ORDER BY id DESC`
    )
    .all(id);

  return res.json(rows);
});

// ENDPOINT POST: Crear nuevo insumo en inventario
app.post("/api/inventario", (req, res) => {
  const parsed = validateInventarioItemPayload(req.body);
  if (parsed.error) {
    return res.status(400).json(parsed);
  }

  const { insumo, presentacion, tamano, stock, requerir } = parsed.value;

  try {
    const numeroAuto =
      db.prepare("SELECT COALESCE(MAX(numero), 0) + 1 as next_numero FROM inventario_insumos").get()?.next_numero ?? 1;

    const result = db
      .prepare(
        `INSERT INTO inventario_insumos (
          numero,
          insumo,
          presentacion,
          tamano_presentacion,
          stock,
          total,
          requerir_2026
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(numeroAuto, insumo, presentacion, tamano, stock, stock, requerir);

    const created = getInventarioById(result.lastInsertRowid);
    return res.status(201).json(created);
  } catch (error) {
    return res.status(400).json({
      error: "No se pudo crear el insumo",
      detail: error.message,
    });
  }
});

// ENDPOINT PATCH: Actualizar datos base de un item
app.patch("/api/inventario/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "ID invalido" });
  }

  const item = getInventarioById(id);
  if (!item) {
    return res.status(404).json({ error: "Insumo no encontrado" });
  }

  const parsed = validateInventarioItemPayload(req.body);
  if (parsed.error) {
    return res.status(400).json(parsed);
  }

  const { insumo, presentacion, tamano, stock, requerir } = parsed.value;
  const deltaStock = stock - item.stock;

  try {
    // CAMBIO: Al editar stock base se ajusta total para mantener coherencia entre saldo y movimientos.
    db.prepare(
      `UPDATE inventario_insumos
       SET insumo = ?,
           presentacion = ?,
           tamano_presentacion = ?,
           stock = ?,
           total = total + ?,
           requerir_2026 = ?,
           updated_at = datetime('now', 'localtime')
       WHERE id = ?`
    ).run(insumo, presentacion, tamano, stock, deltaStock, requerir, id);

    const updated = getInventarioById(id);
    return res.json(updated);
  } catch (error) {
    return res.status(400).json({
      error: "No se pudo actualizar el insumo",
      detail: error.message,
    });
  }
});

// ENDPOINT DELETE: Eliminar item de inventario
app.delete("/api/inventario/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "ID invalido" });
  }

  const item = getInventarioById(id);
  if (!item) {
    return res.status(404).json({ error: "Insumo no encontrado" });
  }

  db.prepare("DELETE FROM inventario_insumos WHERE id = ?").run(id);
  return res.json({ ok: true });
});

// ENDPOINT PATCH: Registrar entrada o salida para un insumo de inventario
app.patch("/api/inventario/:id/movimiento", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "ID invalido" });
  }

  const tipo = typeof req.body?.tipo === "string" ? req.body.tipo.trim().toUpperCase() : "";
  const cantidad = Number(req.body?.cantidad);
  const mes = typeof req.body?.mes === "string" ? req.body.mes.trim().toLowerCase() : "";
  const detalle = typeof req.body?.detalle === "string" ? req.body.detalle.trim() : "";
  const responsable = typeof req.body?.responsable === "string" ? req.body.responsable.trim() : "";

  if (!["ENTRADA", "SALIDA"].includes(tipo)) {
    return res.status(400).json({ error: "Tipo de movimiento invalido" });
  }

  if (!Number.isInteger(cantidad) || cantidad <= 0) {
    return res.status(400).json({ error: "Cantidad invalida" });
  }

  if (!responsable) {
    return res.status(400).json({ error: "Responsable es obligatorio" });
  }

  if (tipo === "SALIDA" && !inventarioMeses.includes(mes)) {
    return res.status(400).json({ error: "Mes invalido para registrar salida" });
  }

  try {
    const updated = registrarMovimientoTx({ id, tipo, cantidad, mes, detalle, responsable });
    return res.json(updated);
  } catch (error) {
    const status = error.message === "Insumo no encontrado" ? 404 : 400;
    return res.status(status).json({
      error: "No se pudo registrar el movimiento",
      detail: error.message,
    });
  }
});

// ENDPOINT PATCH: Corregir un movimiento cargado por error en inventario
app.patch("/api/inventario/:id/correccion", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "ID invalido" });
  }

  const tipo = typeof req.body?.tipo === "string" ? req.body.tipo.trim().toUpperCase() : "";
  const cantidad = Number(req.body?.cantidad);
  const mes = typeof req.body?.mes === "string" ? req.body.mes.trim().toLowerCase() : "";
  const detalle = typeof req.body?.detalle === "string" ? req.body.detalle.trim() : "";
  const responsable = typeof req.body?.responsable === "string" ? req.body.responsable.trim() : "";

  if (!["ENTRADA", "SALIDA"].includes(tipo)) {
    return res.status(400).json({ error: "Tipo de movimiento invalido" });
  }

  if (!Number.isInteger(cantidad) || cantidad <= 0) {
    return res.status(400).json({ error: "Cantidad invalida" });
  }

  if (!responsable) {
    return res.status(400).json({ error: "Responsable es obligatorio" });
  }

  if (tipo === "SALIDA" && !inventarioMeses.includes(mes)) {
    return res.status(400).json({ error: "Mes invalido para corregir salida" });
  }

  try {
    const updated = corregirMovimientoTx({ id, tipo, cantidad, mes, detalle, responsable });
    return res.json(updated);
  } catch (error) {
    const status = error.message === "Insumo no encontrado" ? 404 : 400;
    return res.status(status).json({
      error: "No se pudo corregir el movimiento",
      detail: error.message,
    });
  }
});

// INICIAR EL SERVIDOR: Escuchar en el puerto y host configurados
// SPA fallback (must be after API routes and static middleware).
// Express v5 does not accept "*" as a path pattern; use a regex.
// Exclude API routes so `/api/...` keeps returning JSON.
app.get(/^(?!\/api(\/|$)).*/, (_req, res) => {
  res.sendFile(path.join(frontendDistPath, "index.html"));
});

app.listen(PORT, HOST, () => {
  const address = HOST === "0.0.0.0" ? "localhost" : HOST;
  console.log(`Backend listo en http://${address}:${PORT}`);
});
