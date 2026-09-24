# 02: Browse the catalog

**What to build:** A visitor opens the store and sees a paginated grid of products, each with its image, name and price in euros. They can search by words in the name or description, filter by category, combine both, and page through results. The current search, category and page are kept in the URL, so results can be bookmarked and the back button works. On first start, the backend seeds about 20 sample products across the categories. See the spec: user stories 1–10 and 67–68 (products), and Seeding.

**Blocked by:** 01 (Walking skeleton)

**Status:** ready-for-agent

- [ ] Product model: name, description, priceCents (positive integer), category (one of the fixed list in the shared package), imageUrl, timestamps; a text index on name and description
- [ ] The Product type, the category list and the paginated list response shape live in the shared package
- [ ] A seed step on backend start inserts about 20 sample products with placeholder image URLs only when the products collection is empty
- [ ] `GET /api/products` supports `q` (text search), `category`, `page` and `pageSize` (capped at a maximum), and returns items plus total count and page info
- [ ] `GET /api/categories` returns the fixed category list
- [ ] The catalog page shows a product grid with search, a category filter and pagination, with state read from and written to URL query params
- [ ] Prices display as euros with two decimals, formatted from cents
- [ ] An empty-results message appears when nothing matches
- [ ] API tests cover the category filter, text search, search combined with category, pagination (including out-of-range pages and the pageSize cap), and seeding twice producing no duplicates
