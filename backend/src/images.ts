import type { Readable } from 'node:stream';
import { mongo, type Connection } from 'mongoose';
import type { ImageType } from '@store/shared';

export const IMAGES_BUCKET = 'images';

export interface StoredImage {
  contentType: ImageType;
  length: number;
  stream: Readable;
}

/** Uploaded images, kept in MongoDB GridFS so they live and are backed up with the rest of the data. */
export class ImageStore {
  private readonly bucket: mongo.GridFSBucket;

  constructor(db: Connection) {
    this.bucket = new mongo.GridFSBucket(db.db!, { bucketName: IMAGES_BUCKET });
  }

  /** Saves the image and returns its id. */
  save(data: Buffer, contentType: ImageType): Promise<string> {
    return new Promise((resolve, reject) => {
      const upload = this.bucket.openUploadStream('image', { metadata: { contentType } });
      upload.once('error', reject);
      upload.once('finish', () => resolve(String(upload.id)));
      upload.end(data);
    });
  }

  /** Opens an image for reading, or returns null when there is none with that id. */
  async open(id: string): Promise<StoredImage | null> {
    if (!mongo.ObjectId.isValid(id)) return null;
    const _id = new mongo.ObjectId(id);
    const file = await this.bucket.find({ _id }).next();
    if (!file) return null;
    return {
      contentType: file.metadata?.contentType as ImageType,
      length: file.length,
      stream: this.bucket.openDownloadStream(_id),
    };
  }

  async exists(id: string): Promise<boolean> {
    if (!mongo.ObjectId.isValid(id)) return false;
    return (await this.bucket.find({ _id: new mongo.ObjectId(id) }).limit(1).next()) !== null;
  }

  /** Deletes an image; deleting one that is already gone is not an error. */
  async delete(id: string): Promise<void> {
    try {
      await this.bucket.delete(new mongo.ObjectId(id));
    } catch (err) {
      if (!(err instanceof mongo.MongoRuntimeError && /not found/i.test(err.message))) throw err;
    }
  }
}

/**
 * Detects the image type from the file's first bytes. The client's Content-Type is not trusted:
 * the stored type is what browsers are later told, so it must match what the bytes really are.
 */
export function detectImageType(data: Buffer): ImageType | null {
  const startsWith = (bytes: number[], offset = 0) => bytes.every((b, i) => data[offset + i] === b);
  if (startsWith([0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (startsWith([0x47, 0x49, 0x46, 0x38])) return 'image/gif'; // "GIF8"
  if (startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8)) return 'image/webp'; // "RIFF"…"WEBP"
  return null;
}
