import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { AvalesService } from '../avales.service';
import { InventarioService } from '../inventario/inventario.service';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterLink, MatCardModule, MatButtonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  private readonly avalesService = inject(AvalesService);
  private readonly inventarioService = inject(InventarioService);

  readonly totalAvales = signal(0);
  readonly avalesActivos = signal(0);
  readonly avalesAnulados = signal(0);
  readonly lineasInventario = signal(0);
  readonly stockInventario = signal(0);

  readonly totalMovimientos = computed(() => this.avalesActivos() + this.stockInventario());

  constructor() {
    // CAMBIO: El dashboard consume avales para mostrar indicadores operativos del modulo existente.
    this.avalesService
      .getAll()
      .pipe(takeUntilDestroyed())
      .subscribe((rows) => {
        this.totalAvales.set(rows.length);
        this.avalesActivos.set(rows.filter((item) => item.estado === 'ACTIVO').length);
        this.avalesAnulados.set(rows.filter((item) => item.estado === 'ANULADO').length);
      });

    // CAMBIO: El dashboard incorpora metricas del inventario para vista unificada del portal.
    this.inventarioService
      .getAll()
      .pipe(takeUntilDestroyed())
      .subscribe((rows) => {
        this.lineasInventario.set(rows.length);
        this.stockInventario.set(rows.reduce((acc, item) => acc + item.total, 0));
      });
  }
}
