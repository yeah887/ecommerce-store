import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { firstValueFrom } from 'rxjs';
import {
  SHIPPING_FIELD_MAX_LENGTH,
  type CreateOrderRequest,
  type Order,
  type ShippingAddress,
} from '@store/shared';
import { AuthService } from '../auth/auth.service';
import { CartStore, type CartLine } from '../cart/cart-store';
import { apiError } from '../shared/api-error';
import { PricePipe } from '../shared/price.pipe';

type AddressField = keyof ShippingAddress;

/** A cart line the server refused, with its reason. */
interface RejectedLine {
  line: CartLine;
  reason: string;
}

@Component({
  selector: 'app-checkout-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    PricePipe,
  ],
  templateUrl: './checkout-page.html',
  styleUrl: './checkout-page.scss',
})
export class CheckoutPage {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  protected readonly cart = inject(CartStore);

  private readonly max = SHIPPING_FIELD_MAX_LENGTH;
  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: [inject(AuthService).user()?.name ?? '', [Validators.required, Validators.maxLength(this.max.name)]],
    street: ['', [Validators.required, Validators.maxLength(this.max.street)]],
    postalCode: ['', [Validators.required, Validators.maxLength(this.max.postalCode)]],
    city: ['', [Validators.required, Validators.maxLength(this.max.city)]],
    country: ['', [Validators.required, Validators.maxLength(this.max.country)]],
  });
  protected readonly addressFields: { key: AddressField; label: string; autocomplete: string }[] = [
    { key: 'name', label: 'Full name', autocomplete: 'shipping name' },
    { key: 'street', label: 'Street and number', autocomplete: 'shipping street-address' },
    { key: 'postalCode', label: 'Postal code', autocomplete: 'shipping postal-code' },
    { key: 'city', label: 'City', autocomplete: 'shipping address-level2' },
    { key: 'country', label: 'Country', autocomplete: 'shipping country-name' },
  ];

  protected readonly placing = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly rejected = signal<RejectedLine[]>([]);
  /** Rejected lines still in the cart; the list empties as the customer removes them. */
  protected readonly stillRejected = computed(() =>
    this.rejected().filter((r) => this.cart.lines().some((l) => l.productId === r.line.productId)),
  );

  /** Hide the error once every item it complained about has been removed from the cart. */
  protected readonly visibleError = computed(() =>
    this.rejected().length > 0 && this.stillRejected().length === 0 ? null : this.error(),
  );

  protected async placeOrder(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const lines = this.cart.lines();
    const request: CreateOrderRequest = {
      lines: lines.map(({ productId, quantity }) => ({ productId, quantity })),
      shippingAddress: this.form.getRawValue(),
    };

    this.placing.set(true);
    this.error.set(null);
    this.rejected.set([]);
    try {
      const order = await firstValueFrom(this.http.post<Order>('/api/orders', request));
      this.cart.clear();
      await this.router.navigate(['/checkout/confirmation', order.id], { state: { order } });
    } catch (err) {
      this.showError(err, lines);
    } finally {
      this.placing.set(false);
    }
  }

  private showError(err: unknown, sentLines: CartLine[]): void {
    const body = apiError(err);
    const fields = body?.fields ?? {};

    if (body?.code === 'invalid_lines') {
      const rejected: RejectedLine[] = [];
      for (const [key, reason] of Object.entries(fields)) {
        const line = sentLines[Number(key.split('.')[1])];
        if (line) rejected.push({ line, reason });
      }
      this.rejected.set(rejected);
    }
    for (const [key, message] of Object.entries(fields)) {
      if (key.startsWith('shippingAddress.')) {
        const control = this.form.controls[key.split('.')[1] as AddressField];
        control?.setErrors({ server: message });
        control?.markAsTouched();
      }
    }
    this.error.set(body?.message ?? "We couldn't place your order. Please try again.");
  }
}
