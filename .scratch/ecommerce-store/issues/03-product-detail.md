# 03: Product detail page

**What to build:** A visitor clicks a product in the catalog and lands on its detail page, showing a large image, name, price, category and full description, with a quantity picker next to an add-to-cart button. The button is wired to the cart in ticket 04. A link to a product that doesn't exist or was deleted shows a friendly not-found page instead of a blank screen. See the spec: user stories 11–14.

**Blocked by:** 02 (Browse the catalog)

**Status:** done

- [x] `GET /api/products/:id` returns the product, or 404 in the standard error shape for unknown or malformed IDs
- [x] Catalog items link to the detail page
- [x] The detail page shows image, name, price, category and description, plus a quantity picker (minimum 1)
- [x] Unknown products show a not-found page with a link back to the catalog; unknown app routes show the same not-found page
- [x] API tests cover a found product, an unknown ID (404) and a malformed ID (404)

## Comments

**Done (2026-09-24).** Notes for later tickets:

- **The 404 code is `product_not_found`.** `GET /api/products/:id` returns it for unknown IDs and for malformed IDs alike, with no separate 400. Ticket 06 can use the same code when it reports missing cart lines.
- **The add-to-cart button is a disabled placeholder for ticket 04.** The quantity picker keeps its value between 1 and `MAX_QUANTITY` (99, exported from the product page), clamping typed values. Ticket 04 should move `MAX_QUANTITY` to the shared package so the cart and the order API can use the same limit.
- **Missing router params arrive as `undefined`.** With `withComponentInputBinding`, router input binding sets inputs to `undefined` when their route or query param is absent, which overrides `input()` defaults. `NotFound` therefore keeps its defaults in the template. Keep this in mind for other routed components.
- **"Back to the catalog" always goes to `/`,** dropping any earlier search or filter. The browser back button keeps them.
- **Browser checks.** Verified in a real browser with headless Firefox driven through geckodriver (`/snap/bin/geckodriver`); the one-shot `firefox --screenshot` fires before async data loads.
