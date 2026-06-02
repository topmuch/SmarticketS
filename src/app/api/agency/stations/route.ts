import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ─── GET /api/agency/stations ─────────────────────────────────────────
// List stations for an agency with per-station baggage counts
// Query: ?agencyId=xxx

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agencyId = searchParams.get('agencyId');

    if (!agencyId) {
      return NextResponse.json(
        { error: 'Agency ID is required' },
        { status: 400 }
      );
    }

    // ── Fetch stations ──
    const stations = await db.station.findMany({
      where: { agencyId },
      orderBy: { createdAt: 'desc' },
    });

    if (stations.length === 0) {
      return NextResponse.json({ stations: [] });
    }

    const stationIds = stations.map((s) => s.id);

    // ── Today's start (UTC midnight) ──
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // ── Parallel queries: baggage counts grouped by stationId + status ──
    const [
      statusCounts,
      scanCounts,
      todayActivationCounts,
    ] = await Promise.all([
      // Count baggages per station, grouped by status
      db.baggage.groupBy({
        by: ['stationId', 'status'],
        where: {
          agencyId,
          stationId: { in: stationIds },
        },
        _count: { id: true },
      }),
      // Count scanned baggages per station (using scanLogs relation)
      db.baggage.groupBy({
        by: ['stationId'],
        where: {
          agencyId,
          stationId: { in: stationIds },
          status: 'scanned',
        },
        _count: { id: true },
      }),
      // Count today's activations per station
      db.baggage.groupBy({
        by: ['stationId'],
        where: {
          agencyId,
          stationId: { in: stationIds },
          activatedAt: { gte: todayStart },
        },
        _count: { id: true },
      }),
    ]);

    // ── Helper: sum counts for a stationId + status match ──
    const countByStationStatus = (stationId: string, status: string) =>
      statusCounts
        .filter((s) => s.stationId === stationId && s.status === status)
        .reduce((acc, s) => acc + s._count.id, 0);

    const countByStationScanned = (stationId: string) =>
      scanCounts
        .filter((s) => s.stationId === stationId)
        .reduce((acc, s) => acc + s._count.id, 0);

    const countTodayActivations = (stationId: string) =>
      todayActivationCounts
        .filter((s) => s.stationId === stationId)
        .reduce((acc, s) => acc + s._count.id, 0);

    // ── Build response ──
    const result = stations.map((station) => {
      const pending = countByStationStatus(station.id, 'pending_activation');
      const active = countByStationStatus(station.id, 'active');
      const inTransit = countByStationStatus(station.id, 'in_transit');
      const delivered = countByStationStatus(station.id, 'delivered');
      const scanned = countByStationScanned(station.id);
      const total = pending + active + inTransit + delivered + scanned
        + countByStationStatus(station.id, 'lost')
        + countByStationStatus(station.id, 'found')
        + countByStationStatus(station.id, 'blocked');

      return {
        id: station.id,
        name: station.name,
        slug: station.slug,
        city: station.city,
        address: station.address,
        isActive: station.isActive,
        baggageCounts: {
          total,
          pending,
          active,
          inTransit,
          delivered,
          scanned,
        },
        todayActivations: countTodayActivations(station.id),
      };
    });

    return NextResponse.json({ stations: result });
  } catch (error) {
    console.error('[/api/agency/stations] GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
