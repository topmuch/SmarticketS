import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

/**
 * POST /api/busgo/incidents
 *
 * Déclare un retard ou un incident sur un départ.
 * Envoie une notification push à tous les passagers concernés.
 *
 * Body: {
 *   departureId: string,
 *   type: "delay" | "technical" | "other",
 *   delayMinutes?: number,    // si type=delay
 *   description?: string,     // si type=technical ou other
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    if (!['agent', 'admin', 'superadmin'].includes(session.role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const body = await request.json();
    const { departureId, type, delayMinutes, description } = body as {
      departureId: string;
      type: 'delay' | 'technical' | 'other';
      delayMinutes?: number;
      description?: string;
    };

    if (!departureId || !type) {
      return NextResponse.json({ error: 'departureId et type requis' }, { status: 400 });
    }

    const departure = await db.departure.findUnique({
      where: { id: departureId },
      include: { agency: { select: { name: true } } },
    });

    if (!departure) return NextResponse.json({ error: 'Départ non trouvé' }, { status: 404 });

    // Handle delay
    if (type === 'delay' && delayMinutes) {
      await db.departure.update({
        where: { id: departureId },
        data: {
          status: 'DELAYED',
          delayMinutes: departure.delayMinutes + delayMinutes,
        },
      });

      // Notify all passengers
      const tickets = await db.passengerTicket.findMany({
        where: { departureId, ticketStatus: { in: ['ACTIVE', 'BOARDED'] } },
      });

      const newTime = new Date(departure.scheduledTime);
      newTime.setMinutes(newTime.getMinutes() + departure.delayMinutes + delayMinutes);

      for (const ticket of tickets) {
        await db.busGoNotificationLog.create({
          data: {
            ticketId: ticket.id,
            templateType: 'delay_notification',
            messageText: `⏰ Retard de ${delayMinutes} minutes. Nouvel horaire: ${newTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}. Bus ${departure.lineNumber} → ${departure.destination}.`,
            ttsText: `Attention. Votre bus pour ${departure.destination} a un retard de ${delayMinutes} minutes. Le nouveau départ est à ${newTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}.`,
            status: 'sent',
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: `Retard de ${delayMinutes}min signalé. ${tickets.length} passagers notifiés.`,
        newDelayMinutes: departure.delayMinutes + delayMinutes,
      });
    }

    // Handle technical/other incident
    if ((type === 'technical' || type === 'other') && description) {
      await db.systemLog.create({
        data: {
          level: type === 'technical' ? 'error' : 'warning',
          action: `busgo_incident_${type}`,
          message: `Incident sur ${departure.lineNumber} → ${departure.destination}: ${description}`,
          userId: session.id,
          tenantId: departure.agencyId,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Incident signalé au SuperAdmin.',
      });
    }

    return NextResponse.json({ error: 'Paramètres insuffisants' }, { status: 400 });
  } catch (error) {
    console.error('[API /api/busgo/incidents]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
