# 12: Product image galleries

**What to build:** A product can have up to 15 images instead of one. Admins upload several at once or add links, reorder them and pick the cover by putting it first. Customers see the images in a gallery on the product page, with a full-screen view.

**Blocked by:** 11 (Admin: upload product pictures)

**Status:** done

- [x] `ProductInput` takes `images` (1–15, no duplicates, each an http(s) URL or an existing uploaded image); `Product` returns `images` and keeps `imageUrl` as the cover (`images[0]`), so the catalog, cart and admin table are unchanged
- [x] Products stored with a single `imageUrl` are migrated to `images` on startup, safely repeatable
- [x] Uploaded images removed from a product, or belonging to a deleted product, are deleted unless another product still uses them
- [x] Sample products are seeded with three images each
- [x] Admin form: image grid with cover badge, move earlier/later and remove; multi-file upload (one file at a time, each added as it arrives); add by link; count out of 15
- [x] Product page: large image with previous/next, counter, thumbnails, arrow keys and swipe; clicking opens a full-screen view (Material dialog) that also supports arrows, swipe and Escape, and returns to the image last shown
- [x] API tests for the limits, duplicates, order, partial removal cleanup and migration; unit test for swipe detection

## Comments

**Done (2026-09-29).**

- **Why keep `imageUrl`:** carts in localStorage and every list view only need the cover, so the API derives it instead of every client picking `images[0]`.
- **Existing databases:** the migration uses an update pipeline (MongoDB 4.2+), which also works with the Pi's MongoDB 4.4.
- **Existing sample products keep one image.** Seeding only fills an empty catalog, so a database created before this change keeps its single picsum image per product; `docker compose down -v` reseeds with three.
