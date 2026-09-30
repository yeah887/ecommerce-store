# 14: User settings and dark mode

**What to build:** A settings page where anyone can choose the theme (light, dark or follow the system), the language (or follow the browser), and how many products the catalog shows per page. Settings are kept in the browser and managed by an NgRx Signal Store.

**Blocked by:** 13 (Languages)

**Status:** done

- [x] `SettingsStore` (`@ngrx/signals`): state `theme`, `language`, `pageSize`; derived `isDark`; methods to change and reset; saved to localStorage on every change and validated on load
- [x] The language moves into the store (with an "auto" option); the language saved by ticket 13 is taken over once
- [x] Dark theme for every page and for Material components, applied before the app starts so there is no white flash
- [x] `/settings` page with native radio groups, linked from the footer and the account menu; texts in all six languages
- [x] The catalog uses the page size setting
- [x] Unit tests for the store (defaults, saving, invalid saved data, migration, dark mode following the system, reset) and the language resolution; browser check of the page, persistence after reload and every page in dark mode

## Comments

**Done (2026-09-29).**

- **How dark mode works:** `tailwind.css` mirrors the zinc scale under `.dark` instead of adding `dark:` variants to every template. The rules to keep it working are in the README's notes.
- **Settings stay in the browser.** Syncing them to the user's account would need an API and a place to store them; the store has one place (`withHooks`) where that would go.
