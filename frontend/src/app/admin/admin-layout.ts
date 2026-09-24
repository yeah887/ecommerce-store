import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';

/** Frame for the admin area: section tabs above the current admin page. */
@Component({
  selector: 'app-admin-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, MatTabsModule],
  template: `
    <nav mat-tab-nav-bar [tabPanel]="panel" class="tabs" aria-label="Admin sections">
      @for (link of links; track link.path) {
        <a mat-tab-link [routerLink]="link.path" routerLinkActive #rla="routerLinkActive" [active]="rla.isActive">
          {{ link.label }}
        </a>
      }
    </nav>
    <mat-tab-nav-panel #panel>
      <router-outlet />
    </mat-tab-nav-panel>
  `,
  styles: `
    .tabs {
      margin-bottom: 24px;
    }
  `,
})
export class AdminLayout {
  protected readonly links = [
    { path: '/admin/products', label: 'Products' },
    { path: '/admin/orders', label: 'Orders' },
  ];
}
