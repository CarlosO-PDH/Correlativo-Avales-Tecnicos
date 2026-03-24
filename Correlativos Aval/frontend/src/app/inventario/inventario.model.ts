export interface InventarioItem {
  id: number;
  correlativo: string;
  numero: number;
  insumo: string;
  presentacion: string;
  tamano_presentacion: string;
  stock: number;
  entrada: number;
  enero: number;
  febrero: number;
  marzo: number;
  abril: number;
  mayo: number;
  junio: number;
  julio: number;
  agosto: number;
  septiembre: number;
  octubre: number;
  noviembre: number;
  diciembre: number;
  egresos: number;
  total: number;
  requerir_2026: number;
  created_at: string;
  updated_at: string | null;
}

export interface InventarioMovimientoPayload {
  // CAMBIO: Agregar tipos de ajustes manuales además de entradas y salidas
  tipo: 'ENTRADA' | 'SALIDA' | 'CORRECCION_ENTRADA' | 'CORRECCION_SALIDA' | 'AJUSTE_MANUAL';
  cantidad: number;
  responsable: string;
  detalle?: string;
  mes?:
    | 'enero'
    | 'febrero'
    | 'marzo'
    | 'abril'
    | 'mayo'
    | 'junio'
    | 'julio'
    | 'agosto'
    | 'septiembre'
    | 'octubre'
    | 'noviembre'
    | 'diciembre';
}

export interface InventarioItemPayload {
  insumo: string;
  presentacion: string;
  tamano_presentacion: string;
  stock: number;
  requerir_2026: number;
}

export interface InventarioResponsable {
  id: number;
  nombre: string;
}

export interface InventarioMovimiento {
  id: number;
  inventario_id: number;
  tipo: 'ENTRADA' | 'SALIDA' | 'CORRECCION_ENTRADA' | 'CORRECCION_SALIDA';
  responsable: string;
  mes: string | null;
  cantidad: number;
  detalle: string | null;
  created_at: string;
  insumo?: string;
  presentacion?: string;
  tamano_presentacion?: string;
}
