import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

/** Frame for the admin area: section switcher above the current admin page. */
@Component({
  selector: 'app-admin-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-6">
      <div>
        <p class="eyebrow">Admin</p>
        <p class="mt-1 text-sm text-zinc-500">Manage the catalog and fulfil orders.</p>
      </div>
      <nav class="inline-flex rounded-xl bg-zinc-100 p-1" aria-label="Admin sections">
        @for (link of links; track link.path) {
          <a
            class="rounded-lg px-4 py-1.5 text-sm font-medium text-zinc-600 hover:text-zinc-900"
            [routerLink]="link.path"
            routerLinkActive="bg-white !text-zinc-900 shadow-sm"
            ariaCurrentWhenActive="page"
          >
            {{ link.label }}
          </a>
        }
      </nav>
    </div>
    <router-outlet />
  `,
})
export class AdminLayout {
  protected readonly links = [
    { path: '/admin/products', label: 'Products' },
    { path: '/admin/orders', label: 'Orders' },
  ];
}
