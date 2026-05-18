# QRTrans - Dockerfile for Coolify
FROM node:20-alpine

# Cache buster - increment to force rebuild
ARG CACHEBUST=14

# Install required packages (Alpine correct package names)
# sqlite = CLI tool + shared library (needed for runtime migrations)
# build-base = gcc/make for native module compilation (sharp, qrcode optional deps)
# vips = image processing library (sharp dependency)
RUN apk add --no-cache git sqlite build-base vips-dev
RUN npm install -g bun

WORKDIR /app

# Clone the repository from main branch
RUN git clone --branch main --depth 1 https://github.com/topmuch/qrtrans.git /app/tmp && \
    cp -r /app/tmp/. /app/ && rm -rf /app/tmp && \
    echo "--- Build context files ---" && ls -la /app/package.json /app/bun.lock

# ⚠️ CRITICAL: Force development mode during build so devDependencies are installed
# (typescript, prisma, next, tailwindcss, etc. are needed for `bun run build`)
ENV NODE_ENV=development

# Install ALL dependencies (including devDependencies)
RUN bun install

# Generate Prisma Client
RUN npx prisma generate

# Build the application
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=file:/app/data/qrtrans.db
RUN bun run build

# Copy static assets into standalone for runtime
RUN cp -r .next/static .next/standalone/.next/static
RUN cp -r public .next/standalone/public

# Copy Prisma client into standalone for runtime queries
RUN cp -r node_modules/.prisma .next/standalone/node_modules/.prisma
RUN cp -r node_modules/@prisma/client .next/standalone/node_modules/@prisma/client
RUN cp -r node_modules/@prisma/engines .next/standalone/node_modules/@prisma/engines 2>/dev/null || true

# Copy prisma schema for reference
RUN mkdir -p .next/standalone/prisma
RUN cp prisma/schema.prisma .next/standalone/prisma/schema.prisma

# IMPORTANT: Keep full node_modules at /app/node_modules for migration scripts.
# The standalone node_modules is incomplete (missing prisma CLI dependencies),
# so we run migrations using the FULL node_modules before starting the server.
# Do NOT delete /app/node_modules.

# Create data directories
RUN mkdir -p /app/data /app/public/uploads

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV DATABASE_URL=file:/app/data/qrtrans.db
ENV NODE_ENV=production

# Runtime dependencies for sharp (libvips shared libs)
RUN apk add --no-cache vips

# Health check — Coolify expects the container to respond on its port
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

# Start command:
# Step 1: prisma db push creates tables from scratch (fresh DB) or syncs schema
# Step 2: migrate-db.js adds missing columns to existing tables (existing DB upgrade)
# Both run against /app/node_modules (full deps) — NOT standalone's incomplete node_modules
# Step 3: Start the Next.js standalone server
CMD ["sh", "-c", "\
  mkdir -p /app/data /app/public/uploads && \
  export DATABASE_URL=file:/app/data/qrtrans.db && \
  echo '>>> [1/3] Creating/syncing database tables via Prisma CLI...' && \
  (./node_modules/.bin/prisma db push --skip-generate --accept-data-loss 2>&1 && echo '    ✅ Schema synced' || echo '    ⚠️ prisma db push issue — column migration will handle it') && \
  echo '>>> [2/3] Running column migrations for existing databases...' && \
  node scripts/migrate-db.js 2>&1 && \
  echo '>>> [3/3] Starting server on port 3000...' && \
  exec node .next/standalone/server.js \
"]
