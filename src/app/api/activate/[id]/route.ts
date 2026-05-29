import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { cleanPhone, generateWaMeLink } from '@/lib/wame';
import { sendEmail, getEmailSettings, getColisActivatedEmailTemplate } from '@/lib/email';

const WHATSAPP_REGEX = /^\+[1-9]\d{1,14}$/;

const senderSchema = z.object({
  name: z.string().min(1, "Le nom de l'expéditeur est obligatoire"),
  phone: z.string().regex(WHATSAPP_REGEX, 'Format WhatsApp invalide (ex: +221771234567)'),
});

const receiverSchema = z.object({
  name: z.string().min(1, 'Le nom du destinataire est obligatoire'),
  phone: z.string().regex(WHATSAPP_REGEX, 'Format WhatsApp invalide (ex: +221761234567)'),
});

const baggageSchema = z.object({
  type: z.enum(['VALISE', 'SAC', 'CARTON', 'BACKPACK', 'CABIN', 'OTHER']),
  typeOther: z.string().optional(),
  weight: z.number().min(0.1, 'Le poids doit être positif').optional(),
  dimensions: z.string().optional(),
  color: z.string().optional(),
  contentCategory: z.enum(['CLOTHES', 'DOCS', 'ELECTRONICS', 'FOOD', 'GIFTS', 'OTHER']).optional(),
  declaredValue: z.number().min(0).optional(),
  isFragile: z.boolean().default(false),
  hasProhibited: z.boolean().default(false),
}).refine(
  (data) => !(data.type === 'OTHER' && (!data.typeOther || data.typeOther.trim().length === 0)),
  { message: 'Veuillez préciser le type de bagage', path: ['typeOther'] }
).refine(
  (data) => data.hasProhibited === false,
  { message: "Les produits interdits (inflammables, liquides >100ml, armes) ne sont pas acceptés.", path: ['hasProhibited'] }
);

const activateSchema = z.object({
  transport_type: z.enum(['BUS'], { message: 'Le type de transport est BUS' }),
  company_name: z.string().min(1, 'La compagnie est obligatoire'),
  departure_city: z.string().min(1, 'La ville de départ est obligatoire'),
  arrival_city: z.string().min(1, "La ville d'arrivée est obligatoire"),
  departure_datetime: z.string().min(1, 'La date/heure de départ est obligatoire'),
  pickup_address: z.string().optional(),
  estimated_arrival: z.string().optional(),
  payment_status: z.enum(['SENDER_PAID', 'RECEIVER_PAY'], { message: 'Le statut de paiement est obligatoire' }),
  driver_phone: z.string().regex(WHATSAPP_REGEX, 'Format WhatsApp invalide').optional(),
  share_driver_phone: z.boolean().default(false),
  sender: senderSchema,
  receiver: receiverSchema,
  baggage: baggageSchema,
}).refine(
  (data) => !(data.share_driver_phone && !data.driver_phone),
  { message: 'Le numéro du chauffeur est requis pour activer le partage.', path: ['driver_phone'] }
);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = activateSchema.parse(body);

    const reference = (id || '').toUpperCase().trim();

    // Find colis by reference
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

    // Handle special statuses
    if (colis.status === 'in_transit') {
      return NextResponse.json({
        error: 'already_in_transit',
        message: 'Ce colis est déjà en transit.',
        reference: colis.reference,
      });
    }
    if (colis.status === 'delivered' || colis.status === 'found') {
      return NextResponse.json({
        error: 'already_delivered',
        message: 'Ce colis a déjà été livré.',
        reference: colis.reference,
      });
    }
    if (colis.status === 'active' || colis.status === 'scanned') {
      return NextResponse.json({
        error: 'already_active',
        message: 'Ce colis a déjà été activé.',
        reference: colis.reference,
      });
    }
    if (colis.status === 'blocked') {
      return NextResponse.json(
        { error: 'blocked', message: 'Ce colis a été bloqué. Contactez le support.' },
        { status: 403 }
      );
    }
    if (colis.status !== 'pending_activation') {
      return NextResponse.json(
        { error: 'invalid_status', message: `Statut invalide : ${colis.status}` },
        { status: 400 }
      );
    }

    // Validate departure_datetime is not in the past
    const depDateTime = new Date(data.departure_datetime);
    const now = new Date();
    if (depDateTime < now) {
      return NextResponse.json(
        { error: 'invalid_date', message: 'La date de départ ne peut pas être antérieure à maintenant.' },
        { status: 400 }
      );
    }

    // Expiration: 90 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);

    // Parse datetime for separate date/time fields
    const depDate = depDateTime.toISOString().split('T')[0];
    const depTime = depDateTime.toTimeString().slice(0, 5);

    // Baggage type label for display
    const baggageTypeLabels: Record<string, string> = {
      VALISE: 'Valise', SAC: 'Sac', CARTON: 'Carton',
      BACKPACK: 'Sac à dos', CABIN: 'Bagage cabine', OTHER: data.baggage.typeOther || 'Autre',
    };
    const baggageTypeLabel = baggageTypeLabels[data.baggage.type] || data.baggage.type;

    // Payment status labels
    const paymentLabels: Record<string, string> = {
      SENDER_PAID: '✅ Payé par l\'expéditeur',
      RECEIVER_PAY: '💸 À payer par le destinataire',
    };

    // Update colis in DB — status → in_transit
    const updated = await db.baggage.update({
      where: { id: colis.id },
      data: {
        status: 'in_transit',
        transportMode: 'bus',
        busCompany: data.company_name,
        departureCity: data.departure_city,
        destination: data.arrival_city,
        departureDate: depDateTime,
        departureTime: depTime,
        travelerFirstName: data.sender.name,
        whatsappOwner: data.sender.phone,
        receiverName: data.receiver.name,
        receiverWhatsapp: data.receiver.phone,
        expiresAt,
        // New logistics fields
        pickupAddress: data.pickup_address || null,
        estimatedArrival: data.estimated_arrival || null,
        paymentStatus: data.payment_status,
        // Driver phone & consent
        driverPhone: data.driver_phone || null,
        shareDriverPhone: data.share_driver_phone,
        // New baggage fields
        colisType: data.baggage.type,
        colisTypeOther: data.baggage.type === 'OTHER' ? (data.baggage.typeOther || null) : null,
        colisWeight: data.baggage.weight ?? null,
        colisDimensions: data.baggage.dimensions || null,
        colisColor: data.baggage.color || null,
        contentCategory: data.baggage.contentCategory || null,
        declaredValue: data.baggage.declaredValue ?? null,
        isFragile: data.baggage.isFragile,
        hasProhibited: data.baggage.hasProhibited,
      },
    });

    // PIN-FEATURE: Generate 6-digit retrieval PIN
    const pin = Math.floor(100000 + Math.random() * 900000).toString();

    // Save PIN to DB
    await db.baggage.update({
      where: { id: updated.id },
      data: {
        retrievalPin: pin,
        pinGeneratedAt: new Date(),
      },
    });

    // Build tracking URL → page suivi
    const trackingUrl = `https://smartickets.com/suivi/${updated.reference}`;

    // Format date/time for wa.me messages
    const formattedDate = depDateTime.toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
    const formattedTime = depTime;

    // Estimated arrival line (use ETA if provided, otherwise departure date)
    const estimatedArrivalLine = data.estimated_arrival
      ? data.estimated_arrival
      : formattedDate;

    // ─── 🟢 SENDER MESSAGE (Departure) ───
    const senderMessage = `🟢 *SmarticketS — Colis en Partance*

Bonjour *${data.sender.name}*,

Votre colis a bien été pris en charge et est actuellement en route.

📦 Référence : *${updated.reference}*
🚌 Compagnie : ${data.company_name}
📍 Trajet : ${data.departure_city} → ${data.arrival_city}
🕐 Départ : ${formattedDate} à ${formattedTime}

Vous recevrez une notification dès son arrivée.

Merci de votre confiance 🙏

🔗 Suivre le colis : ${trackingUrl}`;

    // Driver phone line (conditional)
    const driverLine = data.share_driver_phone && data.driver_phone
      ? `📞 Contacter le transporteur : ${data.driver_phone}`
      : '📞 Pour toute question, contactez l\'agence au +221 78 123 00 00';

    // Pickup address line (set by sender during activation)
    const pickupLine = data.pickup_address
      ? `📍 Adresse de retrait : ${data.pickup_address}`
      : '';

    // ─── 🔵 RECEIVER MESSAGE (Departure — with PIN) ───
    const receiverMessage = `🔵 *SmarticketS — Colis en Transit*

Bonjour *${data.receiver.name}*,

Un colis destiné à votre attention est actuellement en route.

📦 Référence : *${updated.reference}*
👤 Expéditeur : ${data.sender.name}
🚌 Compagnie : ${data.company_name}
📍 Destination : ${data.arrival_city}
🕐 Arrivée estimée : ${estimatedArrivalLine}${pickupLine ? `
${pickupLine}` : ''}
🔐 *Code de retrait : ${pin}*
Conservez ce code. Il sera exigé à l'arrivée.
${driverLine}

Vous serez notifié immédiatement dès l'arrivée du colis.

🤝 Merci d'utiliser SmarticketS

🔗 Suivre le colis : ${trackingUrl}`;

    const wa_sender = generateWaMeLink(cleanPhone(data.sender.phone), senderMessage);
    const wa_receiver = generateWaMeLink(cleanPhone(data.receiver.phone), receiverMessage);

    // 📧 Send email notification for colis activation
    try {
      const emailSettings = await getEmailSettings();
      if (emailSettings) {
        const template = getColisActivatedEmailTemplate({
          reference: updated.reference,
          agencyName: colis.agency?.name || undefined,
          senderName: data.sender.name,
          senderPhone: data.sender.phone,
          receiverName: data.receiver.name,
          receiverPhone: data.receiver.phone,
          companyName: data.company_name,
          departureCity: data.departure_city,
          arrivalCity: data.arrival_city,
          departureDate: formattedDate,
          departureTime: formattedTime,
          colisType: baggageTypeLabel,
          transportMode: 'bus',
          paymentStatus: data.payment_status,
        });

        const recipients: string[] = [];
        if (emailSettings.recipientColisEmail) recipients.push(emailSettings.recipientColisEmail);
        if (colis.agency?.email && !recipients.includes(colis.agency.email)) recipients.push(colis.agency.email);

        if (recipients.length > 0) {
          await sendEmail({
            to: recipients,
            subject: `🚌 Colis activé — ${updated.reference}`,
            html: template.html,
            text: template.text,
            type: 'colis_activated',
            agencyId: colis.agencyId || undefined,
            data: { reference: updated.reference, baggageId: updated.id },
          });
          console.log(`📧 Activation email sent for ${updated.reference} to ${recipients.join(', ')}`);
        }
      }
    } catch (emailError) {
      console.error('Failed to send activation email:', emailError);
    }

    // Log activation events to ColisEvent table
    const maskPhone = (phone: string) => {
      const clean = cleanPhone(phone);
      if (clean.length <= 4) return '***';
      return clean.slice(0, 4) + '***' + clean.slice(-2);
    };

    await db.colisEvent.createMany({
      data: [
        {
          baggageId: updated.id,
          eventType: 'activation',
          recipientType: 'sender',
          recipientName: data.sender.name,
          recipientPhone: maskPhone(data.sender.phone),
          messageTitle: '🟢 Colis en Partance — Expéditeur',
          messageContent: senderMessage,
          waLink: wa_sender,
          metadata: JSON.stringify({ departure_city: data.departure_city, arrival_city: data.arrival_city, company: data.company_name, departure_date: formattedDate, departure_time: formattedTime }),
        },
        {
          baggageId: updated.id,
          eventType: 'activation',
          recipientType: 'receiver',
          recipientName: data.receiver.name,
          recipientPhone: maskPhone(data.receiver.phone),
          messageTitle: '🔵 Colis en Transit — Destinataire (avec PIN)',
          messageContent: receiverMessage,
          waLink: wa_receiver,
          metadata: JSON.stringify({ departure_city: data.departure_city, arrival_city: data.arrival_city, company: data.company_name, pin: '***' + pin.slice(-3), driver_shared: data.share_driver_phone }),
        },
        {
          baggageId: updated.id,
          eventType: 'pin_generated',
          recipientType: 'system',
          messageTitle: '🔐 Code PIN généré',
          messageContent: `Code de retrait à 6 chiffres généré pour le destinataire.`,
          metadata: JSON.stringify({ pin_masked: '***' + pin.slice(-3), generated_at: new Date().toISOString() }),
        },
      ],
    });

    return NextResponse.json({
      success: true,
      colis: {
        id: updated.id,
        reference: updated.reference,
        status: updated.status,
      },
      pin,
      wa_sender,
      wa_receiver,
    });

  } catch (error) {
    console.error('[/api/activate] Error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'validation', message: error.issues[0].message, details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'server_error', message: "Échec de l'activation. Vérifiez votre connexion et réessayez." },
      { status: 500 }
    );
  }
}
