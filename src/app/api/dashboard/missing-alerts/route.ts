import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

/**
 * GET /api/dashboard/missing-alerts?agencyId=xxx
 *
 * Scans all today's departures (SCHEDULED/BOARDING) within the 15-minute window
 * and returns those with missing (unsanned) passengers.
 *
 * Used by the dashboard AlertBanner for auto-polling.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const url = new URL(req.url);
    const agencyId = url.searchParams.get('agencyId') || session.agencyId;

    if (!agencyId) {
      return NextResponse.json({ error: 'agencyId requis' }, { status: 400 });
    }

    // Agency isolation
    if (session.role !== 'superadmin' && agencyId !== session.agencyId) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const now = new Date();

    // Window: departures from now to now + 2 hours (covering "15 min before" threshold)
    const windowStart = new Date(now.getTime() - 60 * 60_000); // 1h ago (already boarding)
    const windowEnd = new Date(now.getTime() + 2 * 60 * 60_000); // 2h ahead

    // 1. Find departures in the window
    const departures = await db.departure.findMany({
      where: {
        agencyId,
        scheduledTime: { gte: windowStart, lte: windowEnd },
        status: { in: ['SCHEDULED', 'BOARDING', 'DELAYED'] },
      },
      include: {
        tickets: {
          where: {
            ticketStatus: { in: ['ACTIVE', 'USED'] },
          },
          select: {
            id: true,
            passengerName: true,
            passengerPhone: true,
            seatNumber: true,
            controlCode: true,
            ticketStatus: true,
            validatedAt: true,
          },
        },
      },
      orderBy: { scheduledTime: 'asc' },
    });

    // 2. Process each departure
    const alerts = departures
      .map((dep) => {
        const scheduled = new Date(dep.scheduledTime);
        const delayMs = dep.delayMinutes ? dep.delayMinutes * 60_000 : 0;
        const effective = new Date(scheduled.getTime() + delayMs);
        const diffMin = Math.floor((effective.getTime() - now.getTime()) / 60_000);

        const totalSold = dep.tickets.length;
        const totalScanned = dep.tickets.filter(
          (t) => t.ticketStatus === 'USED' && t.validatedAt
        ).length;
        const missingCount = totalSold - totalScanned;

        // Only trigger alert if within 15 min and has missing passengers
        const isAlert = diffMin <= 15 && diffMin > -60 && missingCount > 0;

        const missing = dep.tickets
          .filter((t) => t.ticketStatus === 'ACTIVE')
          .map((t) => ({
            passengerName: t.passengerName,
            seatNumber: t.seatNumber,
            ticketId: t.id,
            controlCode: t.controlCode,
            passengerPhone: t.passengerPhone,
          }));

        return {
          departureId: dep.id,
          destination: dep.destination,
          lineNumber: dep.lineNumber,
          scheduledTime: scheduled.toISOString(),
          effectiveTime: effective.toISOString(),
          platform: dep.platform,
          status: dep.status,
          delayMinutes: dep.delayMinutes || 0,
          totalSold,
          totalScanned,
          missingCount,
          minutesBeforeDeparture: diffMin,
          isAlert,
          missingPassengers: missing,
        };
      })
      .filter((a) => a.isAlert);

    // 3. Compute total missing across all trips
    const totalMissing = alerts.reduce((sum, a) => sum + a.missingCount, 0);

    return NextResponse.json({
      totalAlerts: alerts.length,
      totalMissing,
      alerts,
      checkedAt: now.toISOString(),
    });
  } catch (error) {
    console.error('[missing-alerts] Error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
