import { Schema, type Connection, type HydratedDocument, type InferSchemaType, type Model } from 'mongoose';
import type { PublicUser } from '@store/shared';

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true, enum: ['customer', 'admin'], default: 'customer' },
  },
  { timestamps: true },
);

export type User = InferSchemaType<typeof userSchema>;
export type UserDocument = HydratedDocument<User>;
export type UserModel = Model<User>;

export function userModel(db: Connection): UserModel {
  return (db.models.User as UserModel | undefined) ?? db.model('User', userSchema);
}

export function toPublicUser(user: UserDocument): PublicUser {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}
