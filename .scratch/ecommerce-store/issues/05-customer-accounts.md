# 05: Customer accounts

**What to build:** A visitor registers with name, email and password, or logs in, and stays logged in across reloads. The header shows their name and a logout action. Wrong credentials give a generic error that doesn't reveal whether the email exists. On first start, the backend creates the admin account from environment variables. See the spec: user stories 25–32 and 60, Backend (sessions), Seeding (admin).

**Blocked by:** 01 (Walking skeleton)

**Status:** done

- [x] User model: name, email (unique, lowercased), passwordHash (bcrypt), role (`customer` | `admin`), timestamps; the password hash is never returned by the API
- [x] Sessions via `express-session` stored in MongoDB (`connect-mongo`); the cookie is httpOnly and SameSite=Lax, Secure in production; the secret comes from the environment
- [x] `POST /api/auth/register` validates input (400 with field errors), rejects a taken email (409), creates a customer and logs them in
- [x] `POST /api/auth/login` regenerates the session ID on success and returns 401 with a generic message on failure
- [x] `POST /api/auth/logout` destroys the session; `GET /api/auth/me` returns the current user or 401
- [x] The public user type (id, name, email, role) lives in the shared package
- [x] On start, the seed step creates the admin user from environment variables only if no user with that email exists
- [x] Frontend auth service loads the current user on startup; an HTTP interceptor sends credentials with requests
- [x] Login and register pages built with Material forms showing validation errors; the header shows the user's name plus logout when logged in, and login/register links otherwise
- [x] API tests: register then me, duplicate email (409), invalid input (400), login success, wrong password and unknown email both give the same 401, logout then me (401), admin seeding runs twice without duplicates

## Comments

**Done (2026-09-24).** Notes for later tickets:

- **Auth building blocks:**
  - `requireAuth` in the backend's session module returns 401 `not_authenticated`.
  - Every `/api` route except `/api/health` has `req.user` (the Mongoose user document) loaded by `currentUser`.
  - Ticket 08 should add `requireAdmin` next to `requireAuth`, returning 403 for non-admins.
  - Frontend: `loggedInGuard` (redirects to `/login?returnUrl=…`) is ready for checkout (06) and order history (07); `AuthService.isAdmin()` is ready for ticket 08.
- **bcryptjs, not native bcrypt.** It's the same algorithm (`$2b$`, cost 12), with no native build in the Alpine images. Tests use cost 4 for speed via the test config.
- **Sessions:**
  - The cookie is `sid`: httpOnly, SameSite=Lax, 7 days. Sessions live in MongoDB `sessions`, with a TTL index that `prepareDatabase` creates (connect-mongo's own `autoRemove` is disabled, because its background index build raced test teardown).
  - Login regenerates the session ID; logout destroys the session on the server, so a copied cookie stops working.
- **Secure cookies are configurable.** `COOKIE_SECURE` defaults to true in production. The production-like Compose stack sets it to false because it serves plain HTTP on localhost; it should be true behind HTTPS.
- **Production refuses weak secrets.** The API won't start without a `SESSION_SECRET` of at least 32 characters (or with the `.env.example` placeholder). Dev mode falls back to an insecure built-in secret and to the admin login `admin@example.com` / `admin-password`.
- **Two MongoDB driver copies.** mongodb-memory-server pins driver 7.5 while Mongoose uses 7.6, so connect-mongo's types don't match Mongoose's client. The session module casts with a comment; at runtime the store uses Mongoose's client.
- **Admin seeding.** The admin is created only if no user with that email exists. Changing `ADMIN_PASSWORD` later does not change an existing admin, and dev and production-like modes share the same MongoDB volume.
- **Bundle budget.** The initial-bundle warning budget was raised to 700 kB, since the header now pulls in the Material menu, badge and snackbar.
