import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { AvalesService } from '../avales.service';
import { AvalPayload } from '../aval.model';
import { toDate, toYmd } from '../date-utils';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { MatDividerModule } from '@angular/material/divider';
import { TextFieldModule } from '@angular/cdk/text-field';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-registro',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatDividerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    TextFieldModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  templateUrl: './registro.component.html',
  styleUrl: './registro.component.css',
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'es-GT' }
  ]
})
export class RegistroComponent {
  private readonly fb = inject(FormBuilder);
  private readonly avalesService = inject(AvalesService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

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
    fecha_registro: [null as Date | null, Validators.required],
    fecha_solicitud: [null as Date | null, Validators.required],
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

    const raw = this.form.getRawValue();
    const payload: AvalPayload = {
      fecha_registro: toYmd(raw.fecha_registro),
      fecha_solicitud: toYmd(raw.fecha_solicitud),
      direccion_administrativa: String(raw.direccion_administrativa ?? '').trim(),
      unidad_institucion: String(raw.unidad_institucion ?? '').trim(),
      nombre_solicitante: String(raw.nombre_solicitante ?? '').trim(),
      cargo: String(raw.cargo ?? '').trim(),
      responsable: String(raw.responsable ?? '').trim(),
      memorando_solicitud: String(raw.memorando_solicitud ?? '').trim()
    };
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
        this.saving.set(false);
        this.showSuccessDialog(created.correlativo);
        this.resetForm();
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

  protected clearNewForm() {
    if (!this.form.dirty) {
      this.resetForm();
      this.clearMessages();
      return;
    }

    const ok = window.confirm('Deseas limpiar el formulario? Se perderan los cambios no guardados.');
    if (!ok) return;

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
          fecha_registro: toDate(aval.fecha_registro),
          fecha_solicitud: toDate(aval.fecha_solicitud),
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
      fecha_registro: null,
      fecha_solicitud: null,
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

  // CAMBIO: Ahora muestra modal profesional en lugar de mensaje simple
  private showSuccessDialog(correlativo: string) {
    const dialogRef = this.dialog.open(RegistroSuccessDialogComponent, {
      width: '400px',
      data: { correlativo },
      disableClose: false
    });

    dialogRef.afterClosed().subscribe();
  }

  protected copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      this.snackBar.open('Correlativo copiado al portapapeles', 'Cerrar', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom'
      });
    });
  }
}

// CAMBIO: Componente de diálogo para mostrar éxito al crear aval
@Component({
  selector: 'app-registro-success-dialog',
  imports: [CommonModule, MatButtonModule, MatIconModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title> Aval Creado </h2>
    <mat-dialog-content>
      <p>El aval se ha registrado correctamente.</p>
      <div class="correlativo-box">
        <span class="correlativo-label">Correlativo:</span>
        <span class="correlativo-value">{{ data.correlativo }}</span>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-flat-button color="primary" (click)="copyCorrelativo()">
        <mat-icon>content_copy</mat-icon>
        Copiar
      </button>
      <button mat-stroked-button (click)="close()">Cerrar</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .correlativo-box {
      background: #f5f5f5;
      padding: 16px;
      border-radius: 8px;
      margin-top: 16px;
      text-align: center;
    }
    .correlativo-label {
      display: block;
      font-size: 12px;
      color: #666;
      margin-bottom: 4px;
    }
    .correlativo-value {
      font-size: 20px;
      font-weight: bold;
      color: #1976d2;
    }
    mat-dialog-actions {
      padding: 16px 0 0;
    }
  `]
})
export class RegistroSuccessDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<RegistroSuccessDialogComponent>);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly data = inject(MAT_DIALOG_DATA);

  protected copyCorrelativo() {
    const correlativo = this.data.correlativo;
    navigator.clipboard.writeText(correlativo).then(() => {
      this.snackBar.open('Correlativo copiado', 'Cerrar', { duration: 2000 });
    });
  }

  protected close() {
    this.dialogRef.close();
  }
}
