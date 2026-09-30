import { Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import type { TranslationKey } from '../i18n/en';
import { I18n, browserLanguage } from '../i18n/i18n';
import { TranslatePipe } from '../i18n/translate.pipe';
import { PAGE_SIZES, SettingsStore, type Theme } from './settings-store';

/** Theme, language and catalog settings, kept in this browser by SettingsStore. */
@Component({
  selector: 'app-settings-page',
  imports: [MatButtonModule, MatIconModule, TranslatePipe],
  templateUrl: './settings-page.html',
})
export class SettingsPage {
  protected readonly settings = inject(SettingsStore);
  protected readonly i18n = inject(I18n);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly themes: { value: Theme; label: TranslationKey; icon: string }[] = [
    { value: 'system', label: 'settings.themeSystem', icon: 'contrast' },
    { value: 'light', label: 'settings.themeLight', icon: 'light_mode' },
    { value: 'dark', label: 'settings.themeDark', icon: 'dark_mode' },
  ];
  protected readonly pageSizes = PAGE_SIZES;

  /** What "browser language" currently means, e.g. "Deutsch", or English when none is supported. */
  protected readonly browserLanguageName = computed(() => {
    const code = browserLanguage() ?? 'en';
    return this.i18n.languages.find((language) => language.code === code)!.name;
  });

  protected reset(): void {
    this.settings.reset();
    this.snackBar.open(this.i18n.t('settings.resetDone'), undefined, { duration: 3000 });
  }
}
