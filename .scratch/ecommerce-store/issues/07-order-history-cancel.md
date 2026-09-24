# 07: Order history and customer cancel

**What to build:** A logged-in customer opens "My orders" and sees their orders, newest first, with date, total and status. Opening one shows its lines (with the prices paid), the shipping address and the status. While an order is still `placed`, the customer can cancel it; once it has shipped, the option is gone. Customers can never see or cancel someone else's order. This ticket also introduces the order status rules that ticket 09 reuses. See the spec: user stories 42–46 and 62, Order lifecycle.

**Blocked by:** 06 (Checkout and place an order)

**Status:** ready-for-agent

- [ ] The order status rules live in one backend module: `placed → shipped`, `shipped → delivered`, `placed → cancelled`; everything else is rejected; `delivered` and `cancelled` are final
- [ ] `GET /api/orders` returns only the current user's orders, newest first
- [ ] `GET /api/orders/:id` returns the user's own order, or 404 for other users' orders and unknown IDs
- [ ] `POST /api/orders/:id/cancel` cancels the user's own `placed` order, returns 409 for any other status and 404 for other users' orders
- [ ] An order history page (list) and order detail page, both behind the login guard; a "My orders" link in the header menu; a cancel action with a confirmation, shown only for `placed` orders
- [ ] The confirmation page from ticket 06 links to the new order's detail page
- [ ] API tests: a user sees only their own orders; another user's order gives 404 on read and on cancel; cancelling a `placed` order succeeds; cancelling a non-`placed` order gives 409 (with the status set directly in the test database)
- [ ] Unit-level coverage of the status rules through their public function: every allowed transition passes and every other pair is rejected
