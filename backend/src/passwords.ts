import bcrypt from 'bcryptjs';

export function hashPassword(password: string, rounds: number): Promise<string> {
  return bcrypt.hash(password, rounds);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

const dummyHashes = new Map<number, Promise<string>>();

/**
 * Burns the same time as a real check, so a login for an unknown email
 * takes as long as one with a wrong password.
 */
export async function verifyAgainstDummy(password: string, rounds: number): Promise<false> {
  if (!dummyHashes.has(rounds)) dummyHashes.set(rounds, bcrypt.hash('dummy-password', rounds));
  await bcrypt.compare(password, await dummyHashes.get(rounds)!);
  return false;
}
