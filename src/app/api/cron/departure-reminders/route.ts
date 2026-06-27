import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * POST /api/cron/departure-reminders
 *
 * Scheduler pour les notifications de départ BUSGO.
 *
 * Tourne toutes les minutes (appelé par un cron externe ou un scheduler interne).
 * Pour chaque départ dans la fenêtre "T-5min" (4 à 6 minutes dans le futur),
 * trouve tous les passagers avec un billet ACTIF, et envoie la notification
 * "departure_5min" si elle n'a pas déjà été envoyée (tracké via BusGoNotificationLog).
 *
 * Fenêtre de tolérance : ±60 secondes autour de T-5min pour éviter de manquer
 * le créneau exact si le cron ne tourne pas à la seconde près.
 *
 * Authentification : header Authorization Bearer CRON_SECRET (optionnel si
 * CRON_SECRET n'est pas défini — utile en dev).
 *
 * Cf. BUG #5 : aucune notification T-5min n'était envoyée car aucun scheduler
 * n'existait. L'endpoint /api/busgo/notifications/send était manuel uniquement.
 */

// Types of reminders to send, with their offset in minutes before departure
const REMINDER_TYPES: Array<{ type: string; offsetMinutes: number; label: string }> = [
  { type: 'reminder_1h', offsetMinutes: 60, label: 'H-1h' },
  { type: 'bags_45min', offsetMinutes: 45, label: 'H-45min' },
  { type: 'boarding_30min', offsetMinutes: 30, label: 'H-30min' },
  { type: 'departure_5min', offsetMinutes: 5, label: 'H-5min' },
];

// Tolerance window: ±60 seconds around the target time
const TOLERANCE_MS = 60 * 1000;

export async function POST(request: NextRequest) {
  const startedAt = Date.now();

  // Verify cron secret (optional in dev)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const now = new Date();
  const stats = {
    checked: 0,
    departuresFound: 0,
    notificationsSent: 0,
    notificationsSkipped: 0,
    errors: 0,
    byType: {} as Record<string, number>,
  };

  try {
    for (const reminder of REMINDER_TYPES) {
      // Target time = now + offsetMinutes
      const targetTime = new Date(now.getTime() + reminder.offsetMinutes * 60 * 1000);
      const windowStart = new Date(targetTime.getTime() - TOLERANCE_MS);
      const windowEnd = new Date(targetTime.getTime() + TOLERANCE_MS);

      // Find departures in the tolerance window that are not yet departed/cancelled
      const departures = await prisma.departure.findMany({
        where: {
          scheduledTime: {
            gte: windowStart,
            lte: windowEnd,
          },
          status: {
            in: ['SCHEDULED', 'BOARDING', 'DELAYED'],
          },
        },
        include: {
          agency: { select: { id: true, name: true } },
          route: { select: { origin: true, destination: true } },
          tickets: {
            where: {
              ticketStatus: { in: ['ACTIVE', 'BOARDED'] },
            },
          },
        },
      });

      stats.departuresFound += departures.length;
      stats.byType[reminder.type] = 0;

      for (const departure of departures) {
        for (const ticket of departure.tickets) {
          stats.checked++;

          // Check if notification already sent for this ticket + type
          // (idempotency — prevents duplicate notifications if cron runs twice)
          const alreadySent = await prisma.busGoNotificationLog.findFirst({
            where: {
              ticketId: ticket.id,
              templateType: reminder.type,
            },
            select: { id: true },
          });

          if (alreadySent) {
            stats.notificationsSkipped++;
            continue;
          }

          // Get the active template for this agency + type
          const template = await prisma.busGoNotificationTemplate.findFirst({
            where: {
              agencyId: ticket.agencyId,
              notificationType: reminder.type,
              language: 'fr',
              isActive: true,
            },
          });

          if (!template) {
            // No active template — skip silently (agency hasn't configured this)
            stats.notificationsSkipped++;
            continue;
          }

          // Prepare variables
          const departureTime = ticket.departureTime || departure.scheduledTime;
          const vars: Record<string, string> = {
            '{passenger_name}': ticket.passengerName,
            '{company_name}': departure.agency?.name || 'BusGo',
            '{departure_city}': departure.route?.origin || '—',
            '{arrival_city}': ticket.destination || departure.destination,
            '{date}': departureTime
              ? new Date(departureTime).toLocaleDateString('fr-FR')
              : '—',
            '{time}': departureTime
              ? new Date(departureTime).toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '—',
            '{platform}': ticket.platform || departure.platform || '—',
            '{ticket_number}': ticket.paperTicketNumber || ticket.controlCode,
          };

          // Replace variables in templates
          let textMessage = template.textTemplate;
          let ttsMessage = template.ttsTemplate;
          for (const [key, value] of Object.entries(vars)) {
            textMessage = textMessage.replaceAll(key, value);
            ttsMessage = ttsMessage.replaceAll(key, value);
          }

          try {
            // Log the notification (this is the source of truth for "sent")
            await prisma.busGoNotificationLog.create({
              data: {
                ticketId: ticket.id,
                templateType: reminder.type,
                messageText: textMessage,
                ttsText: ttsMessage,
                status: 'sent',
              },
            });

            // Get push subscriptions for this ticket
            const subscriptions = await prisma.busGoPushSubscription.findMany({
              where: { passengerTicketId: ticket.id },
            });

            // TODO: Send actual Web Push notifications to each subscription.
            // For now, the PWA passager polls /api/busgo/notifications or
            // receives via WebSocket (kiosk-service). The log above is what
            // the PWA reads to display the notification.

            stats.notificationsSent++;
            stats.byType[reminder.type]++;

            console.log(
              `[departure-reminders] ${reminder.label} → ticket ${ticket.id} (${ticket.passengerName}) — ${subscriptions.length} push subs`
            );
          } catch (err) {
            stats.errors++;
            console.error(
              `[departure-reminders] Failed to send ${reminder.type} to ticket ${ticket.id}:`,
              err
            );
          }
        }
      }
    }

    const durationMs = Date.now() - startedAt;
    console.log(
      `[departure-reminders] ✅ Done in ${durationMs}ms — checked: ${stats.checked}, sent: ${stats.notificationsSent}, skipped: ${stats.notificationsSkipped}, errors: ${stats.errors}`
    );

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      durationMs,
      stats,
    });
  } catch (error) {
    console.error('[departure-reminders] ❌ Fatal error:', error);
    return NextResponse.json(
      {
        error: 'Erreur serveur',
        details: error instanceof Error ? error.message : 'Unknown',
        stats,
      },
      { status: 500 }
    );
  }
}

// Allow GET for easy testing in browser/dev
export async function GET(request: NextRequest) {
  return POST(request);
}
