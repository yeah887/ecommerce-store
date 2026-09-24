# Spec: E-commerce store

Status: ready-for-agent

## Problem Statement

I want a portfolio-quality e-commerce store that shows I can build a complete full-stack web application: a modern Angular frontend, a typed Express API in the middle, and MongoDB for storage, all runnable with a single Docker Compose command. There are no real customers and no real money. The value is in the store working end to end (browse, cart, checkout, order history, admin), being built with sound practices (server-side price authority, safe session handling, tests where bugs cost something), and being easy for anyone to clone and run.

## Solution

A web store where visitors browse a catalog of products by category and search, view product details, and add items to a cart kept in their browser. To check out they register or log in, enter a shipping address, and pay through a mock payment step. The server recalculates every price from the database before creating the order. Customers see their order history and can cancel an order while it is still `placed`. Admins manage products and move orders through their lifecycle.

The whole stack comes up with `docker compose up`. The default is a development setup with hot reload. A production-like setup runs nginx, which serves the compiled Angular app and proxies `/api` to Express, alongside MongoDB with a persistent volume. A seed step creates the first admin and about 20 sample products, so the store is usable on first launch.

## User Stories

### Browsing the catalog

1. As a visitor, I want to see a list of products on the home page, so that I can start shopping right away.
2. As a visitor, I want each product in the list to show its image, name and price, so that I can scan quickly.
3. As a visitor, I want to filter products by category, so that I only see what I'm interested in.
4. As a visitor, I want to search products by words in their name or description, so that I can find a specific item.
5. As a visitor, I want search and category filtering to work together, so that I can narrow results precisely.
6. As a visitor, I want the product list paginated, so that pages load quickly and stay readable.
7. As a visitor, I want to move between pages of results, so that I can see the whole catalog.
8. As a visitor, I want a clear message when a search has no results, so that I know to try something else.
9. As a visitor, I want the current search, category and page reflected in the URL, so that I can bookmark or share a result set and the back button works.
10. As a visitor, I want prices shown in euros with two decimals, so that prices are unambiguous.

### Product detail

11. As a visitor, I want to open a product's detail page, so that I can read its full description.
12. As a visitor, I want the detail page to show a large image, name, price, category and description, so that I can decide whether to buy.
13. As a visitor, I want to choose a quantity and add the product to my cart from the detail page, so that I can buy several at once.
14. As a visitor, I want a friendly "not found" page for products that don't exist or were removed, so that broken links don't show a blank screen.

### Cart

15. As a visitor, I want to add products to a cart without an account, so that I can shop before committing to registering.
16. As a visitor, I want a cart indicator in the header showing the item count, so that I always know what's in my cart.
17. As a visitor, I want to see my cart with each line's product, unit price, quantity and line total, so that I understand what I'll pay.
18. As a visitor, I want to change the quantity of a cart line, so that I can buy more or fewer.
19. As a visitor, I want to remove a line from my cart, so that I can drop things I no longer want.
20. As a visitor, I want to see the cart subtotal, so that I know the total before checking out.
21. As a visitor, I want my cart to survive a page reload or closing the browser, so that I don't lose it.
22. As a visitor, I want adding a product that's already in the cart to increase its quantity rather than add a duplicate line, so that the cart stays tidy.
23. As a visitor, I want an empty-cart message with a link back to the catalog, so that I know what to do next.
24. As a visitor, I want cart lines for products that no longer exist to be flagged or dropped at checkout, so that I'm not charged for unavailable items.

### Accounts

25. As a visitor, I want to register with my name, email and password, so that I can place orders.
26. As a visitor, I want clear validation errors (invalid email, password too short, email already registered), so that I can fix my input.
27. As a registered customer, I want to log in with email and password, so that I can check out and see my orders.
28. As a registered customer, I want a generic "invalid email or password" message on failure, so that my account's existence isn't revealed.
29. As a logged-in customer, I want to stay logged in across page reloads, so that I don't have to log in repeatedly.
30. As a logged-in customer, I want to log out, so that nobody else on this device can use my account.
31. As a logged-in customer, I want to see my name in the header, so that I know I'm logged in.
32. As a customer, I want my password stored only as a hash, so that a database leak doesn't expose it.

### Checkout

33. As a visitor with items in my cart, I want to be asked to log in or register when I start checkout, and then return to checkout, so that I don't lose my place.
34. As a customer, I want to enter a shipping address (name, street, postal code, city, country), so that the order can be delivered.
35. As a customer, I want the checkout page to show my order summary, so that I can review before paying.
36. As a customer, I want to pay through a simple mock payment step, so that the full checkout flow can be demonstrated without real money.
37. As a customer, I want a confirmation page with my order number after placing an order, so that I know it succeeded.
38. As a customer, I want my cart emptied after a successful order, so that I don't reorder by accident.
39. As a customer, I want the order total calculated by the server from current product prices, so that the price I pay can't be tampered with in the browser.
40. As a customer, I want a clear error if an item in my cart no longer exists or a quantity is invalid, so that I can fix my cart.
41. As a customer, I want the order to record the product name and price at the time of purchase, so that my order history stays accurate if the product is later edited or deleted.

### Order history

42. As a customer, I want a list of my past orders with date, total and status, so that I can track my purchases.
43. As a customer, I want to open an order and see its lines, shipping address and status, so that I know exactly what I bought.
44. As a customer, I want to cancel an order while it's still `placed`, so that I can change my mind before it ships.
45. As a customer, I want the cancel option unavailable once an order has shipped, so that the rules are clear.
46. As a customer, I want to see only my own orders, so that my purchases stay private.

### Admin: products

47. As an admin, I want an admin area only admins can access, so that customers can't change the catalog.
48. As an admin, I want to see all products in a table, so that I can manage the catalog.
49. As an admin, I want to create a product with name, description, price, category and image URL, so that I can add items to the store.
50. As an admin, I want to edit a product, so that I can fix details or change prices.
51. As an admin, I want to delete a product after a confirmation step, so that I can remove items without deleting by accident.
52. As an admin, I want validation on product forms (required fields, positive price, category from the fixed list, valid URL), so that the catalog stays clean.
53. As an admin, I want to enter prices in euros while they're stored exactly, so that there are no rounding errors.

### Admin: orders

54. As an admin, I want to see all orders from all customers, newest first, so that I can process them.
55. As an admin, I want to filter orders by status, so that I can focus on those needing action.
56. As an admin, I want to open an order and see the customer, lines, total and shipping address, so that I can fulfil it.
57. As an admin, I want to move an order from `placed` to `shipped` to `delivered`, so that customers see progress.
58. As an admin, I want to cancel an order that hasn't shipped, so that I can handle problems.
59. As an admin, I want invalid status changes (for example `delivered` back to `placed`) rejected, so that order history stays consistent.

### Security and access

60. As a customer, I want my session in an httpOnly cookie, so that page scripts can't steal it.
61. As an admin, I want every admin API endpoint to reject non-admins with 403 and anonymous users with 401, so that hiding the admin UI isn't the only protection.
62. As a customer, I want requests for another customer's order to be refused, so that my data can't be read by guessing IDs.

### Running the project

63. As a developer, I want to start the whole stack with `docker compose up`, so that I don't have to install MongoDB or run several terminals.
64. As a developer, I want code changes in the frontend and backend to reload automatically in the dev setup, so that I get fast feedback.
65. As a developer, I want a production-like mode where nginx serves the built Angular app and proxies `/api` to Express, so that I can check the real deployment shape.
66. As a developer, I want MongoDB data kept in a named volume, so that it survives container restarts.
67. As a developer, I want the first admin (from environment variables) and about 20 sample products seeded automatically, so that the store is usable immediately.
68. As a developer, I want seeding to be safe to run again, so that it doesn't create duplicates or overwrite my changes.
69. As a developer, I want secrets such as the session secret and admin password to come from environment variables with an example file, so that they're never committed.
70. As a developer, I want a health endpoint on the API, so that Compose and I can tell when the backend is ready.
71. As a developer, I want model types shared between frontend and backend, so that the API and UI can't silently drift apart.
72. As a developer, I want one command to run the backend tests, so that I can check auth, pricing and permissions quickly.

## Implementation Decisions

### Repository and tooling

- An npm-workspaces monorepo with three workspaces: the Angular frontend, the Express backend, and a shared package of TypeScript types (Product, Order, OrderStatus, User as seen by the client, the category list, and API request/response shapes).
- TypeScript everywhere. Node 22 locally and in containers (`node:22-alpine`).
- Git, with a commit after each working milestone.

### Frontend (Angular)

- The current Angular version, with standalone components, signals and client-side rendering only (no SSR).
- Angular Material for the UI.
- Main areas: catalog (list with search, category filter, pagination; state kept in URL query params), product detail, cart, auth (login and register), checkout, confirmation, order history and detail, and an admin section with product and order management.
- A **cart store** service holds the cart as signals (lines of product ID, snapshot name and price for display, and quantity), with derived item count and subtotal, and saves to localStorage. Its public interface: add, set quantity, remove, clear, plus read-only lines, count and subtotal. Displayed prices are informational; the server is authoritative.
- An **auth service** tracks the current user by calling the "current user" endpoint on startup. Route guards protect checkout, order history (logged in) and admin (admin role). Guards only affect UX; the API enforces access.
- An HTTP interceptor sends credentials with every request. The frontend always calls relative `/api/...` URLs, so it's same-origin behind nginx and in the dev server (via its proxy config).

### Backend (Express)

- An **app factory** builds the Express app from its dependencies (the database connection and config) without connecting or listening on import. A separate entry point connects to MongoDB, runs the seed step and listens. This is the main test seam.
- Mongoose models:
  - **User**: name, email (unique, lowercased), passwordHash (bcrypt), role (`customer` | `admin`), timestamps.
  - **Product**: name, description, priceCents (positive integer), category (one of the fixed shared list), imageUrl, timestamps. A text index on name and description.
  - **Order**: owner user reference; lines, each holding a product ID plus a snapshot of name and unitPriceCents, and a quantity; totalCents; shipping address (name, street, postalCode, city, country); status; payment reference from the mock provider; timestamps.
- Money is always integer euro cents. The currency is a single config constant.
- Sessions use `express-session` stored in MongoDB via `connect-mongo`, with an httpOnly, SameSite=Lax cookie (Secure in production). Passwords are hashed with bcrypt. Login regenerates the session ID.
- A **payment provider** interface with one mock implementation that always approves and returns a fake reference. Checkout depends on the interface, so Stripe could be added later without changing checkout logic.
- Request bodies are validated at the route boundary. Validation failures return 400 with field-level messages.
- The error format is one consistent JSON shape for 400, 401, 403, 404, 409 and 500.

### API contract (REST under `/api`)

- `GET /api/health`: liveness and database connectivity.
- Auth:
  - `POST /api/auth/register` creates a customer and logs them in (409 if the email is taken).
  - `POST /api/auth/login` (401 with a generic message on failure).
  - `POST /api/auth/logout`.
  - `GET /api/auth/me` returns the current user, or 401.
- Products (public):
  - `GET /api/products` with query params `q`, `category`, `page` and `pageSize` (capped), returning items plus total count and page info.
  - `GET /api/products/:id` (404 if missing).
  - `GET /api/categories` returns the fixed list.
- Orders (customer):
  - `POST /api/orders` takes cart lines (product ID and quantity only; any client prices are ignored) and a shipping address. The server loads products, rejects missing products or invalid quantities with 400, computes the totals, charges through the payment provider, and stores the order as `placed`.
  - `GET /api/orders` returns the current user's orders.
  - `GET /api/orders/:id` returns one of the user's own orders (404 for other users' orders, so their existence isn't revealed).
  - `POST /api/orders/:id/cancel` works only for the owner while the order is `placed` (409 otherwise).
- Admin (401 when anonymous, 403 for non-admins):
  - `POST`, `PUT` and `DELETE` on `/api/admin/products`.
  - `GET /api/admin/orders`, with an optional status filter.
  - `GET /api/admin/orders/:id`.
  - `PATCH /api/admin/orders/:id/status`.

### Order lifecycle

- Statuses: `placed`, `shipped`, `delivered`, `cancelled`.
- Allowed transitions: `placed → shipped`, `shipped → delivered`, and `placed → cancelled` (by the owner or an admin). Every other transition is rejected with 409. `delivered` and `cancelled` are final.
- Transition rules live in one place in the backend and are used by both the customer cancel endpoint and the admin status endpoint.

### Seeding

- On backend start, a seed step runs that is safe to repeat:
  - It creates the admin user from environment variables only if no user with that email exists.
  - It inserts about 20 sample products spread across the categories only if the products collection is empty.
- Sample products use placeholder image URLs.

### Docker

- `compose.yaml` (production-like) runs three services:
  - **web**: a multi-stage build that compiles Angular, then nginx serves the static files with SPA fallback and proxies `/api` to the API service.
  - **api**: a multi-stage build that compiles TypeScript and runs on `node:22-alpine`.
  - **mongo**: the official MongoDB image (7.0, because 8.x fails on Linux kernel 6.19+; see ticket 01) with a named volume.
- Health checks: `api` waits for a healthy `mongo`, and `web` waits for `api`.
- `compose.override.yaml` (development, applied automatically) runs the Angular dev server and the API in watch mode, bind-mounts the source, keeps `node_modules` inside the container, and exposes the dev ports.
- The production-like stack runs with `docker compose -f compose.yaml up --build`.
- Configuration comes from a `.env` file (git-ignored) with a committed example file listing every variable: Mongo URL, session secret, admin email and password, and ports.

## Testing Decisions

- A good test drives the system through a public interface and asserts on externally visible results (HTTP status, response body, the next request's response). Tests don't reach into route handlers, Mongoose models or private functions, and they survive refactors of internals.
- **Seam 1: the backend HTTP API.** Vitest with supertest against the app factory, backed by an in-memory MongoDB (`mongodb-memory-server`) with a fresh database per test file. A cookie-keeping agent holds sessions across requests. It covers:
  - Register, login, logout, and the current-user endpoint, including the generic login failure and the duplicate email case.
  - Checkout: the total is computed from database prices even when the client sends different prices; missing products and invalid quantities are rejected; an anonymous user gets 401; the order is stored as `placed` with price snapshots.
  - Order privacy: one customer can't read or cancel another's order.
  - Order lifecycle: every allowed transition succeeds and disallowed ones return 409, through both the customer and admin endpoints.
  - Admin authorization: anonymous users get 401 and customers get 403 on every admin endpoint; admins succeed.
  - Catalog: category filter, text search, pagination bounds, and 404 for missing products.
  - Seeding is safe to repeat: running it twice produces no duplicates.
- **Seam 2: the frontend cart store.** Angular unit tests through its public methods: add (including merging into an existing line), set quantity, remove, clear, derived count and subtotal, and restoring state from localStorage.
- There is no prior art in the repo; these tests establish the patterns.
- **Manual check (not automated):** run `docker compose -f compose.yaml up --build` and confirm the app loads through nginx, `/api/health` reports healthy, seeded products appear, and the admin can log in. Repeat for the dev setup and confirm hot reload.
- Angular components (pages, forms, admin screens) aren't tested in v1.

## Out of Scope

- Real payments (Stripe or others), taxes, shipping costs, discounts and coupons
- Inventory and stock tracking
- Product reviews and ratings
- Multiple currencies and internationalization
- Guest checkout
- A server-side or cross-device cart
- Image uploads (products use image URLs)
- Category management (categories are a fixed shared list)
- Email sending (order confirmation, password reset)
- Password reset and account settings
- Server-side rendering and SEO
- End-to-end browser tests
- Production deployment and hosting, TLS and CI pipelines

## Further Notes

- This is a learning and portfolio project. Choices favor clarity and sound practice over feature breadth, but the payment interface, typed shared models and app factory leave room to grow into a real store.
- Security habits worth showing even without real money: server-side price authority, httpOnly session cookies, regenerating the session on login, bcrypt hashing, 404 rather than 403 for other users' orders, and role checks enforced in the API rather than only in the UI.
- Docker Engine 29 and Compose v2 are installed locally on Ubuntu 26.04. There is no global Angular CLI, so scaffolding uses `npx @angular/cli`.
- Implementation should be split into tickets with `/to-tickets` before building.
