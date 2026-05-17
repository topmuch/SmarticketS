# QRTrans - Dockerfile for Coolify
FROM node:20-alpine

# Cache buster - increment to force rebuild
ARG CACHEBUST=11

# Install required packages
RUN apk add --no-cache git libc6-compat sqlite
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

# Copy Prisma files into standalone so db push works at runtime
RUN cp -r prisma .next/standalone/prisma
RUN cp -r node_modules/.prisma .next/standalone/node_modules/.prisma
RUN cp -r node_modules/@prisma .next/standalone/node_modules/@prisma
RUN cp -r node_modules/prisma .next/standalone/node_modules/prisma

# Create data directories
RUN mkdir -p /app/data /app/public/uploads

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV DATABASE_URL=file:/app/data/qrtrans.db
ENV NODE_ENV=production

# Health check — Coolify expects the container to respond on its port
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

# Start command: sync DB schema then start server
# ⚠️ NO --accept-data-loss: preserves existing data (baggages, QR codes, sessions, etc.)
# If schema migration requires data loss, it will FAIL SAFE and keep existing DB intact.
# Manually run `npx prisma db push --accept-data-loss` in Coolify terminal ONLY when needed.
CMD sh -c "\
  mkdir -p /app/data /app/public/uploads && \
  export DATABASE_URL=file:/app/data/qrtrans.db && \
  echo '>>> [1/3] Syncing DB schema...' && \
  npx prisma db push --skip-generate 2>&1; echo '>>> [2/3] DB sync completed' && \
  echo '>>> [3/3] Starting server on port 3000...' && \
  exec node .next/standalone/server.js \
"
