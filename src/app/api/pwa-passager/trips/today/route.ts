import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/pwa-passager/trips/today?search=xxx&stationSlug=xxx
 *
 * Returns today's departures for the passenger Live Board.
 * Public endpoint (no auth) — passengers browse departures before buying.
 *
 * Returns trips sorted by scheduledTime, with real-time status.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const stationSlug = searchParams.get('stationSlug');

    // Build where clause for today's departures
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const where: Record<string, unknown> = {
      scheduledTime: {
        gte: startOfDay,
        lt: endOfDay,
      },
      status: {
        notIn: ['CANCELLED'], // hide cancelled by default
      },
    };

    if (search) {
      where.OR = [
        { destination: { contains: search } },
        { lineNumber: { contains: search } },
        { originStation: { name: { contains: search } } },
      ];
    }

    if (stationSlug) {
      where.originStation = { slug: stationSlug };
    }

    const departures = await db.departure.findMany({
      where,
      include: {
        route: { select: { origin: true, destination: true } },
        originStation: { select: { name: true, slug: true, city: true } },
        agency: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { scheduledTime: 'asc' },
      take: 100,
    });

    const trips = departures.map((dep) => ({
      id: dep.id,
      lineNumber: dep.lineNumber,
      origin: dep.route?.origin || dep.originStation?.name || '—',
      destination: dep.destination,
      scheduledTime: dep.scheduledTime.toISOString(),
      platform: dep.platform,
      status: dep.status,
      delayMinutes: dep.delayMinutes,
      availableSeats: dep.availableSeats,
      totalSeats: dep.totalSeats,
      agentName: dep.agentName,
      agentPhone: dep.agentPhone,
      boardingStartedAt: dep.boardingStartedAt?.toISOString() || null,
      departedAt: dep.departedAt?.toISOString() || null,
    }));

    return NextResponse.json({ trips });
  } catch (error) {
    console.error('[API /api/pwa-passager/trips/today]', error);
    return NextResponse.json({ error: 'Erreur serveur', trips: [] }, { status: 500 });
  }
}
