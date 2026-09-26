# 11: Admin: upload product pictures

**What to build:** An admin can upload a real picture for a product from the product form instead of pasting a link to an image hosted elsewhere. Pasting a link keeps working. Uploaded pictures are served by the store itself and are removed once no product uses them.

**Blocked by:** 08 (Admin: manage products)

**Status:** done

- [x] `POST /api/admin/images` (admins only) takes the raw file as the body, up to 5 MB, and returns `{ url: "/api/images/<id>" }` (201)
- [x] The type is detected from the file's bytes (JPEG, PNG, WebP, GIF); anything else, including SVG, gives 415. Too large gives 413, an empty body 400
- [x] `GET /api/images/:id` is public, sends the detected type with `nosniff`, and is cached as immutable; unknown ids give 404
- [x] A product's `imageUrl` is an http(s) URL or the URL of an uploaded image that exists
- [x] Replacing a product's uploaded image, or deleting the product, deletes the old image unless another product still uses it
- [x] The product form has an Upload button next to the image field, with client-side type and size checks and the preview
- [x] nginx accepts request bodies large enough for uploads
- [x] API tests cover access, each image type, rejected types, size limit, 404s, product validation and cleanup

## Comments

**Done (2026-09-26).**

- **Storage is GridFS** (bucket `images`) in the store's own database, so there is no extra volume, it's backed up with the rest of the data, and tests work against the in-memory MongoDB unchanged.
- **Orphans.** An image uploaded in the form but never saved to a product stays in the bucket. That's rare and admin-only, so there's no sweep for it yet.
- **Carts** keep a snapshot of `imageUrl` in localStorage. If an admin replaces an uploaded picture, a cart line added earlier shows a broken thumbnail until the product is added again. Orders don't store images, so order history is unaffected.
