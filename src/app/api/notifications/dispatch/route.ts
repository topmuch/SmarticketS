import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';
import { validateBody, dispatchNotificationSchema } from '@/lib/validation';
import { dispatchNotification } from '@/lib/notification-dispatch';

// POST /api/notifications/dispatch — Dispatch a WhatsApp notification
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (!session.agencyId) {
      return NextResponse.json({ error: 'Session agence requise' }, { status: 403 });
    }

    const rawBody = await request.json();
    const validation = validateBody(dispatchNotificationSchema, rawBody);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, details: validation.details },
        { status: 400 }
      );
    }

    const { type, recipientPhone, recipientName, baggageId, reference } = validation.data;

    // For 'alert' and 'system' types, handle differently
    if (type === 'system') {
      // System notification — just create in DB
      const notification = await db.notification.create({
        data: {
          type: 'system',
          userId: session.id,
          agencyId: session.agencyId,
          message: validation.data.message || 'Notification système',
          read: false,
        },
      });

      return NextResponse.json({ success: true, notification });
    }

    if (type === 'alert') {
      // Alert notification
      const notification = await db.notification.create({
        data: {
          type: 'alert',
          userId: session.id,
          agencyId: session.agencyId,
          baggageId: baggageId || null,
          message: validation.data.message || 'Alerte',
          read: false,
        },
      });

      return NextResponse.json({ success: true, notification });
    }

    // WhatsApp notification types require baggageId and reference
    if (!baggageId) {
      return NextResponse.json({ error: 'baggageId requis pour les notifications WhatsApp' }, { status: 400 });
    }

    if (!reference) {
      return NextResponse.json({ error: 'reference requise pour les notifications WhatsApp' }, { status: 400 });
    }

    // Verify the baggage belongs to the agency
    const baggage = await db.baggage.findUnique({
      where: { id: baggageId },
      select: {
        id: true,
        reference: true,
        agencyId: true,
        travelerFirstName: true,
        travelerLastName: true,
        whatsappOwner: true,
        receiverName: true,
        receiverWhatsapp: true,
        departureCity: true,
        destination: true,
        departureDate: true,
        departureTime: true,
        arrivedAt: true,
        deliveryLocation: true,
        retrievalPin: true,
        driverPhone: true,
        shareDriverPhone: true,
        pickupAddress: true,
        agency: {
          select: { name: true },
        },
      },
    });

    if (!baggage) {
      return NextResponse.json({ error: 'Colis introuvable' }, { status: 404 });
    }

    if (baggage.agencyId && baggage.agencyId !== session.agencyId) {
      return NextResponse.json({ error: 'Colis non autorisé pour cette agence' }, { status: 403 });
    }

    const senderName = `${baggage.travelerFirstName || ''} ${baggage.travelerLastName || ''}`.trim() || 'Expéditeur';
    const senderWhatsapp = baggage.whatsappOwner || '';
    const receiverName = baggage.receiverName || '';
    const receiverWhatsapp = baggage.receiverWhatsapp || '';
    const companyName = baggage.agency?.name || 'SmarticketS';
    const departureCity = baggage.departureCity || '';
    const arrivalCity = baggage.destination || '';
    const departureDate = baggage.departureDate ? new Date(baggage.departureDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
    const departureTime = baggage.departureTime || '';

    const sharedData = {
      senderName,
      senderWhatsapp,
      receiverName,
      receiverWhatsapp,
      companyName,
      departureCity,
      arrivalCity,
      departureDate,
      departureTime,
      pickupAddress: baggage.pickupAddress || undefined,
      pin: baggage.retrievalPin || undefined,
      driverPhone: baggage.driverPhone || undefined,
      shareDriverPhone: baggage.shareDriverPhone,
    };

    if (type === 'departure_sender' || type === 'departure_receiver') {
      const result = await dispatchNotification({
        type: type as 'departure_sender' | 'departure_receiver',
        recipientPhone: type === 'departure_sender' ? senderWhatsapp : receiverWhatsapp,
        recipientName: type === 'departure_sender' ? senderName : receiverName,
        baggageId,
        reference,
        departureData: sharedData,
      });

      return NextResponse.json({ success: true, ...result });
    }

    if (type === 'arrival_sender' || type === 'arrival_receiver') {
      const arrivedDate = baggage.arrivedAt
        ? new Date(baggage.arrivedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : undefined;
      const arrivedTime = baggage.arrivedAt
        ? new Date(baggage.arrivedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        : undefined;

      const result = await dispatchNotification({
        type: type as 'arrival_sender' | 'arrival_receiver',
        recipientPhone: type === 'arrival_sender' ? senderWhatsapp : receiverWhatsapp,
        recipientName: type === 'arrival_sender' ? senderName : receiverName,
        baggageId,
        reference,
        arrivalData: {
          ...sharedData,
          arrivedDate,
          arrivedTime,
          deliveryLocation: baggage.deliveryLocation || undefined,
        },
      });

      return NextResponse.json({ success: true, ...result });
    }

    return NextResponse.json({ error: `Type de notification non supporté: ${type}` }, { status: 400 });
  } catch (error) {
    console.error('[Notifications/Dispatch] POST error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
