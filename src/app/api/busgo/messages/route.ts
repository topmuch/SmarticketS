import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

/**
 * GET /api/busgo/messages?ticketId=xxx
 * Liste les messages entre passager et agent.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get('ticketId');
    if (!ticketId) {
      return NextResponse.json({ error: 'ticketId requis' }, { status: 400 });
    }

    const messages = await db.busGoMessage.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ data: messages });
  } catch (error) {
    console.error('[API /api/busgo/messages GET]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * POST /api/busgo/messages
 * Envoie un message du passager à l'agent.
 * Body: { ticketId, message }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ticketId, message } = body as { ticketId: string; message: string };

    if (!ticketId || !message) {
      return NextResponse.json({ error: 'ticketId et message requis' }, { status: 400 });
    }

    const ticket = await db.passengerTicket.findUnique({
      where: { id: ticketId },
      select: { passengerName: true },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Billet non trouvé' }, { status: 404 });
    }

    const msg = await db.busGoMessage.create({
      data: {
        ticketId,
        senderType: 'passenger',
        senderName: ticket.passengerName,
        message,
      },
    });

    return NextResponse.json({ data: msg }, { status: 201 });
  } catch (error) {
    console.error('[API /api/busgo/messages POST]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
