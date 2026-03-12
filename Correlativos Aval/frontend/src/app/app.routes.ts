import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    // CAMBIO: El inicio ahora apunta al dashboard para vista general.
    redirectTo: 'dashboard'
  },
  {
    // CAMBIO: Nueva ruta principal para resumen operativo del portal.
    path: 'dashboard',
    loadComponent: () => import('./dashboard/dashboard.component').then((m) => m.DashboardComponent)
  },
  {
    // CAMBIO: Modulo avales tecnicos organizado por pestañas internas.
    path: 'avales',
    loadComponent: () =>
      import('./avales-tecnicos/avales-tecnicos.component').then((m) => m.AvalesTecnicosComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'registro'
      },
      {
        path: 'registro',
        loadComponent: () => import('./registro/registro.component').then((m) => m.RegistroComponent)
      },
      {
        path: 'historial',
        loadComponent: () => import('./historial/historial.component').then((m) => m.HistorialComponent)
      }
    ]
  },
  {
    // CAMBIO: Rutas antiguas se redirigen para mantener compatibilidad de enlaces guardados.
    path: 'registro',
    redirectTo: 'avales/registro'
  },
  {
    path: 'historial',
    redirectTo: 'avales/historial'
  },
  {
    // CAMBIO: Nueva ruta para el modulo de inventario de insumos.
    path: 'inventario',
    loadComponent: () => import('./inventario/inventario.component').then((m) => m.InventarioComponent)
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
