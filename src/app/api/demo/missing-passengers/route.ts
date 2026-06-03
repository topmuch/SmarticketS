import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureSeeded } from '@/lib/auto-seed';

export const dynamic = 'force-dynamic';

/**
 * GET /api/demo/missing-passengers?agencyId=xxx
 *
 * PUBLIC demo endpoint (no auth) — scans all departures within the 15-min window
 * and returns those with missing (unvalidated) passengers.
 *
 * Used for demo/preview on the landing page without requiring login.
 */
export async function GET(req: NextRequest) {
  try {
    // Ensure database is seeded
    await ensureSeeded();

    const url = new URL(req.url);
    const agencyId = url.searchParams.get('agencyId') || 'demo-agency-1';

    const now = new Date();

    // Window: departures from 1h ago to 2h ahead
    const windowStart = new Date(now.getTime() - 60 * 60_000);
    const windowEnd = new Date(now.getTime() + 2 * 60 * 60_000);

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
            baggageId: true,
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

        const isAlert = diffMin <= 15 && diffMin > -60 && missingCount > 0;

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
          missingPassengers: dep.tickets
            .filter((t) => t.ticketStatus === 'ACTIVE')
            .map((t) => ({
              passengerName: t.passengerName,
              seatNumber: t.seatNumber,
              ticketId: t.id,
              baggageId: t.baggageId,
              controlCode: t.controlCode,
              passengerPhone: t.passengerPhone,
              status: 'MISSING',
            })),
        };
      })
      .filter((a) => a.isAlert);

    const totalMissing = alerts.reduce((sum, a) => sum + a.missingCount, 0);

    return NextResponse.json({
      success: true,
      totalAlerts: alerts.length,
      totalMissing,
      alerts,
      checkedAt: now.toISOString(),
    });
  } catch (error) {
    console.error('[demo/missing-passengers] Error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
