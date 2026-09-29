import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { swipeDirection } from './swipe';

export interface LightboxData {
  images: string[];
  index: number;
  name: string;
}

/** Full-screen view of a product's images. Closes with the index that was last shown. */
@Component({
  selector: 'app-gallery-lightbox',
  imports: [MatDialogModule, MatIconModule],
  host: {
    class: 'block h-full',
    '(keydown.arrowleft)': 'step(-1)',
    '(keydown.arrowright)': 'step(1)',
  },
  template: `
    <div class="flex h-full flex-col text-white">
      <div class="flex items-center justify-between gap-4 px-4 py-3">
        <p class="min-w-0 truncate text-sm text-zinc-300">
          {{ data.name }} <span class="text-zinc-500 tabular-nums">· {{ index() + 1 }} / {{ data.images.length }}</span>
        </p>
        <button
          type="button"
          class="grid size-10 shrink-0 place-items-center rounded-full hover:bg-white/10"
          aria-label="Close"
          (click)="close()"
        >
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div
        class="relative flex min-h-0 flex-1 items-center justify-center px-4 sm:px-20"
        (touchstart)="touchStart = $event" (touchend)="onSwipe($event)"
      >
        <img
          class="max-h-full max-w-full rounded-lg object-contain select-none"
          [src]="data.images[index()]"
          [alt]="data.name + ', image ' + (index() + 1) + ' of ' + data.images.length"
        />
        @if (data.images.length > 1) {
          <button
            type="button"
            class="absolute top-1/2 left-3 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 hover:bg-white/20 max-sm:hidden"
            aria-label="Previous image"
            (click)="step(-1)"
          >
            <mat-icon>chevron_left</mat-icon>
          </button>
          <button
            type="button"
            class="absolute top-1/2 right-3 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 hover:bg-white/20 max-sm:hidden"
            aria-label="Next image"
            (click)="step(1)"
          >
            <mat-icon>chevron_right</mat-icon>
          </button>
        }
      </div>

      @if (data.images.length > 1) {
        <ul class="flex justify-center gap-2 overflow-x-auto px-4 py-3">
          @for (url of data.images; track url; let i = $index) {
            <li class="shrink-0">
              <button
                type="button"
                class="block w-16 overflow-hidden rounded-lg ring-2 transition sm:w-20"
                [class]="i === index() ? 'ring-white' : 'opacity-50 ring-transparent hover:opacity-100'"
                [attr.aria-label]="'Show image ' + (i + 1)"
                [attr.aria-current]="i === index() ? 'true' : null"
                (click)="index.set(i)"
              >
                <img class="aspect-[4/3] w-full object-cover" [src]="url" alt="" />
              </button>
            </li>
          }
        </ul>
      }
    </div>
  `,
})
export class GalleryLightbox {
  protected readonly data = inject<LightboxData>(MAT_DIALOG_DATA);
  private readonly ref = inject<MatDialogRef<GalleryLightbox, number>>(MatDialogRef);

  protected readonly index = signal(this.data.index);
  protected touchStart?: TouchEvent;

  constructor() {
    // Opened with disableClose, so Escape and backdrop clicks come here and still report the last image shown.
    this.ref.keydownEvents().subscribe((event) => {
      if (event.key === 'Escape') this.close();
    });
    this.ref.backdropClick().subscribe(() => this.close());
  }

  protected step(offset: number): void {
    const count = this.data.images.length;
    this.index.set((this.index() + offset + count) % count);
  }

  protected onSwipe(end: TouchEvent): void {
    const direction = swipeDirection(this.touchStart, end);
    if (direction) this.step(direction);
  }

  protected close(): void {
    this.ref.close(this.index());
  }
}
