import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { cleanPhone, generateWaMeLink } from '@/lib/wame';

// PIN-FEATURE: Zod schema for PIN validation
const validatePinSchema = z.object({
  reference: z
    .string()
    .min(1, 'La référence est obligatoire')
    .regex(/^[A-Z0-9]+-[A-Z0-9]+$/i, 'Format de référence invalide'),
  pin: z
    .string()
    .length(6, 'Le code doit contenir exactement 6 chiffres')
    .regex(/^\d{6}$/, 'Le code doit contenir uniquement des chiffres'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = validatePinSchema.parse(body);

    const reference = data.reference.toUpperCase().trim();

    // 1. Find colis by reference
    const colis = await db.baggage.findUnique({
      where: { reference },
    });

    // 2. Not found → 404
    if (!colis) {
      return NextResponse.json(
        { error: 'not_found', message: 'Ce code QR ne correspond à aucun colis.' },
        { status: 404 }
      );
    }

    // 3. Status must be in_transit
    if (colis.status !== 'in_transit') {
      return NextResponse.json({
        error: 'invalid_status',
        message:
          colis.status === 'delivered'
            ? 'Ce colis a déjà été livré.'
            : colis.status === 'pending_activation'
              ? "Ce colis n'a pas encore été activé."
              : `Ce colis ne peut pas être retiré (statut: ${colis.status}).`,
      });
    }

    // 4. Check if PIN attempts are blocked (>= 3)
    if ((colis.pinAttempts ?? 0) >= 3) {
      return NextResponse.json({
        blocked: true,
        message: 'Code bloqué. Contactez l\'agence.',
      });
    }

    // 5. Compare PIN
    if (data.pin !== colis.retrievalPin) {
      // 6. Incorrect — increment attempts
      const newAttempts = (colis.pinAttempts ?? 0) + 1;

      await db.baggage.update({
        where: { id: colis.id },
        data: { pinAttempts: newAttempts },
      });

      return NextResponse.json({
        error: true,
        attemptsLeft: 3 - newAttempts,
      });
    }

    // 7. Correct PIN — update DB: delivered
    const now = new Date();
    const updated = await db.baggage.update({
      where: { id: colis.id },
      data: {
        pinVerified: true,
        status: 'delivered',
        deliveredAt: now,
        arrivedAt: now,
      },
    });

    // Build delivery wa.me links
    const today = now.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const deliveryTime = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const trackingUrl = `https://qrtrans.com/suivi/${updated.reference}`;

    // Company name for assistance
    const companyName = updated.busCompany || updated.airlineName || updated.trainCompany || '';

    // Driver phone line (conditional — security: never expose if consent = false)
    const driverLine = updated.shareDriverPhone && updated.driverPhone
      ? `📞 Contacter le transporteur : ${updated.driverPhone}`
      : `📞 Assistance : ${companyName}`;

    // ─── 🟢 SENDER MESSAGE (Delivery confirmed) ───
    const senderMessage = `🟢 *QRTrans — Colis Livré ✅*

Bonjour *${updated.travelerFirstName || 'Expéditeur'}*,

Bonne nouvelle ! Votre colis a bien été livré avec succès.

📦 Référence : *${updated.reference}*
📍 Lieu de livraison : ${updated.deliveryLocation || 'Non renseigné'}
✅ Livré le : ${today} à ${deliveryTime}
👤 Destinataire : ${updated.receiverName || '—'}

Merci de votre confiance envers QRTrans 🙏

⭐ Évaluer le service : https://qrtrans.com

🔗 Suivre le colis : ${trackingUrl}`;

    // ─── 🔵 RECEIVER MESSAGE (Package available for pickup / retrieved) ───
    const receiverMessage = `🔵 *QRTrans — Colis Disponible 📦*

Bonjour *${updated.receiverName || 'Destinataire'}*,

Votre colis est arrivé et a été retiré avec succès.

📦 Référence : *${updated.reference}*
📍 Retrait : ${updated.deliveryLocation || 'Non renseigné'}
✅ Retiré le : ${today} à ${deliveryTime}
${driverLine}

Merci d'utiliser QRTrans 🙏

🔗 Suivre le colis : ${trackingUrl}`;

    const wa_sender = generateWaMeLink(
      cleanPhone(updated.whatsappOwner || ''),
      senderMessage
    );
    const wa_receiver = generateWaMeLink(
      cleanPhone(updated.receiverWhatsapp || ''),
      receiverMessage
    );

    // Log delivery events
    const maskPhone = (phone: string) => {
      const clean = cleanPhone(phone);
      if (clean.length <= 4) return '***';
      return clean.slice(0, 4) + '***' + clean.slice(-2);
    };

    await db.colisEvent.createMany({
      data: [
        {
          baggageId: updated.id,
          eventType: 'delivery',
          recipientType: 'sender',
          recipientName: updated.travelerFirstName || 'Expéditeur',
          recipientPhone: maskPhone(updated.whatsappOwner || ''),
          messageTitle: '🟢 Colis Livré — Expéditeur',
          messageContent: senderMessage,
          waLink: wa_sender,
          metadata: JSON.stringify({ delivered_date: today, delivered_time: deliveryTime }),
        },
        {
          baggageId: updated.id,
          eventType: 'delivery',
          recipientType: 'receiver',
          recipientName: updated.receiverName || 'Destinataire',
          recipientPhone: maskPhone(updated.receiverWhatsapp || ''),
          messageTitle: '🔵 Colis Disponible — Destinataire',
          messageContent: receiverMessage,
          waLink: wa_receiver,
          metadata: JSON.stringify({ delivered_date: today, delivered_time: deliveryTime }),
        },
      ],
    });

    return NextResponse.json({
      success: true,
      colis: {
        reference: updated.reference,
        status: updated.status,
      },
      wa_sender,
      wa_receiver,
    });

  } catch (error) {
    console.error('[/api/validate-pin] Error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'validation', message: error.issues[0].message, details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'server_error', message: 'Erreur serveur. Réessayez.' },
      { status: 500 }
    );
  }
}
