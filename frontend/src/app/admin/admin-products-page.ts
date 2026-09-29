import { HttpClient, httpResource } from '@angular/common/http';
import { Component, inject, input, linkedSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, type PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { firstValueFrom } from 'rxjs';
import { MAX_PAGE_SIZE, type Page, type Product } from '@store/shared';
import { I18n } from '../i18n/i18n';
import { Confirm } from '../shared/confirm-dialog';
import { PricePipe } from '../shared/price.pipe';
import { translatedPaginator } from '../i18n/paginator-intl';
import { CategoryPipe, TranslatePipe } from '../i18n/translate.pipe';

@Component({
  providers: [translatedPaginator],
  selector: 'app-admin-products-page',
  imports: [
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatTableModule,
    PricePipe,
    CategoryPipe,
    TranslatePipe,
  ],
  templateUrl: './admin-products-page.html',
})
export class AdminProductsPage {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly confirm = inject(Confirm);
  private readonly snackBar = inject(MatSnackBar);
  private readonly i18n = inject(I18n);

  // Bound from the URL query (?q=&page=).
  readonly q = input<string>();
  readonly page = input<string>();

  protected readonly pageSize = MAX_PAGE_SIZE;
  protected readonly columns = ['image', 'name', 'category', 'price', 'actions'];
  protected readonly searchText = linkedSignal(() => this.q() ?? '');

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
      title: this.i18n.t('admin.deleteTitle'),
      message: this.i18n.t('admin.deleteMessage', { name: product.name }),
      confirmLabel: this.i18n.t('admin.deleteConfirm'),
    });
    if (!confirmed) return;

    try {
      await firstValueFrom(this.http.delete(`/api/admin/products/${product.id}`));
      this.snackBar.open(this.i18n.t('admin.deleted', { name: product.name }), undefined, { duration: 3000 });
    } catch (err) {
      this.snackBar.open(this.i18n.errorMessage(err, 'admin.deleteFailed'), undefined, { duration: 5000 });
    }
    this.products.reload();
  }
}
