# 02: Browse the catalog

**What to build:** A visitor opens the store and sees a paginated grid of products, each with its image, name and price in euros. They can search by words in the name or description, filter by category, combine both, and page through results. The current search, category and page are kept in the URL, so results can be bookmarked and the back button works. On first start, the backend seeds about 20 sample products across the categories. See the spec: user stories 1–10 and 67–68 (products), and Seeding.

**Blocked by:** 01 (Walking skeleton)

**Status:** done

- [x] Product model: name, description, priceCents (positive integer), category (one of the fixed list in the shared package), imageUrl, timestamps; a text index on name and description
- [x] The Product type, the category list and the paginated list response shape live in the shared package
- [x] A seed step on backend start inserts about 20 sample products with placeholder image URLs only when the products collection is empty
- [x] `GET /api/products` supports `q` (text search), `category`, `page` and `pageSize` (capped at a maximum), and returns items plus total count and page info
- [x] `GET /api/categories` returns the fixed category list
- [x] The catalog page shows a product grid with search, a category filter and pagination, with state read from and written to URL query params
- [x] Prices display as euros with two decimals, formatted from cents
- [x] An empty-results message appears when nothing matches
- [x] API tests cover the category filter, text search, search combined with category, pagination (including out-of-range pages and the pageSize cap), and seeding twice producing no duplicates

## Comments

**Done (2026-09-24).** Notes for later tickets:

- **Sorting.** Lists sort by name (with `_id` as a tiebreaker); text searches sort by relevance first. Search uses a MongoDB `$text` index with name weighted 3× over description, so it matches whole words and their stems ("headphone" finds "Headphones") but not word prefixes.
- **Page size.** A `pageSize` above 48 is capped to 48. Pages past the end return `items: []` with the real `total`, not an error. A malformed `page` or `pageSize`, an unknown category, a `q` over 100 characters, or a repeated parameter returns 400 `validation_failed` with `fields`.
- **Database preparation.** The server runs `prepareDatabase` before listening. It builds indexes (needed before the first `$text` query) and seeds sample products only into an empty collection. The test helper runs the same step, and `useTestApp({ seed: true })` includes the sample data.
- **Test fixtures.** Tests arrange fixtures through the Product model, because no admin API exists yet (ticket 08), and assert only through HTTP.
- **Categories in the frontend.** The frontend takes the category list and labels from `@store/shared` rather than calling `GET /api/categories`. The endpoint exists for API clients.
- **Status page.** The status page moved from `/` to `/status`; the catalog is now the home page.
- **Placeholder images.** Sample images come from picsum.photos, so they are random photos unrelated to the products and need internet access.
