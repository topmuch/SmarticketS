import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ─── GET /api/agency/stations/[stationId]/stats ───────────────────────
// Detailed stats for a single station
// Query: ?agencyId=xxx

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ stationId: string }> }
) {
  try {
    const { stationId } = await params;
    const { searchParams } = new URL(request.url);
    const agencyId = searchParams.get('agencyId');

    if (!agencyId) {
      return NextResponse.json(
        { error: 'Agency ID is required' },
        { status: 400 }
      );
    }

    // ── Verify station belongs to agency ──
    const station = await db.station.findUnique({
      where: { id: stationId },
      select: { id: true, name: true, slug: true, city: true, agencyId: true },
    });

    if (!station || station.agencyId !== agencyId) {
      return NextResponse.json(
        { error: 'Station not found or does not belong to this agency' },
        { status: 404 }
      );
    }

    // ── Today's start (UTC midnight) ──
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // ── Parallel queries ──
    const [
      statusGroups,
      todayActivated,
      todayTickets,
      todayParcels,
      todayScanned,
      recentBaggages,
    ] = await Promise.all([
      // QR count by status for this station
      db.baggage.groupBy({
        by: ['status'],
        where: { agencyId, stationId },
        _count: { id: true },
      }),
      // Today: activations (activatedAt today)
      db.baggage.count({
        where: {
          agencyId,
          stationId,
          activatedAt: { gte: todayStart },
        },
      }),
      // Today: tickets created
      db.baggage.count({
        where: {
          agencyId,
          stationId,
          category: 'ticket',
          createdAt: { gte: todayStart },
        },
      }),
      // Today: parcels created
      db.baggage.count({
        where: {
          agencyId,
          stationId,
          category: 'parcel',
          createdAt: { gte: todayStart },
        },
      }),
      // Today: scanned
      db.baggage.count({
        where: {
          agencyId,
          stationId,
          status: 'scanned',
          lastScanDate: { gte: todayStart },
        },
      }),
      // Last 10 baggages
      db.baggage.findMany({
        where: { agencyId, stationId },
        select: {
          id: true,
          reference: true,
          status: true,
          category: true,
          type: true,
          createdAt: true,
          activatedAt: true,
          travelerFirstName: true,
          travelerLastName: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    // ── Build QR counts ──
    const sum = (status: string) =>
      statusGroups
        .filter((g) => g.status === status)
        .reduce((acc, g) => acc + g._count.id, 0);

    const qr = {
      total: statusGroups.reduce((acc, g) => acc + g._count.id, 0),
      pending: sum('pending_activation'),
      active: sum('active'),
      inTransit: sum('in_transit'),
      delivered: sum('delivered'),
      lost: sum('lost'),
      found: sum('found'),
    };

    // ── Build today stats ──
    const today = {
      activations: todayActivated,
      tickets: todayTickets,
      parcels: todayParcels,
      scanned: todayScanned,
    };

    return NextResponse.json({
      station: {
        id: station.id,
        name: station.name,
        slug: station.slug,
        city: station.city,
      },
      qr,
      today,
      recentBaggages,
    });
  } catch (error) {
    console.error('[/api/agency/stations/[stationId]/stats] GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
