import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';

import { AvalesService } from '../avales.service';
import { Aval, AvalFilters } from '../aval.model';
import { formatDmy, toYmd } from '../date-utils';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';

@Component({
  selector: 'app-historial',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatTableModule,
    MatPaginatorModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  templateUrl: './historial.component.html',
  styleUrl: './historial.component.css',
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'es-GT' }
  ]
})
export class HistorialComponent {
  protected readonly formatDmy = formatDmy;
    // Exportar a Excel (.xls)
  protected exportExcel() {
      const rows = this.avales();
      if (!rows.length) {
        alert('No hay registros para exportar.');
        return;
      }
      // Mapeo explícito de columnas a propiedades de Aval
      const columns = [
        { key: 'correlativo', label: 'Correlativo' },
        { key: 'fecha_registro', label: 'Fecha Registro' },
        { key: 'fecha_solicitud', label: 'Fecha Solicitud' },
        { key: 'responsable', label: 'Responsable' },
        { key: 'estado', label: 'Estado' },
        { key: 'nombre_solicitante', label: 'Solicitante' },
        { key: 'cargo', label: 'Cargo' },
        { key: 'memorando_solicitud', label: 'Memorando' },
        { key: 'motivo_anulacion', label: 'Motivo Anulación' }
      ];
      let table = '<table><thead><tr>';
      for (const col of columns) {
        table += `<th>${col.label}</th>`;
      }
      table += '</tr></thead><tbody>';
      for (const row of rows) {
        table += '<tr>';
        for (const col of columns) {
          const cell = (row as any)[col.key];
          const value = col.key === 'fecha_registro' || col.key === 'fecha_solicitud'
            ? formatDmy(cell)
            : (cell ?? '');
          table += `<td>${value}</td>`;
        }
        table += '</tr>';
      }
      table += '</tbody></table>';
      const blob = new Blob([
        '<html><head><meta charset="utf-8"></head><body>',
        table,
        '</body></html>'
      ], { type: 'application/vnd.ms-excel' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'historial_avales.xls';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  private readonly fb = inject(FormBuilder);
  private readonly avalesService = inject(AvalesService);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');

  protected readonly avales = signal<Aval[]>([]);
  protected readonly total = signal(0);
  protected readonly displayedColumns = [
    'correlativo',
    'fecha_registro',
    'fecha_solicitud',
    'responsable',
    'estado',
    'nombre_solicitante',
    'cargo',
    'memorando_solicitud',
    'actions'
  ];
  // Manejo de paginación Material
  protected onPage(event: any) {
    this.pageSize.set(event.pageSize);
    this.pageIndex.set(event.pageIndex);
    this.loadPage();
  }

  protected readonly pageSize = signal<10 | 25 | 50>(25);
  protected readonly pageIndex = signal(0); // 0-based

  protected readonly filterForm = this.fb.group({
    correlativo: [''],
    solicitante: [''],
    fecha: [null as Date | null],
    estado: ['']
  });

  constructor() {
    this.loadPage();
  }

  protected trackById(_index: number, aval: Aval) {
    return aval.id;
  }

  protected applyFilters() {
    this.pageIndex.set(0);
    this.loadPage();
  }

  protected clearFilters() {
    this.filterForm.reset({
      correlativo: '',
      solicitante: '',
      fecha: null,
      estado: ''
    });
    this.pageIndex.set(0);
    this.loadPage();
  }

  protected changePageSize(value: string) {
    const next = Number(value);
    if (next === 10 || next === 25 || next === 50) {
      this.pageSize.set(next);
      this.pageIndex.set(0);
      this.loadPage();
    }
  }

  protected prevPage() {
    if (!this.canPrev) return;
    this.pageIndex.set(this.pageIndex() - 1);
    this.loadPage();
  }

  protected nextPage() {
    if (!this.canNext) return;
    this.pageIndex.set(this.pageIndex() + 1);
    this.loadPage();
  }

  protected get canPrev() {
    return this.pageIndex() > 0;
  }

  protected get canNext() {
    return (this.pageIndex() + 1) * this.pageSize() < this.total();
  }

  protected get rangeLabel() {
    const total = this.total();
    if (total === 0) return '0';
    const start = this.pageIndex() * this.pageSize() + 1;
    const end = Math.min((this.pageIndex() + 1) * this.pageSize(), total);
    return `${start}-${end} de ${total}`;
  }

  protected startEdit(aval: Aval) {
    this.router.navigate(['/registro'], { queryParams: { id: aval.id } });
  }

  protected anularAval(aval: Aval) {
    this.clearMessages();

    if (aval.estado === 'ANULADO') {
      this.errorMessage.set('Este aval ya esta anulado.');
      return;
    }

    const motivo = window.prompt(`Motivo de anulacion para ${aval.correlativo}:`);
    if (!motivo || motivo.trim() === '') {
      this.errorMessage.set('La anulacion requiere un motivo.');
      return;
    }

    this.saving.set(true);
    this.avalesService.anular(aval.id, motivo.trim()).subscribe({
      next: () => {
        this.successMessage.set(`Aval ${aval.correlativo} anulado correctamente.`);
        this.saving.set(false);
        this.loadPage();
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.error ?? 'No se pudo anular el aval.');
        this.saving.set(false);
      }
    });
  }

  protected printHistorial() {
    window.print();
  }

  private loadPage() {
    this.loading.set(true);
    this.clearMessages();

    const raw = this.filterForm.getRawValue();
    const fechaYmd = toYmd(raw.fecha);
    const filters: AvalFilters = {
      correlativo: raw.correlativo ?? '',
      solicitante: raw.solicitante ?? '',
      fecha: fechaYmd,
      estado: (raw.estado ?? '') as AvalFilters['estado']
    };

    const limit = this.pageSize();
    const offset = this.pageIndex() * limit;

    this.avalesService.getPage(filters, { limit, offset }).subscribe({
      next: ({ items, total }) => {
        this.avales.set(items);
        this.total.set(total);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudo cargar el historial de avales.');
        this.loading.set(false);
      }
    });
  }

  private clearMessages() {
    this.errorMessage.set('');
    this.successMessage.set('');
  }
}
