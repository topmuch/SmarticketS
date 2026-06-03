/**
 * Startup environment validation.
 * Ensures all required secrets are set before the app starts.
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
  
  if (missing.length > 0 && process.env.NODE_ENV === 'production') {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      `Please set these in your .env file before starting the application.`
    );
  }
  
  if (missing.length > 0 && process.env.NODE_ENV !== 'production') {
    console.warn(
      `⚠️ Missing env vars (using defaults in development): ${missing.join(', ')}`
    );
  }
}
