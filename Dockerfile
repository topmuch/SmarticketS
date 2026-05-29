# ============================================================
# SmarticketS — Multi-stage Dockerfile for Coolify
# Coolify clones the repo, so we use COPY (not git clone)
# ============================================================

# ── Stage 1: Build ──
FROM node:20-alpine AS builder

ARG CACHEBUST=1

# Install required packages for building
RUN apk add --no-cache git sqlite build-base
RUN npm install -g bun

WORKDIR /app

# Copy source code (Coolify already cloned the repo)
COPY package.json bun.lock ./
COPY prisma ./prisma/
COPY scripts ./scripts/
COPY public ./public/
COPY src ./src/
COPY next.config.ts tsconfig.json postcss.config.mjs tailwind.config.ts components.json ./

# Install ALL dependencies (including devDependencies) for build
ENV NODE_ENV=development
RUN bun install

# Generate Prisma Client
RUN npx prisma generate

# Build the application
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=file:/app/data/qrtrans.db
RUN bun run build

# ── Stage 2: Production (minimal image) ──
FROM node:20-alpine AS runner

ARG CACHEBUST=1

# Only install runtime essentials
RUN apk add --no-cache sqlite-libs

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV DATABASE_URL=file:/app/data/qrtrans.db
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone server
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Copy static assets
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy runtime-only node_modules
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma

# Copy runtime packages needed by API routes
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/qrcode ./node_modules/qrcode
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/pngjs ./node_modules/pngjs
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/dijkstrajs ./node_modules/dijkstrajs
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/jszip ./node_modules/jszip
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/nodemailer ./node_modules/nodemailer
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/mailparser ./node_modules/mailparser
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/iconv-lite ./node_modules/iconv-lite
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/he ./node_modules/he
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/mimetic ./node_modules/mimetic 2>/dev/null || true
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/encodeurl ./node_modules/encodeurl 2>/dev/null || true

# Copy Prisma schema + migration script
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts

# Create data directories
RUN mkdir -p /app/data /app/public/uploads && \
    chown nextjs:nodejs /app/data /app/public/uploads

USER nextjs

EXPOSE 3000

# HEALTH CHECK
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

# START COMMAND: sync DB schema then start server
CMD ["sh", "-c", "\
  mkdir -p /app/data /app/public/uploads && \
  echo '>>> [1/3] Syncing database schema...' && \
  (npx prisma db push --skip-generate --accept-data-loss 2>&1 && echo '    Schema synced' || echo '    Schema sync warning') && \
  echo '>>> [2/3] Running column migrations...' && \
  node scripts/migrate-db.js 2>&1 && \
  echo '>>> [3/3] Starting server...' && \
  exec node server.js \
"]
