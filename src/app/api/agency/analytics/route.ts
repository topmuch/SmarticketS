import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

// ─── Date Range Helper ────────────────────────────────────────────────────────

function getDateRange(period: string) {
  const now = new Date();
  let start: Date;

  switch (period) {
    case 'week': {
      const dayOfWeek = now.getDay();
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = 0
      start = new Date(now);
      start.setDate(now.getDate() - diff);
      start.setHours(0, 0, 0, 0);
      break;
    }
    case 'month': {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    }
    case 'day':
    default: {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      start.setHours(0, 0, 0, 0);
      break;
    }
  }

  return { start, end: now };
}

// ─── GET /api/agency/analytics ────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'day';
    const agencyId = searchParams.get('agencyId') || session.agencyId;

    if (session.role !== 'admin' && session.role !== 'superadmin' && session.agencyId !== agencyId) {
      return NextResponse.json({ success: false, error: 'Accès non autorisé' }, { status: 403 });
    }

    if (!agencyId) {
      return NextResponse.json(
        { error: 'Agency ID requis' },
        { status: 400 }
      );
    }

    const { start, end } = getDateRange(period);

    // Run all queries in parallel for performance
    const [
      salesByDayData,
      revenueData,
      departureData,
      topDestinationsData,
      deliveryTimeData,
      recurrenceData,
      totalActiveData,
      totalDeliveredData,
      topRoutesData,
    ] = await Promise.all([
      // ── 1. Sales by day (for line chart) ─────────────────────────────
      db.$queryRawUnsafe<Array<{ day: string; count: number; category: string }>>(`
        SELECT 
          DATE(createdAt) as day,
          category,
          COUNT(*) as count
        FROM Baggage
        WHERE agencyId = ? 
          AND createdAt >= ? AND createdAt <= ?
          AND status IN ('in_transit', 'delivered', 'used', 'active')
        GROUP BY DATE(createdAt), category
        ORDER BY day ASC
      `, agencyId, start.toISOString(), end.toISOString()),

      // ── 2. Revenue breakdown ──────────────────────────────────────────
      db.$queryRawUnsafe<Array<{ totalLuggageFee: number }>>(`
        SELECT COALESCE(SUM(luggageFee), 0) as totalLuggageFee
        FROM PassengerTicket
        WHERE agencyId = ?
          AND activatedAt >= ? AND activatedAt <= ?
      `, agencyId, start.toISOString(), end.toISOString()),

      // ── 3. Occupancy data ─────────────────────────────────────────────
      db.departure.findMany({
        where: {
          agencyId,
          scheduledTime: { gte: start, lte: end },
          status: { not: 'CANCELLED' },
        },
        select: {
          lineNumber: true,
          destination: true,
          totalSeats: true,
          availableSeats: true,
          status: true,
          _count: { select: { tickets: true } },
        },
        orderBy: { scheduledTime: 'asc' },
        take: 50,
      }),

      // ── 4. Top destinations (by Baggage count) ─────────────────────────
      db.$queryRawUnsafe<Array<{ destination: string; count: number }>>(`
        SELECT destination, COUNT(*) as count
        FROM Baggage
        WHERE agencyId = ? 
          AND createdAt >= ? AND createdAt <= ?
          AND destination IS NOT NULL AND destination != ''
          AND status IN ('in_transit', 'delivered', 'used', 'active')
        GROUP BY destination
        ORDER BY count DESC
        LIMIT 10
      `, agencyId, start.toISOString(), end.toISOString()),

      // ── 5. Average delivery time (parcels delivered in period) ─────────
      db.$queryRawUnsafe<Array<{ avgHours: number | null }>>(`
        SELECT 
          AVG(
            CAST((julianday(deliveredAt) - julianday(createdAt)) * 24 AS REAL)
          ) as avgHours
        FROM Baggage
        WHERE agencyId = ?
          AND status = 'delivered'
          AND deliveredAt IS NOT NULL
          AND deliveredAt >= ? AND deliveredAt <= ?
      `, agencyId, start.toISOString(), end.toISOString()),

      // ── 6. Recurrence rate (% passengers > 1 trip this month) ────────
      db.$queryRawUnsafe<Array<{ totalPassengers: number; recurringPassengers: number }>>(`
        SELECT 
          COUNT(DISTINCT passengerPhone) as totalPassengers,
          SUM(
            CASE WHEN tripCount > 1 THEN 1 ELSE 0 END
          ) as recurringPassengers
        FROM (
          SELECT 
            passengerPhone,
            COUNT(*) as tripCount
          FROM PassengerTicket
          WHERE agencyId = ?
            AND activatedAt >= ? AND activatedAt <= ?
          GROUP BY passengerPhone
        )
      `, agencyId, start.toISOString(), end.toISOString()),

      // ── 7. Total active (in_transit) baggages now ─────────────────────
      db.baggage.count({
        where: { agencyId, status: 'in_transit' },
      }),

      // ── 8. Total delivered in period ──────────────────────────────────
      db.baggage.count({
        where: {
          agencyId,
          status: 'delivered',
          deliveredAt: { gte: start, lte: end },
        },
      }),

      // ── 9. Top routes ─────────────────────────────────────────────────
      db.$queryRawUnsafe<Array<{ route: string; count: number }>>(`
        SELECT 
          CASE 
            WHEN departureCity IS NOT NULL AND destination IS NOT NULL 
            THEN departureCity || ' → ' || destination
            WHEN destination IS NOT NULL THEN destination
            ELSE 'Non défini'
          END as route,
          COUNT(*) as count
        FROM Baggage
        WHERE agencyId = ?
          AND createdAt >= ? AND createdAt <= ?
          AND status IN ('in_transit', 'delivered', 'used', 'active')
        GROUP BY route
        ORDER BY count DESC
        LIMIT 10
      `, agencyId, start.toISOString(), end.toISOString()),
    ]);

    // ── Format: Sales Over Time (for Line Chart) ────────────────────────────
    const salesMap = new Map<string, Record<string, number>>();
    for (const item of salesByDayData) {
      const dayKey = item.day;
      if (!salesMap.has(dayKey)) {
        salesMap.set(dayKey, { parcel: 0, ticket: 0, hajj: 0, total: 0 });
      }
      const entry = salesMap.get(dayKey)!;
      entry[item.category] = (entry[item.category] || 0) + item.count;
      entry.total += item.count;
    }
    const salesOverTime = Array.from(salesMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, counts]) => ({
        date: new Date(day).toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: 'short',
        }),
        ...counts,
      }));

    // ── Format: Revenue ────────────────────────────────────────────────────
    const totalRevenue = revenueData[0]?.totalLuggageFee || 0;

    // ── Format: Occupancy ──────────────────────────────────────────────────
    const occupancyByRoute = departureData.map((d) => {
      const soldSeats = d.totalSeats - d.availableSeats;
      const occupancyRate =
        d.totalSeats > 0
          ? Math.round((soldSeats / d.totalSeats) * 100)
          : 0;
      return {
        lineNumber: d.lineNumber,
        destination: d.destination,
        totalSeats: d.totalSeats,
        soldSeats,
        availableSeats: d.availableSeats,
        occupancyRate,
        status: d.status,
        ticketCount: d._count.tickets,
      };
    });

    const avgOccupancy =
      occupancyByRoute.length > 0
        ? Math.round(
            occupancyByRoute.reduce(
              (sum, r) => sum + r.occupancyRate,
              0
            ) / occupancyByRoute.length
          )
        : 0;

    // ── Format: Top Destinations (Bar Chart) ────────────────────────────────
    const topDestinations = topDestinationsData.map((d, i) => ({
      name: d.destination.length > 15
        ? d.destination.substring(0, 14) + '…'
        : d.destination,
      fullName: d.destination,
      count: d.count,
      rank: i + 1,
    }));

    // ── Format: Delivery Time ───────────────────────────────────────────────
    const avgDeliveryHours = deliveryTimeData[0]?.avgHours ?? null;
    const avgDeliveryDisplay =
      avgDeliveryHours !== null
        ? avgDeliveryHours < 24
          ? `${Math.round(avgDeliveryHours)}h`
          : `${(avgDeliveryHours / 24).toFixed(1)}j`
        : 'N/A';

    // ── Format: Recurrence ──────────────────────────────────────────────────
    const totalPassengers = recurrenceData[0]?.totalPassengers || 0;
    const recurringPassengers = recurrenceData[0]?.recurringPassengers || 0;
    const recurrenceRate =
      totalPassengers > 0
        ? Math.round((recurringPassengers / totalPassengers) * 100)
        : 0;

    // ── Format: Top Routes (Table) ─────────────────────────────────────────
    const topRoutes = topRoutesData.map((d, i) => ({
      rank: i + 1,
      route: d.route,
      count: d.count,
    }));

    // ── Summary ─────────────────────────────────────────────────────────────
    const totalSales = salesOverTime.reduce((s, d) => s + d.total, 0);

    return NextResponse.json({
      period,
      dateRange: {
        from: start.toISOString(),
        to: end.toISOString(),
      },
      summary: {
        totalSales,
        totalRevenue,
        avgOccupancy,
        totalActiveNow: totalActiveData,
        totalDelivered: totalDeliveredData,
        avgDeliveryTime: avgDeliveryDisplay,
        recurrenceRate,
        totalPassengers,
        recurringPassengers,
      },
      charts: {
        salesOverTime,
        topDestinations,
        occupancyByRoute,
        topRoutes,
      },
    });
  } catch (error) {
    console.error('[/api/agency/analytics] Error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
