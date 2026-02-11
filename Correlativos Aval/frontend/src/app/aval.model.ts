export interface Aval {
  id: number;
  fecha_registro: string;
  correlativo: string;
  direccion_administrativa: string;
  unidad_institucion: string;
  nombre_solicitante: string;
  cargo: string;
  memorando_solicitud: string;
  estado: 'ACTIVO' | 'ANULADO';
  motivo_anulacion: string | null;
  anulado_at: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface AvalPayload {
  fecha_registro: string;
  direccion_administrativa: string;
  unidad_institucion: string;
  nombre_solicitante: string;
  cargo: string;
  memorando_solicitud: string;
}

export interface AvalFilters {
  correlativo?: string;
  solicitante?: string;
  fecha?: string;
  estado?: 'ACTIVO' | 'ANULADO' | '';
}
