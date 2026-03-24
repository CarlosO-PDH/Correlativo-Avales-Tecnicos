import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import {
  InventarioItem,
  InventarioItemPayload,
  InventarioMovimiento,
  InventarioMovimientoPayload,
  InventarioResponsable
} from './inventario.model';

@Injectable({ providedIn: 'root' })
export class InventarioService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/inventario';

  getAll(filtro?: string) {
    let params = new HttpParams();
    if (filtro?.trim()) {
      params = params.set('q', filtro.trim());
    }

    return this.http.get<InventarioItem[]>(this.baseUrl, { params });
  }

  registrarMovimiento(id: number, payload: InventarioMovimientoPayload) {
    // CAMBIO: Se centraliza el registro de entradas y salidas para persistir inventario en backend.
    return this.http.patch<InventarioItem>(`${this.baseUrl}/${id}/movimiento`, payload);
  }

  corregirMovimiento(id: number, payload: InventarioMovimientoPayload) {
    // CAMBIO: Permite revertir una carga equivocada de entrada/salida sin borrar el insumo.
    return this.http.patch<InventarioItem>(`${this.baseUrl}/${id}/correccion`, payload);
  }

  crearItem(payload: InventarioItemPayload) {
    // CAMBIO: Alta de nuevos insumos para completar CRUD de inventario.
    return this.http.post<InventarioItem>(this.baseUrl, payload);
  }

  actualizarItem(id: number, payload: InventarioItemPayload) {
    // CAMBIO: Edicion de datos descriptivos y planificacion del insumo.
    return this.http.patch<InventarioItem>(`${this.baseUrl}/${id}`, payload);
  }

  eliminarItem(id: number) {
    // CAMBIO: Baja de item con eliminacion de su historial asociado.
    return this.http.delete<{ ok: true }>(`${this.baseUrl}/${id}`);
  }

  getMovimientos(id: number) {
    // CAMBIO: Historial cronologico para auditoria de movimientos por insumo.
    return this.http.get<InventarioMovimiento[]>(`${this.baseUrl}/${id}/movimientos`);
  }

  getMovimientosGlobal(filters?: { tipo?: string; responsable?: string; q?: string }) {
    let params = new HttpParams();

    if (filters?.tipo?.trim()) {
      params = params.set('tipo', filters.tipo.trim());
    }

    if (filters?.responsable?.trim()) {
      params = params.set('responsable', filters.responsable.trim());
    }

    if (filters?.q?.trim()) {
      params = params.set('q', filters.q.trim());
    }

    return this.http.get<InventarioMovimiento[]>(`${this.baseUrl}/movimientos`, { params });
  }

  getResponsables() {
    return this.http.get<InventarioResponsable[]>(`${this.baseUrl}/responsables`);
  }

  crearResponsable(nombre: string) {
    return this.http.post<InventarioResponsable>(`${this.baseUrl}/responsables`, { nombre });
  }

  registrarAjuste(id: number, payload: InventarioMovimientoPayload) {
    // CAMBIO: Permite registrar ajustes manuales y correcciones en inventario.
    return this.http.patch<InventarioItem>(`${this.baseUrl}/${id}/ajuste`, payload);
  }
}
