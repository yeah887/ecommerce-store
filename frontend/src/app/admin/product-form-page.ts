import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import {
  FormBuilder,
  FormControl,
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
  IMAGE_UPLOAD,
  PRODUCT_LIMITS,
  isProductImageUrl,
  type Category,
  type Product,
  type ProductInput,
  type UploadedImage,
} from '@store/shared';
import { NotFound } from '../not-found/not-found';
import { apiError } from '../shared/api-error';
import { centsToEuroInput, parseEuroToCents } from './money';

type Field = 'name' | 'description' | 'price' | 'category' | 'images';

function euroPrice(control: AbstractControl<string>): ValidationErrors | null {
  if (!control.value) return null;
  const cents = parseEuroToCents(control.value);
  if (cents === null) return { price: 'Enter an amount like 12.99' };
  if (cents < 1 || cents > PRODUCT_LIMITS.maxPriceCents) return { price: 'Price must be between €0.01 and €100,000' };
  return null;
}

function imageCount(control: AbstractControl<string[]>): ValidationErrors | null {
  if (control.value.length === 0) return { images: 'Add at least one image' };
  if (control.value.length > PRODUCT_LIMITS.maxImages) return { images: `At most ${PRODUCT_LIMITS.maxImages} images` };
  return null;
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
  protected readonly imageTypes = IMAGE_UPLOAD.types.join(',');

  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(PRODUCT_LIMITS.nameMaxLength)]],
    description: ['', [Validators.required, Validators.maxLength(PRODUCT_LIMITS.descriptionMaxLength)]],
    price: ['', [Validators.required, euroPrice]],
    category: ['' as Category | '', Validators.required],
    images: new FormControl<string[]>([], { nonNullable: true, validators: imageCount }),
  });
  /** The image list as a signal for the template; `setImages` keeps it and the form control in step. */
  protected readonly images = signal<string[]>([]);
  protected readonly newImageUrl = signal('');
  protected readonly imageError = signal<string | null>(null);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly uploading = signal(false);
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
        images: product.images,
      });
      this.images.set(product.images);
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 404) this.notFound.set(true);
      else this.error.set("Couldn't load the product.");
    } finally {
      this.loading.set(false);
    }
  }

  /** The message to show under the images: a local problem, or a validation or server error. */
  protected imageMessage(): string | null {
    const control = this.form.controls.images;
    if (this.imageError()) return this.imageError();
    if (!control.touched || !control.errors) return null;
    return control.getError('server') ?? control.getError('images');
  }

  private setImages(images: string[]): void {
    this.images.set(images);
    const control = this.form.controls.images;
    control.setValue(images);
    control.markAsDirty();
    control.markAsTouched();
  }

  protected moveImage(index: number, offset: -1 | 1): void {
    const images = [...this.images()];
    [images[index], images[index + offset]] = [images[index + offset], images[index]];
    this.setImages(images);
  }

  protected removeImage(index: number): void {
    this.imageError.set(null);
    this.setImages(this.images().filter((_, i) => i !== index));
  }

  protected addImageUrl(): void {
    const url = this.newImageUrl().trim();
    if (!url) return;
    if (url.length > PRODUCT_LIMITS.imageUrlMaxLength || !isProductImageUrl(url)) {
      this.imageError.set('Enter a valid http(s) link to an image');
    } else if (this.images().includes(url)) {
      this.imageError.set('That image is already in the list');
    } else if (this.images().length >= PRODUCT_LIMITS.maxImages) {
      this.imageError.set(`A product can have at most ${PRODUCT_LIMITS.maxImages} images`);
    } else {
      this.imageError.set(null);
      this.setImages([...this.images(), url]);
      this.newImageUrl.set('');
    }
  }

  /** Uploads the chosen files one after another, adding each to the list as it arrives. */
  protected async upload(event: Event): Promise<void> {
    const fileInput = event.target as HTMLInputElement;
    const files = [...(fileInput.files ?? [])];
    // Clear the input so choosing the same files again still triggers a change.
    fileInput.value = '';
    if (files.length === 0) return;

    const problems: string[] = [];
    const room = PRODUCT_LIMITS.maxImages - this.images().length;
    if (files.length > room) {
      problems.push(`Only ${room} more ${room === 1 ? 'image fits' : 'images fit'}, so ${files.length - room} were skipped.`);
    }

    this.imageError.set(null);
    this.uploading.set(true);
    try {
      for (const file of files.slice(0, room)) {
        if (!(IMAGE_UPLOAD.types as readonly string[]).includes(file.type)) {
          problems.push(`${file.name} is not a JPEG, PNG, WebP or GIF image.`);
          continue;
        }
        if (file.size > IMAGE_UPLOAD.maxBytes) {
          problems.push(`${file.name} is larger than ${IMAGE_UPLOAD.maxBytes / 1024 / 1024} MB.`);
          continue;
        }
        try {
          const uploaded = await firstValueFrom(
            this.http.post<UploadedImage>('/api/admin/images', file, { headers: { 'Content-Type': file.type } }),
          );
          this.setImages([...this.images(), uploaded.url]);
        } catch (err) {
          problems.push(`${file.name}: ${apiError(err)?.message ?? "couldn't upload it"}.`);
        }
      }
    } finally {
      this.uploading.set(false);
    }
    if (problems.length > 0) this.imageError.set(problems.join(' '));
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
      images: value.images,
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
