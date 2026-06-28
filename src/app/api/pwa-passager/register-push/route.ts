import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/pwa-passager/register-push
 *
 * Register a Web Push subscription for a passenger ticket.
 *
 * C3 fix (audit): this route was previously missing (404). The frontend
 * called it in src/app/pwa-passager/install/page.tsx but got no response.
 *
 * Body: {
 *   ticketId: string,
 *   subscription: {
 *     endpoint: string,
 *     keys: { p256dh: string, auth: string }
 *   },
 *   userAgent?: string
 * }
 *
 * The subscription is stored in BusGoPushSubscription. The push-service
 * module uses it later to send actual push notifications via web-push.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ticketId, subscription, userAgent } = body as {
      ticketId: string;
      subscription: {
        endpoint: string;
        keys: { p256dh: string; auth: string };
        expirationTime?: number | null;
      };
      userAgent?: string;
    };

    if (!ticketId || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json(
        { error: 'ticketId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth are required' },
        { status: 400 }
      );
    }

    // Verify the ticket exists
    const ticket = await db.passengerTicket.findUnique({
      where: { id: ticketId },
      select: { id: true, agencyId: true },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Billet introuvable' }, { status: 404 });
    }

    // Check if subscription already exists (by endpoint — unique per device/browser)
    const existing = await db.busGoPushSubscription.findFirst({
      where: { endpoint: subscription.endpoint },
      select: { id: true },
    });

    if (existing) {
      // Update the existing subscription (keys may have changed)
      await db.busGoPushSubscription.update({
        where: { id: existing.id },
        data: {
          keys: JSON.stringify(subscription.keys),
          userAgent: userAgent || null,
        },
      });
      return NextResponse.json({ success: true, id: existing.id, updated: true });
    }

    // Create new subscription
    const newSub = await db.busGoPushSubscription.create({
      data: {
        passengerTicketId: ticketId,
        endpoint: subscription.endpoint,
        keys: JSON.stringify(subscription.keys),
        userAgent: userAgent || null,
      },
    });

    return NextResponse.json({ success: true, id: newSub.id, created: true }, { status: 201 });
  } catch (error) {
    console.error('[API /api/pwa-passager/register-push]', error);
    return NextResponse.json(
      { error: 'Erreur serveur', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/pwa-passager/register-push
 *
 * Unregister a Web Push subscription (e.g., when user clears data or logs out).
 * Body: { endpoint: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint } = body as { endpoint: string };

    if (!endpoint) {
      return NextResponse.json({ error: 'endpoint requis' }, { status: 400 });
    }

    await db.busGoPushSubscription.deleteMany({
      where: { endpoint },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API /api/pwa-passager/register-push DELETE]', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
