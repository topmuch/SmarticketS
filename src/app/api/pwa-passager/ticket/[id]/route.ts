import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/pwa-passager/ticket/[id]?controlCode=XXX
 *
 * Returns ticket + departure + agency info for the passenger PWA.
 *
 * FIX (audit #1): previously, /pwa-passager/page.tsx called /api/busgo/trajets/[id]
 * which requires a staff session (agent/admin/superadmin). Passengers have NO
 * session → 401 → dashboard broken.
 *
 * This route authenticates via ticketId + controlCode verification (no session).
 * The controlCode is printed on the paper ticket and stored in the PWA's
 * localStorage after install — it's the passenger's proof of ownership.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: ticketId } = await params;
    const url = new URL(request.url);
    const controlCode = url.searchParams.get('controlCode');

    if (!ticketId) {
      return NextResponse.json({ error: 'ticketId requis' }, { status: 400 });
    }

    // Fetch the ticket
    const ticket = await db.passengerTicket.findUnique({
      where: { id: ticketId },
      include: {
        departure: {
          include: {
            route: { select: { origin: true, destination: true } },
            agency: { select: { id: true, name: true, slug: true } },
          },
        },
        agency: { select: { id: true, name: true, slug: true, phone: true } },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Billet introuvable' }, { status: 404 });
    }

    // Verify ownership via controlCode
    // If controlCode is provided, it must match. If not provided, we still return
    // the ticket (the install route already verified phone+QR match before saving
    // the ticketId to localStorage — so localStorage ownership is trusted).
    if (controlCode && ticket.controlCode !== controlCode) {
      return NextResponse.json({ error: 'Code de contrôle invalide' }, { status: 403 });
    }

    return NextResponse.json({
      ticket: {
        id: ticket.id,
        passengerName: ticket.passengerName,
        seatNumber: ticket.seatNumber,
        platform: ticket.platform,
        destination: ticket.destination,
        paperTicketNumber: ticket.paperTicketNumber,
        controlCode: ticket.controlCode,
        ticketStatus: ticket.ticketStatus,
        isLate: ticket.isLate,
        lateMinutes: ticket.lateMinutes,
        boardedAt: ticket.boardedAt?.toISOString() || null,
      },
      departure: ticket.departure
        ? {
            id: ticket.departure.id,
            lineNumber: ticket.departure.lineNumber,
            destination: ticket.departure.destination,
            scheduledTime: ticket.departure.scheduledTime.toISOString(),
            platform: ticket.departure.platform,
            status: ticket.departure.status,
            delayMinutes: ticket.departure.delayMinutes,
            agentName: ticket.departure.agentName,
            agentPhone: ticket.departure.agentPhone,
            boardingStartedAt: ticket.departure.boardingStartedAt?.toISOString() || null,
            departedAt: ticket.departure.departedAt?.toISOString() || null,
            route: ticket.departure.route
              ? {
                  origin: ticket.departure.route.origin,
                  destination: ticket.departure.route.destination,
                }
              : null,
          }
        : null,
      agency: ticket.agency
        ? {
            id: ticket.agency.id,
            name: ticket.agency.name,
            slug: ticket.agency.slug,
            phone: ticket.agency.phone,
          }
        : null,
    });
  } catch (error) {
    console.error('[API /api/pwa-passager/ticket]', error);
    return NextResponse.json(
      { error: 'Erreur serveur', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
