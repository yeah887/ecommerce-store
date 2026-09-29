import { registerLocaleData } from '@angular/common';
import { Injectable, computed, signal } from '@angular/core';
import type { ApiErrorBody } from '@store/shared';
import { apiError } from '../shared/api-error';
import { en, type TranslationKey, type Translations } from './en';
import { LANGUAGES, isLanguage, loadLanguage, type Language } from './languages';

export const LANGUAGE_STORAGE_KEY = 'store.language';

type Params = Record<string, string | number>;
/** Keys that have `.one` / `.other` plural forms, without the suffix. */
export type PluralKey = TranslationKey extends infer K ? (K extends `${infer Base}.other` ? Base : never) : never;

/** The UI language: picks one on start (saved choice, else the browser's), translates, and formats. */
@Injectable({ providedIn: 'root' })
export class I18n {
  readonly languages = LANGUAGES;
  private readonly current = signal<Language>('en');
  private readonly translations = signal<Translations>(en);

  readonly language = this.current.asReadonly();
  /** Angular/Intl locale id for number, date and plural formatting. */
  readonly locale = computed(() => LANGUAGES.find((l) => l.code === this.current())!.locale);

  /** Loads the saved or browser language; runs before the first render. */
  async init(): Promise<void> {
    await this.use(this.initialLanguage(), false);
  }

  async use(language: Language, remember = true): Promise<void> {
    const { translations, localeData } = await loadLanguage(language);
    registerLocaleData(localeData);
    this.translations.set(translations);
    this.current.set(language);
    document.documentElement.lang = language;
    if (remember) {
      try {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
      } catch {
        // Storage can be unavailable (private mode); the choice then lasts for this visit.
      }
    }
  }

  /** Translates a key, filling `{name}` placeholders from `params`. */
  t(key: TranslationKey, params?: Params): string {
    const text = this.translations()[key] ?? en[key];
    return params ? text.replace(/\{(\w+)\}/g, (match, name: string) => String(params[name] ?? match)) : text;
  }

  /** Translates a plural key such as 'cart.subtotal' for `count`, which is also available as `{count}`. */
  tn(key: PluralKey, count: number, params?: Params): string {
    const form = new Intl.PluralRules(this.locale()).select(count) === 'one' ? 'one' : 'other';
    return this.t(`${key}.${form}` as TranslationKey, { count, ...params });
  }

  /** A translated message for a failed API call: by error code when known, else the fallback. */
  errorMessage(error: unknown, fallback: TranslationKey = 'error.generic'): string {
    const body: ApiErrorBody['error'] | undefined = apiError(error);
    const key = body && (`error.${body.code}` as TranslationKey);
    return key && key in en ? this.t(key) : this.t(fallback);
  }

  private initialLanguage(): Language {
    try {
      const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (isLanguage(saved)) return saved;
    } catch {
      // Fall through to the browser's languages.
    }
    for (const tag of navigator.languages ?? [navigator.language]) {
      const code = tag.toLowerCase().split('-')[0];
      if (isLanguage(code)) return code;
    }
    return 'en';
  }
}
