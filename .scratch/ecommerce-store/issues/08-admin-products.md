# 08: Admin: manage products

**What to build:** An admin logs in and reaches an admin area that customers can't access, either in the UI or through the API. There they see all products in a table and can create, edit and delete products. Prices are entered in euros and stored as cents, and deleting asks for confirmation first. The form validates required fields, a positive price, a category from the fixed list, and a valid image URL. See the spec: user stories 47–53 and 61, and the admin API contract.

**Blocked by:** 02 (Browse the catalog), 05 (Customer accounts)

**Status:** done

- [x] A reusable backend guard returns 401 when not logged in and 403 for non-admins, applied to all `/api/admin` routes
- [x] `POST /api/admin/products`, `PUT /api/admin/products/:id` and `DELETE /api/admin/products/:id` validate input (400 with field errors) and return 404 for unknown IDs
- [x] Past orders keep their snapshots when a product is edited or deleted, which already holds by design; a test confirms it once ticket 06 exists, and otherwise it is noted for ticket 09
- [x] The admin route guard in the UI allows only the admin role; the header shows an "Admin" link only for admins
- [x] The admin product table (Material table) links to create and edit forms; delete shows a confirmation dialog
- [x] The product form converts euro input to cents exactly (no floating-point drift) and shows validation errors
- [x] API tests: anonymous users get 401 and customers get 403 on every admin product endpoint; an admin can create, update and delete; invalid input gives 400; an unknown ID gives 404; changes appear in `GET /api/products`

## Comments

**Done (2026-09-24).** Notes for later tickets:

- **Admin access.** `requireAdmin` (session module) is mounted once on `/api/admin`, so every admin route, including unknown paths, gives 401 to visitors and 403 `forbidden` to customers. Ticket 09 only needs to mount its router under `/api/admin/orders`.
- **Product validation.**
  - `POST` and `PUT /api/admin/products` take a full `ProductInput` (shared). Unknown fields are ignored.
  - Limits are in `PRODUCT_LIMITS`: name ≤120, description ≤2000, price 1…10,000,000 cents, image URL ≤500 and http(s) only.
  - `DELETE` returns 204. Unknown and malformed IDs return 404 `product_not_found`.
- **Snapshot check done here.** The acceptance item about past orders surviving product edits and deletes is covered by a test in this ticket (ticket 06 already existed), so ticket 09 doesn't need it.
- **Admin table data.** The admin table reuses the public `GET /api/products` with pageSize 48 plus search; there's no admin-only list endpoint.
- **Euro parsing rejects thousands separators.** `parseEuroToCents` (in the frontend's admin folder, with unit tests) uses string math, accepts `.` or `,` with up to two decimals, and refuses thousands separators, because "12.505" is ambiguous.
- **Frontend access.** `adminGuard` sends visitors to login and customers home. The user menu shows "Manage products" to admins; ticket 09 can add "Manage orders" next to it.
