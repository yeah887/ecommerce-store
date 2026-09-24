import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'Store',
    loadComponent: () => import('./catalog/catalog-page').then((m) => m.CatalogPage),
  },
  {
    path: 'status',
    title: 'System status · Store',
    loadComponent: () => import('./health/health-page').then((m) => m.HealthPage),
  },
];
