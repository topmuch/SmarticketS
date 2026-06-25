import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';
import { randomBytes } from 'crypto';

/**
 * POST /api/busgo/guichet/sell
 *
 * Vend un billet pour un départ donné.
 * Crée un Baggage + PassengerTicket avec controlCode unique.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    if (!['agent', 'admin', 'superadmin'].includes(session.role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const body = await request.json();
    const { departureId, passengerName, passengerPhone, seatNumber, destination } = body as {
      departureId: string;
      passengerName: string;
      passengerPhone: string;
      seatNumber: string;
      destination: string;
    };

    if (!departureId || !passengerName || !passengerPhone || !seatNumber) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 });
    }

    // Vérifier le départ
    const departure = await db.departure.findUnique({
      where: { id: departureId },
    });

    if (!departure) {
      return NextResponse.json({ error: 'Départ introuvable' }, { status: 404 });
    }

    // Vérifier l'accès agency
    if (session.role !== 'superadmin' && departure.agencyId !== session.agencyId) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    // Vérifier siège disponible
    const existingTicket = await db.passengerTicket.findFirst({
      where: {
        departureId,
        seatNumber,
        ticketStatus: { in: ['ACTIVE', 'BOARDED'] },
      },
    });

    if (existingTicket) {
      return NextResponse.json(
        { error: `Siège ${seatNumber} déjà pris` },
        { status: 409 }
      );
    }

    // Générer controlCode unique
    const controlCode = `BG-${randomBytes(4).toString('hex').toUpperCase()}`;

    // Créer le baggage (requis par le schéma PassengerTicket)
    const baggage = await db.baggage.create({
      data: {
        reference: `BG${Date.now().toString(36).toUpperCase()}`,
        type: 'voyageur',
        category: 'ticket',
        status: 'ACTIVE',
        agencyId: departure.agencyId,
      },
    });

    // Créer le ticket
    const ticket = await db.passengerTicket.create({
      data: {
        baggageId: baggage.id,
        agencyId: departure.agencyId,
        departureId,
        passengerName,
        passengerPhone,
        passengerAge: 0,
        documentType: 'NONE',
        documentNumber: 'N/A',
        destination: destination || departure.destination,
        seatNumber,
        platform: departure.platform,
        departureTime: departure.scheduledTime,
        controlCode,
        ticketStatus: 'ACTIVE',
        activatedAt: new Date(),
      },
    });

    // Décrémenter availableSeats
    await db.departure.update({
      where: { id: departureId },
      data: { availableSeats: { decrement: 1 } },
    });

    return NextResponse.json({
      success: true,
      ticket: {
        id: ticket.id,
        controlCode: ticket.controlCode,
        seatNumber: ticket.seatNumber,
        passengerName: ticket.passengerName,
        destination: ticket.destination,
      },
    });
  } catch (error) {
    console.error('[API /api/busgo/guichet/sell]', error);
    return NextResponse.json(
      { error: 'Erreur serveur', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
