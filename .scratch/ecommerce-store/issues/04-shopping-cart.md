# 04: Shopping cart

**What to build:** A visitor, logged in or not, adds products to a cart from the catalog grid or from the detail page with a chosen quantity. A badge in the header shows the item count. The cart page lists each line with product, unit price, quantity and line total, lets the visitor change quantities or remove lines, and shows the subtotal. The cart survives page reloads and closing the browser. An empty cart shows a message with a link back to the catalog. See the spec: user stories 15–23, and the cart store under Frontend.

**Blocked by:** 03 (Product detail page)

**Status:** done

- [x] A cart store service holds cart lines (product ID, snapshot name, price and image for display, quantity) as signals, with derived item count and subtotal
- [x] Cart store interface: add (merges into an existing line for the same product), set quantity (quantity 0 or less removes the line), remove, clear
- [x] The cart is saved to localStorage and restored on startup; corrupt or missing stored data results in an empty cart without errors
- [x] Add-to-cart works from catalog items (quantity 1) and from the detail page (chosen quantity), with a brief confirmation such as a snackbar
- [x] The header cart badge shows the live item count and links to the cart page
- [x] The cart page shows lines with unit price, quantity controls, line total and remove, plus the subtotal and a "Checkout" button (wired up in ticket 06)
- [x] An empty cart shows a message and a link to the catalog
- [x] Angular unit tests for the cart store: add, merge on repeat add, set quantity, remove, clear, count and subtotal, restore from localStorage, and corrupt localStorage

## Comments

**Done (2026-09-24).** Notes for later tickets:

- **`MAX_QUANTITY` (99) is in the shared package now.** Ticket 06's order validation should use it too.
- **The store stays valid on its own.** `CartStore` caps quantities at 99, rounds fractions down, and ignores adds of 0, negative or NaN quantities; `setQuantity` of 0 or less removes the line. Storage key `store.cart.v1`: malformed, duplicate or invalid stored lines are dropped on load, and a `storage` event listener keeps open tabs in sync.
- **Each add refreshes the snapshot.** It updates the line's name, price and image, so the cart shows the latest price the shopper saw.
- **Ticket 06 needs to wire checkout.** The cart page's Checkout button is a disabled placeholder. Checkout should send only `productId` and `quantity` from `CartStore.lines()` and call `clear()` on success.
- **`AddToCart`** (a root service) wraps `CartStore.add` with a snackbar whose "View cart" action goes to `/cart`. The catalog cards and the detail page use it.
- **`QuantityPicker`** (in the frontend's `shared` folder) is used on the detail page and in cart lines.
- **Material gotchas:**
  - In Material 3, `matBadgeSize="small"` renders a dot with no number, so the header badge uses the default size.
  - `mat-card-image` only sizes images that are direct children of the card, so the linked card image sizes itself.
- **Browser check.** The full flow was checked in headless Firefox via geckodriver:
  - add from a card and from the detail page (quantity 3)
  - "View cart", +/−, typing 1000 (capped to 99)
  - reload persistence, remove down to an empty cart
  - corrupt storage
