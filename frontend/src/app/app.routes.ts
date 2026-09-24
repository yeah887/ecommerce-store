import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'Store',
    loadComponent: () => import('./catalog/catalog-page').then((m) => m.CatalogPage),
  },
  {
    path: 'products/:id',
    loadComponent: () => import('./product/product-page').then((m) => m.ProductPage),
  },
  {
    path: 'status',
    title: 'System status · Store',
    loadComponent: () => import('./health/health-page').then((m) => m.HealthPage),
  },
  {
    path: '**',
    title: 'Page not found · Store',
    loadComponent: () => import('./not-found/not-found').then((m) => m.NotFound),
  },
];
