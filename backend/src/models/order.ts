import { Schema, Types, type Connection, type HydratedDocument, type InferSchemaType, type Model } from 'mongoose';
import { ORDER_STATUSES, orderNumber, type Order } from '@store/shared';

const orderLineSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, required: true },
    // Snapshots, so the order stays accurate if the product is later edited or deleted.
    name: { type: String, required: true },
    unitPriceCents: { type: Number, required: true, min: 1 },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const shippingAddressSchema = new Schema(
  {
    name: { type: String, required: true },
    street: { type: String, required: true },
    postalCode: { type: String, required: true },
    city: { type: String, required: true },
    country: { type: String, required: true },
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    lines: { type: [orderLineSchema], required: true },
    totalCents: { type: Number, required: true, min: 1 },
    shippingAddress: { type: shippingAddressSchema, required: true },
    status: { type: String, required: true, enum: ORDER_STATUSES, default: 'placed' },
    paymentReference: { type: String, required: true },
  },
  { timestamps: true },
);

orderSchema.index({ owner: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

export type OrderRecord = InferSchemaType<typeof orderSchema>;
export type OrderDocument = HydratedDocument<OrderRecord>;
export type OrderModel = Model<OrderRecord>;

export function orderModel(db: Connection): OrderModel {
  return (db.models.Order as OrderModel | undefined) ?? db.model('Order', orderSchema);
}

export function toOrder(order: OrderDocument): Order {
  const id = order.id as string;
  return {
    id,
    number: orderNumber(id),
    lines: order.lines.map((line) => ({
      productId: String(line.productId as Types.ObjectId),
      name: line.name,
      unitPriceCents: line.unitPriceCents,
      quantity: line.quantity,
    })),
    totalCents: order.totalCents,
    shippingAddress: {
      name: order.shippingAddress.name,
      street: order.shippingAddress.street,
      postalCode: order.shippingAddress.postalCode,
      city: order.shippingAddress.city,
      country: order.shippingAddress.country,
    },
    status: order.status,
    paymentReference: order.paymentReference,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}
