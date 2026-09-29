import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { de } from './de';
import { en } from './en';
import { es } from './es';
import { fr } from './fr';
import { I18n, LANGUAGE_STORAGE_KEY } from './i18n';
import { it as italian } from './it';
import { pt } from './pt';

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

  beforeEach(() => {
    localStorage.clear();
    i18n = TestBed.inject(I18n);
  });

  afterEach(() => vi.restoreAllMocks());

  it('fills in placeholders', async () => {
    await i18n.use('en');
    expect(i18n.t('cart.remove', { name: 'Mug' })).toBe('Remove Mug');
  });

  it('switches language and remembers the choice', async () => {
    await i18n.use('de');

    expect(i18n.t('cart.title')).toBe('Warenkorb');
    expect(i18n.locale()).toBe('de');
    expect(document.documentElement.lang).toBe('de');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('de');
  });

  it('picks plural forms by language rules', async () => {
    await i18n.use('en');
    expect(i18n.tn('catalog.count', 1)).toBe('1 product');
    expect(i18n.tn('catalog.count', 0)).toBe('0 products');

    await i18n.use('fr');
    // French treats 0 as singular.
    expect(i18n.tn('catalog.count', 0)).toBe('0 produit');
    expect(i18n.tn('catalog.count', 2)).toBe('2 produits');
  });

  it('formats in the language: European Portuguese for pt', async () => {
    await i18n.use('pt');
    expect(i18n.locale()).toBe('pt-PT');
  });

  it('translates API errors by code and falls back for unknown ones', async () => {
    await i18n.use('es');
    const error = (code: string) =>
      new HttpErrorResponse({ status: 400, error: { error: { code, message: 'English from the server' } } });

    expect(i18n.errorMessage(error('invalid_credentials'))).toBe('Correo electrónico o contraseña incorrectos');
    expect(i18n.errorMessage(error('something_new'), 'checkout.failed')).toBe(es['checkout.failed']);
    expect(i18n.errorMessage(new Error('network'))).toBe(es['error.generic']);
  });

  it('starts with the saved language, else the first supported browser language, else English', async () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['ja-JP', 'it-IT', 'de']);
    await i18n.init();
    expect(i18n.language()).toBe('it');

    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'fr');
    await i18n.init();
    expect(i18n.language()).toBe('fr');

    localStorage.clear();
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['ja-JP']);
    await i18n.init();
    expect(i18n.language()).toBe('en');
  });
});
