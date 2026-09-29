# 13: Languages

**What to build:** Customers and admins can use the store in the main European languages. The store starts in the browser's language, the header has a language menu, and the choice is remembered.

**Blocked by:** 10 (README and full-stack check)

**Status:** done

- [x] English, German, French, Spanish, Italian and Portuguese (European) for every page, dialog, snackbar, page title and accessible label
- [x] Runtime switching without a reload or a build per language; dictionaries and locale data load on demand, so the initial bundle only grows by the English source (about 17 kB)
- [x] Start language: saved choice, else the first supported browser language, else English; `<html lang>` follows
- [x] Prices, dates, plurals and the Material paginator follow the language (European Portuguese formatting for `pt`)
- [x] API errors translated by `code`, with a sensible fallback per action
- [x] Type safety: every language must provide every key; templates are checked against the key list
- [x] Unit tests for placeholders in every language, plural rules, error codes and the start language; a browser check found no English left on any page in German, French, Spanish, Italian or Portuguese

## Comments

**Done (2026-09-29).**

- **Product content isn't translated.** Names and descriptions are admin-entered data; translating them would need per-language fields in the product model and form.
- **Server-side field messages** other than "email already registered" stay in English. The client validates the same rules first, so they only show if the two disagree.
- **Fixed on the way:** admin tables no longer shrink below the card width on desktop (a regression from the Tailwind redesign's phone fix).
