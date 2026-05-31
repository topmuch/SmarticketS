import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { cleanPhone, generateWaMeLink } from '@/lib/wame';

const DRIVER_COOKIE_NAME = 'smartickets_driver_session';
const INACTIVITY_TIMEOUT_MS = 24 * 60 * 60 * 1000;
const MAX_PIN_ATTEMPTS = 5;

// ─── Helper: Get driver session user ────────────────────────────────────

async function getDriverSession(request: NextRequest) {
  const sessionId = request.cookies.get(DRIVER_COOKIE_NAME)?.value;
  if (!sessionId) return null;

  const session = await db.session.findUnique({
    where: { id: sessionId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          role: true,
          agencyId: true,
        },
      },
    },
  });

  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id: sessionId } }).catch(() => {});
    return null;
  }
  const inactivityThreshold = new Date(Date.now() - INACTIVITY_TIMEOUT_MS);
  if (session.lastActivity < inactivityThreshold) {
    await db.session.delete({ where: { id: sessionId } }).catch(() => {});
    return null;
  }

  const user = session.user;
  if (user.role !== 'agent' && user.role !== 'agency' && user.role !== 'driver') {
    return null;
  }

  return { session, user };
}

// ─── Zod schema ──────────────────────────────────────────────────────────

const deliverSchema = z.object({
  pin: z
    .string()
    .length(6, 'Le code PIN doit comporter 6 chiffres')
    .regex(/^\d{6}$/, 'Le code PIN doit être composé de chiffres uniquement'),
});

// ─── POST: Confirm delivery with PIN ─────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: parcelId } = await params;

    // Auth check
    const auth = await getDriverSession(request);
    if (!auth) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 },
      );
    }

    // Update session activity
    await db.session
      .update({
        where: { id: auth.session.id },
        data: { lastActivity: new Date() },
      })
      .catch(() => {});

    // Validate request body
    const body = await request.json();
    const parsed = deliverSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const { pin } = parsed.data;

    // Find parcel
    const parcel = await db.baggage.findUnique({
      where: { id: parcelId },
    });

    if (!parcel) {
      return NextResponse.json(
        { error: 'Colis non trouvé' },
        { status: 404 },
      );
    }

    if (parcel.status !== 'in_transit') {
      return NextResponse.json(
        { error: 'Ce colis n\'est pas en transit' },
        { status: 400 },
      );
    }

    // Check PIN attempts
    if (parcel.pinAttempts >= MAX_PIN_ATTEMPTS) {
      return NextResponse.json(
        {
          error: 'Trop de tentatives de PIN. Veuillez contacter le support.',
          maxAttemptsReached: true,
        },
        { status: 429 },
      );
    }

    // Check if PIN is set
    if (!parcel.retrievalPin) {
      return NextResponse.json(
        { error: 'Aucun PIN configuré pour ce colis' },
        { status: 400 },
      );
    }

    // Verify PIN
    if (pin !== parcel.retrievalPin) {
      const newAttempts = parcel.pinAttempts + 1;
      const remainingAttempts = MAX_PIN_ATTEMPTS - newAttempts;

      await db.baggage.update({
        where: { id: parcelId },
        data: { pinAttempts: newAttempts },
      });

      return NextResponse.json(
        {
          wrongPin: true,
          remainingAttempts,
          error:
            remainingAttempts > 0
              ? `Code incorrect (${remainingAttempts} tentative${remainingAttempts > 1 ? 's' : ''} restante${remainingAttempts > 1 ? 's' : ''})`
              : 'Trop de tentatives. Contactez le support.',
        },
        { status: 400 },
      );
    }

    // PIN is correct — confirm delivery
    const deliveredAt = new Date();

    // Include sender/receiver fields for WhatsApp notifications
    const fullParcel = await db.baggage.findUnique({
      where: { id: parcelId },
    });

    await db.baggage.update({
      where: { id: parcelId },
      data: {
        status: 'delivered',
        deliveredAt,
        deliveredBy: auth.user.id,
        pinVerified: true,
        lastLocation: fullParcel?.pickupAddress || fullParcel?.destination || null,
      },
    });

    // ─── WhatsApp Notification Messages ───
    const maskPhone = (phone: string): string => {
      const clean = cleanPhone(phone);
      if (clean.length <= 6) return '***';
      return clean.slice(0, 4) + '***' + clean.slice(-2);
    };

    const trackingUrl = `https://smartickets.com/suivi/${parcel.reference}`;
    const deliveredDate = deliveredAt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const deliveredTime = deliveredAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const pickupLocation = fullParcel?.pickupAddress || fullParcel?.destination || 'Non renseigné';

    // Sender: Colis Livré ✅
    const senderMessage = `🟢 *SmarticketS — Colis Livré ✅*

Bonjour *${fullParcel?.travelerFirstName || 'Expéditeur'}*,

Bonne nouvelle ! Votre colis a bien été livré avec succès.

📦 Référence : *${parcel.reference}*
📍 Lieu de livraison : ${pickupLocation}
✅ Livré le : ${deliveredDate} à ${deliveredTime}
👤 Destinataire : ${parcel.receiverName || '—'}
🚛 Livré par : ${fullParcel?.busCompany || 'Transporteur'}

Merci de votre confiance envers SmarticketS 🙏

🔗 Suivre le colis : ${trackingUrl}`;

    // Receiver: Livraison Confirmée
    const receiverMessage = `🔵 *SmarticketS — Livraison Confirmée ✅*

Bonjour *${parcel.receiverName || 'Destinataire'}*,

Votre colis a été livré avec succès.

📦 Référence : *${parcel.reference}*
📍 Point de retrait : ${pickupLocation}
✅ Livré le : ${deliveredDate} à ${deliveredTime}

Merci d'utiliser SmarticketS 🙏

🔗 Suivre le colis : ${trackingUrl}`;

    const wa_sender = fullParcel?.whatsappOwner
      ? generateWaMeLink(cleanPhone(fullParcel.whatsappOwner), senderMessage)
      : null;
    const wa_receiver = parcel.receiverWhatsapp
      ? generateWaMeLink(cleanPhone(parcel.receiverWhatsapp), receiverMessage)
      : null;

    // ─── Log ColisEvents (system + sender + receiver) ───
    await db.colisEvent.createMany({
      data: [
        {
          baggageId: parcelId,
          eventType: 'delivery',
          recipientType: 'system',
          messageTitle: '📦 Colis livré par chauffeur',
          messageContent: `Le chauffeur (${auth.user.id}) a confirmé la livraison du colis ${parcel.reference} à ${pickupLocation}. Code PIN vérifié avec succès.`,
          metadata: JSON.stringify({ deliveredBy: auth.user.id, deliveredAt: deliveredAt.toISOString(), pinVerified: true, deliveryLocation: pickupLocation }),
        },
        ...(fullParcel?.whatsappOwner ? [{
          baggageId: parcelId,
          eventType: 'delivery',
          recipientType: 'sender' as const,
          recipientName: fullParcel.travelerFirstName || 'Expéditeur',
          recipientPhone: maskPhone(fullParcel.whatsappOwner),
          messageTitle: '🟢 Colis Livré — Expéditeur',
          messageContent: senderMessage,
          waLink: wa_sender,
          metadata: JSON.stringify({ deliveredAt: deliveredAt.toISOString(), deliveryLocation: pickupLocation }),
        }] : []),
        ...(parcel.receiverWhatsapp ? [{
          baggageId: parcelId,
          eventType: 'delivery',
          recipientType: 'receiver' as const,
          recipientName: parcel.receiverName || 'Destinataire',
          recipientPhone: maskPhone(parcel.receiverWhatsapp),
          messageTitle: '🔵 Livraison Confirmée — Destinataire',
          messageContent: receiverMessage,
          waLink: wa_receiver,
          metadata: JSON.stringify({ deliveredAt: deliveredAt.toISOString(), deliveryLocation: pickupLocation }),
        }] : []),
      ],
    });

    return NextResponse.json({
      success: true,
      deliveredAt: deliveredAt.toISOString(),
      reference: parcel.reference,
      deliveryLocation: pickupLocation,
      wa_sender,
      wa_receiver,
      sender: fullParcel?.whatsappOwner ? {
        name: fullParcel.travelerFirstName || '',
        phone: fullParcel.whatsappOwner,
      } : null,
      receiver: parcel.receiverWhatsapp ? {
        name: parcel.receiverName || '',
        phone: parcel.receiverWhatsapp,
      } : null,
    });
  } catch (error) {
    console.error('Driver deliver error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 },
    );
  }
}
