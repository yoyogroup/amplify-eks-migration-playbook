# syntax=docker/dockerfile:1
# Template — copy to app repo root; replace <NODE_VERSION> with .nvmrc pin (e.g. 24.22.3-alpine3.24).
# Reference: wiplatform-portal-nextjs PR #142; yoyo-deals-marketplace-nextjs / yoyo-avbob-nextjs.

ARG NODE_VERSION=<NODE_VERSION>
ARG ALPINE_VERSION=3.24

FROM node:${NODE_VERSION} AS base

ENV NEXT_TELEMETRY_DISABLED=1
ENV CI=true
RUN apk add --no-cache libc6-compat
WORKDIR /build

FROM base AS builder

ARG NODE_OPTIONS=--max-old-space-size=1536
ENV NODE_OPTIONS=$NODE_OPTIONS
ENV NEXT_WEBPACK_PARALLELISM=1

# --- Add one ARG/ENV pair per NEXT_PUBLIC_* in tekton.buildargs ---
ARG NEXT_PUBLIC_EXAMPLE
ENV NEXT_PUBLIC_EXAMPLE=$NEXT_PUBLIC_EXAMPLE

ENV DOCKER_BUILD=1
ENV HUSKY=0

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .

# Webpack, not Turbopack, under Tekton ~4Gi Kaniko step (see docs/gotchas.md).
RUN npm run build \
  && npx next build --webpack \
  && rm -rf .next/cache \
  && mv .next/static .next/standalone/.next/static \
  && mv public .next/standalone/public

FROM alpine:${ALPINE_VERSION} AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
WORKDIR /app

USER root
RUN apk upgrade --no-cache \
  && apk add --no-cache ca-certificates libstdc++ libc6-compat \
  && addgroup -g 1000 node \
  && adduser -u 1000 -G node -s /bin/sh -D node

COPY --from=base /usr/local/bin/node /usr/local/bin/node
COPY --from=builder --chown=node:node /build/.next/standalone ./

USER node
EXPOSE 3000
CMD ["node", "server.js"]