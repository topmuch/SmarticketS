import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// PUBLIC endpoint — no auth required
// GET /api/schedules?origin=Dakar&destination=Mbour&date=2026-01-15&agencyId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const origin = searchParams.get('origin')?.trim();
    const destination = searchParams.get('destination')?.trim();
    const dateStr = searchParams.get('date')?.trim();
    const agencyId = searchParams.get('agencyId')?.trim();

    // Parse date — default to today
    let targetDate: Date;
    if (dateStr) {
      targetDate = new Date(dateStr + 'T00:00:00');
      if (isNaN(targetDate.getTime())) {
        return NextResponse.json(
          { error: 'Format de date invalide (YYYY-MM-DD)' },
          { status: 400 }
        );
      }
    } else {
      targetDate = new Date();
    }

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Build where clause for routes
    const routeWhere: Record<string, unknown> = {};
    if (origin) routeWhere.origin = { contains: origin };
    if (destination) routeWhere.destination = { contains: destination };
    if (agencyId) routeWhere.agencyId = agencyId;

    // Fetch matching routes with their departures
    const routes = await db.route.findMany({
      where: routeWhere,
      include: {
        agency: {
          select: { id: true, name: true, slug: true },
        },
        departures: {
          where: {
            scheduledTime: {
              gte: startOfDay,
              lte: endOfDay,
            },
            status: { not: 'CANCELLED' },
          },
          orderBy: { scheduledTime: 'asc' },
        },
      },
      orderBy: { origin: 'asc' },
    });

    // Also fetch departures NOT linked to a route (legacy/manual)
    const departureWhere: Record<string, unknown> = {
      routeId: null,
      scheduledTime: {
        gte: startOfDay,
        lte: endOfDay,
      },
      status: { not: 'CANCELLED' },
    };
    if (origin || destination) {
      if (destination) departureWhere.destination = { contains: destination };
    }
    if (agencyId) departureWhere.agencyId = agencyId;

    const standaloneDepartures = await db.departure.findMany({
      where: departureWhere,
      include: {
        agency: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: { scheduledTime: 'asc' },
    });

    const now = new Date();

    // Process routes into schedule response
    const processedRoutes = routes.map((route) => {
      const processedDeps = route.departures.map((dep) => {
        const scheduled = new Date(dep.scheduledTime);
        const effectiveTime = new Date(scheduled.getTime() + dep.delayMinutes * 60000);
        const effectiveDiff = Math.floor((effectiveTime.getTime() - now.getTime()) / 60000);

        let status = dep.status;
        // Auto-recalculate
        if (status === 'SCHEDULED' && targetDate.toDateString() === now.toDateString()) {
          if (effectiveDiff < -15) status = 'DEPARTED';
          else if (effectiveDiff >= 0 && effectiveDiff <= 10) status = 'BOARDING';
        }

        const occupancy = dep.totalSeats > 0
          ? Math.round(((dep.totalSeats - dep.availableSeats) / dep.totalSeats) * 100)
          : 0;

        return {
          id: dep.id,
          lineNumber: dep.lineNumber,
          destination: dep.destination,
          departureType: dep.departureType,
          scheduledTime: scheduled.toISOString(),
          effectiveTime: effectiveTime.toISOString(),
          platform: dep.platform || '-',
          status,
          delayMinutes: dep.delayMinutes,
          availableSeats: dep.availableSeats,
          totalSeats: dep.totalSeats,
          occupancy,
          countdownMin: status === 'DEPARTED' ? Math.abs(effectiveDiff) : Math.max(0, effectiveDiff),
          isToday: targetDate.toDateString() === now.toDateString(),
        };
      });

      return {
        id: route.id,
        name: route.name,
        origin: route.origin,
        destination: route.destination,
        isRoundTrip: route.isRoundTrip,
        durationMinutes: route.durationMinutes,
        distanceKm: route.distanceKm,
        price: route.price,
        agency: route.agency,
        departures: processedDeps,
      };
    });

    // Process standalone departures
    const processedStandalone = standaloneDepartures.map((dep) => {
      const scheduled = new Date(dep.scheduledTime);
      const effectiveTime = new Date(scheduled.getTime() + dep.delayMinutes * 60000);
      const effectiveDiff = Math.floor((effectiveTime.getTime() - now.getTime()) / 60000);

      let status = dep.status;
      if (status === 'SCHEDULED' && targetDate.toDateString() === now.toDateString()) {
        if (effectiveDiff < -15) status = 'DEPARTED';
        else if (effectiveDiff >= 0 && effectiveDiff <= 10) status = 'BOARDING';
      }

      const occupancy = dep.totalSeats > 0
        ? Math.round(((dep.totalSeats - dep.availableSeats) / dep.totalSeats) * 100)
        : 0;

      return {
        id: dep.id,
        routeId: null,
        routeName: null,
        origin: null,
        destination: dep.destination,
        departureType: dep.departureType,
        lineNumber: dep.lineNumber,
        scheduledTime: scheduled.toISOString(),
        effectiveTime: effectiveTime.toISOString(),
        platform: dep.platform || '-',
        status,
        delayMinutes: dep.delayMinutes,
        availableSeats: dep.availableSeats,
        totalSeats: dep.totalSeats,
        occupancy,
        countdownMin: status === 'DEPARTED' ? Math.abs(effectiveDiff) : Math.max(0, effectiveDiff),
        isToday: targetDate.toDateString() === now.toDateString(),
        agency: dep.agency,
      };
    });

    // Get available origins and destinations for filters
    const allOrigins = await db.route.findMany({
      select: { origin: true },
      distinct: ['origin'],
      orderBy: { origin: 'asc' },
    });

    const allDestinations = await db.route.findMany({
      select: { destination: true },
      distinct: ['destination'],
      orderBy: { destination: 'asc' },
    });

    // Get all agencies with departures
    const activeAgencies = await db.agency.findMany({
      where: {
        departures: {
          some: {
            scheduledTime: { gte: startOfDay },
          },
        },
      },
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      routes: processedRoutes,
      standaloneDepartures: processedStandalone,
      filters: {
        origins: allOrigins.map((r) => r.origin),
        destinations: allDestinations.map((r) => r.destination),
        agencies: activeAgencies,
      },
      searchDate: targetDate.toISOString().split('T')[0],
      totalResults: processedRoutes.length + processedStandalone.length,
    });
  } catch (error) {
    console.error('[/api/schedules] GET error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
