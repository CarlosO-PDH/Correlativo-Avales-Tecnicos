import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { AvalesService } from '../avales.service';
import { AvalPayload } from '../aval.model';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-registro',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule
  ],
  templateUrl: './registro.component.html',
  styleUrl: './registro.component.css'
})
export class RegistroComponent {
  private readonly fb = inject(FormBuilder);
  private readonly avalesService = inject(AvalesService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly saving = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');
  protected readonly editingId = signal<number | null>(null);

  // Lista fija (oficina). Si necesita ser dinámica, mover a backend/DB.
  protected readonly responsables = [
    'Ana Patricia García Reyes',
    'Carlos Enrique Orozco Menéndez',
    'Christian Randolfo Valdez Policarpio',
    'Estuardo Adolfo Huertas Sajché',
    'Wilfredo Orlando de León Guachín'
  ];

  protected readonly form = this.fb.group({
    fecha_registro: ['', Validators.required],
    fecha_solicitud: ['', Validators.required],
    direccion_administrativa: ['', Validators.required],
    unidad_institucion: ['', Validators.required],
    nombre_solicitante: ['', Validators.required],
    cargo: ['', Validators.required],
    responsable: ['', Validators.required],
    memorando_solicitud: ['', Validators.required]
  });

  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      const rawId = params.get('id');
      const id = rawId ? Number(rawId) : NaN;
      if (Number.isInteger(id) && id > 0) {
        this.loadForEdit(id);
      } else {
        this.editingId.set(null);
      }
    });
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

    const editingId = this.editingId();
    if (editingId) {
      this.avalesService.update(editingId, payload).subscribe({
        next: () => {
          this.successMessage.set('Aval actualizado correctamente.');
          this.saving.set(false);
          this.router.navigate(['/historial']);
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
        this.saving.set(false);
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.error ?? 'No se pudo crear el aval.');
        this.saving.set(false);
      }
    });
  }

  protected cancelEdit() {
    this.router.navigate(['/registro']);
    this.resetForm();
    this.clearMessages();
  }

  private loadForEdit(id: number) {
    this.clearMessages();
    this.saving.set(true);
    this.avalesService.getById(id).subscribe({
      next: (aval) => {
        this.editingId.set(aval.id);
        this.form.patchValue({
          fecha_registro: aval.fecha_registro,
          fecha_solicitud: aval.fecha_solicitud ?? '',
          direccion_administrativa: aval.direccion_administrativa,
          unidad_institucion: aval.unidad_institucion,
          nombre_solicitante: aval.nombre_solicitante,
          cargo: aval.cargo,
          responsable: aval.responsable ?? '',
          memorando_solicitud: aval.memorando_solicitud
        });
        this.saving.set(false);
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.error ?? 'No se pudo cargar el aval.');
        this.editingId.set(null);
        this.saving.set(false);
      }
    });
  }

  private resetForm() {
    this.form.reset({
      fecha_registro: '',
      fecha_solicitud: '',
      direccion_administrativa: '',
      unidad_institucion: '',
      nombre_solicitante: '',
      cargo: '',
      responsable: '',
      memorando_solicitud: ''
    });
  }

  private clearMessages() {
    this.errorMessage.set('');
    this.successMessage.set('');
  }
}
