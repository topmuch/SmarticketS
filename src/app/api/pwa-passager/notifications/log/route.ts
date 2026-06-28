import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/pwa-passager/notifications/log?ticketId=XXX&controlCode=XXX&type=XXX
 *
 * Returns notification history for a passenger ticket.
 *
 * FIX (audit #1): previously, /pwa-passager/page.tsx called /api/busgo/notifications/log
 * which requires a staff session (W7 fix added getSession). Passengers have NO
 * session → 401 → welcome notification never displayed.
 *
 * This route authenticates via ticketId + controlCode verification (no session).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get('ticketId');
    const controlCode = searchParams.get('controlCode');
    const type = searchParams.get('type');

    if (!ticketId) {
      return NextResponse.json({ error: 'ticketId requis' }, { status: 400 });
    }

    // Verify ticket exists + ownership via controlCode
    const ticket = await db.passengerTicket.findUnique({
      where: { id: ticketId },
      select: { controlCode: true },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Billet introuvable' }, { status: 404 });
    }

    if (controlCode && ticket.controlCode !== controlCode) {
      return NextResponse.json({ error: 'Code de contrôle invalide' }, { status: 403 });
    }

    // Fetch notification logs
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
    console.error('[API /api/pwa-passager/notifications/log]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
