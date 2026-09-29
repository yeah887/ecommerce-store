import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PricePipe } from '../shared/price.pipe';
import { QuantityPicker } from '../shared/quantity-picker';
import { CartStore } from './cart-store';
import { TranslatePipe, TranslatePluralPipe } from '../i18n/translate.pipe';

@Component({
  selector: 'app-cart-page',
  imports: [RouterLink, MatButtonModule, MatIconModule, PricePipe, QuantityPicker, TranslatePipe, TranslatePluralPipe],
  templateUrl: './cart-page.html',
})
export class CartPage {
  protected readonly cart = inject(CartStore);
}
