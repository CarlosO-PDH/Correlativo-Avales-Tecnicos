// Interfaz principal: Representa un aval técnico completo en la BD
export interface Aval {
  // ID único de la base de datos (generado automáticamente)
  id: number;
  // Fecha en que se registró el aval
  fecha_registro: string;
  // Fecha de solicitud (fecha en que ingresa el documento de solicitud)
  fecha_solicitud: string | null;
  // Código único del aval: DTI|DSST|AVAL|0001
  correlativo: string;
  // Dirección o departamento administrativo
  direccion_administrativa: string;
  // Unidad dentro de la institución
  unidad_institucion: string;
  // Nombre completo de quien solicita
  nombre_solicitante: string;
  // Puesto o cargo del solicitante
  cargo: string;
  // Responsable asignado internamente
  responsable: string | null;
  // Referencia del memorando de solicitud
  memorando_solicitud: string;
  // Estado del aval: ACTIVO o ANULADO
  estado: 'ACTIVO' | 'ANULADO';
  // Razón por la que se anuló el aval (null si está activo)
  motivo_anulacion: string | null;
  // Fecha y hora de anulación (null si está activo)
  anulado_at: string | null;
  // Fecha de creación
  created_at: string;
  // Última fecha de actualización
  updated_at: string | null;
}

// Interfaz para crear un nuevo aval
// Solo incluye los campos que el usuario debe ingresar
export interface AvalPayload {
  fecha_registro: string;           // Fecha de registro (YYYY-MM-DD)
  fecha_solicitud: string;          // Fecha solicitud (YYYY-MM-DD)
  direccion_administrativa: string; // Dirección administrativa
  unidad_institucion: string;       // Unidad
  nombre_solicitante: string;       // Nombre de quien solicita
  cargo: string;                    // Cargo del solicitante
  responsable: string;              // Responsable (seleccionado de lista)
  memorando_solicitud: string;      // Número o referencia de memorando
}

// Interfaz para parámetros de filtrado
// Todos los campos son opcionales
export interface AvalFilters {
  // Filtro por correlativo (búsqueda parcial)
  correlativo?: string;
  // Filtro por nombre del solicitante
  solicitante?: string;
  // Filtro por fecha exacta
  fecha?: string;
  // Filtro por estado (ACTIVO o ANULADO)
  estado?: 'ACTIVO' | 'ANULADO' | '';
}
