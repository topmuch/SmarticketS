import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/busgo/embarquement/scan
 *
 * Le PASSAGER scanne le QR code de l'AGENT (qui contient juste l'ID du départ).
 * Le système marque le passager comme "embarqué".
 *
 * Body: {
 *   departureId: string,    // from agent QR code
 *   ticketId: string,       // from passenger's session/PWA
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { departureId, ticketId } = body as {
      departureId: string;
      ticketId: string;
    };

    if (!departureId || !ticketId) {
      return NextResponse.json(
        { error: 'departureId et ticketId requis' },
        { status: 400 }
      );
    }

    // Vérifier le ticket
    const ticket = await db.passengerTicket.findUnique({
      where: { id: ticketId },
      include: { departure: true },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Billet introuvable' }, { status: 404 });
    }

    // Vérifier que le ticket correspond au départ scanné
    if (ticket.departureId !== departureId) {
      return NextResponse.json(
        { error: 'Ce billet ne correspond pas à ce départ' },
        { status: 403 }
      );
    }

    // Vérifier le statut
    if (ticket.ticketStatus === 'CANCELLED') {
      return NextResponse.json({ error: 'Billet annulé' }, { status: 410 });
    }

    if (ticket.boardedAt) {
      return NextResponse.json({
        success: true,
        alreadyBoarded: true,
        message: 'Vous êtes déjà embarqué',
        ticket: {
          id: ticket.id,
          passengerName: ticket.passengerName,
          seatNumber: ticket.seatNumber,
          boardedAt: ticket.boardedAt.toISOString(),
        },
      });
    }

    // Marquer comme embarqué
    const updated = await db.passengerTicket.update({
      where: { id: ticketId },
      data: {
        boardedAt: new Date(),
        ticketStatus: 'BOARDED',
        isLate: false, // Reset late flag — passenger showed up
      },
    });

    return NextResponse.json({
      success: true,
      alreadyBoarded: false,
      ticket: {
        id: updated.id,
        passengerName: updated.passengerName,
        seatNumber: updated.seatNumber,
        boardedAt: updated.boardedAt?.toISOString(),
        destination: updated.destination,
      },
      departure: {
        id: ticket.departure.id,
        destination: ticket.departure.destination,
        scheduledTime: ticket.departure.scheduledTime.toISOString(),
        platform: ticket.departure.platform,
      },
    });
  } catch (error) {
    console.error('[API /api/busgo/embarquement/scan]', error);
    return NextResponse.json(
      { error: 'Erreur serveur', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
