import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/busgo/notifications/log?ticketId=xxx&type=xxx
 * Récupère les notifications envoyées à un passager.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get('ticketId');
    const type = searchParams.get('type');

    if (!ticketId) {
      return NextResponse.json({ error: 'ticketId requis' }, { status: 400 });
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
