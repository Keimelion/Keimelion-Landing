# syntax=docker/dockerfile:1
# Self-hosted build: the repo targets Vercel, so the image swaps the adapter for
# @astrojs/node (standalone) to keep the server route /api/waitlist working.

FROM node:24-alpine AS deps
WORKDIR /app
ENV HUSKY=0
COPY package.json package-lock.json ./
RUN npm ci && npm install @astrojs/node

FROM deps AS build
ARG PUBLIC_API_BASE_URL
ENV PUBLIC_API_BASE_URL=${PUBLIC_API_BASE_URL} \
    ASTRO_TELEMETRY_DISABLED=1
COPY . .
# Restore the manifests from `deps` (they declare @astrojs/node) so `npm prune` keeps it.
COPY --from=deps /app/package.json /app/package-lock.json ./
COPY <<'EOF' astro.config.docker.mjs
import node from '@astrojs/node'
import baseConfig from './astro.config.mjs'

export default { ...baseConfig, adapter: node({ mode: 'standalone' }) }
EOF
RUN npx astro build --config astro.config.docker.mjs && npm prune --omit=dev

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3002
COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
USER node
EXPOSE 3002
CMD ["node", "dist/server/entry.mjs"]
