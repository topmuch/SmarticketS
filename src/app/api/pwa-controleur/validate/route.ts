import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

/**
 * POST /api/pwa-controleur/validate
 *
 * Le contrôleur scanne/saisit le controlCode d'un billet.
 * Le système vérifie la validité et marque le billet comme "contrôlé".
 *
 * Body: { controlCode: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ valid: false, message: 'Non authentifié' }, { status: 401 });
    }

    if (!['controller', 'admin', 'superadmin', 'agent'].includes(session.role)) {
      return NextResponse.json({ valid: false, message: 'Accès refusé' }, { status: 403 });
    }

    const body = await request.json();
    const { controlCode } = body as { controlCode: string };

    if (!controlCode) {
      return NextResponse.json({ valid: false, message: 'Code requis' }, { status: 400 });
    }

    const ticket = await db.passengerTicket.findUnique({
      where: { controlCode: controlCode.toUpperCase().trim() },
      include: {
        departure: {
          select: { lineNumber: true, destination: true, scheduledTime: true },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({
        valid: false,
        message: 'Billet introuvable',
      });
    }

    // Vérifier agency
    if (session.role !== 'superadmin' && ticket.agencyId !== session.agencyId) {
      return NextResponse.json({
        valid: false,
        message: 'Billet hors de votre compagnie',
      });
    }

    // Vérifier statut
    if (ticket.ticketStatus === 'CANCELLED') {
      return NextResponse.json({
        valid: false,
        message: 'Billet annulé',
        ticket: {
          passengerName: ticket.passengerName,
          seatNumber: ticket.seatNumber,
          destination: ticket.destination,
          controlCode: ticket.controlCode,
          ticketStatus: ticket.ticketStatus,
          paperTicketNumber: ticket.paperTicketNumber,
          boardedAt: ticket.boardedAt?.toISOString() || null,
        },
      });
    }

    return NextResponse.json({
      valid: true,
      message: 'Billet valide',
      ticket: {
        passengerName: ticket.passengerName,
        seatNumber: ticket.seatNumber,
        destination: ticket.destination,
        controlCode: ticket.controlCode,
        ticketStatus: ticket.ticketStatus,
        paperTicketNumber: ticket.paperTicketNumber,
        boardedAt: ticket.boardedAt?.toISOString() || null,
      },
      departure: ticket.departure ? {
        lineNumber: ticket.departure.lineNumber,
        destination: ticket.departure.destination,
        scheduledTime: ticket.departure.scheduledTime.toISOString(),
      } : null,
    });
  } catch (error) {
    console.error('[API /api/pwa-controleur/validate]', error);
    return NextResponse.json(
      { valid: false, message: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
