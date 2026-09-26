import express, { Router } from 'express';
import { pipeline } from 'node:stream/promises';
import { IMAGE_UPLOAD, UPLOADED_IMAGE_PATH, type UploadedImage } from '@store/shared';
import { HttpError } from '../errors.js';
import { detectImageType, type ImageStore } from '../images.js';

/** Serves uploaded images to anyone. */
export function imagesRouter(images: ImageStore): Router {
  const router = Router();

  router.get('/:id', async (req, res) => {
    const image = await images.open(req.params.id);
    if (!image) throw new HttpError(404, 'image_not_found', 'Image not found');
    res.set({
      'Content-Type': image.contentType,
      'Content-Length': String(image.length),
      // An id always names the same bytes: replacing a picture uploads a new image.
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'",
    });
    // pipeline destroys both streams on failure, e.g. when the client goes away; there is nothing left to answer.
    await pipeline(image.stream, res).catch(() => undefined);
  });

  return router;
}

/** Image uploads. Mounted behind `requireAdmin`, so only admins' bodies are ever read. */
export function adminImagesRouter(images: ImageStore): Router {
  const router = Router();

  // The body is the image file itself; its type is detected from the bytes, not from Content-Type.
  router.post('/', express.raw({ type: () => true, limit: IMAGE_UPLOAD.maxBytes }), async (req, res) => {
    const data: unknown = req.body;
    if (!Buffer.isBuffer(data) || data.length === 0) {
      throw new HttpError(400, 'image_missing', 'Send the image file as the request body');
    }
    const type = detectImageType(data);
    if (!type) {
      throw new HttpError(415, 'unsupported_image_type', 'Upload a JPEG, PNG, WebP or GIF image');
    }
    const id = await images.save(data, type);
    const body: UploadedImage = { url: `${UPLOADED_IMAGE_PATH}${id}` };
    res.status(201).json(body);
  });

  return router;
}
