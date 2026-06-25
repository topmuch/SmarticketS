import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

/**
 * GET /api/agent/trajets/[departureId]
 *
 * Renvoie les détails d'un départ + la liste des passagers (PassengerTicket).
 * Inclus : statut boarded/absent, siège, nom, téléphone, contrôle code.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ departureId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (!['agent', 'admin', 'superadmin'].includes(session.role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { departureId } = await params;

    const departure = await db.departure.findUnique({
      where: { id: departureId },
      include: {
        route: {
          select: { id: true, name: true, origin: true, destination: true, price: true },
        },
        originStation: { select: { id: true, name: true, slug: true } },
        destinationStation: { select: { id: true, name: true, slug: true } },
        tickets: {
          select: {
            id: true,
            passengerName: true,
            passengerPhone: true,
            passengerAge: true,
            seatNumber: true,
            platform: true,
            ticketStatus: true,
            validatedAt: true,
            validatedBy: true,
            controlCode: true,
            luggageCount: true,
            luggageWeightKg: true,
            destination: true,
            hasParentalAuth: true,
          },
          orderBy: { seatNumber: 'asc' },
        },
      },
    });

    if (!departure) {
      return NextResponse.json({ error: 'Départ introuvable' }, { status: 404 });
    }

    // Agency access control (sauf superadmin)
    if (session.role !== 'superadmin' && departure.agencyId !== session.agencyId) {
      return NextResponse.json({ error: 'Accès refusé à ce départ' }, { status: 403 });
    }

    // Format tickets for the UI
    const tickets = departure.tickets.map((t) => ({
      id: t.id,
      passengerName: t.passengerName,
      passengerPhone: t.passengerPhone,
      passengerAge: t.passengerAge,
      seatNumber: t.seatNumber,
      platform: t.platform,
      destination: t.destination,
      controlCode: t.controlCode,
      status: t.ticketStatus, // ACTIVE, BOARDED, ABSENT, CANCELLED
      validatedAt: t.validatedAt?.toISOString() ?? null,
      luggageCount: t.luggageCount,
      luggageWeightKg: t.luggageWeightKg,
      hasParentalAuth: t.hasParentalAuth,
    }));

    return NextResponse.json({
      data: {
        id: departure.id,
        lineNumber: departure.lineNumber,
        destination: departure.destination,
        scheduledTime: departure.scheduledTime.toISOString(),
        platform: departure.platform,
        status: departure.status,
        availableSeats: departure.availableSeats,
        totalSeats: departure.totalSeats,
        delayMinutes: departure.delayMinutes,
        route: departure.route
          ? {
              name: departure.route.name,
              origin: departure.route.origin,
              destination: departure.route.destination,
              price: departure.route.price,
            }
          : null,
        originStation: departure.originStation
          ? { name: departure.originStation.name, slug: departure.originStation.slug }
          : null,
        destinationStation: departure.destinationStation
          ? { name: departure.destinationStation.name, slug: departure.destinationStation.slug }
          : null,
        tickets,
        stats: {
          total: tickets.length,
          boarded: tickets.filter((t) => t.status === 'BOARDED').length,
          active: tickets.filter((t) => t.status === 'ACTIVE').length,
          absent: tickets.filter((t) => t.status === 'ABSENT').length,
          cancelled: tickets.filter((t) => t.status === 'CANCELLED').length,
        },
      },
    });
  } catch (error) {
    console.error('[API /api/agent/trajets/[departureId]]', error);
    return NextResponse.json(
      { error: 'Erreur serveur', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/agent/trajets/[departureId]
 *
 * Met à jour le statut d'un départ (start-boarding, depart, etc.)
 * ou le retard.
 *
 * Body:
 *   - action: "start-boarding" | "depart" | "delay"
 *   - delayMinutes?: number (si action=delay)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ departureId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (!['agent', 'admin', 'superadmin'].includes(session.role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { departureId } = await params;
    const body = await request.json();
    const { action, delayMinutes } = body as {
      action: 'start-boarding' | 'depart' | 'delay';
      delayMinutes?: number;
    };

    const departure = await db.departure.findUnique({
      where: { id: departureId },
    });

    if (!departure) {
      return NextResponse.json({ error: 'Départ introuvable' }, { status: 404 });
    }

    if (session.role !== 'superadmin' && departure.agencyId !== session.agencyId) {
      return NextResponse.json({ error: 'Accès refusé à ce départ' }, { status: 403 });
    }

    let newStatus = departure.status;
    let newDelayMinutes = departure.delayMinutes;

    switch (action) {
      case 'start-boarding':
        newStatus = 'BOARDING';
        break;
      case 'depart':
        newStatus = 'DEPARTED';
        break;
      case 'delay':
        newStatus = 'DELAYED';
        newDelayMinutes = delayMinutes ?? departure.delayMinutes;
        break;
      default:
        return NextResponse.json({ error: 'Action invalide' }, { status: 400 });
    }

    const updated = await db.departure.update({
      where: { id: departureId },
      data: { status: newStatus, delayMinutes: newDelayMinutes },
    });

    return NextResponse.json({
      data: {
        id: updated.id,
        status: updated.status,
        delayMinutes: updated.delayMinutes,
      },
    });
  } catch (error) {
    console.error('[API /api/agent/trajets/[departureId] PATCH]', error);
    return NextResponse.json(
      { error: 'Erreur serveur', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
