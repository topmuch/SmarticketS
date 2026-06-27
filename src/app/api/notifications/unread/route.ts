import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

/**
 * GET /api/notifications/unread
 *
 * Fetch unread notifications for the authenticated user (SuperAdmin bell).
 *
 * Security (C2 fix): previously this endpoint had NO authentication — anyone
 * could fetch the 20 most recent unread notifications across ALL agencies.
 * Now requires a valid session + role check (superadmin/admin/agent).
 *
 * The query is scoped to:
 *   - SuperAdmin: sees all unread (system-wide broadcast)
 *   - Admin/Agent: sees only their agency's unread (agency isolation)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Role check — only staff can see notifications
    const allowedRoles = ['superadmin', 'admin', 'agent'];
    if (!allowedRoles.includes(session.role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    // Build where clause with agency isolation
    // SuperAdmin sees all; admin/agent see only their agency's
    const where: Record<string, unknown> = { read: false };
    if (session.role !== 'superadmin' && session.agencyId) {
      where.agencyId = session.agencyId;
    }

    const notifications = await db.notification.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
    });

    return NextResponse.json(notifications);
  } catch (error) {
    console.error('Fetch notifications error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
