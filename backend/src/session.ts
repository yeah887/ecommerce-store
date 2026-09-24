import type { RequestHandler, Request } from 'express';
import session from 'express-session';
import { MongoStore } from 'connect-mongo';
import type { Connection } from 'mongoose';
import type { Config } from './config.js';
import { HttpError } from './errors.js';
import { userModel, type UserDocument } from './models/user.js';

declare module 'express-session' {
  interface SessionData {
    userId: string;
  }
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** The logged-in user, loaded by `currentUser`. */
      user?: UserDocument;
    }
  }
}

type StoreClient = NonNullable<Parameters<typeof MongoStore.create>[0]['client']>;

export const SESSION_COOKIE = 'sid';
export const SESSIONS_COLLECTION = 'sessions';
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

export function sessionMiddleware(db: Connection, config: Config): RequestHandler {
  return session({
    name: SESSION_COOKIE,
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      // connect-mongo's types come from a different copy of the mongodb package (mongodb-memory-server pins
      // an older one), but it only calls client.db().collection(), so Mongoose's own client works as is.
      client: db.getClient() as unknown as StoreClient,
      dbName: db.name,
      collectionName: SESSIONS_COLLECTION,
      ttl: SESSION_TTL_SECONDS,
      // prepareDatabase creates the TTL index up front, instead of the store racing to create it.
      autoRemove: 'disabled',
    }),
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.cookieSecure,
      maxAge: SESSION_TTL_SECONDS * 1000,
    },
  });
}

/** Loads the session's user into `req.user`. Sessions of deleted users are logged out. */
export function currentUser(db: Connection): RequestHandler {
  const users = userModel(db);
  return async (req, _res, next) => {
    const userId = req.session.userId;
    if (userId) {
      const user = await users.findById(userId);
      if (user) req.user = user;
      else delete req.session.userId;
    }
    next();
  };
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  if (!req.user) {
    throw new HttpError(401, 'not_authenticated', 'Please log in');
  }
  next();
};

/** 401 when not logged in, 403 for logged-in users who aren't admins. */
export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (!req.user) {
    throw new HttpError(401, 'not_authenticated', 'Please log in');
  }
  if (req.user.role !== 'admin') {
    throw new HttpError(403, 'forbidden', 'This area is for admins only');
  }
  next();
};

/** Starts a fresh session for the user, so a session ID set before login can't be reused. */
export function logIn(req: Request, user: UserDocument): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.userId = user.id;
      req.user = user;
      resolve();
    });
  });
}

export function logOut(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.destroy((err) => (err ? reject(err) : resolve()));
  });
}
