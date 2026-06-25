# SmarticketS - Dockerfile for Coolify
FROM node:20-alpine

# Install required packages (openssl for secret generation in entrypoint)
RUN apk add --no-cache git libc6-compat sqlite openssl
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
