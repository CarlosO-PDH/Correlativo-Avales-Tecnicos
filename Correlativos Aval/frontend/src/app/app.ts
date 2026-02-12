// Importar lo necesario de Angular
import { Component, inject, signal } from '@angular/core';              // Decorador y utilidades del componente
import { CommonModule } from '@angular/common';                       // *ngIf, *ngFor, etc.
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms'; // Formularios reactivos
import { AvalesService } from './avales.service';                     // Servicio para llamadas HTTP
import { Aval, AvalFilters, AvalPayload } from './aval.model';        // Tipos de datos

// Decorador del componente: define selector, imports, template y estilos
@Component({
  selector: 'app-root',                           // Nombre del elemento HTML
  imports: [CommonModule, ReactiveFormsModule],   // Módulos que usa
  templateUrl: './app.html',                      // Archivo HTML del componente
  styleUrl: './app.css'                           // Archivo CSS del componente
})
export class App {
  // Inyectar el constructor de formularios
  private readonly fb = inject(FormBuilder);
  // Inyectar el servicio para hacer llamadas al backend
  private readonly avalesService = inject(AvalesService);

  // ===== SIGNALS: Estado reactivo del componente =====
  protected readonly loading = signal(false);           // Indica si se está cargando la lista
  protected readonly saving = signal(false);            // Indica si se está guardando un aval
  protected readonly errorMessage = signal('');         // Mensaje de error para mostrar
  protected readonly successMessage = signal('');       // Mensaje de éxito para mostrar
  protected readonly editingId = signal<number | null>(null); // ID del aval en edición (null si no se edita)
  protected readonly avales = signal<Aval[]>([]);      // Lista de avales obtenidos
  protected readonly activeFilters = signal<AvalFilters>({}); // Filtros activos actuales;

  // ===== FORMULARIO PRINCIPAL: Para crear/editar avales =====
  protected readonly form = this.fb.group({
    fecha_registro: ['', Validators.required],              // Requerido
    direccion_administrativa: ['', Validators.required],    // Requerido
    unidad_institucion: ['', Validators.required],          // Requerido
    nombre_solicitante: ['', Validators.required],          // Requerido
    cargo: ['', Validators.required],                       // Requerido
    memorando_solicitud: ['', Validators.required]          // Requerido
  });

  // ===== FORMULARIO DE FILTROS: Para buscar avales =====
  protected readonly filterForm = this.fb.group({
    correlativo: [''],     // Búsqueda por número de correlativo
    solicitante: [''],     // Búsqueda por nombre
    fecha: [''],           // Filtro por fecha
    estado: ['']           // Filtro por estado
  });

  // Constructor: se ejecuta al iniciar el componente
  constructor() {
    // Cargar avales al iniciar (con filtros vacíos)
    this.applyFilters();
  }

  // Getter: retorna true si actualmente se está editando un aval
  protected get isEditing() {
    return this.editingId() !== null;
  }

  // ===== SUBMITFORM: Crear o actualizar un aval =====
  protected submitForm() {
    // Limpiar mensajes anteriores
    this.clearMessages();

    // Validar que el formulario cumple todos los requisitos
    if (this.form.invalid) {
      // Marcar todos los campos como "tocados" para mostrar errores de validación
      this.form.markAllAsTouched();
      this.errorMessage.set('Completa todos los campos requeridos.');
      return;
    }

    // Obtener los datos del formulario
    const payload = this.form.getRawValue() as AvalPayload;

    // Mostrar indicador de guardado
    this.saving.set(true);

    // Si se está editando un aval existente
    if (this.isEditing) {
      // Llamar al servicio para actualizar
      this.avalesService.update(this.editingId() as number, payload).subscribe({
        next: () => {
          // Éxito
          this.successMessage.set('Aval actualizado correctamente.');
          this.resetForm();      // Limpiar formulario
          this.loadAvales();     // Recargar lista
        },
        error: (error) => {
          // Error
          this.errorMessage.set(error?.error?.error ?? 'No se pudo actualizar el aval.');
          this.saving.set(false);
        }
      });
      return;
    }

    // Si es un nuevo aval
    this.avalesService.create(payload).subscribe({
      next: (created) => {
        // Éxito: mostrar el correlativo generado
        this.successMessage.set(`Aval creado con correlativo ${created.correlativo}.`);
        this.resetForm();        // Limpiar formulario
        this.loadAvales();       // Recargar lista
      },
      error: (error) => {
        // Error
        this.errorMessage.set(error?.error?.error ?? 'No se pudo crear el aval.');
        this.saving.set(false);
      }
    });
  }

  // ===== STARTEDIT: Iniciar la edición de un aval =====
  protected startEdit(aval: Aval) {
    // No se pueden editar avales anulados
    if (aval.estado === 'ANULADO') {
      this.errorMessage.set('No se puede editar un aval anulado.');
      return;
    }

    this.clearMessages();
    // Guardar el ID del aval que se está editando
    this.editingId.set(aval.id);
    // Llenar el formulario con los datos actual del aval
    this.form.patchValue({
      fecha_registro: aval.fecha_registro,
      direccion_administrativa: aval.direccion_administrativa,
      unidad_institucion: aval.unidad_institucion,
      nombre_solicitante: aval.nombre_solicitante,
      cargo: aval.cargo,
      memorando_solicitud: aval.memorando_solicitud
    });
  }

  // ===== CANCELEDIT: Cancelar la edición actual =====
  protected cancelEdit() {
    this.resetForm();        // Limpiar el formulario
    this.clearMessages();    // Limpiar mensajes
  }

  // ===== TRACKBYID: Optimizar *ngFor para mejor rendimiento =====
  // Angular usa esto para saber qué items cambiaron en la lista
  protected trackById(_index: number, aval: Aval) {
    return aval.id;
  }

  // ===== APPLYFILTERS: Aplicar los filtros y cargar avales =====
  protected applyFilters() {
    // Obtener los valores del formulario de filtros
    const raw = this.filterForm.getRawValue();
    // Construir objeto de filtros normalizados
    const filters: AvalFilters = {
      correlativo: raw.correlativo ?? '',
      solicitante: raw.solicitante ?? '',
      fecha: raw.fecha ?? '',
      estado: (raw.estado ?? '') as AvalFilters['estado']
    };

    // Guardar los filtros activos
    this.activeFilters.set(filters);
    // Cargar avales con estos filtros
    this.loadAvales(filters);
  }

  // ===== CLEARFILTERS: Limpiar todos los filtros =====
  protected clearFilters() {
    // Restaurar el formulario de filtros a vacío
    this.filterForm.reset({
      correlativo: '',
      solicitante: '',
      fecha: '',
      estado: ''
    });
    // Limpiar filtros activos
    this.activeFilters.set({});
    // Cargar avales sin filtros (todos)
    this.loadAvales({});
  }

  // ===== ANULARAVAL: Anular un aval existente =====
  protected anularAval(aval: Aval) {
    this.clearMessages();

    // Validar que no esté ya anulado
    if (aval.estado === 'ANULADO') {
      this.errorMessage.set('Este aval ya esta anulado.');
      return;
    }

    // Pedir al usuario que ingrese el motivo de anulación
    const motivo = window.prompt(`Motivo de anulacion para ${aval.correlativo}:`);
    // Si el usuario cancela o deja en blanco
    if (!motivo || motivo.trim() === '') {
      this.errorMessage.set('La anulacion requiere un motivo.');
      return;
    }

    this.saving.set(true);
    // Llamar al servicio para anular
    this.avalesService.anular(aval.id, motivo.trim()).subscribe({
      next: () => {
        // Éxito
        this.successMessage.set(`Aval ${aval.correlativo} anulado correctamente.`);
        // Si se estaba editando este aval, limpiar el formulario
        if (this.editingId() === aval.id) {
          this.resetForm();
        }
        // Recargar con los filtros actuales
        this.loadAvales(this.activeFilters());
      },
      error: (error) => {
        // Error
        this.errorMessage.set(error?.error?.error ?? 'No se pudo anular el aval.');
        this.saving.set(false);
      }
    });
  }

  // ===== PRINTHISTORIAL: Imprimir el listado de avales =====
  protected printHistorial() {
    // Utilizar la función nativa del navegador para imprimir
    window.print();
  }

  // ===== PRIVATE METHODS =====

  // Método privado: Cargar lista de avales desde el backend
  private loadAvales(filters?: AvalFilters) {
    // Mostrar indicador de carga
    this.loading.set(true);
    // Llamar al servicio con los filtros
    this.avalesService.getAll(filters).subscribe({
      next: (items) => {
        // Éxito: guardar avales en el signal
        this.avales.set(items);
        // Ocultar indicadores
        this.loading.set(false);
        this.saving.set(false);
      },
      error: () => {
        // Error
        this.errorMessage.set('No se pudo cargar el listado de avales.');
        this.loading.set(false);
        this.saving.set(false);
      }
    });
  }

  // Método privado: Limpiar y resetear el formulario principal
  private resetForm() {
    this.form.reset({
      fecha_registro: '',
      direccion_administrativa: '',
      unidad_institucion: '',
      nombre_solicitante: '',
      cargo: '',
      memorando_solicitud: ''
    });
    this.editingId.set(null);    // Dejar de editar
    this.saving.set(false);      // Ocultar indicador de guardado
  }

  // Método privado: Limpiar mensajes de error y éxito
  private clearMessages() {
    this.errorMessage.set('');
    this.successMessage.set('');
  }
}
