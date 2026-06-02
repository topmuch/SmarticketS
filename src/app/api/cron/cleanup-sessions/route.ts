import { NextRequest, NextResponse } from 'next/server';
import { cleanupExpiredSessions } from '@/lib/session';

// Cron secret for authorization — required in all environments
const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Cron endpoint to cleanup expired sessions
 * Should be called periodically (e.g., every hour)
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
    // Verify authorization — CRON_SECRET env var is required
    if (!CRON_SECRET) {
      console.error('[/api/cron/cleanup-sessions] CRON_SECRET env var is not set');
      return NextResponse.json(
        { error: 'Server misconfigured — CRON_SECRET not set' },
        { status: 500 }
      );
    }

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    // Always validate the secret (no environment skip)
    if (token !== CRON_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

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
