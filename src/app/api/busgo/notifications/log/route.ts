import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

/**
 * GET /api/busgo/notifications/log?ticketId=xxx&type=xxx
 *
 * Récupère les notifications envoyées à un passager.
 *
 * W7 fix (audit): previously this endpoint had NO authentication — anyone
 * with a ticketId could read its notification history (info leak).
 * Now requires a valid session + agency isolation check.
 */
export async function GET(request: NextRequest) {
  try {
    // W7 fix: require authentication
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get('ticketId');
    const type = searchParams.get('type');

    if (!ticketId) {
      return NextResponse.json({ error: 'ticketId requis' }, { status: 400 });
    }

    // Verify the ticket belongs to the user's agency (agency isolation)
    // SuperAdmin can access any ticket; admin/agent only their agency's
    if (session.role !== 'superadmin') {
      const ticket = await db.passengerTicket.findUnique({
        where: { id: ticketId },
        select: { agencyId: true },
      });
      if (!ticket) {
        return NextResponse.json({ error: 'Billet introuvable' }, { status: 404 });
      }
      if (ticket.agencyId !== session.agencyId) {
        return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
      }
    }

    const logs = await db.busGoNotificationLog.findMany({
      where: {
        ticketId,
        ...(type ? { templateType: type } : {}),
      },
      orderBy: { sentAt: 'desc' },
      take: 10,
    });

    return NextResponse.json({ data: logs });
  } catch (error) {
    console.error('[API /api/busgo/notifications/log]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
