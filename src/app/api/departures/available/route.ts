import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// PUBLIC endpoint — no auth required
// GET /api/departures/available?agencyId=xxx
// Returns today's available departures (availableSeats > 0, status SCHEDULED or BOARDING)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agencyId = searchParams.get('agencyId');

    if (!agencyId) {
      return NextResponse.json(
        { error: 'agencyId est requis' },
        { status: 400 }
      );
    }

    // Today's date range
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const departures = await db.departure.findMany({
      where: {
        agencyId,
        scheduledTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
        availableSeats: { gt: 0 },
        status: { in: ['SCHEDULED', 'BOARDING'] },
      },
      include: {
        route: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { scheduledTime: 'asc' },
    });

    const result = departures.map((dep) => ({
      id: dep.id,
      lineNumber: dep.lineNumber,
      destination: dep.destination,
      scheduledTime: dep.scheduledTime.toISOString(),
      platform: dep.platform,
      availableSeats: dep.availableSeats,
      departureType: dep.departureType,
      routeName: dep.route?.name || null,
    }));

    return NextResponse.json({ departures: result });
  } catch (error) {
    console.error('[/api/departures/available] GET error:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
