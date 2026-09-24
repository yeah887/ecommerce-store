# 10: README and full-stack check

**What to build:** Someone who clones the repo can understand what the project is and have it running in minutes. The finished store is checked end to end in both Compose modes. See the spec: Testing Decisions (manual check), user stories 63–72.

**Blocked by:** 01–09

**Status:** done

- [x] README covers: what the project is (a learning/portfolio store) and its stack; prerequisites (Docker with Compose v2, and Node 22 for running outside Docker); running the dev mode and the production-like mode; every environment variable and the `.env.example` workflow; the seeded admin login; running backend and frontend tests; a short overview of the architecture and API
- [x] Manual check in production-like mode (`docker compose -f compose.yaml up --build`) from an empty volume: the store loads through nginx, `/api/health` is healthy, seeded products appear, a new customer can register, add to cart, check out, see the order and cancel it, and the admin can log in, edit a product and ship and deliver an order
- [x] Manual check in dev mode: a frontend and a backend code change both hot-reload
- [x] All backend and frontend tests pass
- [x] Any problems found are fixed or recorded as new tickets

## Comments

**Done (2026-09-24).**

- **Production-like mode from an empty database.** Run as a separate Compose project (`-p store-verify`), so its volume was fresh and the regular `store_mongo-data` volume was left alone; the verification volume was deleted afterwards. In headless Firefox via nginx, all 11 steps passed:
  1. The store loads, and the API had created 20 products and the admin.
  2. A customer registers.
  3. The customer adds items from a card and from a detail page (quantity 2).
  4. The customer checks out.
  5. The customer opens "View order" and cancels the order.
  6. The customer places a second order.
  7. The admin changes a price (€22.50 → €25), and the catalog shows it.
  8. The admin filters orders by "placed".
  9. The admin ships and then delivers the second order.
  10. The customer's history shows Delivered and Cancelled.
  11. The cancelled order still shows the old €22.50 price.
- **Dev mode.** Backend and frontend edits both hot-reloaded.
- **Without Docker.** The README's "Running without Docker" steps were run as written: `docker compose up -d mongo`, then `npm run dev:api` with `MONGO_URL`, then `npm run dev:web`. The dev server proxied `/api/health` to a healthy API.
- **Tests.** 137 backend and 54 frontend, all passing.
- **No new tickets.** No problems turned up that needed one.
