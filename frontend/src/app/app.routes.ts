import { Routes } from '@angular/router';
import { guestOnlyGuard, loggedInGuard } from './auth/guards';

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
    path: 'checkout',
    title: 'Checkout · Store',
    canActivate: [loggedInGuard],
    loadComponent: () => import('./checkout/checkout-page').then((m) => m.CheckoutPage),
  },
  {
    path: 'checkout/confirmation/:id',
    title: 'Order placed · Store',
    canActivate: [loggedInGuard],
    loadComponent: () => import('./checkout/confirmation-page').then((m) => m.ConfirmationPage),
  },
  {
    path: 'orders',
    title: 'My orders · Store',
    canActivate: [loggedInGuard],
    loadComponent: () => import('./orders/orders-page').then((m) => m.OrdersPage),
  },
  {
    path: 'orders/:id',
    title: 'Order · Store',
    canActivate: [loggedInGuard],
    loadComponent: () => import('./orders/order-page').then((m) => m.OrderPage),
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
