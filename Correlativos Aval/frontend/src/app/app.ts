import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AvalesService } from './avales.service';
import { Aval, AvalFilters, AvalPayload } from './aval.model';

@Component({
  selector: 'app-root',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private readonly fb = inject(FormBuilder);
  private readonly avalesService = inject(AvalesService);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');
  protected readonly editingId = signal<number | null>(null);
  protected readonly avales = signal<Aval[]>([]);
  protected readonly activeFilters = signal<AvalFilters>({});

  protected readonly form = this.fb.group({
    fecha_registro: ['', Validators.required],
    direccion_administrativa: ['', Validators.required],
    unidad_institucion: ['', Validators.required],
    nombre_solicitante: ['', Validators.required],
    cargo: ['', Validators.required],
    memorando_solicitud: ['', Validators.required]
  });

  protected readonly filterForm = this.fb.group({
    correlativo: [''],
    solicitante: [''],
    fecha: [''],
    estado: ['']
  });

  constructor() {
    this.applyFilters();
  }

  protected get isEditing() {
    return this.editingId() !== null;
  }

  protected submitForm() {
    this.clearMessages();

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set('Completa todos los campos requeridos.');
      return;
    }

    const payload = this.form.getRawValue() as AvalPayload;

    this.saving.set(true);

    if (this.isEditing) {
      this.avalesService.update(this.editingId() as number, payload).subscribe({
        next: () => {
          this.successMessage.set('Aval actualizado correctamente.');
          this.resetForm();
          this.loadAvales();
        },
        error: (error) => {
          this.errorMessage.set(error?.error?.error ?? 'No se pudo actualizar el aval.');
          this.saving.set(false);
        }
      });
      return;
    }

    this.avalesService.create(payload).subscribe({
      next: (created) => {
        this.successMessage.set(`Aval creado con correlativo ${created.correlativo}.`);
        this.resetForm();
        this.loadAvales();
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.error ?? 'No se pudo crear el aval.');
        this.saving.set(false);
      }
    });
  }

  protected startEdit(aval: Aval) {
    if (aval.estado === 'ANULADO') {
      this.errorMessage.set('No se puede editar un aval anulado.');
      return;
    }

    this.clearMessages();
    this.editingId.set(aval.id);
    this.form.patchValue({
      fecha_registro: aval.fecha_registro,
      direccion_administrativa: aval.direccion_administrativa,
      unidad_institucion: aval.unidad_institucion,
      nombre_solicitante: aval.nombre_solicitante,
      cargo: aval.cargo,
      memorando_solicitud: aval.memorando_solicitud
    });
  }

  protected cancelEdit() {
    this.resetForm();
    this.clearMessages();
  }

  protected trackById(_index: number, aval: Aval) {
    return aval.id;
  }

  protected applyFilters() {
    const raw = this.filterForm.getRawValue();
    const filters: AvalFilters = {
      correlativo: raw.correlativo ?? '',
      solicitante: raw.solicitante ?? '',
      fecha: raw.fecha ?? '',
      estado: (raw.estado ?? '') as AvalFilters['estado']
    };

    this.activeFilters.set(filters);
    this.loadAvales(filters);
  }

  protected clearFilters() {
    this.filterForm.reset({
      correlativo: '',
      solicitante: '',
      fecha: '',
      estado: ''
    });
    this.activeFilters.set({});
    this.loadAvales({});
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
        if (this.editingId() === aval.id) {
          this.resetForm();
        }
        this.loadAvales(this.activeFilters());
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

  private loadAvales(filters?: AvalFilters) {
    this.loading.set(true);
    this.avalesService.getAll(filters).subscribe({
      next: (items) => {
        this.avales.set(items);
        this.loading.set(false);
        this.saving.set(false);
      },
      error: () => {
        this.errorMessage.set('No se pudo cargar el listado de avales.');
        this.loading.set(false);
        this.saving.set(false);
      }
    });
  }

  private resetForm() {
    this.form.reset({
      fecha_registro: '',
      direccion_administrativa: '',
      unidad_institucion: '',
      nombre_solicitante: '',
      cargo: '',
      memorando_solicitud: ''
    });
    this.editingId.set(null);
    this.saving.set(false);
  }

  private clearMessages() {
    this.errorMessage.set('');
    this.successMessage.set('');
  }
}
