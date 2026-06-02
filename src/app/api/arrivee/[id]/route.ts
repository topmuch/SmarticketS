import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { cleanPhone, generateWaMeLink } from '@/lib/wame';
import { sendEmail, getEmailSettings, getColisDeliveredEmailTemplate } from '@/lib/email';

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

    // Build timeline from ColisEvent + ScanLog
    const [events, scans] = await Promise.all([
      db.colisEvent.findMany({
        where: { baggageId: colis.id },
        orderBy: { createdAt: 'asc' },
      }),
      db.scanLog.findMany({
        where: { baggageId: colis.id },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const timeline = [
      ...events.map((e) => ({
        id: e.id,
        type: 'event' as const,
        title: e.messageTitle,
        description: (e.messageContent || '').length > 100
          ? (e.messageContent || '').slice(0, 100) + '…'
          : (e.messageContent || ''),
        timestamp: e.createdAt,
        location: null as string | null,
      })),
      ...scans.map((s) => ({
        id: s.id,
        type: 'scan' as const,
        title: `Scan à ${s.location || 'Position inconnue'}`,
        description: s.context || '',
        timestamp: s.createdAt,
        location: s.location,
      })),
    ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Fetch PassengerTicket data if category is 'ticket'
    let ticket = null;
    if (colis.category === 'ticket') {
      ticket = await db.passengerTicket.findUnique({
        where: { baggageId: colis.id },
        select: {
          passengerName: true, passengerAge: true, documentType: true, documentNumber: true,
          destination: true, seatNumber: true, platform: true, departureTime: true,
          luggageCount: true, luggageWeightKg: true, luggageFee: true,
          controlCode: true, ticketStatus: true, activatedAt: true,
        }
      });
    }

    // Return colis data for the arrival page
    return NextResponse.json({
      success: true,
      colis: {
        id: colis.id,
        reference: colis.reference,
        status: colis.status,
        category: colis.category,
        agencyId: colis.agencyId || '',
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
        pickupAddress: colis.pickupAddress,
        estimatedArrival: colis.estimatedArrival,
        paymentStatus: colis.paymentStatus,
        colisType: colis.colisType,
        colisTypeOther: colis.colisTypeOther,
        colisWeight: colis.colisWeight,
        isFragile: colis.isFragile,
        driverPhone: colis.shareDriverPhone ? colis.driverPhone : null,
        shareDriverPhone: colis.shareDriverPhone,
        deliveredAt: colis.deliveredAt,
      },
      ticket,
      pin_masked,
      pinAttempts: colis.pinAttempts ?? 0,
      timeline,
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
    const colis = await db.baggage.findUnique({ where: { reference }, include: { agency: true } });

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
    const trackingUrl = `https://smartickets.com/suivi/${updated.reference}`;
    const companyName = updated.busCompany || updated.airlineName || '';

    // Driver phone line (conditional — security: never expose if consent = false)
    const driverLine = updated.shareDriverPhone && updated.driverPhone
      ? `📞 Contacter le transporteur : ${updated.driverPhone}`
      : `📞 Assistance : ${companyName}`;

    // 📧 Send email notification for delivery (driver confirmed)
    try {
      const emailSettings = await getEmailSettings();
      if (emailSettings) {
        const template = getColisDeliveredEmailTemplate({
          reference: updated.reference,
          agencyName: colis.agency?.name || undefined,
          senderName: updated.travelerFirstName || undefined,
          receiverName: updated.receiverName || undefined,
          deliveryLocation: data.delivery_location,
          deliveryDate: arrivedDate,
          deliveryTime: arrivedTime,
          deliveryMethod: 'driver',
          companyName,
          departureCity: updated.departureCity || undefined,
          arrivalCity: updated.destination || undefined,
        });

        const recipients: string[] = [];
        if (emailSettings.recipientColisEmail) recipients.push(emailSettings.recipientColisEmail);
        if (colis.agency?.email && !recipients.includes(colis.agency.email)) recipients.push(colis.agency.email);

        if (recipients.length > 0) {
          await sendEmail({
            to: recipients,
            subject: `✅ Colis livré — ${updated.reference}`,
            html: template.html,
            text: template.text,
            type: 'colis_delivered',
            agencyId: colis.agencyId || undefined,
            data: { reference: updated.reference, baggageId: updated.id, method: 'driver' },
          });
          console.log(`📧 Delivery email sent for ${updated.reference} to ${recipients.join(', ')}`);
        }
      }
    } catch (emailError) {
      console.error('Failed to send delivery email:', emailError);
    }

    // Resolve pickup location: driver's input > sender's pickupAddress > fallback
    const pickupLocation = data.delivery_location || colis.pickupAddress || 'Non renseigné';

    // ─── 🟢 SENDER MESSAGE (Arrival confirmed) ───
    const senderArrivalMessage = `🟢 *SmarticketS — Colis Livré ✅*

Bonjour *${updated.travelerFirstName || 'Expéditeur'}*,

Bonne nouvelle ! Votre colis a bien été livré avec succès.

📦 Référence : *${updated.reference}*
📍 Lieu de livraison : ${pickupLocation}
✅ Livré le : ${arrivedDate} à ${arrivedTime}
👤 Destinataire : ${updated.receiverName || '—'}

Merci de votre confiance envers SmarticketS 🙏

⭐ Évaluer le service : https://smartickets.com

🔗 Suivre le colis : ${trackingUrl}`;

    // ─── 🔵 RECEIVER MESSAGE (Package available for pickup) ───
    const receiverArrivalMessage = `🔵 *SmarticketS — Colis Disponible 📦*

Bonjour *${updated.receiverName || 'Destinataire'}*,

Votre colis est arrivé et peut maintenant être retiré.

📦 Référence : *${updated.reference}*
📍 Point de retrait : ${pickupLocation}
🕐 Horaires : 08h00 - 18h00
✅ Arrivé le : ${arrivedDate} à ${arrivedTime}
${driverLine}

Merci d'utiliser SmarticketS 🙏

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
