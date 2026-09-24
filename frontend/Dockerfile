# Build context is the repo root (npm workspaces share one lockfile).

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/ shared/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
# The root postinstall builds the shared package.
RUN npm ci -w shared -w frontend --include-workspace-root

# Development: source is bind-mounted by compose.override.yaml.
FROM deps AS dev
COPY frontend/ frontend/
ENV API_PROXY_TARGET=http://api:3000
EXPOSE 4200
CMD ["sh", "-c", "npm run watch -w shared & exec npm start -w frontend -- --host 0.0.0.0"]

FROM deps AS build
COPY frontend/ frontend/
RUN npm run build -w frontend

FROM nginx:stable-alpine AS runtime
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist/frontend/browser /usr/share/nginx/html
EXPOSE 80
