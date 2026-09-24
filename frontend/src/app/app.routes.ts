import { Routes } from '@angular/router';
import { guestOnlyGuard } from './auth/guards';

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
    path: 'cart',
    title: 'Your cart · Store',
    loadComponent: () => import('./cart/cart-page').then((m) => m.CartPage),
  },
  {
    path: 'login',
    title: 'Log in · Store',
    canActivate: [guestOnlyGuard],
    loadComponent: () => import('./auth/login-page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    title: 'Create an account · Store',
    canActivate: [guestOnlyGuard],
    loadComponent: () => import('./auth/register-page').then((m) => m.RegisterPage),
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
