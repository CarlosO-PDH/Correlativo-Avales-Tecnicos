import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';

import { AvalesService } from '../avales.service';
import { Aval, AvalFilters } from '../aval.model';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-historial',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule
  ],
  templateUrl: './historial.component.html',
  styleUrl: './historial.component.css'
})
export class HistorialComponent {
  private readonly fb = inject(FormBuilder);
  private readonly avalesService = inject(AvalesService);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');

  protected readonly avales = signal<Aval[]>([]);
  protected readonly total = signal(0);

  protected readonly pageSize = signal<10 | 25 | 50>(25);
  protected readonly pageIndex = signal(0); // 0-based

  protected readonly filterForm = this.fb.group({
    correlativo: [''],
    solicitante: [''],
    fecha: [''],
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
      fecha: '',
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
    const filters: AvalFilters = {
      correlativo: raw.correlativo ?? '',
      solicitante: raw.solicitante ?? '',
      fecha: raw.fecha ?? '',
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
