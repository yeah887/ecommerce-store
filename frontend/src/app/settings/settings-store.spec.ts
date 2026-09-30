import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY, SettingsStore } from './settings-store';

/** A fresh store, as after a page load, reading whatever is in localStorage. */
function loadStore() {
  TestBed.resetTestingModule();
  const store = TestBed.inject(SettingsStore);
  TestBed.tick();
  return store;
}

const saved = () => JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) ?? 'null');

function mockSystemDark(matches: boolean) {
  const listeners: ((event: { matches: boolean }) => void)[] = [];
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches,
      addEventListener: (_: string, listener: (event: { matches: boolean }) => void) => listeners.push(listener),
      removeEventListener: vi.fn(),
    })),
  );
  return (dark: boolean) => listeners.forEach((listener) => listener({ matches: dark }));
}

describe('SettingsStore', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => vi.unstubAllGlobals());

  it('starts with the defaults', () => {
    const store = loadStore();

    expect(store.theme()).toBe('system');
    expect(store.language()).toBe('auto');
    expect(store.pageSize()).toBe(12);
  });

  it('saves every change and restores it on the next page load', () => {
    const store = loadStore();

    store.setTheme('dark');
    store.setLanguage('fr');
    store.setPageSize(48);
    TestBed.tick();

    expect(saved()).toEqual({ theme: 'dark', language: 'fr', pageSize: 48 });
    const reloaded = loadStore();
    expect([reloaded.theme(), reloaded.language(), reloaded.pageSize()]).toEqual(['dark', 'fr', 48]);
  });

  it('ignores invalid saved values but keeps the valid ones', () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ theme: 'neon', language: 'de', pageSize: 1000 }));

    const store = loadStore();

    expect([store.theme(), store.language(), store.pageSize()]).toEqual(['system', 'de', 12]);
  });

  it('survives unreadable storage', () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, '{not json');

    expect(loadStore().theme()).toBe('system');
  });

  it('takes over a language saved before settings existed', () => {
    localStorage.setItem('store.language', 'it');

    expect(loadStore().language()).toBe('it');
    expect(localStorage.getItem('store.language')).toBeNull();
  });

  it('puts the page in dark mode for the dark theme, and follows the system for "system"', () => {
    const setSystemDark = mockSystemDark(false);
    const store = loadStore();
    const isDarkPage = () => document.documentElement.classList.contains('dark');

    expect(isDarkPage()).toBe(false);

    setSystemDark(true);
    TestBed.tick();
    expect(store.isDark()).toBe(true);
    expect(isDarkPage()).toBe(true);

    store.setTheme('light');
    TestBed.tick();
    expect(isDarkPage()).toBe(false);

    store.setTheme('dark');
    setSystemDark(false);
    TestBed.tick();
    expect(isDarkPage()).toBe(true);
  });

  it('resets to the defaults', () => {
    const store = loadStore();
    store.setTheme('dark');
    store.setPageSize(24);

    store.reset();
    TestBed.tick();

    expect(saved()).toEqual(DEFAULT_SETTINGS);
  });
});
