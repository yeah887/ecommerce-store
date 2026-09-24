# 06: Checkout and place an order

**What to build:** A visitor with items in the cart clicks Checkout. If not logged in, they are sent to log in or register and then returned to checkout. They enter a shipping address, review an order summary, and place the order through a mock payment step. The server recalculates every price from the database and ignores prices sent by the browser, then stores the order as `placed` with a snapshot of each product's name and price. The customer sees a confirmation page with the order number, and the cart is emptied. See the spec: user stories 24, 33–41, the payment provider, the Order model, and the `POST /api/orders` contract.

**Blocked by:** 04 (Shopping cart), 05 (Customer accounts)

**Status:** done

- [x] Order model: owner reference; lines (product ID, snapshot name, unitPriceCents, quantity); totalCents; shipping address (name, street, postalCode, city, country); status; payment reference; timestamps
- [x] Order and status types plus the create-order request shape live in the shared package
- [x] A payment provider interface with a mock implementation that approves and returns a fake reference; checkout depends only on the interface
- [x] `POST /api/orders` requires login (401), accepts only product IDs and quantities plus a shipping address, validates quantities (positive integers), rejects missing products with 400 naming the offending lines, computes totals from database prices, charges through the payment provider and stores the order as `placed`
- [x] Checkout is guarded: anonymous users are redirected to login and returned to checkout afterwards
- [x] The checkout page shows the shipping address form (validated) and an order summary, plus a "Pay and place order" mock payment step
- [x] On success the cart is cleared and the confirmation page shows the order number; on a 400 the page shows which cart lines are invalid
- [x] The Checkout button on the cart page leads here; it is disabled for an empty cart
- [x] API tests: prices sent by the client are ignored and the total comes from the database; snapshots are stored; missing product (400); zero or negative quantity (400); anonymous (401); new orders have status `placed`

## Comments

**Done (2026-09-24).** Notes for later tickets:

- **Order numbers.** An order's `number` is the last 8 characters of its id, upper-cased, from the shared `orderNumber()`. It isn't stored separately. Ticket 07 can show it the same way.
- **Line errors:**
  - Every bad line comes back as 400 `invalid_lines`, with `fields` keyed `lines.<index>` (the position in the request): malformed or unknown product IDs, missing products, bad quantities (a whole number from 1 to `MAX_QUANTITY`), and duplicates.
  - An empty or oversized (>100 lines) `lines` gives `fields.lines`.
  - Address problems give `validation_failed` with `shippingAddress.<field>`.
- **Payments.** `PaymentProvider` is injected through `createApp({ payments })`; the default is `MockPaymentProvider`. A `PaymentDeclinedError` becomes 402 `payment_declined`. The charge happens before the order is saved; with a real provider, a failed save after a successful charge would need a refund, which is out of scope for the mock.
- **Confirmation page.** It gets the order through router navigation state. After a reload it shows only the number from the URL; ticket 07 should link it to the order detail page.
- **Stale snapshot prices.** Cart prices are browser-side snapshots and can be stale (for example after an admin price change in ticket 08). The summary says the final price is confirmed, and the confirmation shows the server's total.
- **Temporary test databases.** Backend tests now put mongodb-memory-server's temporary databases under `node_modules/.cache/mongodb-memory-server/tmp` (via `TMPDIR` in the Vitest config). `/tmp` on this machine is a RAM disk with per-user quotas, and parallel mongod instances hit "Disk quota exceeded".
- **MatInput overrides `[attr.name]`.** It has its own `name` input, so bind `[name]` instead.
