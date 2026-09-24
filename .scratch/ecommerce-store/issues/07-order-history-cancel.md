# 07: Order history and customer cancel

**What to build:** A logged-in customer opens "My orders" and sees their orders, newest first, with date, total and status. Opening one shows its lines (with the prices paid), the shipping address and the status. While an order is still `placed`, the customer can cancel it; once it has shipped, the option is gone. Customers can never see or cancel someone else's order. This ticket also introduces the order status rules that ticket 09 reuses. See the spec: user stories 42–46 and 62, Order lifecycle.

**Blocked by:** 06 (Checkout and place an order)

**Status:** done

- [x] The order status rules live in one backend module: `placed → shipped`, `shipped → delivered`, `placed → cancelled`; everything else is rejected; `delivered` and `cancelled` are final
- [x] `GET /api/orders` returns only the current user's orders, newest first
- [x] `GET /api/orders/:id` returns the user's own order, or 404 for other users' orders and unknown IDs
- [x] `POST /api/orders/:id/cancel` cancels the user's own `placed` order, returns 409 for any other status and 404 for other users' orders
- [x] An order history page (list) and order detail page, both behind the login guard; a "My orders" link in the header menu; a cancel action with a confirmation, shown only for `placed` orders
- [x] The confirmation page from ticket 06 links to the new order's detail page
- [x] API tests: a user sees only their own orders; another user's order gives 404 on read and on cancel; cancelling a `placed` order succeeds; cancelling a non-`placed` order gives 409 (with the status set directly in the test database)
- [x] Unit-level coverage of the status rules through their public function: every allowed transition passes and every other pair is rejected

## Comments

**Done (2026-09-24).** Notes for later tickets:

- **Status rules for ticket 09.** They live in the backend's order-status module: `canTransition`, `assertTransition` (409 `invalid_status_transition`) and `allowedNextStatuses`. The admin status endpoint should reuse them, together with the same compare-and-set update (`findOneAndUpdate({ _id, status: <status read> })`) that customer cancel uses, so a concurrent change gives 409 instead of being silently overwritten.
- **List responses.** `GET /api/orders` returns an unpaginated `OrderSummary[]` (id, number, itemCount, totalCents, status, createdAt), newest first. `ORDER_STATUS_LABELS` and `OrderSummary` are in the shared package.
- **Hidden orders.** Other users' orders and malformed IDs return 404 `order_not_found`, the same as unknown ones.
- **Reusable frontend pieces:**
  - `Confirm.ask()` wraps a Material dialog, for ticket 08's delete confirmation.
  - `StatusChip` shows a colored status label, for ticket 09.
- **Order numbers.** The number is the last 8 hex characters of the ObjectId, and ObjectIds end in a per-process counter, so consecutive orders get consecutive-looking numbers (…FAE, …FAF). That's fine for display.
