import { HttpClient, httpResource } from '@angular/common/http';
import { Component, inject, input, linkedSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, type PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { firstValueFrom } from 'rxjs';
import { CATEGORY_LABELS, MAX_PAGE_SIZE, type Page, type Product } from '@store/shared';
import { apiError } from '../shared/api-error';
import { Confirm } from '../shared/confirm-dialog';
import { PricePipe } from '../shared/price.pipe';

@Component({
  selector: 'app-admin-products-page',
  imports: [
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatTableModule,
    PricePipe,
  ],
  templateUrl: './admin-products-page.html',
  styleUrl: './admin-products-page.scss',
})
export class AdminProductsPage {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly confirm = inject(Confirm);
  private readonly snackBar = inject(MatSnackBar);

  // Bound from the URL query (?q=&page=).
  readonly q = input<string>();
  readonly page = input<string>();

  protected readonly pageSize = MAX_PAGE_SIZE;
  protected readonly categoryLabels = CATEGORY_LABELS;
  protected readonly columns = ['image', 'name', 'category', 'price', 'actions'];
  protected readonly searchText = linkedSignal(() => this.q() ?? '');

  protected categoryLabel(product: Product): string {
    return this.categoryLabels[product.category];
  }

  private pageNumber(): number {
    const page = Number(this.page());
    return Number.isInteger(page) && page >= 1 ? page : 1;
  }

  // The admin list reuses the public catalog endpoint: admins see exactly what customers can buy.
  protected readonly products = httpResource<Page<Product>>(() => {
    const params: Record<string, string | number> = { page: this.pageNumber(), pageSize: this.pageSize };
    const q = this.q()?.trim();
    if (q) params['q'] = q;
    return { url: '/api/products', params };
  });

  protected search(): void {
    void this.router.navigate([], {
      queryParams: { q: this.searchText().trim() || null, page: null },
      queryParamsHandling: 'merge',
    });
  }

  protected changePage(event: PageEvent): void {
    void this.router.navigate([], {
      queryParams: { page: event.pageIndex === 0 ? null : event.pageIndex + 1 },
      queryParamsHandling: 'merge',
    });
  }

  protected async remove(product: Product): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: 'Delete this product?',
      message: `“${product.name}” will be removed from the store. Past orders keep their copy of it.`,
      confirmLabel: 'Delete',
    });
    if (!confirmed) return;

    try {
      await firstValueFrom(this.http.delete(`/api/admin/products/${product.id}`));
      this.snackBar.open(`Deleted “${product.name}”`, undefined, { duration: 3000 });
    } catch (err) {
      this.snackBar.open(apiError(err)?.message ?? "Couldn't delete the product", undefined, { duration: 5000 });
    }
    this.products.reload();
  }
}
