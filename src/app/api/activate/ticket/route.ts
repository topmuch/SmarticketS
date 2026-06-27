import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateControlCode } from '@/lib/qr';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limit';

/**
 * POST /api/activate/ticket
 *
 * FIX (audit #1): previously fully unauthenticated — anyone with a baggageId
 * could create a ticket. Now applies IP-based rate limiting (5 attempts / 15 min)
 * to prevent brute-force on baggageIds (CUIDs are guessable-enough to be a risk).
 *
 * The endpoint remains public (passengers activate pre-printed QR stock without
 * a session), but the rate limiter + the `pending_activation` status check
 * (a baggage can only be activated once) make brute-force impractical.
 */

// Zod schema pour validation
const activateTicketSchema = z.object({
  baggageId: z.string().min(1, 'ID du QR requis'),
  agencyId: z.string().min(1, 'ID agence requis'),
  passengerName: z.string().min(2, 'Nom du passager requis'),
  passengerPhone: z.string().min(8, 'Numéro de téléphone invalide'),
  passengerAge: z.coerce.number().int().min(0).max(120),
  documentType: z.enum(['CNI', 'PASSPORT', 'BIRTH_CERTIFICATE']),
  documentNumber: z.string().min(2, 'Numéro de pièce requis'),
  hasParentalAuth: z.boolean().optional().default(false),
  destination: z.string().min(2, 'Destination requise'),
  seatNumber: z.string().min(1, 'Numéro de siège requis'),
  luggageCount: z.coerce.number().int().min(1).default(1),
  luggageWeightKg: z.coerce.number().min(0).default(0),
  luggageFee: z.coerce.number().int().min(0).default(0),
  departureTime: z.string().optional(),
  departureStation: z.string().optional(),
  busCompany: z.string().optional(),
  departureDate: z.string().optional(),
  departureId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    // FIX (audit #1): Rate limit by IP (5 activations / 15 min)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const { allowed } = rateLimit(`activate-ticket:${ip}`, { maxRequests: 5, windowMs: 15 * 60 * 1000 });
    if (!allowed) {
      return NextResponse.json(
        { error: 'Trop de tentatives. Réessayez dans 15 minutes.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = activateTicketSchema.safeParse(body);

    if (!parsed.success) {
      console.error('[/api/activate/ticket] Validation error:', parsed.error.issues);
      return NextResponse.json(
        { error: 'validation', message: parsed.error.issues[0].message, details: parsed.error.issues },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const { baggageId, agencyId, passengerName, passengerPhone, passengerAge,
      documentType, documentNumber, hasParentalAuth, destination, seatNumber,
      luggageCount, luggageWeightKg, luggageFee, departureTime, departureStation,
      busCompany, departureDate, departureId } = data;

    // 1. Vérifier le Baggage existe + appartient à l'agence (multi-tenant)
    const baggage = await db.baggage.findUnique({
      where: { id: baggageId },
      select: { id: true, agencyId: true, status: true, category: true, reference: true }
    });

    if (!baggage || baggage.agencyId !== agencyId) {
      return NextResponse.json({ error: 'QR invalide ou non autorisé' }, { status: 403 });
    }

    if (baggage.status !== 'pending_activation') {
      return NextResponse.json(
        { error: `QR déjà activé (statut: ${baggage.status})` },
        { status: 409 }
      );
    }

    // 2. Règles métier passager
    if (passengerAge < 5 && documentType !== 'BIRTH_CERTIFICATE') {
      return NextResponse.json(
        { error: 'Extrait de naissance obligatoire pour enfant de moins de 5 ans' },
        { status: 400 }
      );
    }

    if (passengerAge < 18 && !hasParentalAuth) {
      return NextResponse.json(
        { error: 'Autorisation parentale requise pour mineur non accompagné' },
        { status: 400 }
      );
    }

    // 3. Normaliser téléphone Sénégal
    let normalizedPhone = passengerPhone.replace(/\D/g, '');
    if (normalizedPhone.startsWith('0')) normalizedPhone = normalizedPhone.slice(1);
    if (!normalizedPhone.startsWith('221')) normalizedPhone = `221${normalizedPhone}`;

    // 4. Vérifier et réserver le départ si departureId fourni
    let departure = null;
    if (departureId) {
      departure = await db.departure.findUnique({
        where: { id: departureId },
        select: { id: true, agencyId: true, scheduledTime: true, platform: true, destination: true, availableSeats: true, lineNumber: true },
      });
      if (!departure || departure.agencyId !== agencyId) {
        return NextResponse.json({ error: 'Départ invalide ou non autorisé' }, { status: 403 });
      }
      if (departure.availableSeats <= 0) {
        return NextResponse.json({ error: 'Plus aucune place disponible sur ce départ' }, { status: 409 });
      }
    }

    // 5. Générer code contrôle unique
    const controlCode = await generateControlCode();

    // 6. Préparer departureTime (priorité au départ lié)
    let depTime: Date | null = null;
    let depPlatform: string | null = departure?.platform || null;
    let depDestination: string = destination;
    let depDate: Date | null = null;
    let depStation: string | null = departureStation || null;
    let depBusCompany: string | null = busCompany || null;
    if (departure) {
      depTime = new Date(departure.scheduledTime);
      depDate = new Date(departure.scheduledTime);
      if (!destination || destination === depDestination) depDestination = departure.destination;
    } else if (departureTime) {
      const [hours, minutes] = departureTime.split(':').map(Number);
      depTime = new Date();
      depTime.setHours(hours, minutes, 0, 0);
      if (departureDate) {
        depDate = new Date(departureDate + 'T00:00:00');
        depTime.setFullYear(depDate.getFullYear(), depDate.getMonth(), depDate.getDate());
      }
    }

    // 7. Transaction Prisma atomique : créer PassengerTicket + mettre à jour Baggage + décrémenter sièges
    const ops: any[] = [
      db.passengerTicket.create({
        data: {
          baggageId,
          agencyId,
          passengerName,
          passengerPhone: normalizedPhone,
          passengerAge,
          documentType,
          documentNumber,
          hasParentalAuth,
          destination: depDestination,
          seatNumber,
          luggageCount,
          luggageWeightKg,
          luggageFee,
          departureTime: depTime,
          platform: depPlatform,
          departureId: departureId || null,
          controlCode,
          ticketStatus: 'ACTIVE',
          activatedAt: new Date(),
        },
      }),
      db.baggage.update({
        where: { id: baggageId },
        data: {
          category: 'ticket',
          status: 'in_transit',
          transportMode: 'bus',
          destination: depDestination,
          departureCity: depStation,
          busCompany: depBusCompany,
          departureDate: depDate,
          departureTime: depTime ? depTime.toTimeString().slice(0, 5) : null,
          receiverName: passengerName,
          receiverWhatsapp: normalizedPhone,
        },
      }),
    ];
    if (departure) {
      ops.push(db.departure.update({
        where: { id: departureId! },
        data: { availableSeats: { decrement: 1 } },
      }));
    }
    const [passengerTicket] = await db.$transaction(ops);

    // 7. Log événement ColisEvent (ticket_activated)
    await db.colisEvent.create({
      data: {
        baggageId,
        eventType: 'activation',
        recipientType: 'system',
        messageTitle: '🎫 Ticket Activé — Billetterie Transport',
        messageContent: `Ticket activé pour ${passengerName} — ${destination} — Siège ${seatNumber} — Code contrôle: ${controlCode}`,
        metadata: JSON.stringify({
          controlCode,
          destination,
          seatNumber,
          passengerAge,
          documentType,
          luggageCount,
          luggageWeightKg,
          luggageFee,
        }),
      },
    });

    // 8. Générer lien WhatsApp
    const message = `🚌 *SMARTICKETS — BILLET CONFIRMÉ*

👤 ${passengerName}
🚌 Destination : ${destination}
💺 Siège : ${seatNumber}
🧳 Bagages : ${luggageCount} valise(s) (${luggageWeightKg}kg)

🔢 *CODE DE CONTRÔLE : ${controlCode}*

⚠️ CONDITIONS :
* Arrivez 1h avant le départ
* Pièce d'identité obligatoire
* Billet non remboursable
* Report possible 1x ≥24h avant

Merci de votre confiance ! Bon voyage 🚌`;

    const whatsappLink = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;

    return NextResponse.json({
      success: true,
      reference: baggage.reference,
      controlCode,
      passengerTicketId: passengerTicket.id,
      whatsappLink,
      passengerPhone: normalizedPhone,
    });

  } catch (error: any) {
    console.error('[/api/activate/ticket] POST error:', error);

    if (error.message?.includes('Failed to generate')) {
      return NextResponse.json({ error: 'Erreur serveur: génération code contrôle' }, { status: 500 });
    }

    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}
