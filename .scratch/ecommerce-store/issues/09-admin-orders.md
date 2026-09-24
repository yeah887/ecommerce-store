# 09: Admin: manage orders

**What to build:** An admin sees every customer's orders, newest first, filters them by status, and opens any order to see the customer, lines, total and shipping address. From there they move the order along its lifecycle (placed → shipped → delivered) or cancel it before it ships. Invalid status changes are rejected. The customer's order history reflects the new status. See the spec: user stories 54–59, Order lifecycle, and the admin order endpoints.

**Blocked by:** 07 (Order history and customer cancel), 08 (Admin: manage products)

**Status:** done

- [x] `GET /api/admin/orders` lists all orders newest first, with an optional status filter and the customer's name and email
- [x] `GET /api/admin/orders/:id` returns any order (404 if unknown)
- [x] `PATCH /api/admin/orders/:id/status` applies a status change through the shared status rules from ticket 07, with 409 for disallowed changes and 400 for unknown statuses
- [x] An admin orders table with a status filter, and an order detail page with action buttons for only the allowed next statuses
- [x] API tests: 401 and 403 on every admin order endpoint; admin sees orders from several customers; the filter works; each allowed change succeeds and disallowed ones give 409; the customer's `GET /api/orders/:id` shows the updated status
- [x] If not already covered in ticket 08: an order placed before its product is edited or deleted still shows the original name and price

## Comments

**Done (2026-09-24).** Notes:

- **Lifecycle table in the shared package.** `NEXT_ORDER_STATUSES` now lives in the shared package, so the admin UI offers only the allowed next statuses. The backend's order-status module wraps it (`canTransition`, `assertTransition`, `allowedNextStatuses`).
- **Admin order list.**
  - `GET /api/admin/orders` is paginated (`Page<AdminOrderSummary>`, default 12, max 48; the admin UI uses 20) with an optional `status` filter (unknown status → 400).
  - Each row carries `customer: { id, name, email } | null`, which is null when the account was deleted.
- **Status changes.**
  - `PATCH /api/admin/orders/:id/status` with `{ status }` returns 400 for an unknown status and 409 `invalid_status_transition` for a disallowed change.
  - It uses the same compare-and-set as customer cancel, so a customer cancelling while an admin has the page open gives the admin a 409, and the page reloads to the real status. Checked in the browser.
- **Snapshot check.** The last acceptance item (snapshots survive product edits and deletes) was already covered by a test in ticket 08.
- **Admin layout.** The admin area now has a layout with Products and Orders tabs. The user menu has "Manage orders" for admins.
