import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/demo/mark-present
 *
 * PUBLIC demo endpoint (no auth) — marks a passenger as present (validates ticket).
 * Body: { ticketId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ticketId } = body;

    if (!ticketId) {
      return NextResponse.json(
        { error: 'ticketId requis' },
        { status: 400 }
      );
    }

    // Find the ticket
    const ticket = await db.passengerTicket.findUnique({
      where: { id: ticketId },
      include: {
        baggage: { select: { id: true, status: true, reference: true } },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket non trouvé' }, { status: 404 });
    }

    if (ticket.ticketStatus !== 'ACTIVE') {
      return NextResponse.json(
        { error: `Ticket ${ticket.ticketStatus === 'USED' ? 'déjà validé' : ticket.ticketStatus}` },
        { status: 400 }
      );
    }

    // Mark ticket as USED
    await db.passengerTicket.update({
      where: { id: ticketId },
      data: {
        ticketStatus: 'USED',
        validatedAt: new Date(),
        validatedBy: 'Demo Dashboard',
      },
    });

    // Update baggage status
    if (ticket.baggage && ticket.baggage.status === 'active') {
      await db.baggage.update({
        where: { id: ticket.baggage.id },
        data: { status: 'scanned' },
      });
    }

    // Update departure available seats
    if (ticket.departureId) {
      const departure = await db.departure.findUnique({
        where: { id: ticket.departureId },
        select: { availableSeats: true },
      });
      if (departure && departure.availableSeats > 0) {
        await db.departure.update({
          where: { id: ticket.departureId },
          data: { availableSeats: { decrement: 1 } },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `${ticket.passengerName} marqué(e) présent(e) avec succès`,
      passengerName: ticket.passengerName,
      seatNumber: ticket.seatNumber,
      controlCode: ticket.controlCode,
      validatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[demo/mark-present] Error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
