import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { de } from './de';
import { en } from './en';
import { es } from './es';
import { fr } from './fr';
import { I18n, resolveLanguage } from './i18n';
import { it as italian } from './it';
import type { Language } from './languages';
import { pt } from './pt';
import { SettingsStore } from '../settings/settings-store';

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('translations', () => {
  it.each(Object.entries({ de, fr, es, it: italian, pt }))('%s uses the same placeholders as English', (_, dict) => {
    for (const [key, text] of Object.entries(en)) {
      expect(placeholders(dict[key as keyof typeof en]), key).toEqual(placeholders(text));
    }
  });
});

describe('I18n', () => {
  let i18n: I18n;
  let settings: InstanceType<typeof SettingsStore>;

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    settings = TestBed.inject(SettingsStore);
    i18n = TestBed.inject(I18n);
  });

  afterEach(() => vi.restoreAllMocks());

  /** Changes the language setting and waits for its dictionary to load. */
  async function useLanguage(language: Language): Promise<void> {
    settings.setLanguage(language);
    TestBed.tick();
    await vi.waitFor(() => expect(i18n.language()).toBe(language));
  }

  it('fills in placeholders', async () => {
    await i18n.init();
    expect(i18n.t('cart.remove', { name: 'Mug' })).toBe('Remove Mug');
  });

  it('follows the language setting', async () => {
    await useLanguage('de');

    expect(i18n.t('cart.title')).toBe('Warenkorb');
    expect(i18n.locale()).toBe('de');
    expect(document.documentElement.lang).toBe('de');
  });

  it('picks plural forms by language rules', async () => {
    await useLanguage('en');
    expect(i18n.tn('catalog.count', 1)).toBe('1 product');
    expect(i18n.tn('catalog.count', 0)).toBe('0 products');

    await useLanguage('fr');
    // French treats 0 as singular.
    expect(i18n.tn('catalog.count', 0)).toBe('0 produit');
    expect(i18n.tn('catalog.count', 2)).toBe('2 produits');
  });

  it('formats in the language: European Portuguese for pt', async () => {
    await useLanguage('pt');
    expect(i18n.locale()).toBe('pt-PT');
  });

  it('translates API errors by code and falls back for unknown ones', async () => {
    await useLanguage('es');
    const error = (code: string) =>
      new HttpErrorResponse({ status: 400, error: { error: { code, message: 'English from the server' } } });

    expect(i18n.errorMessage(error('invalid_credentials'))).toBe('Correo electrónico o contraseña incorrectos');
    expect(i18n.errorMessage(error('something_new'), 'checkout.failed')).toBe(es['checkout.failed']);
    expect(i18n.errorMessage(new Error('network'))).toBe(es['error.generic']);
  });
});

describe('resolveLanguage', () => {
  afterEach(() => vi.restoreAllMocks());

  it('uses a chosen language as is', () => {
    expect(resolveLanguage('de')).toBe('de');
  });

  it('for "auto", picks the first supported browser language, else English', () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['ja-JP', 'it-IT', 'de']);
    expect(resolveLanguage('auto')).toBe('it');

    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['ja-JP']);
    expect(resolveLanguage('auto')).toBe('en');
  });
});
