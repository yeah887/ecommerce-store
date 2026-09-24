import { Schema, type Connection, type InferSchemaType, type Model } from 'mongoose';
import { CATEGORIES, type Product } from '@store/shared';

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
    imageUrl: { type: String, required: true, trim: true },
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
    imageUrl: doc.imageUrl,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}
