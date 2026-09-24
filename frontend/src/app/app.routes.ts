import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'Store',
    loadComponent: () => import('./health/health-page').then((m) => m.HealthPage),
  },
];
