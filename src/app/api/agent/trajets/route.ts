import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

/**
 * GET /api/agent/trajets
 *
 * Renvoie les départs assignés à l'agent (aujourd'hui + à venir).
 * Filtre par agencyId de l'utilisateur connecté.
 *
 * Query params:
 *   - dateFilter: "today" | "upcoming" | "all" (default: "today")
 *   - status: filtre par statut spécifique (SCHEDULED, BOARDING, etc.)
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Only agents, admins and superadmins can access
    if (!['agent', 'admin', 'superadmin'].includes(session.role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const dateFilter = searchParams.get('dateFilter') || 'today';
    const statusFilter = searchParams.get('status');

    // Date range
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    const tomorrow = new Date(todayStart);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let dateWhere: Record<string, unknown> = {};
    if (dateFilter === 'today') {
      dateWhere = { scheduledTime: { gte: todayStart, lt: tomorrow } };
    } else if (dateFilter === 'upcoming') {
      dateWhere = { scheduledTime: { gte: todayStart } };
    }
    // 'all' → no date filter

    // Agency filter — superadmin sees all, others see only their agency.
    // If agencyId is null (shouldn't happen for non-superadmin, but be safe),
    // fall back to a non-match (empty string) instead of null (Prisma rejects null).
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
        route: {
          select: { id: true, name: true, origin: true, destination: true, price: true },
        },
        originStation: { select: { id: true, name: true, slug: true } },
        destinationStation: { select: { id: true, name: true, slug: true } },
        _count: {
          select: {
            tickets: {
              where: { ticketStatus: { in: ['ACTIVE', 'BOARDED'] } },
            },
          },
        },
      },
      orderBy: { scheduledTime: 'asc' },
      take: 100,
    });

    // Format response
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
      route: d.route
        ? {
            name: d.route.name,
            origin: d.route.origin,
            destination: d.route.destination,
            price: d.route.price,
          }
        : null,
      originStation: d.originStation
        ? { name: d.originStation.name, slug: d.originStation.slug }
        : null,
      destinationStation: d.destinationStation
        ? { name: d.destinationStation.name, slug: d.destinationStation.slug }
        : null,
      ticketsBoarded: d._count.tickets,
      ticketsTotal: d._count.tickets,
    }));

    return NextResponse.json({ data: formatted });
  } catch (error) {
    console.error('[API /api/agent/trajets]', error);
    return NextResponse.json(
      { error: 'Erreur serveur', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
