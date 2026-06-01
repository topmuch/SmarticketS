import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

// POST /api/notifications/read-all — Mark all notifications as read for the current user/agency
export async function POST(_request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const where: Record<string, unknown> = { read: false };

    if (session.agencyId) {
      where.OR = [
        { agencyId: session.agencyId },
        { agencyId: null },
      ];
    }

    const result = await db.notification.updateMany({
      where,
      data: { read: true, updatedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      count: result.count,
    });
  } catch (error) {
    console.error('[Notifications/ReadAll] POST error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
