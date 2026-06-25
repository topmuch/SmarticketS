import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';
import { z } from 'zod';

/**
 * GET /api/busgo/trajets
 * Renvoie les départs de l'agence (ou tous si superadmin).
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (!['agent', 'admin', 'superadmin'].includes(session.role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const dateFilter = searchParams.get('dateFilter') || 'today';
    const statusFilter = searchParams.get('status');

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const tomorrow = new Date(todayStart);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let dateWhere: Record<string, unknown> = {};
    if (dateFilter === 'today') {
      dateWhere = { scheduledTime: { gte: todayStart, lt: tomorrow } };
    } else if (dateFilter === 'upcoming') {
      dateWhere = { scheduledTime: { gte: todayStart } };
    }

    const agencyFilter =
      session.role === 'superadmin' || !session.agencyId
        ? {}
        : { agencyId: session.agencyId };

    const departures = await db.departure.findMany({
      where: {
        ...agencyFilter,
        ...dateWhere,
        ...(statusFilter ? { status: statusFilter } : {}),
      },
      include: {
        route: { select: { name: true, origin: true, destination: true, price: true } },
        originStation: { select: { name: true, slug: true } },
        destinationStation: { select: { name: true, slug: true } },
        _count: {
          select: {
            tickets: { where: { ticketStatus: { in: ['ACTIVE', 'BOARDED'] } } },
          },
        },
      },
      orderBy: { scheduledTime: 'asc' },
      take: 100,
    });

    const formatted = departures.map((d) => ({
      id: d.id,
      lineNumber: d.lineNumber,
      destination: d.destination,
      scheduledTime: d.scheduledTime.toISOString(),
      platform: d.platform,
      status: d.status,
      availableSeats: d.availableSeats,
      totalSeats: d.totalSeats,
      delayMinutes: d.delayMinutes,
      agentName: d.agentName,
      agentPhone: d.agentPhone,
      boardingStartedAt: d.boardingStartedAt?.toISOString() || null,
      departedAt: d.departedAt?.toISOString() || null,
      route: d.route
        ? { name: d.route.name, origin: d.route.origin, destination: d.route.destination, price: d.route.price }
        : null,
      originStation: d.originStation ? { name: d.originStation.name, slug: d.originStation.slug } : null,
      destinationStation: d.destinationStation ? { name: d.destinationStation.name, slug: d.destinationStation.slug } : null,
      ticketsBoarded: d._count.tickets,
      ticketsTotal: d._count.tickets,
    }));

    // Return as flat array (frontend expects array or {data: array})
    return NextResponse.json({ data: formatted });
  } catch (error) {
    console.error('[API /api/busgo/trajets GET]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

const createTrajetSchema = z.object({
  lineNumber: z.string().min(1, 'Numéro de ligne requis'),
  destination: z.string().min(1, 'Destination requise'),
  scheduledTime: z.string().min(1, 'Heure de départ requise'),
  platform: z.string().optional(),
  totalSeats: z.number().int().min(1).max(200).default(45),
  agentName: z.string().optional(),
  agentPhone: z.string().optional(),
});

/**
 * POST /api/busgo/trajets
 * Crée un nouveau départ (trajet).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (!['admin', 'superadmin'].includes(session.role)) {
      return NextResponse.json({ error: 'Accès refusé — admin uniquement' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createTrajetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.issues },
        { status: 400 }
      );
    }

    // Use the user's agencyId, or if superadmin without agency, use the first agency
    let agencyId = session.agencyId;
    if (!agencyId) {
      const firstAgency = await db.agency.findFirst();
      if (!firstAgency) {
        return NextResponse.json({ error: 'Aucune agence trouvée. Créez une compagnie d\'abord.' }, { status: 400 });
      }
      agencyId = firstAgency.id;
    }

    const scheduledTime = new Date(parsed.data.scheduledTime);

    const departure = await db.departure.create({
      data: {
        lineNumber: parsed.data.lineNumber,
        destination: parsed.data.destination,
        scheduledTime,
        platform: parsed.data.platform || null,
        totalSeats: parsed.data.totalSeats,
        availableSeats: parsed.data.totalSeats,
        status: 'SCHEDULED',
        agencyId,
        agentName: parsed.data.agentName || null,
        agentPhone: parsed.data.agentPhone || null,
      },
    });

    return NextResponse.json({
      data: {
        id: departure.id,
        lineNumber: departure.lineNumber,
        destination: departure.destination,
        scheduledTime: departure.scheduledTime.toISOString(),
        platform: departure.platform,
        totalSeats: departure.totalSeats,
        availableSeats: departure.availableSeats,
        status: departure.status,
        agentName: departure.agentName,
        agentPhone: departure.agentPhone,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('[API /api/busgo/trajets POST]', error);
    return NextResponse.json(
      { error: 'Erreur serveur', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
