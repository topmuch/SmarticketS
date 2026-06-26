import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

/**
 * POST /api/busgo/notifications/send
 *
 * Génère et envoie une notification à un passager.
 * Le frontend (PWA passager) reçoit la notification via Web Push.
 *
 * Body: {
 *   ticketId: string,
 *   templateType: "purchase_confirm" | "reminder_1h" | "bags_45min" | "boarding_30min" | "departure_5min"
 * }
 *
 * Variables remplacées:
 *   {passenger_name}, {company_name}, {departure_city}, {arrival_city},
 *   {date}, {time}, {platform}, {ticket_number}
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const body = await request.json();
    const { ticketId, templateType } = body as { ticketId: string; templateType: string };

    if (!ticketId || !templateType) {
      return NextResponse.json({ error: 'ticketId et templateType requis' }, { status: 400 });
    }

    // Get ticket + departure + agency
    const ticket = await db.passengerTicket.findUnique({
      where: { id: ticketId },
      include: {
        departure: { include: { route: true } },
        agency: { select: { id: true, name: true } },
      },
    });

    if (!ticket) return NextResponse.json({ error: 'Billet non trouvé' }, { status: 404 });

    // Get template
    const template = await db.busGoNotificationTemplate.findFirst({
      where: {
        agencyId: ticket.agencyId,
        notificationType: templateType,
        language: 'fr',
        isActive: true,
      },
    });

    if (!template) return NextResponse.json({ error: 'Template non trouvé ou inactif' }, { status: 404 });

    // Prepare variables
    const departureTime = ticket.departure?.scheduledTime || ticket.departureTime;
    const vars: Record<string, string> = {
      '{passenger_name}': ticket.passengerName,
      '{company_name}': ticket.agency.name,
      '{departure_city}': ticket.departure?.route?.origin || '—',
      '{arrival_city}': ticket.destination,
      '{date}': departureTime ? new Date(departureTime).toLocaleDateString('fr-FR') : '—',
      '{time}': departureTime ? new Date(departureTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—',
      '{platform}': ticket.platform || ticket.departure?.platform || '—',
      '{ticket_number}': ticket.paperTicketNumber || ticket.controlCode,
    };

    // Replace variables in templates
    let textMessage = template.textTemplate;
    let ttsMessage = template.ttsTemplate;
    for (const [key, value] of Object.entries(vars)) {
      textMessage = textMessage.replaceAll(key, value);
      ttsMessage = ttsMessage.replaceAll(key, value);
    }

    // Log the notification
    const log = await db.busGoNotificationLog.create({
      data: {
        ticketId,
        templateType,
        messageText: textMessage,
        ttsText: ttsMessage,
        status: 'sent',
      },
    });

    // Get push subscriptions for this ticket
    const subscriptions = await db.busGoPushSubscription.findMany({
      where: { passengerTicketId: ticketId },
    });

    // TODO: Send Web Push notifications to each subscription
    // For now, we just log it. The PWA passager polls /api/busgo/notifications
    // or receives via WebSocket (kiosk-service).

    return NextResponse.json({
      success: true,
      notification: {
        id: log.id,
        type: templateType,
        text: textMessage,
        tts: ttsMessage,
        sentAt: log.sentAt.toISOString(),
      },
      subscriptionsCount: subscriptions.length,
    });
  } catch (error) {
    console.error('[API /api/busgo/notifications/send]', error);
    return NextResponse.json(
      { error: 'Erreur serveur', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
