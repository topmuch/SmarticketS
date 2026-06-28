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

    // C5 fix: log to BusGoNotificationLog (live table) instead of BusGoNotification (dead table)
    // The delay message text
    const delayMessage = `Votre départ est reporté de ${minutes} minutes. Nouvel horaire: ${new Date(
      new Date(ticket.departure.scheduledTime).getTime() + minutes * 60000
    ).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}.`;

    await db.busGoNotificationLog.create({
      data: {
        ticketId,
        templateType: 'delay_notice',
        messageText: delayMessage,
        ttsText: delayMessage,
        status: 'sent',
      },
    });

    // C3 fix (partial): attempt Web Push if subscriptions exist
    // Full implementation in /api/busgo/notifications/send/route.ts
    try {
      const subscriptions = await db.busGoPushSubscription.findMany({
        where: { passengerTicketId: ticketId },
      });
      if (subscriptions.length > 0) {
        // Delegate to the push service (imported dynamically to avoid loading web-push on every request)
        const { sendPushToSubscriptions } = await import('@/lib/push-service');
        await sendPushToSubscriptions(subscriptions, {
          title: '⏰ Retard de départ',
          body: delayMessage,
          tag: `delay-${ticketId}`,
          data: { type: 'DELAY_NOTICE', ticketId },
        });
      }
    } catch (pushErr) {
      console.warn('[retard] Push notification failed (non-fatal):', pushErr);
    }

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
