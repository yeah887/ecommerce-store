import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { I18n } from '../i18n/i18n';
import { CartStore, type CartProduct } from './cart-store';

/** Adds to the cart and confirms with a snackbar that links to the cart. */
@Injectable({ providedIn: 'root' })
export class AddToCart {
  private readonly cart = inject(CartStore);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18n);

  add(product: CartProduct, quantity = 1): void {
    this.cart.add(product, quantity);
    const message =
      quantity > 1
        ? this.i18n.t('cart.addedMany', { count: quantity, name: product.name })
        : this.i18n.t('cart.added', { name: product.name });
    this.snackBar
      .open(message, this.i18n.t('cart.view'), { duration: 4000 })
      .onAction()
      .subscribe(() => void this.router.navigate(['/cart']));
  }
}
