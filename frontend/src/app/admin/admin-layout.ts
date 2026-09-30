import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import type { TranslationKey } from '../i18n/en';
import { TranslatePipe } from '../i18n/translate.pipe';

/** Frame for the admin area: section switcher above the current admin page. */
@Component({
  selector: 'app-admin-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, TranslatePipe],
  template: `
    <div class="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-6">
      <div>
        <p class="eyebrow">{{ 'admin.eyebrow' | t }}</p>
        <p class="mt-1 text-sm text-zinc-500">{{ 'admin.subtitle' | t }}</p>
      </div>
      <nav class="inline-flex rounded-xl bg-zinc-100 p-1" [attr.aria-label]="'admin.sections' | t">
        @for (link of links; track link.path) {
          <a
            class="rounded-lg px-4 py-1.5 text-sm font-medium text-zinc-600 hover:text-zinc-900"
            [routerLink]="link.path"
            routerLinkActive="bg-surface !text-zinc-900 shadow-sm"
            ariaCurrentWhenActive="page"
          >
            {{ link.label | t }}
          </a>
        }
      </nav>
    </div>
    <router-outlet />
  `,
})
export class AdminLayout {
  protected readonly links: { path: string; label: TranslationKey }[] = [
    { path: '/admin/products', label: 'admin.products' },
    { path: '/admin/orders', label: 'admin.orders' },
  ];
}
