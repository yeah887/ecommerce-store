import { registerLocaleData } from '@angular/common';
import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import type { ApiErrorBody } from '@store/shared';
import { SettingsStore, type LanguageSetting } from '../settings/settings-store';
import { apiError } from '../shared/api-error';
import { en, type TranslationKey, type Translations } from './en';
import { LANGUAGES, isLanguage, loadLanguage, type Language } from './languages';

type Params = Record<string, string | number>;
/** Keys that have `.one` / `.other` plural forms, without the suffix. */
export type PluralKey = TranslationKey extends infer K ? (K extends `${infer Base}.other` ? Base : never) : never;

/**
 * The UI language: follows the language setting (a language, or the browser's), loads its dictionary,
 * translates and formats. Change the language through `SettingsStore.setLanguage`.
 */
@Injectable({ providedIn: 'root' })
export class I18n {
  readonly languages = LANGUAGES;
  private readonly settings = inject(SettingsStore);
  private readonly current = signal<Language>('en');
  private readonly translations = signal<Translations>(en);

  readonly language = this.current.asReadonly();
  /** Angular/Intl locale id for number, date and plural formatting. */
  readonly locale = computed(() => LANGUAGES.find((l) => l.code === this.current())!.locale);

  constructor() {
    // Later changes to the setting load the new language; `init` handles the first one.
    effect(() => {
      const language = resolveLanguage(this.settings.language());
      untracked(() => {
        if (language !== this.current()) void this.load(language);
      });
    });
  }

  /** Loads the language from the settings; runs before the first render so nothing flashes in English. */
  async init(): Promise<void> {
    await this.load(resolveLanguage(this.settings.language()));
  }

  private async load(language: Language): Promise<void> {
    const { translations, localeData } = await loadLanguage(language);
    registerLocaleData(localeData);
    this.translations.set(translations);
    this.current.set(language);
    document.documentElement.lang = language;
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
}

/** The language to show for a setting: 'auto' picks the first supported browser language, else English. */
export function resolveLanguage(setting: LanguageSetting): Language {
  if (setting !== 'auto') return setting;
  return browserLanguage() ?? 'en';
}

/** The first of the browser's languages that the store supports. */
export function browserLanguage(): Language | undefined {
  for (const tag of navigator.languages ?? [navigator.language]) {
    const code = tag.toLowerCase().split('-')[0];
    if (isLanguage(code)) return code;
  }
  return undefined;
}
