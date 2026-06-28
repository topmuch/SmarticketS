import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/busgo/embarquement/scan
 *
 * Le PASSAGER scanne le QR code de l'agent.
 * Le système marque le passager comme "embarqué".
 *
 * Body: {
 *   departureId: string,    // from agent QR code
 *   ticketId: string,       // from passenger's localStorage
 * }
 *
 * Le passager n'a PAS de session (pas de login).
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
    // Allow match by departureId OR by destination (more flexible)
    if (ticket.departureId && ticket.departureId !== departureId) {
      return NextResponse.json(
        { error: 'Ce billet ne correspond pas à ce départ. Vérifiez que vous scannez le bon bus.' },
        { status: 403 }
      );
    }

    // If ticket has no departureId linked, link it now
    if (!ticket.departureId) {
      await db.passengerTicket.update({
        where: { id: ticketId },
        data: { departureId },
      });
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
        isLate: false,
      },
    });

    // Envoyer notification de confirmation d'embarquement
    try {
      const template = await db.busGoNotificationTemplate.findFirst({
        where: {
          agencyId: ticket.agencyId,
          notificationType: 'boarding_confirmed',
          isActive: true,
        },
      });

      if (template) {
        const agency = await db.agency.findUnique({ where: { id: ticket.agencyId }, select: { name: true } });
        const dep = ticket.departure;
        const vars: Record<string, string> = {
          '{passenger_name}': ticket.passengerName,
          '{company_name}': agency?.name || 'BusGo',
          '{destination}': ticket.destination,
          '{time}': dep ? new Date(dep.scheduledTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—',
          '{platform}': ticket.platform || dep?.platform || '—',
          '{seat_number}': ticket.seatNumber,
        };

        let textMsg = template.textTemplate;
        let ttsMsg = template.ttsTemplate;
        for (const [key, val] of Object.entries(vars)) {
          textMsg = textMsg.replaceAll(key, val);
          ttsMsg = ttsMsg.replaceAll(key, val);
        }

        await db.busGoNotificationLog.create({
          data: {
            ticketId,
            templateType: 'boarding_confirmed',
            messageText: textMsg,
            ttsText: ttsMsg,
            status: 'sent',
          },
        });
      }
    } catch {
      // Notification log error is non-blocking
    }

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
      departure: ticket.departure ? {
        id: ticket.departure.id,
        destination: ticket.departure.destination,
        scheduledTime: ticket.departure.scheduledTime.toISOString(),
        platform: ticket.departure.platform,
      } : null,
    });
  } catch (error) {
    console.error('[API /api/busgo/embarquement/scan]', error);
    return NextResponse.json(
      { error: 'Erreur serveur', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
