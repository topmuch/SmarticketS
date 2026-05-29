# SmarticketS - Dockerfile for Coolify
FROM node:20-alpine

# Install required packages
RUN apk add --no-cache git libc6-compat sqlite
RUN npm install -g bun

WORKDIR /app

# Clone the repository
RUN git clone https://github.com/topmuch/SmarticketS.git .

# Install dependencies
RUN bun install

# Generate Prisma Client
RUN npx prisma generate

# Build the application
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=file:/app/data/qrtrans.db
RUN bun run build

# Create data directory
RUN mkdir -p /app/data

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV DATABASE_URL=file:/app/data/qrtrans.db

# Start command - sync DB schema and start server
CMD sh -c "mkdir -p /app/data && export DATABASE_URL=file:/app/data/qrtrans.db && npx prisma db push --skip-generate 2>/dev/null || true && node scripts/migrate-db.js 2>/dev/null || true && exec node .next/standalone/server.js"
