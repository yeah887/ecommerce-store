# Store

A full-stack e-commerce store built as a learning and portfolio project. Nothing is really sold and no money moves: payment is simulated. The rest works end to end: catalog, cart, accounts, checkout, order history, and an admin area for products and orders.

- **Frontend:** Angular 22 (standalone components, signals, NgRx Signal Store for settings), styled with Tailwind CSS 4 and Angular Material, client-side rendered
- **Backend:** Express 5 REST API in TypeScript, Mongoose, sessions stored in MongoDB
- **Database:** MongoDB 7
- **Runs with:** Docker Compose, in a dev mode with hot reload or a production-like mode behind nginx

## Features

- **Settings** (`/settings`, kept in the browser): light, dark or system theme, language, and products per page in the catalog. Managed by an NgRx Signal Store.
- **Languages:** English, German, French, Spanish, Italian and Portuguese. The store starts in the browser's language, a menu in the header switches without reloading, and the choice is remembered. Prices and dates follow the language ("12,99 €" in German). Product names and descriptions stay as entered.
- **Catalog:** product grid with text search, category filter and pagination. The state is kept in the URL, so views can be bookmarked and the back button works.
- **Product pages:** details, a quantity picker and an image gallery with thumbnails, swipe and arrow-key navigation, and a full-screen view.
- **Cart:** kept in the browser (localStorage) and survives reloads. Quantities are capped at 99, and open tabs stay in sync.
- **Accounts:**
  - Register, log in and log out.
  - Passwords are hashed with bcrypt.
  - Sessions are stored server-side with an httpOnly, SameSite=Lax cookie.
- **Checkout:**
  - Requires login and a shipping address, and uses a mock payment step.
  - The server recalculates every price from the database and ignores prices sent by the browser.
  - Each order stores a snapshot of each product's name and price.
- **Order history:** customers see their orders and can cancel one until it ships.
- **Admin:**
  - Create, edit and delete products, with prices entered in euros.
  - Give each product 1 to 15 images: upload several at once (JPEG, PNG, WebP or GIF, up to 5 MB each) or add links to images hosted elsewhere, then reorder them. The first image is the cover. Uploads are stored in MongoDB (GridFS) and deleted once no product uses them.
  - See every order, filter by status, and move orders through the lifecycle:

    ```
    placed ──► shipped ──► delivered
       │
       └────► cancelled
    ```

## Quick start (dev mode)

You need Docker with the Compose v2 plugin.

```sh
docker compose up --build
```

`docker compose up` merges `compose.yaml` with `compose.override.yaml`, which runs the Angular dev server and the API in watch mode with the source bind-mounted. Edits to `frontend/src`, `backend/src` or `shared/src` reload automatically.

| What | Where |
|---|---|
| Store | http://localhost:4200 |
| API | http://localhost:3000/api/health |
| MongoDB | `mongodb://localhost:27017/store` |
| System status page | http://localhost:4200/status |

On first start the API seeds 20 sample products and an admin account. In dev mode, without a `.env` file, the admin login is **admin@example.com / admin-password**.

## Production-like mode

This mode builds the real images. nginx serves the compiled Angular app and proxies `/api` to the API; only nginx is exposed.

```sh
cp .env.example .env
# Set SESSION_SECRET to a long random string, e.g.: openssl rand -base64 48
# Set ADMIN_PASSWORD
docker compose -f compose.yaml up --build
```

Open http://localhost:8080. The API refuses to start without a `SESSION_SECRET` of at least 32 characters, and it rejects the placeholder from `.env.example`.

Both modes use the same MongoDB volume (`store_mongo-data`). To start over with an empty database, run `docker compose down -v`. That deletes all products, users and orders.

## Raspberry Pi 4

MongoDB 5.0 and newer need an ARMv8.2-A CPU, which the Pi 4 doesn't have, so the regular stack's database won't start there. `compose.pi.yaml` swaps in MongoDB 4.4.18, the last release that runs on a Pi 4 and the oldest one the app's MongoDB driver supports:

```sh
docker compose -f compose.yaml -f compose.pi.yaml up --build
```

This needs a 64-bit OS (`uname -m` shows `aarch64`). MongoDB 4.4 is end-of-life and gets no security fixes, so keep this stack on a trusted network. A Pi 5 can use the regular stack.

## Configuration

Compose reads `.env` from the project root. The file is git-ignored; `.env.example` lists every variable.

| Variable | Default | Purpose |
|---|---|---|
| `MONGO_URL` | `mongodb://mongo:27017/store` | MongoDB connection used by the API |
| `SESSION_SECRET` | none (dev mode: an insecure built-in secret) | Signs session cookies. Required in production-like mode: at least 32 characters |
| `COOKIE_SECURE` | `false` in Compose, `true` in production otherwise | Send the session cookie only over HTTPS. The local stack serves plain HTTP, so keep it `false` there and set `true` behind HTTPS |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | dev mode: `admin@example.com` / `admin-password` | First admin account, created on startup if no user with that email exists. Changing the password later doesn't change an existing account |
| `WEB_PORT` | `8080` | Production-like mode: port nginx listens on |
| `WEB_DEV_PORT`, `API_PORT`, `MONGO_PORT` | `4200`, `3000`, `27017` | Dev mode: host ports |

## Running without Docker

You can run the frontend and backend directly, for example to run the tests or debug in your IDE. You need Node 22.22.3 or newer (`.nvmrc`) and a MongoDB reachable from your machine.

```sh
npm install                      # also builds the shared package
docker compose up -d mongo       # or any MongoDB 7; the dev override exposes port 27017
MONGO_URL=mongodb://localhost:27017/store npm run dev:api
npm run dev:web                  # http://localhost:4200, proxies /api to localhost:3000
```

## Tests

```sh
npm test                 # everything
npm test -w backend      # API tests
npm test -w frontend     # Angular unit tests
```

- **Backend:** Vitest and supertest against the real Express app, backed by an in-memory MongoDB (mongodb-memory-server). Tests only use the HTTP API, just as the browser does. They cover:
  - auth and sessions
  - catalog search, filters and pagination
  - checkout price recalculation and validation
  - order privacy and the status lifecycle
  - admin authorization
  - image upload, type detection, image lists and cleanup
  - migrating single-image products to image lists
  - seeding
- **Frontend:** unit tests for the cart store, euro-to-cents parsing, the post-login redirect check, swipe detection, and translations (language choice, plurals, error codes, placeholders in every language).

The first backend run downloads a MongoDB binary (about 180 MB unpacked) into `~/.cache/mongodb-binaries`.

## Project structure

```
├── shared/     Types and constants used by both sides: products, orders, statuses, limits
├── backend/    Express API
│   ├── src/
│   │   ├── app.ts          createApp({ db, config, payments }): builds the app, no side effects
│   │   ├── server.ts       entry point: connect, prepare the database, listen
│   │   ├── db/             indexes and safe-to-repeat seeding
│   │   ├── models/         Mongoose models (User, Product, Order)
│   │   ├── images.ts       uploaded images in GridFS, and file type detection
│   │   ├── routes/         one router per resource
│   │   ├── session.ts      sessions, currentUser, requireAuth, requireAdmin
│   │   ├── order-status.ts order lifecycle rules
│   │   └── payments.ts     PaymentProvider interface and the mock provider
│   └── test/
├── frontend/   Angular app (a folder per feature: catalog, product, cart, checkout, orders, auth, admin)
│   └── src/
│       ├── app/i18n/       translations: en.ts is the source, one file per language
│       ├── app/settings/   SettingsStore (NgRx Signal Store) and the settings page
│       ├── tailwind.css    design tokens and shared utilities (card, page-title, eyebrow, icon-*)
│       └── styles.scss     Material theme, pointed at the same colours
├── compose.yaml            production-like stack
└── compose.override.yaml   dev-mode additions
```

## API overview

Every route is under `/api`. Errors always have the shape `{ "error": { "code", "message", "fields?" } }`.

| Method | Path | Who | |
|---|---|---|---|
| GET | `/health` | anyone | API and database status |
| GET | `/products?q=&category=&page=&pageSize=` | anyone | Paginated catalog |
| GET | `/products/:id` | anyone | One product |
| GET | `/categories` | anyone | The fixed category list |
| POST | `/auth/register`, `/auth/login`, `/auth/logout` | anyone | Account and session |
| GET | `/auth/me` | logged in | Current user |
| POST | `/orders` | logged in | Place an order: `{ lines: [{ productId, quantity }], shippingAddress }` |
| GET | `/orders`, `/orders/:id` | logged in | Your own orders |
| POST | `/orders/:id/cancel` | logged in | Cancel your order while it is placed |
| GET | `/images/:id` | anyone | An uploaded image |
| POST, PUT, DELETE | `/admin/products[/:id]` | admin | Manage products. `images` is a list of 1–15 http(s) URLs or uploaded images' `/api/images/:id`, cover first. Products also return the cover as `imageUrl` |
| POST | `/admin/images` | admin | Upload an image: the raw file as the body. Returns `{ url }` |
| GET | `/admin/orders?status=&page=`, `/admin/orders/:id` | admin | All orders |
| PATCH | `/admin/orders/:id/status` | admin | Change status: `{ status }` |

## Notes

- **MongoDB 7, not 8:** MongoDB 8.x refuses to start on Linux kernel 6.19 and newer ([SERVER-121912](https://jira.mongodb.org/browse/SERVER-121912)). The backend tests pin mongodb-memory-server to the same 7.0 line.
- **Sample images** come from picsum.photos: random photos, not pictures of the products. They need internet access. Uploaded images are served by the API itself.
- **Uploaded images are checked by their content:** the server detects the type from the file's first bytes and ignores the type the browser claims. SVG is not accepted, because it can contain scripts.
- **Tailwind and Material together:** pages are styled with Tailwind utilities; Material still provides the interactive widgets (form fields, select, menu, dialog, table, paginator, snackbar), themed to the same zinc and indigo palette. Material's CSS is not in a cascade layer, so it beats Tailwind's layered utilities on Material elements: size a `mat-icon` with `icon-<px>` and colour it with an important utility such as `!text-zinc-400`.
- **Dark mode without `dark:` everywhere:** pages use plain zinc shades and `bg-surface`; in the dark theme `tailwind.css` mirrors the zinc scale and swaps the surface colour, so each shade keeps its role. Use `bg-surface` for cards and inputs, and `text-zinc-50` (not `text-white`) on `bg-zinc-900`. `white` and `black` stay fixed, for text on colour and overlays on photos.
- **Adding a language:** copy `frontend/src/app/i18n/de.ts`, translate it, and add the language to `LANGUAGES` and `loadLanguage` in `languages.ts`. The build fails if a translation is missing a key, and a unit test checks that every `{placeholder}` is kept. Templates use `{{ 'key' | t }}` (and `tn` for plurals); a mistyped key is a compile error. API errors are translated by their `code`.
- **Out of scope for this version:**
  - real payments, taxes and shipping costs
  - inventory, reviews and guest checkout
  - emails and password reset
  - server-side rendering and end-to-end browser tests
  - settings that follow a user's account across browsers
