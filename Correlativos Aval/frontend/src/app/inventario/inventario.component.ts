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
import { debounceTime, distinctUntilChanged, startWith } from 'rxjs';
import { formatDmy } from '../date-utils';
import { InventarioItem, InventarioMovimiento, InventarioResponsable } from './inventario.model';
import { InventarioService } from './inventario.service';

@Component({
  selector: 'app-inventario',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatTabsModule
  ],
  templateUrl: './inventario.component.html',
  styleUrl: './inventario.component.css'
})
export class InventarioComponent {
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
  readonly modalStock = new FormControl<number>(0, { nonNullable: true });
  readonly modalRequerir = new FormControl<number>(0, { nonNullable: true });

  readonly items = signal<InventarioItem[]>([]);
  readonly responsables = signal<InventarioResponsable[]>([]);
  readonly movimientosGlobal = signal<InventarioMovimiento[]>([]);
  readonly cargando = signal(false);
  readonly procesando = signal(false);
  readonly mensaje = signal('');

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

  readonly resumen = computed(() => {
    const base = this.items();
    return {
      lineas: base.length,
      totalStock: base.reduce((acc, item) => acc + item.total, 0),
      totalRequerido: base.reduce((acc, item) => acc + item.requerir_2026, 0),
      totalEgresos: base.reduce((acc, item) => acc + item.egresos, 0)
    };
  });

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
  }

  abrirModalNuevo() {
    this.modalModo.set('create');
    this.modalItemId.set(null);
    this.modalInsumo.setValue('');
    this.modalPresentacion.setValue('');
    this.modalTamano.setValue('');
    this.modalStock.setValue(0);
    this.modalRequerir.setValue(0);
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
            this.setMensaje('Insumo creado correctamente.');
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
          this.setMensaje('Insumo actualizado correctamente.');
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
          this.setMensaje('Insumo eliminado correctamente.');
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
          this.setMensaje('Responsable agregado correctamente.');
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
    this.setMensaje(mensaje);
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

    if (!insumo || !presentacion || !tamano) {
      this.setMensaje('Completa insumo, presentacion y tamano.');
      return null;
    }

    if (!Number.isInteger(stock) || stock < 0 || !Number.isInteger(requerir) || requerir < 0) {
      this.setMensaje('Stock y requerir 2026 deben ser enteros positivos.');
      return null;
    }

    return {
      insumo,
      presentacion,
      tamano_presentacion: tamano,
      stock,
      requerir_2026: requerir
    };
  }

  private setMensaje(value: string) {
    this.mensaje.set(value);
  }

  getModalCorrelativo() {
    const id = this.modalItemId();
    return this.items().find((item) => item.id === id)?.correlativo ?? '';
  }
}
