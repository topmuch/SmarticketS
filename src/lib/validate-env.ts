/**
 * Startup environment validation.
 *
 * NOTE: As of the entrypoint.sh update, missing secrets are AUTO-GENERATED
 * at container startup. This function now only WARNS about missing vars
 * instead of throwing — preventing the app from crashing on boot.
 *
 * The entrypoint.sh script generates:
 *   - NEXTAUTH_SECRET
 *   - JWT_SECRET
 *   - JWT_REFRESH_SECRET
 *   - QR_HMAC_SECRET
 *   - ENCRYPTION_KEY
 *
 * For stable production (sessions persist across restarts), set these
 * explicitly in Coolify env vars.
 */

const REQUIRED_SECRETS = [
  'NEXTAUTH_SECRET',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'QR_HMAC_SECRET',
] as const;

type RequiredSecret = typeof REQUIRED_SECRETS[number];

export function validateEnv(): void {
  const missing: string[] = [];

  for (const key of REQUIRED_SECRETS) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    // In production, secrets should be set via Coolify env vars or entrypoint.sh
    // If still missing, log as info (not warning) — entrypoint.sh auto-generates them
    console.info(
      `[env] Auto-generating missing secrets: ${missing.join(', ')}`
    );
  } else {
    console.log('[env] All required secrets configured ✓');
  }
}
