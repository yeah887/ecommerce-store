# 03: Product detail page

**What to build:** A visitor clicks a product in the catalog and lands on its detail page, showing a large image, name, price, category and full description, with a quantity picker next to an add-to-cart button. The button is wired to the cart in ticket 04. A link to a product that doesn't exist or was deleted shows a friendly not-found page instead of a blank screen. See the spec: user stories 11–14.

**Blocked by:** 02 (Browse the catalog)

**Status:** ready-for-agent

- [ ] `GET /api/products/:id` returns the product, or 404 in the standard error shape for unknown or malformed IDs
- [ ] Catalog items link to the detail page
- [ ] The detail page shows image, name, price, category and description, plus a quantity picker (minimum 1)
- [ ] Unknown products show a not-found page with a link back to the catalog; unknown app routes show the same not-found page
- [ ] API tests cover a found product, an unknown ID (404) and a malformed ID (404)
