/** Uploaded images are served from here, followed by the image's 24-character hex id. */
export const UPLOADED_IMAGE_PATH = '/api/images/';

export const IMAGE_UPLOAD = {
  /** 5 MB */
  maxBytes: 5 * 1024 * 1024,
  /** SVG is left out on purpose: it can carry scripts. */
  types: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
} as const;

export type ImageType = (typeof IMAGE_UPLOAD.types)[number];

/** Response of `POST /api/admin/images`. */
export interface UploadedImage {
  url: string;
}

/** The image id when `url` points at an uploaded image, otherwise null. */
export function uploadedImageId(url: string): string | null {
  if (!url.startsWith(UPLOADED_IMAGE_PATH)) return null;
  const id = url.slice(UPLOADED_IMAGE_PATH.length);
  return /^[0-9a-f]{24}$/.test(id) ? id : null;
}

/** A product image is either an uploaded image or an external http(s) URL. */
export function isProductImageUrl(url: string): boolean {
  if (uploadedImageId(url)) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}
