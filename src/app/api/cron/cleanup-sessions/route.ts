import { NextRequest, NextResponse } from 'next/server';
import { cleanupExpiredSessions } from '@/lib/session';
import { verifyCronSecret } from '@/lib/cron-auth';

/**
 * Cron endpoint to cleanup expired sessions
 * Should be called periodically (e.g., every hour)
 *
 * W2 fix: now uses the shared verifyCronSecret() helper for consistent
 * auth policy across all cron routes.
 *
 * Setup with Vercel Cron:
 * Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/cleanup-sessions",
 *     "schedule": "0 * * * *"
 *   }]
 * }
 *
 * Or call manually with:
 * curl -X POST https://your-domain.com/api/cron/cleanup-sessions \
 *   -H "Authorization: Bearer YOUR_CRON_SECRET"
 */
export async function POST(request: NextRequest) {
  try {
    // W2 fix: use shared cron auth helper
    const authError = verifyCronSecret(request);
    if (authError) return authError;

    // Run cleanup
    const deletedCount = await cleanupExpiredSessions();

    return NextResponse.json({
      success: true,
      deletedSessions: deletedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cron cleanup error:', error);
    return NextResponse.json(
      { error: 'Cleanup failed' },
      { status: 500 }
    );
  }
}

// Also allow GET for Vercel Cron (which uses GET by default)
export async function GET(request: NextRequest) {
  return POST(request);
}
