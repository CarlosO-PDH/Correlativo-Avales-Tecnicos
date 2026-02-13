// Importar los módulos necesarios
import { Injectable, inject } from '@angular/core'; // Inyección de dependencias de Angular
import { HttpClient, HttpParams } from '@angular/common/http'; // Cliente HTTP para llamadas al backend
import { map } from 'rxjs';
import { Aval, AvalFilters, AvalPayload } from './aval.model'; // Tipos/modelos de datos

// Servicio inyectable disponible globalmente en la aplicación
@Injectable({ providedIn: 'root' })
export class AvalesService {
  // Inyectar el cliente HTTP
  private readonly http = inject(HttpClient);
  // URL base de la API.
  // Use relative URL so it works when hosted centrally (same origin).
  private readonly baseUrl = '/api/avales';

  private buildParams(filters?: AvalFilters) {
    let params = new HttpParams();

    if (filters?.correlativo?.trim()) {
      params = params.set('correlativo', filters.correlativo.trim());
    }

    if (filters?.solicitante?.trim()) {
      params = params.set('solicitante', filters.solicitante.trim());
    }

    if (filters?.fecha?.trim()) {
      params = params.set('fecha', filters.fecha.trim());
    }

    if (filters?.estado?.trim()) {
      params = params.set('estado', filters.estado.trim());
    }

    return params;
  }

  // Método: Obtener lista de avales (sin paginación)
  getAll(filters?: AvalFilters) {
    const params = this.buildParams(filters);
    return this.http.get<Aval[]>(this.baseUrl, { params });
  }

  // Método: Obtener una página con total (paginación server-side)
  getPage(filters: AvalFilters | undefined, paging: { limit: number; offset: number }) {
    let params = this.buildParams(filters);
    params = params.set('limit', String(paging.limit));
    params = params.set('offset', String(paging.offset));

    return this.http
      .get<Aval[]>(this.baseUrl, { params, observe: 'response' })
      .pipe(
        map((resp) => {
          const total = Number(resp.headers.get('X-Total-Count') ?? 0);
          return { items: resp.body ?? [], total: Number.isFinite(total) ? total : 0 };
        })
      );
  }

  // Método: Obtener un aval por ID
  getById(id: number) {
    return this.http.get<Aval>(`${this.baseUrl}/${id}`);
  }

  // Método: Crear un nuevo aval
  // El backend genera automáticamente el correlativo
  create(payload: AvalPayload) {
    // POST envía los datos del nuevo aval y retorna el aval creado con su ID
    return this.http.post<Aval>(this.baseUrl, payload);
  }

  // Método: Actualizar campos especificos de un aval existente
  // No permite cambiar el correlativo ni el estado
  update(id: number, payload: Partial<AvalPayload>) {
    // PATCH actualiza parcialmente el registro (solo los campos enviados)
    return this.http.patch<Aval>(`${this.baseUrl}/${id}`, payload);
  }

  // Método: Anular un aval (marca como ANULADO e inmutable)
  anular(id: number, motivo: string) {
    // PATCH a endpoint /anular con el motivo de la anulación
    return this.http.patch<Aval>(`${this.baseUrl}/${id}/anular`, { motivo });
  }
}
