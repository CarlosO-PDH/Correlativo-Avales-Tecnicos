import { Routes } from '@angular/router';

export const routes: Routes = [
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
  },
  {
    path: '**',
    redirectTo: 'registro'
  }
];
