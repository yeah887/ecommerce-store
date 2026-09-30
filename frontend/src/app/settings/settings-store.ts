import { DestroyRef, computed, effect, inject, signal } from '@angular/core';
import {
  getState,
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { isLanguage, type Language } from '../i18n/languages';

export const THEMES = ['system', 'light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

export const PAGE_SIZES = [12, 24, 48] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

/** A language, or 'auto' to follow the browser's. */
export type LanguageSetting = Language | 'auto';

export interface SettingsState {
  theme: Theme;
  language: LanguageSetting;
  pageSize: PageSize;
}

export const DEFAULT_SETTINGS: SettingsState = { theme: 'system', language: 'auto', pageSize: 12 };
export const SETTINGS_STORAGE_KEY = 'store.settings.v1';
/** Where the language was saved before it moved into the settings. */
const OLD_LANGUAGE_KEY = 'store.language';

/**
 * The viewer's settings, kept in this browser. Components read the signals and change them through
 * the methods; every change is saved, and the theme is applied to the page.
 */
export const SettingsStore = signalStore(
  { providedIn: 'root' },
  withState(DEFAULT_SETTINGS),

  // The system's colour scheme is an input, not a setting, so it isn't state and isn't saved.
  withProps(() => ({ _systemDark: signal(prefersDark()) })),

  withComputed(({ theme, _systemDark }) => ({
    isDark: computed(() => theme() === 'dark' || (theme() === 'system' && _systemDark())),
  })),

  withMethods((store) => ({
    setTheme(theme: Theme): void {
      patchState(store, { theme });
    },
    setLanguage(language: LanguageSetting): void {
      patchState(store, { language });
    },
    setPageSize(pageSize: PageSize): void {
      patchState(store, { pageSize });
    },
    reset(): void {
      patchState(store, DEFAULT_SETTINGS);
    },
  })),

  withHooks({
    onInit(store) {
      patchState(store, readSavedSettings());

      effect(() => {
        const state = getState(store);
        try {
          localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(state));
        } catch {
          // Storage can be unavailable (private mode); the settings then last for this visit.
        }
      });

      effect(() => applyTheme(store.isDark()));

      const media = globalThis.matchMedia?.('(prefers-color-scheme: dark)');
      if (media) {
        const onChange = (event: MediaQueryListEvent) => store._systemDark.set(event.matches);
        media.addEventListener('change', onChange);
        inject(DestroyRef).onDestroy(() => media.removeEventListener('change', onChange));
      }
    },
  }),
);

/** Saved settings, keeping only valid values, so a stale or edited entry can't break the page. */
export function readSavedSettings(): Partial<SettingsState> {
  const settings: Partial<SettingsState> = {};
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) ?? 'null');
    const saved = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
    if (THEMES.includes(saved['theme'] as Theme)) settings.theme = saved['theme'] as Theme;
    if (saved['language'] === 'auto' || isLanguage(saved['language'])) {
      settings.language = saved['language'] as LanguageSetting;
    }
    if (PAGE_SIZES.includes(saved['pageSize'] as PageSize)) settings.pageSize = saved['pageSize'] as PageSize;

    if (settings.language === undefined) {
      const oldLanguage = localStorage.getItem(OLD_LANGUAGE_KEY);
      if (isLanguage(oldLanguage)) settings.language = oldLanguage;
    }
    localStorage.removeItem(OLD_LANGUAGE_KEY);
  } catch {
    // Unreadable storage or JSON: keep the defaults.
  }
  return settings;
}

function prefersDark(): boolean {
  return globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

function applyTheme(dark: boolean): void {
  const root = document.documentElement;
  root.classList.toggle('dark', dark);
  root.style.colorScheme = dark ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0f0f11' : '#ffffff');
}
