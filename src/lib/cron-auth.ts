import { NextRequest, NextResponse } from 'next/server';

/**
 * Verify the CRON_SECRET authorization header.
 *
 * W2 fix (audit): previously, CRON_SECRET enforcement was inconsistent —
 * /api/cron/cleanup made it optional (`if (cronSecret && ...)`) while
 * /api/cron/cleanup-sessions required it. This helper enforces a single,
 * consistent policy across all cron routes.
 *
 * Policy:
 *   - In production (NODE_ENV === 'production'): CRON_SECRET is REQUIRED.
 *     If not set in env, the route returns 503 (service misconfigured).
 *     If set but the request doesn't match, returns 401.
 *   - In dev/test: CRON_SECRET is OPTIONAL. If not set in env, the route
 *     is accessible without auth (for local testing). If set, it must match.
 *
 * Usage:
 *   export async function POST(request: NextRequest) {
 *     const authError = verifyCronSecret(request);
 *     if (authError) return authError;
 *     // ... route logic
 *   }
 *
 * @returns null if authorized, or a NextResponse (401/503) if not.
 */
export function verifyCronSecret(request: NextRequest): NextResponse | null {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  // In production, CRON_SECRET must be configured
  if (isProduction && !cronSecret) {
    console.error('[cron-auth] CRON_SECRET not configured in production — refusing to run');
    return NextResponse.json(
      { error: 'CRON_SECRET not configured' },
      { status: 503 }
    );
  }

  // If CRON_SECRET is set (any env), the request must match it
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Non autorisé' },
      { status: 401 }
    );
  }

  // In production with CRON_SECRET set but no auth header → 401
  if (isProduction && cronSecret && !authHeader) {
    return NextResponse.json(
      { error: 'Authorization header required' },
      { status: 401 }
    );
  }

  return null; // Authorized
}
