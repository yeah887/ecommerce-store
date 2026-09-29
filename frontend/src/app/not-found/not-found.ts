import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '../i18n/translate.pipe';

/** Friendly not-found page, used for unknown routes and for missing products. */
@Component({
  selector: 'app-not-found',
  imports: [RouterLink, MatButtonModule, MatIconModule, TranslatePipe],
  template: `
    <section class="card mx-auto flex max-w-xl flex-col items-center px-6 py-16 text-center">
      <span class="grid size-16 place-items-center rounded-full bg-zinc-100 text-zinc-400">
        <mat-icon class="icon-32">search_off</mat-icon>
      </span>
      <h1 class="page-title mt-6">{{ heading() ?? ('notFound.title' | t) }}</h1>
      <p class="mt-2 text-zinc-500">{{ message() ?? ('notFound.message' | t) }}</p>
      <a matButton="filled" routerLink="/" class="mt-8">{{ 'common.backToCatalog' | t }}</a>
    </section>
  `,
})
export class NotFound {
  // As a routed component, router input binding sets these to undefined, so defaults live in the template.
  readonly heading = input<string>();
  readonly message = input<string>();

}
