import type { Translations } from './en';

/** `locale` is the Angular/Intl locale for numbers, dates and plurals: European Portuguese for a euro store. */
export const LANGUAGES = [
  { code: 'en', name: 'English', locale: 'en' },
  { code: 'de', name: 'Deutsch', locale: 'de' },
  { code: 'fr', name: 'Français', locale: 'fr' },
  { code: 'es', name: 'Español', locale: 'es' },
  { code: 'it', name: 'Italiano', locale: 'it' },
  { code: 'pt', name: 'Português', locale: 'pt-PT' },
] as const;

export type Language = (typeof LANGUAGES)[number]['code'];

export function isLanguage(value: unknown): value is Language {
  return LANGUAGES.some((language) => language.code === value);
}

/** Dictionary and Angular locale data (number and date formats) for a language, loaded on demand. */
export async function loadLanguage(language: Language): Promise<{ translations: Translations; localeData: unknown[] }> {
  switch (language) {
    case 'en':
      return { translations: (await import('./en')).en, localeData: (await import('@angular/common/locales/en')).default };
    case 'de':
      return { translations: (await import('./de')).de, localeData: (await import('@angular/common/locales/de')).default };
    case 'fr':
      return { translations: (await import('./fr')).fr, localeData: (await import('@angular/common/locales/fr')).default };
    case 'es':
      return { translations: (await import('./es')).es, localeData: (await import('@angular/common/locales/es')).default };
    case 'it':
      return { translations: (await import('./it')).it, localeData: (await import('@angular/common/locales/it')).default };
    case 'pt':
      return { translations: (await import('./pt')).pt, localeData: (await import('@angular/common/locales/pt-PT')).default };
  }
}
