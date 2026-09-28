# Build context is the repo root (npm workspaces share one lockfile).
# npm installs share one BuildKit cache, locked so only one runs at a time (also across the api and web
# builds): parallel installs on a slow network, e.g. on a Raspberry Pi, crash npm ("Exit handler never called").

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/ shared/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
# The root postinstall builds the shared package. The MongoDB binary for the backend tests isn't needed here.
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    MONGOMS_DISABLE_POSTINSTALL=1 npm ci -w shared -w backend --include-workspace-root --fetch-retries=5 --fetch-retry-maxtimeout=120000 --maxsockets=4

# Development: source is bind-mounted by compose.override.yaml.
FROM deps AS dev
COPY backend/ backend/
EXPOSE 3000
CMD ["sh", "-c", "npm run watch -w shared & exec npm run dev -w backend"]

FROM deps AS build
COPY backend/ backend/
RUN npm run build -w backend

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci -w backend --omit=dev --ignore-scripts --fetch-retries=5 --fetch-retry-maxtimeout=120000 --maxsockets=4
COPY --from=build /app/shared/dist shared/dist
COPY --from=build /app/backend/dist backend/dist
USER node
EXPOSE 3000
CMD ["node", "backend/dist/server.js"]
