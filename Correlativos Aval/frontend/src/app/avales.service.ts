import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Aval, AvalFilters, AvalPayload } from './aval.model';

@Injectable({ providedIn: 'root' })
export class AvalesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000/api/avales';

  getAll(filters?: AvalFilters) {
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

    return this.http.get<Aval[]>(this.baseUrl, { params });
  }

  create(payload: AvalPayload) {
    return this.http.post<Aval>(this.baseUrl, payload);
  }

  update(id: number, payload: Partial<AvalPayload>) {
    return this.http.patch<Aval>(`${this.baseUrl}/${id}`, payload);
  }

  anular(id: number, motivo: string) {
    return this.http.patch<Aval>(`${this.baseUrl}/${id}/anular`, { motivo });
  }
}
