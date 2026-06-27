import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';
import { randomBytes } from 'crypto';
import { rateLimit } from '@/lib/rate-limit';

/**
 * POST /api/busgo/guichet/sell
 *
 * Le guichetier saisit un ticket papier pré-imprimé + infos passager.
 * Le système génère un QR code contenant TOUTES les infos.
 *
 * Le QR code contient un JSON encodé en base64:
 * {
 *   t: ticketId,       // ID pour lookup
 *   n: passengerName,
 *   p: passengerPhone,
 *   s: seatNumber,
 *   d: destination,
 *   h: scheduledTime,
 *   c: controlCode,    // code de contrôle unique
 *   dep: departureId,
 *   ag: agentPhone     // si déjà assigné
 * }
 *
 * Le passager scanne ce QR → la PWA s'ouvre avec toutes les infos pré-remplies.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // FIX (audit #9): rate limit — 30 ticket sales / minute per user
    const { allowed } = rateLimit(`sell-ticket:${session.userId}`, { maxRequests: 30, windowMs: 60 * 1000 });
    if (!allowed) {
      return NextResponse.json({ error: 'Trop de ventes. Attendez 1 minute.' }, { status: 429 });
    }

    // Superadmin without agency → use first agency
    let agencyId = session.agencyId;
    if (!agencyId) {
      if (session.role !== 'superadmin') {
        return NextResponse.json({ error: 'Aucune agence associée' }, { status: 403 });
      }
      const firstAgency = await db.agency.findFirst();
      if (!firstAgency) {
        return NextResponse.json({ error: 'Aucune agence trouvée' }, { status: 400 });
      }
      agencyId = firstAgency.id;
    }

    const body = await request.json();
    const {
      departureId,
      paperTicketNumber,  // ex: "12365" — référence du billet papier
      passengerName,
      passengerPhone,
      seatNumber,
    } = body;

    if (!departureId || !paperTicketNumber || !passengerName || !passengerPhone || !seatNumber) {
      return NextResponse.json(
        { error: 'Tous les champs sont requis: departureId, paperTicketNumber, passengerName, passengerPhone, seatNumber' },
        { status: 400 }
      );
    }

    // Vérifier le départ
    const departure = await db.departure.findUnique({
      where: { id: departureId },
    });

    if (!departure) {
      return NextResponse.json({ error: 'Départ introuvable' }, { status: 404 });
    }

    if (departure.agencyId !== agencyId && session.role !== 'superadmin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    // FIX (audit W2): vérifier le statut du départ — ne pas vendre sur DEPARTED/CANCELLED
    if (['DEPARTED', 'CANCELLED'].includes(departure.status)) {
      return NextResponse.json(
        { error: `Impossible de vendre un billet pour un départ ${departure.status}` },
        { status: 409 }
      );
    }

    if (departure.availableSeats <= 0) {
      return NextResponse.json({ error: 'Plus aucune place disponible' }, { status: 409 });
    }

    // Vérifier siège disponible
    const existingSeat = await db.passengerTicket.findFirst({
      where: {
        departureId,
        seatNumber,
        ticketStatus: { in: ['ACTIVE', 'BOARDED'] },
      },
    });

    if (existingSeat) {
      return NextResponse.json(
        { error: `Siège ${seatNumber} déjà pris` },
        { status: 409 }
      );
    }

    // Vérifier numéro de ticket papier unique
    const existingPaper = await db.passengerTicket.findFirst({
      where: { paperTicketNumber },
    });

    if (existingPaper) {
      return NextResponse.json(
        { error: `Le ticket papier n°${paperTicketNumber} est déjà enregistré` },
        { status: 409 }
      );
    }

    // Générer controlCode unique
    const controlCode = `BG-${randomBytes(4).toString('hex').toUpperCase()}`;

    // FIX (audit #4): wrap baggage + ticket + decrement in a single transaction
    // Previously 3 separate writes — if ticket creation failed, baggage was orphaned;
    // if decrement failed, ticket existed but seats weren't updated.
    const { baggage, ticket } = await db.$transaction(async (tx) => {
      // 1. Créer le baggage (requis par le schéma)
      const baggage = await tx.baggage.create({
        data: {
          reference: `BG${Date.now().toString(36).toUpperCase()}`,
          type: 'voyageur',
          category: 'ticket',
          status: 'ACTIVE',
          agencyId: agencyId,
        },
      });

      // 2. Créer le ticket
      const ticket = await tx.passengerTicket.create({
        data: {
          baggageId: baggage.id,
          agencyId: agencyId,
          departureId,
          passengerName,
          passengerPhone,
          passengerAge: 0,
          documentType: 'NONE',
          documentNumber: 'N/A',
          destination: departure.destination,
          seatNumber,
          platform: departure.platform,
          departureTime: departure.scheduledTime,
          controlCode,
          ticketStatus: 'ACTIVE',
          paperTicketNumber,
          activatedAt: new Date(),
        },
      });

      // 3. Décrémenter availableSeats
      await tx.departure.update({
        where: { id: departureId },
        data: { availableSeats: { decrement: 1 } },
      });

      return { baggage, ticket };
    });

    // FIX (audit #9): audit log for ticket sale
    try {
      await db.auditLog.create({
        data: {
          action: 'SELL_TICKET',
          entity: 'PassengerTicket',
          entityId: ticket.id,
          userId: session.userId || undefined,
          details: `Sold ticket ${paperTicketNumber} to ${passengerName} (seat ${seatNumber}, departure ${departureId})`,
        },
      });
    } catch {
      // Audit log failure is non-fatal
    }

    // Construire le payload du QR code (toutes les infos)
    const qrPayload = {
      t: ticket.id,
      n: passengerName,
      p: passengerPhone,
      s: seatNumber,
      d: departure.destination,
      h: departure.scheduledTime.toISOString(),
      c: controlCode,
      dep: departureId,
      ag: departure.agentPhone || null,
    };

    // Encoder en base64 pour le QR code
    const qrData = Buffer.from(JSON.stringify(qrPayload)).toString('base64');

    return NextResponse.json({
      success: true,
      ticket: {
        id: ticket.id,
        paperTicketNumber,
        controlCode: ticket.controlCode,
        seatNumber,
        passengerName,
        destination: departure.destination,
        scheduledTime: departure.scheduledTime.toISOString(),
      },
      qrData, // Données à encoder dans le QR code (base64 JSON)
      installUrl: `/pwa-passager/install?data=${qrData}`,
    }, { status: 201 });
  } catch (error) {
    console.error('[API /api/busgo/guichet/sell]', error);
    return NextResponse.json(
      { error: 'Erreur serveur', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
