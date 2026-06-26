import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

/**
 * POST /api/pwa-passager/install
 *
 * Le passager a scanné le QR code du guichetier → la PWA s'ouvre avec les infos.
 * Le passager saisit son n° de téléphone pour confirmer.
 * Le système vérifie que le téléphone correspond au ticket.
 *
 * Body: {
 *   qrData: string,       // base64 JSON from QR code
 *   phone: string,        // phone number entered by passenger
 *   pushSubscription?: object  // Web Push subscription (optional, for notifications)
 * }
 *
 * Returns: {
 *   success: true,
 *   ticket: { id, passengerName, seatNumber, destination, scheduledTime, ... },
 *   departure: { id, agentPhone, agentName, platform, ... }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { qrData, phone, pushSubscription } = body as {
      qrData: string;
      phone: string;
      pushSubscription?: { endpoint: string; keys: { p256dh: string; auth: string } };
    };

    if (!qrData || !phone) {
      return NextResponse.json(
        { error: 'QR data et téléphone requis' },
        { status: 400 }
      );
    }

    // Décoder le QR code
    let payload: {
      t: string; n: string; p: string; s: string; d: string;
      h: string; c: string; dep: string; ag: string | null;
    };

    try {
      payload = JSON.parse(Buffer.from(qrData, 'base64').toString('utf-8'));
    } catch {
      return NextResponse.json(
        { error: 'QR code invalide' },
        { status: 400 }
      );
    }

    // Vérifier le ticket en DB
    const ticket = await db.passengerTicket.findUnique({
      where: { id: payload.t },
      include: {
        departure: {
          select: {
            id: true,
            destination: true,
            scheduledTime: true,
            platform: true,
            lineNumber: true,
            status: true,
            delayMinutes: true,
            agentPhone: true,
            agentName: true,
            boardingStartedAt: true,
            departedAt: true,
            route: { select: { origin: true, destination: true, price: true, durationMinutes: true } },
          },
        },
        agency: { select: { id: true, name: true } },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Billet introuvable' }, { status: 404 });
    }

    // Vérifier le téléphone (normaliser: enlever espaces)
    const normalizedPhone = phone.replace(/\s/g, '');
    const ticketPhone = ticket.passengerPhone.replace(/\s/g, '');

    if (normalizedPhone !== ticketPhone) {
      return NextResponse.json(
        { error: 'Le numéro de téléphone ne correspond pas à ce billet' },
        { status: 403 }
      );
    }

    // Marquer comme PWA installée
    await db.passengerTicket.update({
      where: { id: ticket.id },
      data: {
        pwaInstalled: true,
        pwaInstalledAt: new Date(),
      },
    });

    // Envoyer le message de bienvenue (notification purchase_confirm)
    try {
      const template = await db.busGoNotificationTemplate.findFirst({
        where: {
          agencyId: ticket.agency.id,
          notificationType: 'purchase_confirm',
          language: 'fr',
          isActive: true,
        },
      });

      if (template) {
        // Replace variables
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

        let textMessage = template.textTemplate;
        let ttsMessage = template.ttsTemplate;
        for (const [key, value] of Object.entries(vars)) {
          textMessage = textMessage.replaceAll(key, value);
          ttsMessage = ttsMessage.replaceAll(key, value);
        }

        // Log the welcome notification
        await db.busGoNotificationLog.create({
          data: {
            ticketId: ticket.id,
            templateType: 'purchase_confirm',
            messageText: textMessage,
            ttsText: ttsMessage,
            status: 'sent',
          },
        });
      }
    } catch (notifError) {
      console.error('[PWA install] Failed to send welcome notification:', notifError);
      // Non-blocking — installation still succeeds
    }

    // Enregistrer la push subscription si fournie
    if (pushSubscription) {
      await db.busGoPushSubscription.create({
        data: {
          passengerTicketId: ticket.id,
          endpoint: pushSubscription.endpoint,
          keys: JSON.stringify(pushSubscription.keys),
          userAgent: request.headers.get('user-agent') || null,
        },
      });
    }

    // 🔔 Envoyer notification purchase_confirm immédiatement
    try {
      const template = await db.busGoNotificationTemplate.findFirst({
        where: {
          agencyId: ticket.agency.id,
          notificationType: 'purchase_confirm',
          language: 'fr',
          isActive: true,
        },
      });

      if (template) {
        const agency = await db.agency.findUnique({
          where: { id: ticket.agencyId },
          select: { name: true },
        });

        const depTime = ticket.departure?.scheduledTime || ticket.departureTime;
        const vars: Record<string, string> = {
          '{passenger_name}': ticket.passengerName,
          '{company_name}': agency?.name || 'BusGo',
          '{departure_city}': '—',
          '{arrival_city}': ticket.destination,
          '{date}': depTime ? new Date(depTime).toLocaleDateString('fr-FR') : '—',
          '{time}': depTime ? new Date(depTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—',
          '{platform}': ticket.platform || ticket.departure?.platform || '—',
          '{ticket_number}': ticket.paperTicketNumber || ticket.controlCode,
        };

        let textMessage = template.textTemplate;
        let ttsMessage = template.ttsTemplate;
        for (const [key, value] of Object.entries(vars)) {
          textMessage = textMessage.replaceAll(key, value);
          ttsMessage = ttsMessage.replaceAll(key, value);
        }

        await db.busGoNotificationLog.create({
          data: {
            ticketId: ticket.id,
            templateType: 'purchase_confirm',
            messageText: textMessage,
            ttsText: ttsMessage,
            status: 'sent',
          },
        });
      }
    } catch (e) {
      console.error('[install] Notification error:', e);
    }

    return NextResponse.json({
      success: true,
      ticket: {
        id: ticket.id,
        paperTicketNumber: ticket.paperTicketNumber,
        passengerName: ticket.passengerName,
        seatNumber: ticket.seatNumber,
        destination: ticket.destination,
        controlCode: ticket.controlCode,
        ticketStatus: ticket.ticketStatus,
        boardedAt: ticket.boardedAt?.toISOString() || null,
        isLate: ticket.isLate,
        lateMinutes: ticket.lateMinutes,
      },
      departure: {
        id: ticket.departure.id,
        destination: ticket.departure.destination,
        scheduledTime: ticket.departure.scheduledTime.toISOString(),
        platform: ticket.departure.platform,
        lineNumber: ticket.departure.lineNumber,
        status: ticket.departure.status,
        delayMinutes: ticket.departure.delayMinutes,
        agentPhone: ticket.departure.agentPhone,
        agentName: ticket.departure.agentName,
        boardingStartedAt: ticket.departure.boardingStartedAt?.toISOString() || null,
        departedAt: ticket.departure.departedAt?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error('[API /api/pwa-passager/install]', error);
    return NextResponse.json(
      { error: 'Erreur serveur', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
