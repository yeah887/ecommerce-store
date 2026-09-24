# 06: Checkout and place an order

**What to build:** A visitor with items in the cart clicks Checkout. If not logged in, they are sent to log in or register and then returned to checkout. They enter a shipping address, review an order summary, and place the order through a mock payment step. The server recalculates every price from the database and ignores prices sent by the browser, then stores the order as `placed` with a snapshot of each product's name and price. The customer sees a confirmation page with the order number, and the cart is emptied. See the spec: user stories 24, 33–41, the payment provider, the Order model, and the `POST /api/orders` contract.

**Blocked by:** 04 (Shopping cart), 05 (Customer accounts)

**Status:** ready-for-agent

- [ ] Order model: owner reference; lines (product ID, snapshot name, unitPriceCents, quantity); totalCents; shipping address (name, street, postalCode, city, country); status; payment reference; timestamps
- [ ] Order and status types plus the create-order request shape live in the shared package
- [ ] A payment provider interface with a mock implementation that approves and returns a fake reference; checkout depends only on the interface
- [ ] `POST /api/orders` requires login (401), accepts only product IDs and quantities plus a shipping address, validates quantities (positive integers), rejects missing products with 400 naming the offending lines, computes totals from database prices, charges through the payment provider and stores the order as `placed`
- [ ] Checkout is guarded: anonymous users are redirected to login and returned to checkout afterwards
- [ ] The checkout page shows the shipping address form (validated) and an order summary, plus a "Pay and place order" mock payment step
- [ ] On success the cart is cleared and the confirmation page shows the order number; on a 400 the page shows which cart lines are invalid
- [ ] The Checkout button on the cart page leads here; it is disabled for an empty cart
- [ ] API tests: prices sent by the client are ignored and the total comes from the database; snapshots are stored; missing product (400); zero or negative quantity (400); anonymous (401); new orders have status `placed`
