# 04: Shopping cart

**What to build:** A visitor, logged in or not, adds products to a cart from the catalog grid or from the detail page with a chosen quantity. A badge in the header shows the item count. The cart page lists each line with product, unit price, quantity and line total, lets the visitor change quantities or remove lines, and shows the subtotal. The cart survives page reloads and closing the browser. An empty cart shows a message with a link back to the catalog. See the spec: user stories 15–23, and the cart store under Frontend.

**Blocked by:** 03 (Product detail page)

**Status:** ready-for-agent

- [ ] A cart store service holds cart lines (product ID, snapshot name, price and image for display, quantity) as signals, with derived item count and subtotal
- [ ] Cart store interface: add (merges into an existing line for the same product), set quantity (quantity 0 or less removes the line), remove, clear
- [ ] The cart is saved to localStorage and restored on startup; corrupt or missing stored data results in an empty cart without errors
- [ ] Add-to-cart works from catalog items (quantity 1) and from the detail page (chosen quantity), with a brief confirmation such as a snackbar
- [ ] The header cart badge shows the live item count and links to the cart page
- [ ] The cart page shows lines with unit price, quantity controls, line total and remove, plus the subtotal and a "Checkout" button (wired up in ticket 06)
- [ ] An empty cart shows a message and a link to the catalog
- [ ] Angular unit tests for the cart store: add, merge on repeat add, set quantity, remove, clear, count and subtotal, restore from localStorage, and corrupt localStorage
