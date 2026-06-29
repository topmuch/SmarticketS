# SmarticketS - Dockerfile for Coolify
FROM node:20-slim

# Install required packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    git libc6 sqlite3 openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
RUN npm install -g bun

WORKDIR /app

# Clone the repository — always fresh (no cache)
ARG CACHE_BUST=1
RUN git clone https://github.com/topmuch/SmarticketS.git . && \
    echo "Cloned at $(date) — commit: $(git rev-parse HEAD)"

# Install dependencies
RUN bun install

# Generate Prisma Client
RUN npx prisma generate

# Build the application
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=file:/app/data/qrtrans.db
ENV NODE_OPTIONS=--max-old-space-size=2048
RUN bun run build

# Create data directory
RUN mkdir -p /app/data

# Copy entrypoint script (already in repo, but ensure it's executable)
RUN chmod +x /app/entrypoint.sh

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV DATABASE_URL=file:/app/data/qrtrans.db
ENV NODE_ENV=production

# Use the entrypoint script — auto-generates secrets if missing, syncs DB,
# seeds data, then starts the server.
ENTRYPOINT ["/app/entrypoint.sh"]
