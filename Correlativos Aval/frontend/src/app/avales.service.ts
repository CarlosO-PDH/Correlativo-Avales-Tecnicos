// Importar los módulos necesarios
import { Injectable, inject } from '@angular/core'; // Inyección de dependencias de Angular
import { HttpClient, HttpParams } from '@angular/common/http'; // Cliente HTTP para llamadas al backend
import { Aval, AvalFilters, AvalPayload } from './aval.model'; // Tipos/modelos de datos

// Servicio inyectable disponible globalmente en la aplicación
@Injectable({ providedIn: 'root' })
export class AvalesService {
  // Inyectar el cliente HTTP
  private readonly http = inject(HttpClient);
  // URL base de la API.
  // Use relative URL so it works when hosted centrally (same origin).
  private readonly baseUrl = '/api/avales';

  // Método: Obtener lista de avales con filtros opcionales
  getAll(filters?: AvalFilters) {
    // Crear objeto de parámetros HTTP
    let params = new HttpParams();

    // Si hay filtro de correlativo, agregarlo a los parámetros
    if (filters?.correlativo?.trim()) {
      params = params.set('correlativo', filters.correlativo.trim());
    }

    // Si hay filtro de solicitante, agregarlo
    if (filters?.solicitante?.trim()) {
      params = params.set('solicitante', filters.solicitante.trim());
    }

    // Si hay filtro de fecha, agregarlo
    if (filters?.fecha?.trim()) {
      params = params.set('fecha', filters.fecha.trim());
    }

    // Si hay filtro de estado, agregarlo
    if (filters?.estado?.trim()) {
      params = params.set('estado', filters.estado.trim());
    }

    // Hacer petición GET y retornar un Observable de lista de Avales
    return this.http.get<Aval[]>(this.baseUrl, { params });
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
