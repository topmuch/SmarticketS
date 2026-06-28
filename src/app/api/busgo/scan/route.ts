import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

/**
 * POST /api/busgo/scan
 *
 * Valide un billet via son QR code (controlCode) pour un départ donné.
 *
 * Body:
 *   - qrCode: string (controlCode du PassengerTicket)
 *   - departureId?: string (optionnel — si fourni, vérifie que le billet
 *     appartient bien à ce départ)
 *
 * Comportement:
 *   - Si billet trouvé + valide + non déjà embarqué → marque BOARDED
 *   - Si billet déjà embarqué → retourne 409 (warning)
 *   - Si billet annulé → retourne 410 (gone)
 *   - Si billet non trouvé → retourne 404
 *   - Si billet appartient à un autre départ → retourne 403
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (!['agent', 'admin', 'superadmin'].includes(session.role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const body = await request.json();
    const { qrCode, departureId } = body as { qrCode: string; departureId?: string };

    if (!qrCode || typeof qrCode !== 'string') {
      return NextResponse.json({ error: 'QR code requis' }, { status: 400 });
    }

    // Normalize — strip whitespace, uppercase
    const normalizedCode = qrCode.trim().toUpperCase();

    // Find the ticket by controlCode
    const ticket = await db.passengerTicket.findUnique({
      where: { controlCode: normalizedCode },
      include: {
        departure: {
          select: {
            id: true,
            lineNumber: true,
            destination: true,
            scheduledTime: true,
            platform: true,
            status: true,
          },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { error: 'Billet introuvable', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Agency access control
    if (session.role !== 'superadmin' && ticket.agencyId !== session.agencyId) {
      return NextResponse.json(
        { error: 'Billet hors de votre agence', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // Departure mismatch check (if departureId provided)
    if (departureId && ticket.departureId && ticket.departureId !== departureId) {
      return NextResponse.json(
        {
          error: 'Billet appartient à un autre départ',
          code: 'WRONG_DEPARTURE',
          expectedDeparture: ticket.departure,
        },
        { status: 403 }
      );
    }

    // Check current ticket status
    if (ticket.ticketStatus === 'BOARDED') {
      return NextResponse.json(
        {
          error: 'Passager déjà embarqué',
          code: 'ALREADY_BOARDED',
          ticket: {
            id: ticket.id,
            passengerName: ticket.passengerName,
            seatNumber: ticket.seatNumber,
            validatedAt: ticket.validatedAt?.toISOString(),
          },
        },
        { status: 409 }
      );
    }

    if (ticket.ticketStatus === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Billet annulé', code: 'CANCELLED' },
        { status: 410 }
      );
    }

    if (ticket.ticketStatus === 'ABSENT') {
      // Allow re-boarding (agent can revert)
    }

    // Mark as BOARDED
    const updated = await db.passengerTicket.update({
      where: { id: ticket.id },
      data: {
        ticketStatus: 'BOARDED',
        validatedAt: new Date(),
        validatedBy: session.id,
      },
    });

    return NextResponse.json({
      success: true,
      ticket: {
        id: updated.id,
        passengerName: updated.passengerName,
        passengerPhone: updated.passengerPhone,
        seatNumber: updated.seatNumber,
        destination: updated.destination,
        platform: updated.platform,
        controlCode: updated.controlCode,
        ticketStatus: updated.ticketStatus,
        validatedAt: updated.validatedAt?.toISOString(),
        luggageCount: updated.luggageCount,
        hasParentalAuth: updated.hasParentalAuth,
      },
      departure: ticket.departure,
    });
  } catch (error) {
    console.error('[API /api/busgo/scan]', error);
    return NextResponse.json(
      { error: 'Erreur serveur', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/busgo/scan
 *
 * Met à jour le statut d'un billet (marquer absent, annuler, etc.)
 *
 * Body:
 *   - ticketId: string
 *   - status: "ACTIVE" | "BOARDED" | "ABSENT" | "CANCELLED"
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (!['agent', 'admin', 'superadmin'].includes(session.role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const body = await request.json();
    const { ticketId, status } = body as {
      ticketId: string;
      status: 'ACTIVE' | 'BOARDED' | 'ABSENT' | 'CANCELLED';
    };

    if (!ticketId || !status) {
      return NextResponse.json({ error: 'ticketId et status requis' }, { status: 400 });
    }

    const ticket = await db.passengerTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Billet introuvable' }, { status: 404 });
    }

    if (session.role !== 'superadmin' && ticket.agencyId !== session.agencyId) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const updateData: Record<string, unknown> = { ticketStatus: status };
    if (status === 'BOARDED') {
      updateData.validatedAt = new Date();
      updateData.validatedBy = session.id;
    } else if (status === 'CANCELLED') {
      updateData.cancelledAt = new Date();
    }

    const updated = await db.passengerTicket.update({
      where: { id: ticketId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      ticket: {
        id: updated.id,
        ticketStatus: updated.ticketStatus,
        validatedAt: updated.validatedAt?.toISOString(),
      },
    });
  } catch (error) {
    console.error('[API /api/busgo/scan PATCH]', error);
    return NextResponse.json(
      { error: 'Erreur serveur', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
