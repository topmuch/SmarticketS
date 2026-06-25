import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

/**
 * POST /api/busgo/embarquement/retard
 *
 * L'agent appuie sur "Retard client +5min" pour un passager.
 * Le système:
 *   1. Marque le passager comme en retard (isLate=true, lateMinutes=5)
 *   2. Le passager reçoit une notification "Votre départ est reporté de 5 min"
 *   3. Le chronomètre du passager se réinitialise à 5 min
 *
 * Body: {
 *   ticketId: string,
 *   minutes: number  // default: 5
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { ticketId, minutes = 5 } = body as { ticketId: string; minutes?: number };

    if (!ticketId) {
      return NextResponse.json({ error: 'ticketId requis' }, { status: 400 });
    }

    const ticket = await db.passengerTicket.findUnique({
      where: { id: ticketId },
      include: { departure: true },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Billet introuvable' }, { status: 404 });
    }

    // Vérifier l'accès agency
    if (session.role !== 'superadmin' && ticket.agencyId !== session.agencyId) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    // Marquer comme en retard
    const updated = await db.passengerTicket.update({
      where: { id: ticketId },
      data: {
        isLate: true,
        lateMinutes: minutes,
      },
    });

    // Logger la notification de retard
    await db.busGoNotification.create({
      data: {
        passengerTicketId: ticketId,
        departureId: ticket.departureId,
        type: 'LATE',
        message: `Votre départ est reporté de ${minutes} minutes. Nouvel horaire: ${new Date(
          new Date(ticket.departure.scheduledTime).getTime() + minutes * 60000
        ).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}.`,
        sentAt: new Date(),
        status: 'sent',
      },
    });

    // TODO: Envoyer Web Push notification au passager si abonné

    return NextResponse.json({
      success: true,
      ticket: {
        id: updated.id,
        passengerName: updated.passengerName,
        seatNumber: updated.seatNumber,
        isLate: updated.isLate,
        lateMinutes: updated.lateMinutes,
      },
      message: `${updated.passengerName} (siège ${updated.seatNumber}) a ${minutes} min de retard`,
    });
  } catch (error) {
    console.error('[API /api/busgo/embarquement/retard]', error);
    return NextResponse.json(
      { error: 'Erreur serveur', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
