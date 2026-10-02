import { Schema, type Connection, type HydratedDocument, type InferSchemaType, type Model } from 'mongoose';

/**
 * One attempt to pay for a cart: what was priced and sent to the payment provider, and how far it got.
 *
 *   open ──► capturing ──► captured ──► completed
 *     ▲          │
 *     └──────────┘  (declined or not approved: the buyer may try again)
 *
 * `captured` means the money was taken but the order isn't stored yet; completing again retries that step.
 */
export const CHECKOUT_STATES = ['open', 'capturing', 'captured', 'completed'] as const;

/** Unpaid checkouts are removed after this long. */
export const CHECKOUT_TTL_MS = 24 * 60 * 60 * 1000;

const checkoutSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    lines: {
      type: [
        new Schema(
          {
            productId: { type: Schema.Types.ObjectId, required: true },
            name: { type: String, required: true },
            unitPriceCents: { type: Number, required: true },
            quantity: { type: Number, required: true },
          },
          { _id: false },
        ),
      ],
      required: true,
    },
    totalCents: { type: Number, required: true },
    currency: { type: String, required: true },
    shippingAddress: {
      type: new Schema(
        {
          name: { type: String, required: true },
          street: { type: String, required: true },
          postalCode: { type: String, required: true },
          city: { type: String, required: true },
          country: { type: String, required: true },
        },
        { _id: false },
      ),
      required: true,
    },
    provider: { type: String, required: true, enum: ['mock', 'paypal'] },
    providerOrderId: { type: String },
    state: { type: String, required: true, enum: CHECKOUT_STATES, default: 'open' },
    paymentReference: { type: String },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    /** Removed once money is captured, so a paid checkout is never deleted before it becomes an order. */
    expiresAt: { type: Date },
  },
  { timestamps: true },
);

checkoutSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type CheckoutRecord = InferSchemaType<typeof checkoutSchema>;
export type CheckoutDocument = HydratedDocument<CheckoutRecord>;
export type CheckoutModel = Model<CheckoutRecord>;

export function checkoutModel(db: Connection): CheckoutModel {
  return (db.models.Checkout as CheckoutModel | undefined) ?? db.model('Checkout', checkoutSchema);
}
