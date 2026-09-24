import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CartStore, type CartProduct } from './cart-store';

/** Adds to the cart and confirms with a snackbar that links to the cart. */
@Injectable({ providedIn: 'root' })
export class AddToCart {
  private readonly cart = inject(CartStore);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  add(product: CartProduct, quantity = 1): void {
    this.cart.add(product, quantity);
    const units = quantity > 1 ? `${quantity} × ` : '';
    this.snackBar
      .open(`Added ${units}${product.name} to your cart`, 'View cart', { duration: 4000 })
      .onAction()
      .subscribe(() => void this.router.navigate(['/cart']));
  }
}
