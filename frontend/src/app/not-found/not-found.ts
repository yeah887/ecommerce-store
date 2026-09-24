import { Component, input } from '@angular/core';

const DEFAULT_HEADING = 'Page not found';
const DEFAULT_MESSAGE = "The page you're looking for doesn't exist.";
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/** Friendly not-found page, used for unknown routes and for missing products. */
@Component({
  selector: 'app-not-found',
  imports: [RouterLink, MatButtonModule, MatIconModule],
  template: `
    <section class="not-found">
      <mat-icon class="icon">search_off</mat-icon>
      <h1>{{ heading() ?? defaultHeading }}</h1>
      <p>{{ message() ?? defaultMessage }}</p>
      <a matButton="filled" routerLink="/">Back to the catalog</a>
    </section>
  `,
  styles: `
    .not-found {
      padding: 64px 16px;
      text-align: center;
    }
    .icon {
      width: 64px;
      height: 64px;
      font-size: 64px;
      color: var(--mat-sys-on-surface-variant);
    }
    h1 {
      font: var(--mat-sys-headline-medium);
    }
    p {
      color: var(--mat-sys-on-surface-variant);
      margin-bottom: 24px;
    }
  `,
})
export class NotFound {
  // As a routed component, router input binding sets these to undefined, so defaults live in the template.
  readonly heading = input<string>();
  readonly message = input<string>();

  protected readonly defaultHeading = DEFAULT_HEADING;
  protected readonly defaultMessage = DEFAULT_MESSAGE;
}
