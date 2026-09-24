export type Role = 'customer' | 'admin';

/** A user as the API exposes it. The password hash never leaves the server. */
export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export const PASSWORD_MIN_LENGTH = 8;
/** bcrypt only looks at the first 72 bytes, so longer passwords are rejected rather than truncated. */
export const PASSWORD_MAX_BYTES = 72;
export const NAME_MAX_LENGTH = 100;
export const EMAIL_MAX_LENGTH = 254;
