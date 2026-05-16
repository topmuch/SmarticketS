import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { cleanPhone, generateWaMeLink } from '@/lib/wame';

const confirmArrivalSchema = z.object({
  arrival_datetime: z.string().min(1, "La date/heure d'arrivée est obligatoire"),
  delivery_location: z.string().min(1, 'Le lieu de dépôt est obligatoire'),
  notes: z.string().optional().default(''),
});

// GET: Fetch colis info for the arrival page
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const reference = (id || '').toUpperCase().trim();

    const colis = await db.baggage.findUnique({
      where: { reference },
      include: { agency: true },
    });

    if (!colis) {
      return NextResponse.json(
        { error: 'not_found', message: 'Ce code QR ne correspond à aucun colis.' },
        { status: 404 }
      );
    }

    // PIN-FEATURE: Mask the PIN — show only last 3 digits
    let pin_masked: string | null = null;
    if (colis.retrievalPin) {
      const pin = colis.retrievalPin;
      pin_masked = `***${pin.slice(-3)}`;
    }

    // Return colis data for the arrival page
    return NextResponse.json({
      success: true,
      colis: {
        id: colis.id,
        reference: colis.reference,
        status: colis.status,
        transportType: colis.transportMode,
        company: colis.busCompany || colis.airlineName || '',
        departureCity: colis.departureCity || '',
        arrivalCity: colis.destination || '',
        departureDate: colis.departureDate,
        departureTime: colis.departureTime,
        senderName: colis.travelerFirstName || '',
        senderPhone: colis.whatsappOwner || '',
        receiverName: colis.receiverName || '',
        receiverPhone: colis.receiverWhatsapp || '',
        arrivedAt: colis.arrivedAt,
        deliveryLocation: colis.deliveryLocation,
        deliveryNotes: colis.deliveryNotes,
      },
      pin_masked,
      pinAttempts: colis.pinAttempts ?? 0,
    });
  } catch (error) {
    console.error('[/api/arrivee] GET error:', error);
    return NextResponse.json(
      { error: 'server_error', message: 'Erreur serveur.' },
      { status: 500 }
    );
  }
}

// POST: Confirm arrival
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = confirmArrivalSchema.parse(body);

    const reference = (id || '').toUpperCase().trim();

    // Find colis
    const colis = await db.baggage.findUnique({ where: { reference } });

    if (!colis) {
      return NextResponse.json(
        { error: 'not_found', message: 'Ce code QR ne correspond à aucun colis.' },
        { status: 404 }
      );
    }

    // Must be in_transit to confirm arrival
    if (colis.status === 'pending_activation') {
      return NextResponse.json({
        error: 'not_activated',
        message: 'Ce colis n\'a pas encore été activé.',
        reference: colis.reference,
      });
    }

    if (colis.status === 'delivered') {
      return NextResponse.json({
        error: 'already_delivered',
        message: 'Ce colis a déjà été livré.',
        reference: colis.reference,
      });
    }

    if (colis.status !== 'in_transit') {
      return NextResponse.json({
        error: 'invalid_status',
        message: `Ce colis ne peut pas être livré (statut: ${colis.status}).`,
        reference: colis.reference,
      });
    }

    const arrivedAt = new Date(data.arrival_datetime);

    // Update DB: status → delivered
    const updated = await db.baggage.update({
      where: { id: colis.id },
      data: {
        status: 'delivered',
        arrivedAt,
        deliveryLocation: data.delivery_location,
        deliveryNotes: data.notes,
        lastLocation: data.delivery_location,
      },
    });

    // Log arrival event
    const maskPhone = (phone: string) => {
      const clean = phone.replace(/[^0-9+]/g, '').replace(/^0+/, '');
      if (clean.length <= 4) return '***';
      return clean.slice(0, 4) + '***' + clean.slice(-2);
    };

    const arrivedDate = arrivedAt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const arrivedTime = arrivedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const trackingUrl = `https://qrtrans.com/suivi/${updated.reference}`;
    const companyName = updated.busCompany || updated.airlineName || '';

    // Driver phone line (conditional — security: never expose if consent = false)
    const driverLine = updated.shareDriverPhone && updated.driverPhone
      ? `📞 Contacter le transporteur : ${updated.driverPhone}`
      : `📞 Assistance : ${companyName}`;

    // ─── 🟢 SENDER MESSAGE (Arrival confirmed) ───
    const senderArrivalMessage = `🟢 *QRTrans — Colis Livré ✅*

Bonjour *${updated.travelerFirstName || 'Expéditeur'}*,

Bonne nouvelle ! Votre colis a bien été livré avec succès.

📦 Référence : *${updated.reference}*
📍 Lieu de livraison : ${data.delivery_location}
✅ Livré le : ${arrivedDate} à ${arrivedTime}
👤 Destinataire : ${updated.receiverName || '—'}

Merci de votre confiance envers QRTrans 🙏

⭐ Évaluer le service : https://qrtrans.com

🔗 Suivre le colis : ${trackingUrl}`;

    // ─── 🔵 RECEIVER MESSAGE (Package available for pickup) ───
    const receiverArrivalMessage = `🔵 *QRTrans — Colis Disponible 📦*

Bonjour *${updated.receiverName || 'Destinataire'}*,

Votre colis est arrivé et peut maintenant être retiré.

📦 Référence : *${updated.reference}*
📍 Point de retrait : ${data.delivery_location}
🕐 Horaires : 08h00 - 18h00
✅ Arrivé le : ${arrivedDate} à ${arrivedTime}
${driverLine}

Merci d'utiliser QRTrans 🙏

🔗 Suivre le colis : ${trackingUrl}`;

    const wa_sender = generateWaMeLink(cleanPhone(updated.whatsappOwner || ''), senderArrivalMessage);
    const wa_receiver = generateWaMeLink(cleanPhone(updated.receiverWhatsapp || ''), receiverArrivalMessage);

    // Log arrival events (system + sender + receiver WhatsApp notifications)
    await db.colisEvent.createMany({
      data: [
        {
          baggageId: colis.id,
          eventType: 'arrival',
          recipientType: 'system',
          messageTitle: '📍 Arrivée confirmée par le chauffeur',
          messageContent: `Le chauffeur a confirmé l'arrivée du colis ${colis.reference} à ${data.delivery_location} le ${arrivedDate} à ${arrivedTime}.`,
          metadata: JSON.stringify({ delivery_location: data.delivery_location, arrived_date: arrivedDate, arrived_time: arrivedTime, notes: data.notes }),
        },
        {
          baggageId: colis.id,
          eventType: 'arrival',
          recipientType: 'sender',
          recipientName: updated.travelerFirstName || 'Expéditeur',
          recipientPhone: maskPhone(updated.whatsappOwner || ''),
          messageTitle: '🟢 Colis Livré — Expéditeur',
          messageContent: senderArrivalMessage,
          waLink: wa_sender,
          metadata: JSON.stringify({ delivery_location: data.delivery_location, arrived_date: arrivedDate, arrived_time: arrivedTime }),
        },
        {
          baggageId: colis.id,
          eventType: 'arrival',
          recipientType: 'receiver',
          recipientName: updated.receiverName || 'Destinataire',
          recipientPhone: maskPhone(updated.receiverWhatsapp || ''),
          messageTitle: '🔵 Colis Disponible — Destinataire',
          messageContent: receiverArrivalMessage,
          waLink: wa_receiver,
          metadata: JSON.stringify({ delivery_location: data.delivery_location, arrived_date: arrivedDate, arrived_time: arrivedTime }),
        },
      ],
    });

    return NextResponse.json({
      success: true,
      colis: {
        id: updated.id,
        reference: updated.reference,
        status: updated.status,
        arrivedAt: updated.arrivedAt,
        deliveryLocation: updated.deliveryLocation,
      },
      // Return sender/receiver info for wa.me links
      sender: {
        name: updated.travelerFirstName || '',
        phone: updated.whatsappOwner || '',
      },
      receiver: {
        name: updated.receiverName || '',
        phone: updated.receiverWhatsapp || '',
      },
      wa_sender,
      wa_receiver,
      arrivalCity: updated.destination || '',
    });

  } catch (error) {
    console.error('[/api/arrivee] POST error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'validation', message: error.issues[0].message, details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'server_error', message: "Échec de la confirmation. Réessayez." },
      { status: 500 }
    );
  }
}
