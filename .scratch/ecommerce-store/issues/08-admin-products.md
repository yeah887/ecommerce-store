# 08: Admin: manage products

**What to build:** An admin logs in and reaches an admin area that customers can't access, either in the UI or through the API. There they see all products in a table and can create, edit and delete products. Prices are entered in euros and stored as cents, and deleting asks for confirmation first. The form validates required fields, a positive price, a category from the fixed list, and a valid image URL. See the spec: user stories 47–53 and 61, and the admin API contract.

**Blocked by:** 02 (Browse the catalog), 05 (Customer accounts)

**Status:** ready-for-agent

- [ ] A reusable backend guard returns 401 when not logged in and 403 for non-admins, applied to all `/api/admin` routes
- [ ] `POST /api/admin/products`, `PUT /api/admin/products/:id` and `DELETE /api/admin/products/:id` validate input (400 with field errors) and return 404 for unknown IDs
- [ ] Past orders keep their snapshots when a product is edited or deleted, which already holds by design; a test confirms it once ticket 06 exists, and otherwise it is noted for ticket 09
- [ ] The admin route guard in the UI allows only the admin role; the header shows an "Admin" link only for admins
- [ ] The admin product table (Material table) links to create and edit forms; delete shows a confirmation dialog
- [ ] The product form converts euro input to cents exactly (no floating-point drift) and shows validation errors
- [ ] API tests: anonymous users get 401 and customers get 403 on every admin product endpoint; an admin can create, update and delete; invalid input gives 400; an unknown ID gives 404; changes appear in `GET /api/products`
