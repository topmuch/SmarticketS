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

    // C3 fix: actually send Web Push notifications to each subscription
    // (previously this was a TODO that never sent anything)
    let pushResult = { sent: 0, failed: 0, expiredIds: [] as string[] };
    if (subscriptions.length > 0) {
      try {
        const { sendPushToSubscriptions } = await import('@/lib/push-service');
        pushResult = await sendPushToSubscriptions(subscriptions, {
          title: getNotificationTitle(templateType),
          body: textMessage,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
          tag: `${templateType}-${ticketId}`,
          requireInteraction: templateType === 'departure_5min',
          vibrate: templateType === 'departure_5min' ? [100, 50, 100, 50, 100] : [100, 50, 100],
          data: {
            type: templateType.toUpperCase(),
            ticketId,
            ttsMessage,
            url: `/pwa-passager/?action=ticket`,
          },
          actions: [
            { action: 'listen', title: '🔊 Écouter' },
            { action: 'open', title: '🎫 Voir mon billet' },
          ],
        });
      } catch (pushErr) {
        console.warn('[notifications/send] Push delivery failed (non-fatal):', pushErr);
      }
    }

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
      pushSent: pushResult.sent,
      pushFailed: pushResult.failed,
    });
  } catch (error) {
    console.error('[API /api/busgo/notifications/send]', error);
    return NextResponse.json(
      { error: 'Erreur serveur', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

/**
 * Get a human-readable title for a notification type.
 * Used as the push notification title visible in the system tray.
 */
function getNotificationTitle(templateType: string): string {
  const titles: Record<string, string> = {
    purchase_confirm: '🎫 Billet confirmé',
    reminder_1h: '🚌 Départ dans 1h',
    bags_45min: '🧳 Préparez vos bagages',
    boarding_30min: '🚨 Embarquement en cours',
    departure_5min: '⏰ DÉPART DANS 5 MINUTES',
    delay_notice: '⏰ Retard de départ',
  };
  return titles[templateType] || '🔔 Notification BusGo';
}
