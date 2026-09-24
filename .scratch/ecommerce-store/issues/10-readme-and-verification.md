# 10: README and full-stack check

**What to build:** Someone who clones the repo can understand what the project is and have it running in minutes. The finished store is checked end to end in both Compose modes. See the spec: Testing Decisions (manual check), user stories 63–72.

**Blocked by:** 01–09

**Status:** ready-for-agent

- [ ] README covers: what the project is (a learning/portfolio store) and its stack; prerequisites (Docker with Compose v2, and Node 22 for running outside Docker); running the dev mode and the production-like mode; every environment variable and the `.env.example` workflow; the seeded admin login; running backend and frontend tests; a short overview of the architecture and API
- [ ] Manual check in production-like mode (`docker compose -f compose.yaml up --build`) from an empty volume: the store loads through nginx, `/api/health` is healthy, seeded products appear, a new customer can register, add to cart, check out, see the order and cancel it, and the admin can log in, edit a product and ship and deliver an order
- [ ] Manual check in dev mode: a frontend and a backend code change both hot-reload
- [ ] All backend and frontend tests pass
- [ ] Any problems found are fixed or recorded as new tickets
