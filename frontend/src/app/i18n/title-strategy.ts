import { Injectable, effect, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { TitleStrategy, type RouterStateSnapshot } from '@angular/router';
import type { TranslationKey } from './en';
import { I18n } from './i18n';

const STORE = 'Store';

/**
 * Route `title`s are translation keys. The tab shows "<translated title> · Store", or just "Store" for
 * routes without one, and is updated again when the language changes. Pages with their own titles
 * (product pages) set them after this runs.
 */
@Injectable()
export class TranslatedTitleStrategy extends TitleStrategy {
  private readonly i18n = inject(I18n);
  private readonly title = inject(Title);
  private snapshot?: RouterStateSnapshot;

  constructor() {
    super();
    effect(() => {
      this.i18n.language();
      if (this.snapshot) this.apply(this.snapshot);
    });
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.snapshot = snapshot;
    this.apply(snapshot);
  }

  private apply(snapshot: RouterStateSnapshot): void {
    const key = this.buildTitle(snapshot);
    if (key === STORE) this.title.setTitle(STORE);
    else if (key) this.title.setTitle(`${this.i18n.t(key as TranslationKey)} · ${STORE}`);
  }
}
