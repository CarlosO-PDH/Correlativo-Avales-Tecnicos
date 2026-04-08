// Importar dependencias necesarias para la API REST
const express = require("express");
const cors = require("cors"); // Permite solicitudes desde diferentes dominios
const path = require("node:path");
const { db, initDatabase } = require("./db"); // Sistema de base de datos SQLite

// CAMBIO: Importar configuración de entorno
const config = require("./env-config");

// CAMBIO: Importar autenticación JWT
const { authenticateToken, requireAdmin } = require("./auth");
const authRouter = require("./auth-routes");

// Crear instancia del servidor Express
const app = express();
// CAMBIO: Usar configuración de entorno
const PORT = config.port;
const HOST = config.host;

// CAMBIO: Middleware CORS diferenciado por entorno
app.use(cors(config.cors));
// Middleware: parsear JSON en las solicitudes
app.use(express.json());

// CAMBIO: Montar rutas de autenticación (permite login sin JWT)
app.use("/api/auth", authRouter);

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

  // Incrementar el contador en la tabla secuencias
  db.prepare("UPDATE secuencias SET ultimo_numero = ? WHERE nombre = ?").run(
    nextNumber,
    "AVAL"
  );

  // Insertar el nuevo aval en la tabla avales con valores por defecto
  const result = db
    .prepare(
      `INSERT INTO avales (
      fecha_registro,
      correlativo,
      direccion_administrativa,
      unidad_institucion,
      nombre_solicitante,
      cargo,
      fecha_solicitud,
      responsable,
      memorando_solicitud,
      estado,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      payload.fecha_registro,
      correlativo,
      payload.direccion_administrativa,
      payload.unidad_institucion,
      payload.nombre_solicitante,
      payload.cargo,
      payload.fecha_solicitud || null,
      payload.responsable || null,
      payload.memorando_solicitud,
      "ACTIVO",
      new Date().toLocaleString("es-ES", { timeZone: "UTC" })
    );

  // Devolver el aval creado
  return db.prepare("SELECT * FROM avales WHERE id = ?").get(result.lastInsertRowid);
});

// ENDPOINT GET: Health check - Confirma que el servidor está activo
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// ENDPOINT GET: Retornar lista de avales o cantidad de ellos con filtros
// CAMBIO: Protegido con JWT - requiere token válido
app.get("/api/avales", authenticateToken, (req, res) => {
  try {
    // Limpiar parámetros de búsqueda
    const correlativo = cleanQueryParam(req.query.correlativo);
    const solicitante = cleanQueryParam(req.query.solicitante);
    const fecha = cleanQueryParam(req.query.fecha);
    const estado = cleanQueryParam(req.query.estado);
    const limit = parseInt(req.query.limit, 10) || 100;
    const offset = parseInt(req.query.offset, 10) || 0;

    // Construir la query de base
    let query = "SELECT * FROM avales WHERE 1=1";
    const params = [];

    // Agregar filtros dinámicamente si están presentes
    if (correlativo) {
      query += " AND correlativo LIKE ?";
      params.push(`%${correlativo}%`);
    }
    if (solicitante) {
      query += " AND nombre_solicitante LIKE ?";
      params.push(`%${solicitante}%`);
    }
    if (fecha) {
      query += " AND fecha_registro LIKE ?";
      params.push(`%${fecha}%`);
    }
    if (estado) {
      query += " AND estado = ?";
      params.push(estado);
    }

    // Empezar con los más recientes
    query += " ORDER BY fecha_registro DESC, id DESC";
    query += ` LIMIT ${limit} OFFSET ${offset}`;

    // Ejecutar query
    const avales = db.prepare(query).all(...params);

    // Retornar respuesta
    res.json({
      data: avales,
      count: avales.length,
      limit,
      offset,
    });
  } catch (err) {
    console.error("Error al obtener avales:", err);
    return res.status(500).json({ error: "Error al obtener los avales" });
  }
});

// ENDPOINT GET: Obtener un aval específico por su ID
// CAMBIO: Protegido con JWT
app.get("/api/avales/:id", authenticateToken, (req, res) => {
  // Validar ID
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "ID inválido" });
  }

  // Buscar aval por ID
  const aval = db.prepare("SELECT * FROM avales WHERE id = ?").get(id);

  // Si no existe, retornar 404
  if (!aval) {
    return res.status(404).json({ error: "Aval no encontrado" });
  }

  // Retornar el aval encontrado
  res.json(aval);
});

// ENDPOINT POST: Crear un nuevo aval con un correlativo único generado automáticamente
// CAMBIO: Protegido con JWT - solo admin puede crear
app.post("/api/avales", authenticateToken, requireAdmin, (req, res) => {
  try {
    // Validar que todos los campos requeridos estén presentes
    const missingFields = requiredCreateFields.filter((field) => !req.body[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: "Campos requeridos faltantes",
        missing: missingFields,
      });
    }

    // TRANSACCIÓN: Crear aval dentro de una transacción
    const aval = createAvalTx(req.body);

    // Retornar el aval creado (status 201 para created)
    return res.status(201).json(aval);
  } catch (err) {
    console.error("Error al crear aval:", err);
    return res.status(500).json({ error: "Error al crear el aval" });
  }
});

// ENDPOINT PATCH: Actualizar campos específicos de un aval existente
// CAMBIO: Protegido con JWT - solo admin puede editar
app.patch("/api/avales/:id", authenticateToken, requireAdmin, (req, res) => {
  try {
    // Validar ID
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "ID inválido" });
    }

    // Obtener el aval actual
    const aval = db.prepare("SELECT * FROM avales WHERE id = ?").get(id);
    if (!aval) {
      return res.status(404).json({ error: "Aval no encontrado" });
    }

    // Validar que el aval no esté anulado (no se puede editar si está anulado)
    if (aval.estado === "ANULADO") {
      return res.status(400).json({ error: "No se puede editar un aval anulado" });
    }

    // Filtrar los campos que se pueden editar
    const updates = {};
    editableFields.forEach((field) => {
      if (field in req.body) {
        updates[field] = req.body[field];
      }
    });

    // Si no hay campos para actualizar, retornar error
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "Sin campos para actualizar" });
    }

    // Construir la query UPDATE dinámicamente
    const setClause = Object.keys(updates)
      .map((field) => `${field} = ?`)
      .join(", ");
    const setClause_Updated = `${setClause}, updated_at = datetime('now', 'localtime')`;
    const values = Object.values(updates);

    // Ejecutar update
    db.prepare(
      `UPDATE avales SET ${setClause_Updated} WHERE id = ?`
    ).run(...values, id);

    // Obtener y retornar el aval actualizado
    const updated = db.prepare("SELECT * FROM avales WHERE id = ?").get(id);
    return res.json(updated);
  } catch (err) {
    console.error("Error al actualizar aval:", err);
    return res.status(500).json({ error: "Error al actualizar el aval" });
  }
});

// ENDPOINT PATCH: Anular un aval existente (marca como inactivo)
// CAMBIO: Protegido con JWT - solo admin puede anular
app.patch("/api/avales/:id/anular", authenticateToken, requireAdmin, (req, res) => {
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
