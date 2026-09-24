# 09: Admin: manage orders

**What to build:** An admin sees every customer's orders, newest first, filters them by status, and opens any order to see the customer, lines, total and shipping address. From there they move the order along its lifecycle (placed → shipped → delivered) or cancel it before it ships. Invalid status changes are rejected. The customer's order history reflects the new status. See the spec: user stories 54–59, Order lifecycle, and the admin order endpoints.

**Blocked by:** 07 (Order history and customer cancel), 08 (Admin: manage products)

**Status:** ready-for-agent

- [ ] `GET /api/admin/orders` lists all orders newest first, with an optional status filter and the customer's name and email
- [ ] `GET /api/admin/orders/:id` returns any order (404 if unknown)
- [ ] `PATCH /api/admin/orders/:id/status` applies a status change through the shared status rules from ticket 07, with 409 for disallowed changes and 400 for unknown statuses
- [ ] An admin orders table with a status filter, and an order detail page with action buttons for only the allowed next statuses
- [ ] API tests: 401 and 403 on every admin order endpoint; admin sees orders from several customers; the filter works; each allowed change succeeds and disallowed ones give 409; the customer's `GET /api/orders/:id` shows the updated status
- [ ] If not already covered in ticket 08: an order placed before its product is edited or deleted still shows the original name and price
