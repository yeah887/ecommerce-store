# 05: Customer accounts

**What to build:** A visitor registers with name, email and password, or logs in, and stays logged in across reloads. The header shows their name and a logout action. Wrong credentials give a generic error that doesn't reveal whether the email exists. On first start, the backend creates the admin account from environment variables. See the spec: user stories 25–32 and 60, Backend (sessions), Seeding (admin).

**Blocked by:** 01 (Walking skeleton)

**Status:** ready-for-agent

- [ ] User model: name, email (unique, lowercased), passwordHash (bcrypt), role (`customer` | `admin`), timestamps; the password hash is never returned by the API
- [ ] Sessions via `express-session` stored in MongoDB (`connect-mongo`); the cookie is httpOnly and SameSite=Lax, Secure in production; the secret comes from the environment
- [ ] `POST /api/auth/register` validates input (400 with field errors), rejects a taken email (409), creates a customer and logs them in
- [ ] `POST /api/auth/login` regenerates the session ID on success and returns 401 with a generic message on failure
- [ ] `POST /api/auth/logout` destroys the session; `GET /api/auth/me` returns the current user or 401
- [ ] The public user type (id, name, email, role) lives in the shared package
- [ ] On start, the seed step creates the admin user from environment variables only if no user with that email exists
- [ ] Frontend auth service loads the current user on startup; an HTTP interceptor sends credentials with requests
- [ ] Login and register pages built with Material forms showing validation errors; the header shows the user's name plus logout when logged in, and login/register links otherwise
- [ ] API tests: register then me, duplicate email (409), invalid input (400), login success, wrong password and unknown email both give the same 401, logout then me (401), admin seeding runs twice without duplicates
