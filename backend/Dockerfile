# Build context is the repo root (npm workspaces share one lockfile).

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/ shared/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
# The root postinstall builds the shared package.
RUN npm ci -w shared -w backend --include-workspace-root

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
RUN npm ci -w backend --omit=dev --ignore-scripts && npm cache clean --force
COPY --from=build /app/shared/dist shared/dist
COPY --from=build /app/backend/dist backend/dist
USER node
EXPOSE 3000
CMD ["node", "backend/dist/server.js"]
