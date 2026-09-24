import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  type AbstractControl,
  type ValidationErrors,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import {
  CATEGORIES,
  CATEGORY_LABELS,
  PRODUCT_LIMITS,
  type Category,
  type Product,
  type ProductInput,
} from '@store/shared';
import { NotFound } from '../not-found/not-found';
import { apiError } from '../shared/api-error';
import { centsToEuroInput, parseEuroToCents } from './money';

type Field = 'name' | 'description' | 'price' | 'category' | 'imageUrl';

function euroPrice(control: AbstractControl<string>): ValidationErrors | null {
  if (!control.value) return null;
  const cents = parseEuroToCents(control.value);
  if (cents === null) return { price: 'Enter an amount like 12.99' };
  if (cents < 1 || cents > PRODUCT_LIMITS.maxPriceCents) return { price: 'Price must be between €0.01 and €100,000' };
  return null;
}

function httpUrl(control: AbstractControl<string>): ValidationErrors | null {
  if (!control.value) return null;
  try {
    const url = new URL(control.value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:' ? null : { url: true };
  } catch {
    return { url: true };
  }
}

/** Create (`/admin/products/new`) or edit (`/admin/products/:id/edit`) a product. */
@Component({
  selector: 'app-product-form-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
    NotFound,
  ],
  templateUrl: './product-form-page.html',
  styleUrl: './product-form-page.scss',
})
export class ProductFormPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  /** Bound from the `:id` route parameter; absent when creating. */
  readonly id = input<string>();

  protected readonly categories = CATEGORIES;
  protected readonly categoryLabels = CATEGORY_LABELS;
  protected readonly limits = PRODUCT_LIMITS;

  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(PRODUCT_LIMITS.nameMaxLength)]],
    description: ['', [Validators.required, Validators.maxLength(PRODUCT_LIMITS.descriptionMaxLength)]],
    price: ['', [Validators.required, euroPrice]],
    category: ['' as Category | '', Validators.required],
    imageUrl: ['', [Validators.required, Validators.maxLength(PRODUCT_LIMITS.imageUrlMaxLength), httpUrl]],
  });

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly notFound = signal(false);
  protected readonly error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    const id = this.id();
    if (!id) return;
    this.loading.set(true);
    try {
      const product = await firstValueFrom(this.http.get<Product>(`/api/products/${encodeURIComponent(id)}`));
      this.form.setValue({
        name: product.name,
        description: product.description,
        price: centsToEuroInput(product.priceCents),
        category: product.category,
        imageUrl: product.imageUrl,
      });
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 404) this.notFound.set(true);
      else this.error.set("Couldn't load the product.");
    } finally {
      this.loading.set(false);
    }
  }

  protected async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const input: ProductInput = {
      name: value.name.trim(),
      description: value.description.trim(),
      priceCents: parseEuroToCents(value.price)!,
      category: value.category as Category,
      imageUrl: value.imageUrl.trim(),
    };

    this.saving.set(true);
    this.error.set(null);
    try {
      const id = this.id();
      const saved = id
        ? await firstValueFrom(this.http.put<Product>(`/api/admin/products/${id}`, input))
        : await firstValueFrom(this.http.post<Product>('/api/admin/products', input));
      this.snackBar.open(id ? `Saved “${saved.name}”` : `Created “${saved.name}”`, undefined, { duration: 3000 });
      await this.router.navigate(['/admin/products']);
    } catch (err) {
      const body = apiError(err);
      for (const [field, message] of Object.entries(body?.fields ?? {})) {
        const control = this.form.controls[(field === 'priceCents' ? 'price' : field) as Field];
        control?.setErrors({ server: message });
        control?.markAsTouched();
      }
      this.error.set(body?.message ?? "Couldn't save the product.");
    } finally {
      this.saving.set(false);
    }
  }
}
