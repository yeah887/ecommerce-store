import { Component, inject, input, linkedSignal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { I18n } from '../i18n/i18n';
import { GalleryLightbox, type LightboxData } from './gallery-lightbox';
import { swipeDirection } from './swipe';
import { TranslatePipe } from '../i18n/translate.pipe';

/** A product's images: the current one large, thumbnails below, and a full-screen view on click. */
@Component({
  selector: 'app-product-gallery',
  imports: [MatIconModule, TranslatePipe],
  host: {
    class: 'block',
    '(keydown.arrowleft)': 'step(-1)',
    '(keydown.arrowright)': 'step(1)',
  },
  template: `
    <div class="relative overflow-hidden rounded-3xl bg-zinc-100" (touchstart)="touchStart = $event" (touchend)="onSwipe($event)">
      <button
        type="button"
        class="block w-full cursor-zoom-in"
        [attr.aria-label]="'gallery.viewFullScreen' | t: { n: index() + 1, total: images().length }"
        (click)="openLightbox()"
      >
        <img
          class="aspect-[4/3] w-full object-cover"
          [src]="images()[index()]"
          [alt]="images().length > 1 ? ('gallery.imageAlt' | t: { name: name(), n: index() + 1, total: images().length }) : name()"
        />
      </button>
      @if (images().length > 1) {
        <button
          type="button"
          class="absolute top-1/2 left-3 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-zinc-900 shadow-sm ring-1 ring-zinc-900/5 hover:bg-white"
          [attr.aria-label]="'gallery.previous' | t"
          (click)="step(-1)"
        >
          <mat-icon>chevron_left</mat-icon>
        </button>
        <button
          type="button"
          class="absolute top-1/2 right-3 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-zinc-900 shadow-sm ring-1 ring-zinc-900/5 hover:bg-white"
          [attr.aria-label]="'gallery.next' | t"
          (click)="step(1)"
        >
          <mat-icon>chevron_right</mat-icon>
        </button>
        <span
          class="pointer-events-none absolute right-3 bottom-3 rounded-full bg-zinc-900/70 px-2.5 py-1 text-xs font-medium text-white tabular-nums"
          aria-hidden="true"
        >
          {{ index() + 1 }} / {{ images().length }}
        </span>
      }
    </div>

    @if (images().length > 1) {
      <ul class="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-6" [attr.aria-label]="'gallery.images' | t">
        @for (url of images(); track url; let i = $index) {
          <li>
            <button
              type="button"
              class="block w-full overflow-hidden rounded-xl ring-2 transition"
              [class]="i === index() ? 'ring-zinc-900' : 'opacity-70 ring-transparent hover:opacity-100'"
              [attr.aria-label]="'gallery.show' | t: { n: i + 1 }"
              [attr.aria-current]="i === index() ? 'true' : null"
              (click)="index.set(i)"
            >
              <img class="aspect-[4/3] w-full bg-zinc-100 object-cover" [src]="url" alt="" loading="lazy" />
            </button>
          </li>
        }
      </ul>
    }
  `,
})
export class ProductGallery {
  private readonly dialog = inject(MatDialog);
  private readonly i18n = inject(I18n);

  readonly images = input.required<string[]>();
  readonly name = input.required<string>();

  /** Back to the cover whenever a different product's images arrive. */
  protected readonly index = linkedSignal({ source: this.images, computation: () => 0 });
  protected touchStart?: TouchEvent;

  protected step(offset: number): void {
    const count = this.images().length;
    this.index.set((this.index() + offset + count) % count);
  }

  protected onSwipe(end: TouchEvent): void {
    const direction = swipeDirection(this.touchStart, end);
    if (direction) this.step(direction);
  }

  protected openLightbox(): void {
    const ref = this.dialog.open<GalleryLightbox, LightboxData, number>(GalleryLightbox, {
      data: { images: this.images(), index: this.index(), name: this.name() },
      width: '100vw',
      height: '100dvh',
      maxWidth: '100vw',
      maxHeight: '100dvh',
      panelClass: 'gallery-lightbox',
      disableClose: true,
      ariaLabel: this.i18n.t('gallery.imagesOf', { name: this.name() }),
    });
    ref.afterClosed().subscribe((index) => {
      if (index !== undefined) this.index.set(index);
    });
  }
}
