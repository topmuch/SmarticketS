import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

/**
 * POST /api/dashboard/trips/[id]/mark-present
 *
 * Force-validates a ticket (mark passenger as present) without scan.
 * Body: { ticketId: string, validatorName?: string }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id: departureId } = await params;
    const body = await req.json();
    const { ticketId, validatorName } = body;

    if (!ticketId) {
      return NextResponse.json(
        { error: 'ticketId requis' },
        { status: 400 }
      );
    }

    // 1. Verify the departure exists and belongs to the agency
    const departure = await db.departure.findUnique({
      where: { id: departureId },
      select: { id: true, agencyId: true },
    });

    if (!departure) {
      return NextResponse.json({ error: 'Départ non trouvé' }, { status: 404 });
    }

    if (session.role !== 'superadmin' && departure.agencyId !== session.agencyId) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    // 2. Find the ticket
    const ticket = await db.passengerTicket.findUnique({
      where: { id: ticketId },
      include: {
        baggage: { select: { id: true, status: true, reference: true } },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket non trouvé' }, { status: 404 });
    }

    // 3. Verify ticket belongs to this departure
    if (ticket.departureId !== departureId) {
      return NextResponse.json(
        { error: 'Ce ticket ne correspond pas à ce départ' },
        { status: 400 }
      );
    }

    // 4. Check ticket status — can only mark ACTIVE tickets
    if (ticket.ticketStatus !== 'ACTIVE') {
      const statusLabel =
        ticket.ticketStatus === 'USED'
          ? 'déjà validé'
          : ticket.ticketStatus === 'CANCELLED'
            ? 'annulé'
            : ticket.ticketStatus;
      return NextResponse.json(
        { error: `Ticket ${statusLabel}, impossible de le marquer présent` },
        { status: 400 }
      );
    }

    // 5. Mark ticket as USED (validated)
    const validator = validatorName || session.name || 'Agence';

    await db.passengerTicket.update({
      where: { id: ticketId },
      data: {
        ticketStatus: 'USED',
        validatedAt: new Date(),
        validatedBy: validator,
      },
    });

    // 6. Update baggage status to scanned if applicable
    if (ticket.baggage && ticket.baggage.status === 'active') {
      await db.baggage.update({
        where: { id: ticket.baggage.id },
        data: { status: 'scanned' },
      });
    }

    // 7. Update departure available seats
    const updatedDeparture = await db.departure.findUnique({
      where: { id: departureId },
      select: { availableSeats: true, totalSeats: true },
    });

    if (updatedDeparture && updatedDeparture.availableSeats > 0) {
      await db.departure.update({
        where: { id: departureId },
        data: { availableSeats: updatedDeparture.availableSeats - 1 },
      });
    }

    return NextResponse.json({
      success: true,
      message: `${ticket.passengerName} marqué(e) présent(e) avec succès`,
      passengerName: ticket.passengerName,
      seatNumber: ticket.seatNumber,
      controlCode: ticket.controlCode,
      validatedAt: new Date().toISOString(),
      validatedBy: validator,
    });
  } catch (error) {
    console.error('[mark-present] Error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
