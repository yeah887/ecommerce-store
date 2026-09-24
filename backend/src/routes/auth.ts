import { Router } from 'express';
import type { Connection } from 'mongoose';
import {
  EMAIL_MAX_LENGTH,
  NAME_MAX_LENGTH,
  PASSWORD_MAX_BYTES,
  PASSWORD_MIN_LENGTH,
  type PublicUser,
} from '@store/shared';
import type { Config } from '../config.js';
import { HttpError } from '../errors.js';
import { toPublicUser, userModel } from '../models/user.js';
import { hashPassword, verifyAgainstDummy, verifyPassword } from '../passwords.js';
import { SESSION_COOKIE, logIn, logOut, requireAuth } from '../session.js';
import { FieldErrors } from '../validation.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function authRouter(db: Connection, config: Config): Router {
  const router = Router();
  const users = userModel(db);

  router.post('/register', async (req, res) => {
    const body = req.body ?? {};
    const errors = new FieldErrors();

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) errors.add('name', 'Name is required');
    else if (name.length > NAME_MAX_LENGTH) errors.add('name', `Name must be at most ${NAME_MAX_LENGTH} characters`);

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!email) errors.add('email', 'Email is required');
    else if (email.length > EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(email)) errors.add('email', 'Enter a valid email address');

    const password: unknown = body.password;
    if (typeof password !== 'string' || password.length === 0) errors.add('password', 'Password is required');
    else if (password.length < PASSWORD_MIN_LENGTH)
      errors.add('password', `Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
    else if (Buffer.byteLength(password) > PASSWORD_MAX_BYTES) errors.add('password', 'Password is too long');
    errors.throwIfAny();

    if (await users.exists({ email })) {
      throw emailTaken();
    }
    let user;
    try {
      user = await users.create({
        name,
        email,
        passwordHash: await hashPassword(password as string, config.bcryptRounds),
        role: 'customer',
      });
    } catch (err) {
      // Two registrations racing for the same email: the unique index decides.
      if ((err as { code?: number }).code === 11000) throw emailTaken();
      throw err;
    }

    await logIn(req, user);
    const response: PublicUser = toPublicUser(user);
    res.status(201).json(response);
  });

  router.post('/login', async (req, res) => {
    const body = req.body ?? {};
    const errors = new FieldErrors();
    if (typeof body.email !== 'string' || !body.email.trim()) errors.add('email', 'Email is required');
    if (typeof body.password !== 'string' || !body.password) errors.add('password', 'Password is required');
    errors.throwIfAny();

    const user = await users.findOne({ email: body.email.trim().toLowerCase() });
    const valid = user
      ? await verifyPassword(body.password, user.passwordHash)
      : await verifyAgainstDummy(body.password, config.bcryptRounds);
    if (!user || !valid) {
      throw new HttpError(401, 'invalid_credentials', 'Invalid email or password');
    }

    await logIn(req, user);
    const response: PublicUser = toPublicUser(user);
    res.json(response);
  });

  router.post('/logout', async (req, res) => {
    await logOut(req);
    res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: 'lax', secure: config.cookieSecure });
    res.status(204).end();
  });

  router.get('/me', requireAuth, (req, res) => {
    const response: PublicUser = toPublicUser(req.user!);
    res.json(response);
  });

  return router;
}

function emailTaken(): HttpError {
  return new HttpError(409, 'email_taken', 'An account with this email already exists', {
    email: 'An account with this email already exists',
  });
}
