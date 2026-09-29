import { Schema, type Connection, type InferSchemaType, type Model } from 'mongoose';
import { CATEGORIES, PRODUCT_LIMITS, type Product } from '@store/shared';

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    priceCents: {
      type: Number,
      required: true,
      min: 1,
      validate: { validator: Number.isInteger, message: 'priceCents must be an integer' },
    },
    category: { type: String, required: true, enum: CATEGORIES },
    images: {
      type: [{ type: String, trim: true }],
      validate: {
        validator: (images: string[]) => images.length >= 1 && images.length <= PRODUCT_LIMITS.maxImages,
        message: `A product needs 1 to ${PRODUCT_LIMITS.maxImages} images`,
      },
    },
  },
  { timestamps: true },
);

productSchema.index({ name: 'text', description: 'text' }, { weights: { name: 3, description: 1 } });
productSchema.index({ category: 1, name: 1 });

export type ProductDoc = InferSchemaType<typeof productSchema> & { _id: unknown };
export type ProductModel = Model<InferSchemaType<typeof productSchema>>;

export function productModel(db: Connection): ProductModel {
  return (db.models.Product as ProductModel | undefined) ?? db.model('Product', productSchema);
}

export function toProduct(doc: ProductDoc): Product {
  return {
    id: String(doc._id),
    name: doc.name,
    description: doc.description,
    priceCents: doc.priceCents,
    category: doc.category,
    imageUrl: doc.images[0],
    images: doc.images,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}
