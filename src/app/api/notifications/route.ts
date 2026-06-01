import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

// GET /api/notifications — Paginated notifications for the user's agency
// Query params: ?type=...&read=false&limit=20&offset=0
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const readParam = searchParams.get('read');
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10), 1), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);

    // Build where clause
    const where: Record<string, unknown> = {};

    // Agency users see their agency's notifications (or broadcast = null agencyId)
    if (session.agencyId) {
      where.OR = [
        { agencyId: session.agencyId },
        { agencyId: null },
      ];
    }

    // Filter by type
    if (type) {
      where.type = type;
    }

    // Filter by read status
    if (readParam === 'true') {
      where.read = true;
    } else if (readParam === 'false') {
      where.read = false;
    }

    // Get unread count for the user's agency
    const unreadWhere: Record<string, unknown> = { read: false };
    if (session.agencyId) {
      unreadWhere.OR = [
        { agencyId: session.agencyId },
        { agencyId: null },
      ];
    }

    const [notifications, unreadCount, total] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.notification.count({ where: unreadWhere }),
      db.notification.count({ where }),
    ]);

    return NextResponse.json({
      data: notifications,
      meta: {
        total,
        unreadCount,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('[Notifications] GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
