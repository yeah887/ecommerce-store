import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { PricePipe } from '../shared/price.pipe';
import { QuantityPicker } from '../shared/quantity-picker';
import { CartStore } from './cart-store';

@Component({
  selector: 'app-cart-page',
  imports: [RouterLink, MatButtonModule, MatDividerModule, MatIconModule, PricePipe, QuantityPicker],
  templateUrl: './cart-page.html',
  styleUrl: './cart-page.scss',
})
export class CartPage {
  protected readonly cart = inject(CartStore);
}
