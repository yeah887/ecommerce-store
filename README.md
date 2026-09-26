# Store

A full-stack e-commerce store built as a learning and portfolio project. Nothing is really sold and no money moves: payment is simulated. The rest works end to end: catalog, cart, accounts, checkout, order history, and an admin area for products and orders.

- **Frontend:** Angular 22 (standalone components, signals, Angular Material), client-side rendered
- **Backend:** Express 5 REST API in TypeScript, Mongoose, sessions stored in MongoDB
- **Database:** MongoDB 7
- **Runs with:** Docker Compose, in a dev mode with hot reload or a production-like mode behind nginx

## Features

- **Catalog:** product grid with text search, category filter and pagination. The state is kept in the URL, so views can be bookmarked and the back button works.
- **Product pages:** details and a quantity picker.
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
  - Upload product pictures (JPEG, PNG, WebP or GIF, up to 5 MB), or paste a link to an image hosted elsewhere. Uploads are stored in MongoDB (GridFS) and deleted once no product uses them.
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
  - image upload, type detection and cleanup
  - seeding
- **Frontend:** unit tests for the cart store, euro-to-cents parsing and the post-login redirect check.

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
| POST, PUT, DELETE | `/admin/products[/:id]` | admin | Manage products. `imageUrl` is an http(s) URL or an uploaded image's `/api/images/:id` |
| POST | `/admin/images` | admin | Upload an image: the raw file as the body. Returns `{ url }` |
| GET | `/admin/orders?status=&page=`, `/admin/orders/:id` | admin | All orders |
| PATCH | `/admin/orders/:id/status` | admin | Change status: `{ status }` |

## Notes

- **MongoDB 7, not 8:** MongoDB 8.x refuses to start on Linux kernel 6.19 and newer ([SERVER-121912](https://jira.mongodb.org/browse/SERVER-121912)). The backend tests pin mongodb-memory-server to the same 7.0 line.
- **Sample images** come from picsum.photos: random photos, not pictures of the products. They need internet access. Uploaded images are served by the API itself.
- **Uploaded images are checked by their content:** the server detects the type from the file's first bytes and ignores the type the browser claims. SVG is not accepted, because it can contain scripts.
- **Out of scope for this version:**
  - real payments, taxes and shipping costs
  - inventory, reviews and guest checkout
  - emails and password reset
  - server-side rendering and end-to-end browser tests
