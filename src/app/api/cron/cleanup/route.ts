import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyCronSecret } from '@/lib/cron-auth';

// POST - Cleanup expired tokens and old logs
export async function POST(request: NextRequest) {
  try {
    // W2 fix: use shared cron auth helper (consistent with cleanup-sessions + departure-reminders)
    const authError = verifyCronSecret(request);
    if (authError) return authError;

    const now = new Date();
    const results = {
      expiredTokens: 0,
      oldEmailLogs: 0,
      oldEmailTokens: 0,
    };

    // Delete expired email tokens
    const expiredTokens = await prisma.emailToken.deleteMany({
      where: {
        expiresAt: { lt: now }
      }
    });
    results.expiredTokens = expiredTokens.count;

    // Delete old email logs (older than 90 days)
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const oldLogs = await prisma.emailLog.deleteMany({
      where: {
        createdAt: { lt: ninetyDaysAgo }
      }
    });
    results.oldEmailLogs = oldLogs.count;

    // Delete used email tokens older than 7 days
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oldTokens = await prisma.emailToken.deleteMany({
      where: {
        used: true,
        usedAt: { lt: sevenDaysAgo }
      }
    });
    results.oldEmailTokens = oldTokens.count;

    console.log('🧹 Cleanup completed:', results);

    return NextResponse.json({ 
      success: true, 
      message: 'Nettoyage effectué',
      results 
    });
  } catch (error) {
    console.error('Error during cleanup:', error);
    return NextResponse.json(
      { error: 'Erreur lors du nettoyage' },
      { status: 500 }
    );
  }
}
