# ==========================================
# Base Image
# ==========================================
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat python3 make g++

# ==========================================
# Dependencies Stage
# ==========================================
FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
RUN npm install

# ==========================================
# Builder Stage
# ==========================================
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY apps/web ./apps/web

WORKDIR /app/apps/web
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# ==========================================
# Runner Stage
# ==========================================
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy public assets and standalone output
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
