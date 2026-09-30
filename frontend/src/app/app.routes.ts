import { Routes } from '@angular/router';
import { adminGuard, guestOnlyGuard, loggedInGuard } from './auth/guards';

// Titles are translation keys, shown by TranslatedTitleStrategy.
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
    title: 'title.cart',
    loadComponent: () => import('./cart/cart-page').then((m) => m.CartPage),
  },
  {
    path: 'checkout',
    title: 'title.checkout',
    canActivate: [loggedInGuard],
    loadComponent: () => import('./checkout/checkout-page').then((m) => m.CheckoutPage),
  },
  {
    path: 'checkout/confirmation/:id',
    title: 'title.confirmation',
    canActivate: [loggedInGuard],
    loadComponent: () => import('./checkout/confirmation-page').then((m) => m.ConfirmationPage),
  },
  {
    path: 'orders',
    title: 'title.orders',
    canActivate: [loggedInGuard],
    loadComponent: () => import('./orders/orders-page').then((m) => m.OrdersPage),
  },
  {
    path: 'orders/:id',
    title: 'title.order',
    canActivate: [loggedInGuard],
    loadComponent: () => import('./orders/order-page').then((m) => m.OrderPage),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./admin/admin-layout').then((m) => m.AdminLayout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'products' },
      {
        path: 'products',
        title: 'title.adminProducts',
        loadComponent: () => import('./admin/admin-products-page').then((m) => m.AdminProductsPage),
      },
      {
        path: 'products/new',
        title: 'title.adminNewProduct',
        loadComponent: () => import('./admin/product-form-page').then((m) => m.ProductFormPage),
      },
      {
        path: 'products/:id/edit',
        title: 'title.adminEditProduct',
        loadComponent: () => import('./admin/product-form-page').then((m) => m.ProductFormPage),
      },
      {
        path: 'orders',
        title: 'title.adminOrders',
        loadComponent: () => import('./admin/admin-orders-page').then((m) => m.AdminOrdersPage),
      },
      {
        path: 'orders/:id',
        title: 'title.adminOrder',
        loadComponent: () => import('./admin/admin-order-page').then((m) => m.AdminOrderPage),
      },
    ],
  },
  {
    path: 'login',
    title: 'title.login',
    canActivate: [guestOnlyGuard],
    loadComponent: () => import('./auth/login-page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    title: 'title.register',
    canActivate: [guestOnlyGuard],
    loadComponent: () => import('./auth/register-page').then((m) => m.RegisterPage),
  },
  {
    path: 'settings',
    title: 'title.settings',
    loadComponent: () => import('./settings/settings-page').then((m) => m.SettingsPage),
  },
  {
    path: 'status',
    title: 'title.status',
    loadComponent: () => import('./health/health-page').then((m) => m.HealthPage),
  },
  {
    path: '**',
    title: 'title.notFound',
    loadComponent: () => import('./not-found/not-found').then((m) => m.NotFound),
  },
];
