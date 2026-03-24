import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatPaginatorModule } from '@angular/material/paginator';
import { debounceTime, distinctUntilChanged, startWith } from 'rxjs';
import { formatDmy } from '../date-utils';
import { InventarioItem, InventarioMovimiento, InventarioResponsable } from './inventario.model';
import { InventarioService } from './inventario.service';

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTabsModule,
    MatPaginatorModule
  ],
  templateUrl: './inventario.component.html',
  styleUrl: './inventario.component.css'
})
export class InventarioComponent {
  // CAMBIO: Timer para autocierre del modal de resultado en 3 segundos.
  private resultadoTimer: ReturnType<typeof setTimeout> | null = null;
  // --- Paginación para tabla de insumos ---
  readonly pageSize = signal<10 | 25 | 50>(25);
  readonly pageIndex = signal(0); // 0-based

  get pagedItems() {
    const all = this.items();
    const start = this.pageIndex() * this.pageSize();
    return all.slice(start, start + this.pageSize());
  }

  onPage(event: any) {
    this.pageSize.set(event.pageSize);
    this.pageIndex.set(event.pageIndex);
  }
  private readonly inventarioService = inject(InventarioService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly formatDmy = formatDmy;

  readonly filtro = new FormControl('', { nonNullable: true });
  readonly itemId = new FormControl<number | null>(null);

  readonly tipo = new FormControl<'ENTRADA' | 'SALIDA'>('ENTRADA', { nonNullable: true });
  readonly mes = new FormControl<string>('enero', { nonNullable: true });
  readonly cantidad = new FormControl<number>(1, { nonNullable: true });
  readonly detalle = new FormControl('', { nonNullable: true });
  readonly responsable = new FormControl('', { nonNullable: true });

  readonly historialQ = new FormControl('', { nonNullable: true });
  readonly historialTipo = new FormControl('', { nonNullable: true });
  readonly historialResponsable = new FormControl('', { nonNullable: true });
  readonly modalResponsableAbierto = signal(false);
  readonly modalResponsableNombre = new FormControl('', { nonNullable: true });

  readonly modalAbierto = signal(false);
  readonly modalModo = signal<'create' | 'edit'>('create');
  readonly modalItemId = signal<number | null>(null);
  readonly modalInsumo = new FormControl('', { nonNullable: true });
  readonly modalPresentacion = new FormControl('', { nonNullable: true });
  readonly modalTamano = new FormControl('', { nonNullable: true });
  // CAMBIO: Controles para todos los campos editables en el modal
  readonly modalStock = new FormControl<number>(0, { nonNullable: true }); // Stock actual
  readonly modalRequerir = new FormControl<number>(0, { nonNullable: true }); // Stock mínimo
  readonly modalEntrada = new FormControl<number>(0, { nonNullable: true }); // Ingresos
  readonly modalEgresos = new FormControl<number>(0, { nonNullable: true }); // Egresos
  readonly modalRequerimientoAnual = new FormControl<number>(0, { nonNullable: true }); // Requerimiento Anual

  readonly items = signal<InventarioItem[]>([]);
  readonly responsables = signal<InventarioResponsable[]>([]);
  readonly movimientosGlobal = signal<InventarioMovimiento[]>([]);
  
  // CAMBIO: Computed property que calcula resumen de totales del inventario
  // Stock = entrada - egresos (se calcula, no se almacena en base de datos)
  readonly resumen = computed(() => {
    const items = this.items();
    return {
      totalStock: items.reduce((sum, item) => sum + (item.entrada - item.egresos), 0),
      totalEgresos: items.reduce((sum, item) => sum + (item.egresos || 0), 0),
      totalIngresos: items.reduce((sum, item) => sum + (item.entrada || 0), 0)
    };
  });

  readonly cargando = signal(false);
  readonly procesando = signal(false);
  readonly mensaje = signal('');
  // CAMBIO: Estado del modal de resultado para confirmar acciones exitosas al usuario.
  readonly modalResultadoAbierto = signal(false);
  readonly modalResultadoTexto = signal('');

  readonly meses = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre'
  ] as const;

  // CAMBIO: Declaración de FormControls para ajustes de inventario
  ajusteTipo!: FormControl<'CORRECCION_ENTRADA' | 'CORRECCION_SALIDA' | 'AJUSTE_MANUAL'>;
  ajusteOperacion!: FormControl<'suma' | 'resta'>;
  ajusteCantidad!: FormControl<number>;
  ajusteResponsable!: FormControl<string>;
  ajusteDetalle!: FormControl<string>;

  constructor() {
    // CAMBIO: Flujo por pestañas con recarga reactiva para inventario e historial.
    this.filtro.valueChanges
      .pipe(startWith(''), debounceTime(250), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.cargarInventario(value));

    this.historialQ.valueChanges
      .pipe(startWith(''), debounceTime(250), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.cargarHistorialGlobal());

    this.historialTipo.valueChanges.pipe(startWith(''), takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.cargarHistorialGlobal();
    });

    this.historialResponsable.valueChanges
      .pipe(startWith(''), debounceTime(250), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.cargarHistorialGlobal());

    this.cargarResponsables();

    // CAMBIO: Inicialización de FormControls de ajustes de inventario
    this.ajusteTipo = new FormControl<'CORRECCION_ENTRADA' | 'CORRECCION_SALIDA' | 'AJUSTE_MANUAL'>('AJUSTE_MANUAL', { nonNullable: true });
    this.ajusteOperacion = new FormControl<'suma' | 'resta'>('resta', { nonNullable: true });
    this.ajusteCantidad = new FormControl<number>(0, { nonNullable: true });
    this.ajusteResponsable = new FormControl<string>('', { nonNullable: true });
    this.ajusteDetalle = new FormControl<string>('', { nonNullable: true });
  }

  abrirModalNuevo() {
    this.modalModo.set('create');
    this.modalItemId.set(null);
    this.modalInsumo.setValue('');
    this.modalPresentacion.setValue('');
    this.modalTamano.setValue('');
    this.modalStock.setValue(0);
    this.modalRequerir.setValue(0);
    this.modalEntrada.setValue(0);
    this.modalEgresos.setValue(0);
    this.modalRequerimientoAnual.setValue(0);
    this.modalAbierto.set(true);
  }

  abrirModalEditar(item: InventarioItem) {
    this.itemId.setValue(item.id);
    this.modalModo.set('edit');
    this.modalItemId.set(item.id);
    this.modalInsumo.setValue(item.insumo);
    this.modalPresentacion.setValue(item.presentacion);
    this.modalTamano.setValue(item.tamano_presentacion);
    this.modalStock.setValue(item.stock);
    this.modalRequerir.setValue(item.requerir_2026);
    this.modalEntrada.setValue(item.entrada);
    this.modalEgresos.setValue(item.egresos);
    this.modalRequerimientoAnual.setValue(item.requerir_2026); // Si es diferente, ajustar aquí
    this.modalAbierto.set(true);
  }

  cerrarModal() {
    this.modalAbierto.set(false);
  }

  guardarModal() {
    const payload = this.obtenerPayloadModal();
    if (!payload) return;

    this.procesando.set(true);

    if (this.modalModo() === 'create') {
      // CAMBIO: Crear insumo desde modal para mantener un solo flujo de edicion.
      this.inventarioService
        .crearItem(payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (created) => {
            this.procesando.set(false);
            this.modalAbierto.set(false);
            // CAMBIO: Reemplaza mensaje plano por modal amigable de confirmacion.
            this.mostrarResultadoExitoso('Insumo creado correctamente.');
            this.cargarInventario(this.filtro.value, created.id);
          },
          error: (error) => {
            this.procesando.set(false);
            this.setMensaje(error?.error?.error ?? error?.error?.detail ?? 'No se pudo crear el insumo.');
          }
        });
      return;
    }

    const id = this.modalItemId();
    if (!id) {
      this.procesando.set(false);
      this.setMensaje('No se encontro el item para actualizar.');
      return;
    }

    this.inventarioService
      .actualizarItem(id, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.procesando.set(false);
          this.modalAbierto.set(false);
          // CAMBIO: Reemplaza mensaje plano por modal amigable de confirmacion.
          this.mostrarResultadoExitoso('Insumo actualizado correctamente.');
          this.cargarInventario(this.filtro.value, id);
        },
        error: (error) => {
          this.procesando.set(false);
          this.setMensaje(error?.error?.error ?? error?.error?.detail ?? 'No se pudo actualizar el insumo.');
        }
      });
  }

  eliminarDesdeModal() {
    const id = this.modalItemId();
    if (!id) {
      this.setMensaje('No se encontro el item para eliminar.');
      return;
    }

    // CAMBIO: Confirmacion obligatoria antes de eliminar para evitar bajas accidentales.
    if (!window.confirm('Esta accion eliminara el insumo y su historial. Deseas continuar?')) {
      return;
    }

    this.procesando.set(true);
    this.inventarioService
      .eliminarItem(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.procesando.set(false);
          this.modalAbierto.set(false);
          this.itemId.setValue(null, { emitEvent: false });
          // CAMBIO: Reemplaza mensaje plano por modal amigable de confirmacion.
          this.mostrarResultadoExitoso('Insumo eliminado correctamente.');
          this.cargarInventario(this.filtro.value);
          this.cargarHistorialGlobal();
        },
        error: (error) => {
          this.procesando.set(false);
          this.setMensaje(error?.error?.error ?? error?.error?.detail ?? 'No se pudo eliminar el insumo.');
        }
      });
  }

  registrarMovimiento() {
    const id = this.itemId.value;
    const tipo = this.tipo.value;
    const cantidad = Number(this.cantidad.value);
    const responsable = this.responsable.value.trim();

    if (!id) return this.setMensaje('Selecciona un insumo para registrar el movimiento.');
    if (!responsable) return this.setMensaje('Responsable es obligatorio.');
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      return this.setMensaje('La cantidad debe ser un entero mayor que cero.');
    }

    this.procesando.set(true);
    this.inventarioService
      .registrarMovimiento(id, {
        tipo,
        cantidad,
        responsable,
        detalle: this.detalle.value,
        mes: tipo === 'SALIDA' ? (this.mes.value as (typeof this.meses)[number]) : undefined
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.postMovimientoExitoso('Movimiento registrado correctamente.'),
        error: (error) => {
          this.procesando.set(false);
          this.setMensaje(error?.error?.error ?? error?.error?.detail ?? 'No se pudo registrar el movimiento.');
        }
      });
  }

  corregirMovimiento() {
    const id = this.itemId.value;
    const tipo = this.tipo.value;
    const cantidad = Number(this.cantidad.value);
    const responsable = this.responsable.value.trim();

    if (!id) return this.setMensaje('Selecciona un insumo para corregir el movimiento.');
    if (!responsable) return this.setMensaje('Responsable es obligatorio.');
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      return this.setMensaje('La cantidad debe ser un entero mayor que cero.');
    }

    this.procesando.set(true);
    this.inventarioService
      .corregirMovimiento(id, {
        tipo,
        cantidad,
        responsable,
        detalle: this.detalle.value,
        mes: tipo === 'SALIDA' ? (this.mes.value as (typeof this.meses)[number]) : undefined
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.postMovimientoExitoso('Correccion aplicada correctamente.'),
        error: (error) => {
          this.procesando.set(false);
          this.setMensaje(error?.error?.error ?? error?.error?.detail ?? 'No se pudo corregir el movimiento.');
        }
      });
  }

  crearResponsable() {
    const nombre = this.modalResponsableNombre.value.trim();
    if (!nombre) {
      this.setMensaje('Escribe un nombre para el nuevo responsable.');
      return;
    }

    this.inventarioService
      .crearResponsable(nombre)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (created) => {
          this.modalResponsableNombre.setValue('');
          this.modalResponsableAbierto.set(false);
          this.responsable.setValue(created.nombre);
          // CAMBIO: Reemplaza mensaje plano por modal amigable de confirmacion.
          this.mostrarResultadoExitoso('Responsable agregado correctamente.');
          this.cargarResponsables();
        },
        error: (error) => {
          this.setMensaje(error?.error?.error ?? error?.error?.detail ?? 'No se pudo crear el responsable.');
        }
      });
  }

  abrirModalResponsable() {
    // CAMBIO: Modal pequeno para alta rapida de responsable sin usar prompt del navegador.
    this.modalResponsableNombre.setValue('');
    this.modalResponsableAbierto.set(true);
  }

  cerrarModalResponsable() {
    this.modalResponsableAbierto.set(false);
  }

  private postMovimientoExitoso(mensaje: string) {
    this.procesando.set(false);
    this.cantidad.setValue(1);
    this.detalle.setValue('');
    // CAMBIO: Reemplaza mensaje plano por modal amigable de confirmacion.
    this.mostrarResultadoExitoso(mensaje);
    this.cargarInventario(this.filtro.value, this.itemId.value ?? undefined);
    this.cargarHistorialGlobal();
  }

  private cargarInventario(filtro: string, seleccionarId?: number) {
    this.cargando.set(true);

    this.inventarioService
      .getAll(filtro)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => {
          this.items.set(rows);
          this.cargando.set(false);
          this.pageIndex.set(0); // Reiniciar a la primera página al filtrar/cargar

          if (rows.length === 0) {
            this.itemId.setValue(null, { emitEvent: false });
            return;
          }

          const idObjetivo = seleccionarId ?? this.itemId.value ?? rows[0].id;
          const existe = rows.some((row) => row.id === idObjetivo);
          this.itemId.setValue(existe ? idObjetivo : rows[0].id);
        },
        error: () => {
          this.cargando.set(false);
          this.setMensaje('No se pudo cargar el inventario desde el servidor.');
        }
      });
  }

  private cargarHistorialGlobal() {
    this.inventarioService
      .getMovimientosGlobal({
        q: this.historialQ.value,
        tipo: this.historialTipo.value,
        responsable: this.historialResponsable.value
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => this.movimientosGlobal.set(rows),
        error: () => this.movimientosGlobal.set([])
      });
  }

  private cargarResponsables() {
    this.inventarioService
      .getResponsables()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rows) => {
          this.responsables.set(rows);

          if (!this.responsable.value && rows.length > 0) {
            this.responsable.setValue(rows[0].nombre);
          }
        },
        error: () => {
          this.responsables.set([]);
        }
      });
  }

  private obtenerPayloadModal() {
    const insumo = this.modalInsumo.value.trim();
    const presentacion = this.modalPresentacion.value.trim();
    const tamano = this.modalTamano.value.trim();
    const stock = Number(this.modalStock.value);
    const requerir = Number(this.modalRequerir.value);
    const entrada = Number(this.modalEntrada.value);
    const egresos = Number(this.modalEgresos.value);
    const requerimientoAnual = Number(this.modalRequerimientoAnual.value);

    if (!insumo || !presentacion || !tamano) {
      this.setMensaje('Completa insumo, presentacion y tamano.');
      return null;
    }
    // Validaciones básicas
    if ([stock, requerir, entrada, egresos, requerimientoAnual].some(v => !Number.isInteger(v) || v < 0)) {
      this.setMensaje('Todos los campos numéricos deben ser enteros positivos.');
      return null;
    }

    // CAMBIO: Devuelve todos los campos editables (ajustar backend si es necesario)
    return {
      insumo,
      presentacion,
      tamano_presentacion: tamano,
      stock,
      requerir_2026: requerir,
      entrada,
      egresos,
      requerimiento_anual: requerimientoAnual
    };
  }

  private setMensaje(value: string) {
    this.mensaje.set(value);
  }

  getModalCorrelativo() {
    const id = this.modalItemId();
    return this.items().find((item) => item.id === id)?.correlativo ?? '';
  }

  // --- Ajustes de inventario ---
  registrarAjuste() {
    const id = this.itemId.value;
    const tipo = this.ajusteTipo.value;
    let cantidad = Number(this.ajusteCantidad.value);
    const responsable = this.ajusteResponsable.value.trim();
    const detalle = this.ajusteDetalle.value;
    const operacion = this.ajusteOperacion.value;

    if (!id) { this.setMensaje('Selecciona un insumo para registrar el ajuste.'); return; }
    if (!responsable) { this.setMensaje('Responsable es obligatorio.'); return; }
    
    // CAMBIO: Validar que sea un entero válido (puede ser negativo)
    if (!Number.isInteger(cantidad)) {
      this.setMensaje('La cantidad debe ser un número entero.'); return;
    }
    if (cantidad === 0) {
      this.setMensaje('La cantidad no puede ser cero.'); return;
    }

    // CAMBIO: Para CORRECCION_ENTRADA y CORRECCION_SALIDA, siempre resta la cantidad
    // Para AJUSTE_MANUAL, usar el selector de operacion (suma/resta)
    if (tipo === 'CORRECCION_ENTRADA' || tipo === 'CORRECCION_SALIDA') {
      cantidad = -Math.abs(cantidad); // Asegurar que sea negativo
    } else if (operacion === 'resta') {
      cantidad = -Math.abs(cantidad); // Asegurar que sea negativo
    }

    this.procesando.set(true);
    this.inventarioService
      .registrarAjuste(id, {
        tipo,
        cantidad,
        responsable,
        detalle
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.procesando.set(false);
          this.ajusteCantidad.setValue(0);
          this.ajusteDetalle.setValue('');
          // CAMBIO: Reemplaza mensaje plano por modal amigable de confirmacion.
          this.mostrarResultadoExitoso('Ajuste registrado correctamente.');
          this.cargarInventario(this.filtro.value, id);
          this.cargarHistorialGlobal();
        },
        error: (error: any) => {
          this.procesando.set(false);
          this.setMensaje(error?.error?.error ?? error?.error?.detail ?? 'No se pudo registrar el ajuste.');
        }
      });
  }

  cerrarModalResultado() {
    if (this.resultadoTimer) {
      clearTimeout(this.resultadoTimer);
      this.resultadoTimer = null;
    }
    this.modalResultadoAbierto.set(false);
  }

  private mostrarResultadoExitoso(texto: string) {
    this.modalResultadoTexto.set(texto);
    this.modalResultadoAbierto.set(true);

    if (this.resultadoTimer) {
      clearTimeout(this.resultadoTimer);
    }

    // CAMBIO: Autocierre del modal a los 3 segundos para no interrumpir el flujo del usuario.
    this.resultadoTimer = setTimeout(() => {
      this.modalResultadoAbierto.set(false);
      this.resultadoTimer = null;
    }, 3000);
  }
}
