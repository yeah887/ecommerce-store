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
    <section class="card mx-auto flex max-w-xl flex-col items-center px-6 py-16 text-center">
      <span class="grid size-16 place-items-center rounded-full bg-zinc-100 text-zinc-400">
        <mat-icon class="icon-32">search_off</mat-icon>
      </span>
      <h1 class="page-title mt-6">{{ heading() ?? defaultHeading }}</h1>
      <p class="mt-2 text-zinc-500">{{ message() ?? defaultMessage }}</p>
      <a matButton="filled" routerLink="/" class="mt-8">Back to the catalog</a>
    </section>
  `,
})
export class NotFound {
  // As a routed component, router input binding sets these to undefined, so defaults live in the template.
  readonly heading = input<string>();
  readonly message = input<string>();

  protected readonly defaultHeading = DEFAULT_HEADING;
  protected readonly defaultMessage = DEFAULT_MESSAGE;
}
