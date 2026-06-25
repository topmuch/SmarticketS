#!/bin/sh
set -e

# ============================================================================
# SmarticketS — Production entrypoint
#
# This script runs INSIDE the Docker container (Coolify) and:
#   1. Generates required secrets if not provided via env vars
#      (NEXTAUTH_SECRET, JWT_SECRET, JWT_REFRESH_SECRET, QR_HMAC_SECRET,
#       ENCRYPTION_KEY)
#   2. Ensures the SQLite database exists and is migrated
#   3. Starts the Next.js standalone server
#
# Why auto-generate secrets?
#   NextAuth throws `MissingSecretError` in production if NEXTAUTH_SECRET
#   is not set. Many Coolify deployments forget to set it, causing 500
#   errors on every page. Auto-generating ensures the app always starts.
#   Note: auto-generated secrets are FRESH on each container restart,
#   which means existing JWT cookies become invalid. For stable production,
#   SET THE SECRETS EXPLICITLY in Coolify env vars.
# ============================================================================

echo "─── SmarticketS entrypoint ───"

# ─── 1. Generate secrets if missing ───────────────────────────────────────
generate_secret() {
  # Try openssl first (more secure), fallback to /dev/urandom + base64
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 48 2>/dev/null | tr -d '\n' || head -c 48 /dev/urandom | base64
  else
    head -c 48 /dev/urandom | base64
  fi
}

if [ -z "$NEXTAUTH_SECRET" ]; then
  export NEXTAUTH_SECRET="$(generate_secret)"
  echo "✓ Generated NEXTAUTH_SECRET (random)"
  echo "  ⚠️  For stable sessions across restarts, set NEXTAUTH_SECRET explicitly in Coolify env vars."
fi

if [ -z "$JWT_SECRET" ]; then
  export JWT_SECRET="$(generate_secret)"
  echo "✓ Generated JWT_SECRET (random)"
fi

if [ -z "$JWT_REFRESH_SECRET" ]; then
  export JWT_REFRESH_SECRET="$(generate_secret)"
  echo "✓ Generated JWT_REFRESH_SECRET (random)"
fi

if [ -z "$QR_HMAC_SECRET" ]; then
  export QR_HMAC_SECRET="$(generate_secret)"
  echo "✓ Generated QR_HMAC_SECRET (random)"
  echo "  ⚠️  Existing QR codes will not validate after restart. Set QR_HMAC_SECRET explicitly."
fi

if [ -z "$ENCRYPTION_KEY" ]; then
  # ENCRYPTION_KEY must be exactly 32 chars for AES-256
  export ENCRYPTION_KEY="$(head -c 32 /dev/urandom | base64 | tr -d '+/=' | head -c 32)"
  echo "✓ Generated ENCRYPTION_KEY (32 chars)"
  echo "  ⚠️  Encrypted data will not decrypt after restart. Set ENCRYPTION_KEY explicitly."
fi

# ─── 2. Database setup ────────────────────────────────────────────────────
mkdir -p /app/data

# Default DATABASE_URL if not set
if [ -z "$DATABASE_URL" ]; then
  export DATABASE_URL="file:/app/data/qrtrans.db"
fi

echo "📊 Database: $DATABASE_URL"

# Push Prisma schema (create tables if missing)
echo "🔄 Syncing database schema..."
npx prisma db push --skip-generate 2>/dev/null || echo "  (schema sync skipped — may already be in sync)"

# Seed initial data only if database is empty
echo "🌱 Seeding database if needed..."
bun run prisma/seed.ts 2>/dev/null || npx tsx prisma/seed.ts 2>/dev/null || echo "  (seed skipped — may already be seeded)"

# Run additional migrations if present
node scripts/migrate-db.js 2>/dev/null || true

# ─── 3. Start the Next.js server ──────────────────────────────────────────
echo "✅ Starting Next.js server on port ${PORT:-3000}..."
exec node .next/standalone/server.js
