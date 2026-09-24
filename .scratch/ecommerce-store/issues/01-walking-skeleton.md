# 01: Walking skeleton: monorepo, health check and Docker

**What to build:** The thinnest end-to-end path through every layer of the store. A developer runs `docker compose up` and opens the app in a browser. The Angular shell, with an Angular Material header, shows a page reporting that the API is healthy and connected to MongoDB. The same works in the production-like mode, where nginx serves the built Angular app and proxies `/api` to Express. This ticket sets up the repository layout, shared types, the backend app factory, the test harness and both Compose modes that every later ticket builds on. See the spec: Repository and tooling, Backend, Docker.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] npm-workspaces monorepo with three workspaces: frontend (Angular), backend (Express, TypeScript) and shared (TypeScript types used by both)
- [ ] The frontend is scaffolded with the current Angular version via `npx @angular/cli`: standalone components, client-side rendering only, Angular Material installed, a header with the store name
- [ ] The backend exposes an app factory that takes its database connection and config and does not connect or listen on import. A separate entry point connects to MongoDB and listens.
- [ ] `GET /api/health` returns ok plus MongoDB connectivity; its response type lives in the shared package
- [ ] The frontend calls relative `/api/...` URLs only; the dev server proxies `/api` to the backend
- [ ] A consistent JSON error shape and a catch-all error handler exist in the backend
- [ ] Backend test harness: Vitest, supertest and `mongodb-memory-server`, building the app via the factory, with a health endpoint test passing. One command runs the backend tests.
- [ ] `compose.yaml` (production-like): **web** (multi-stage Angular build served by nginx with SPA fallback, proxying `/api`), **api** (multi-stage TypeScript build on `node:22-alpine`) and **mongo** (official image, named volume), with health checks and startup ordering (api waits for mongo, web waits for api)
- [ ] `compose.override.yaml` (dev): Angular dev server and API in watch mode, bind-mounted source, `node_modules` kept inside containers, dev ports exposed
- [ ] `.env.example` lists every variable (Mongo URL, session secret, admin email and password, ports); `.env` is git-ignored
- [ ] Manually verified: `docker compose up` shows "API healthy" in the browser and a code change hot-reloads; `docker compose -f compose.yaml up --build` shows the same through nginx
