import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// ─── GET /api/agency/stations/all-stats ─────────────────
// Aggregate stats across all stations for an agency
// Returns per-station stats + overall allStats

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agencyId = searchParams.get('agencyId');

    if (!agencyId) {
      return NextResponse.json(
        { error: 'Agency ID requis' },
        { status: 400 }
      );
    }

    // Get all stations for this agency
    const agencyStations = await db.station.findMany({
      where: { agencyId },
      select: { id: true, isActive: true },
    });

    const stationIds = agencyStations.map((s) => s.id);

    // Get all baggages assigned to any station of this agency
    const stationBaggages = stationIds.length > 0
      ? await db.baggage.findMany({
          where: {
            stationId: { in: stationIds },
          },
          select: {
            id: true,
            stationId: true,
            status: true,
            createdAt: true,
            category: true,
          },
        })
      : [];

    // Build per-station stats
    const stations: Record<string, {
      total: number;
      pending: number;
      active: number;
      activeTickets: number;
      activeParcels: number;
      terminated: number;
      todayActivations: number;
    }> = {};

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeStatuses = ['active', 'ACTIF', 'scanned', 'SCANNÉ', 'in_transit'];
    const terminatedStatuses = ['delivered', 'delivré', 'returned', 'retourné'];

    for (const station of agencyStations) {
      const stBaggages = stationBaggages.filter((b) => b.stationId === station.id);
      const activeBaggages = stBaggages.filter((b) => activeStatuses.includes(b.status));
      const terminatedBaggages = stBaggages.filter((b) => terminatedStatuses.includes(b.status));

      stations[station.id] = {
        total: stBaggages.length,
        pending: stBaggages.filter(
          (b) => b.status === 'pending_activation' || b.status === 'EN_ATTENTE'
        ).length,
        active: activeBaggages.length,
        activeTickets: activeBaggages.filter(
          (b) => b.category === 'ticket'
        ).length,
        activeParcels: activeBaggages.filter(
          (b) => b.category === 'parcel' || b.category === 'hajj'
        ).length,
        terminated: terminatedBaggages.length,
        todayActivations: stBaggages.filter(
          (b) => new Date(b.createdAt) >= today && activeStatuses.includes(b.status)
        ).length,
      };
    }

    // Aggregate all stats
    const allStats = {
      totalStations: agencyStations.length,
      activeStations: agencyStations.filter((s) => s.isActive).length,
      totalBaggages: stationBaggages.length,
      todayActivations: stationBaggages.filter(
        (b) => new Date(b.createdAt) >= today && activeStatuses.includes(b.status)
      ).length,
    };

    return NextResponse.json({ stations, allStats });
  } catch (error) {
    console.error('[/api/agency/stations/all-stats] GET error:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
