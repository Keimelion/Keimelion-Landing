# syntax=docker/dockerfile:1

FROM node:24-alpine AS deps
WORKDIR /app
ENV HUSKY=0
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
ARG PUBLIC_API_BASE_URL
ARG GIT_SHA=""
ENV PUBLIC_API_BASE_URL=${PUBLIC_API_BASE_URL} \
    GIT_SHA=${GIT_SHA} \
    ASTRO_TELEMETRY_DISABLED=1
COPY . .
RUN npm run build && npm prune --omit=dev

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
