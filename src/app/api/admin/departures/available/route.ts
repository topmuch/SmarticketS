import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

// GET /api/admin/departures/available?agencyId=xxx
// Returns today's available departures (availableSeats > 0, status SCHEDULED or BOARDING)
export async function GET(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    if (!['superadmin', 'admin', 'agency'].includes(user.role)) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const agencyIdParam = searchParams.get('agencyId');

    // Resolve agencyId
    let effectiveAgencyId: string;
    if (user.role === 'superadmin' || user.role === 'admin') {
      if (!agencyIdParam) {
        return NextResponse.json(
          { error: 'agencyId est requis' },
          { status: 400 }
        );
      }
      effectiveAgencyId = agencyIdParam;
    } else {
      // Agency user – always use their own agency
      if (!user.agencyId) {
        return NextResponse.json(
          { error: 'Aucune agence associée à votre compte' },
          { status: 403 }
        );
      }
      effectiveAgencyId = user.agencyId;
    }

    // Today's date range
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const departures = await db.departure.findMany({
      where: {
        agencyId: effectiveAgencyId,
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

    // Return only the specified fields
    const result = departures.map((dep) => ({
      id: dep.id,
      lineNumber: dep.lineNumber,
      destination: dep.destination,
      scheduledTime: dep.scheduledTime.toISOString(),
      platform: dep.platform,
      availableSeats: dep.availableSeats,
      departureType: dep.departureType,
      route: dep.route
        ? { id: dep.route.id, name: dep.route.name }
        : null,
    }));

    return NextResponse.json({ departures: result });
  } catch (error) {
    console.error('[/api/admin/departures/available] GET error:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
