import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// ─── GET /api/agency/stations/[stationId]/stats ──────────
// Stats for a specific station

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ stationId: string }> }
) {
  try {
    const { stationId } = await params;
    const { searchParams } = new URL(request.url);
    const agencyId = searchParams.get('agencyId');

    // Verify station belongs to agency
    const station = await db.station.findUnique({
      where: { id: stationId },
      select: { id: true, agencyId: true },
    });

    if (!station) {
      return NextResponse.json(
        { error: 'Gare introuvable' },
        { status: 404 }
      );
    }

    if (agencyId && station.agencyId !== agencyId) {
      return NextResponse.json(
        { error: 'Accès non autorisé' },
        { status: 403 }
      );
    }

    // Get all baggages for this station
    const baggages = await db.baggage.findMany({
      where: { stationId },
      select: {
        id: true,
        status: true,
        category: true,
        createdAt: true,
      },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const is = (statuses: string[]) => (status: string) =>
      statuses.includes(status);

    const isPendingStatus = is(['pending_activation', 'EN_ATTENTE', 'en_attente']);
    const isActiveStatus = is(['active', 'ACTIF', 'actif', 'scanned', 'SCANNÉ', 'scanné']);
    const isInTransitStatus = is(['in_transit', 'EN_TRANSIT', 'en_transit']);
    const isDeliveredStatus = is(['delivered', 'LIVRÉ', 'livré']);
    const isLostStatus = is(['lost', 'PERDU', 'perdu']);
    const isFoundStatus = is(['found', 'TROUVÉ', 'trouvé']);

    const result = {
      total: baggages.length,
      pending: baggages.filter((b) => isPendingStatus(b.status)).length,
      active: baggages.filter((b) => isActiveStatus(b.status)).length,
      inTransit: baggages.filter((b) => isInTransitStatus(b.status)).length,
      delivered: baggages.filter((b) => isDeliveredStatus(b.status)).length,
      lost: baggages.filter((b) => isLostStatus(b.status)).length,
      found: baggages.filter((b) => isFoundStatus(b.status)).length,
      todayActivations: baggages.filter(
        (b) =>
          new Date(b.createdAt) >= today &&
          isActiveStatus(b.status)
      ).length,
      byCategory: {
        parcel: baggages.filter((b) => b.category === 'parcel').length,
        ticket: baggages.filter((b) => b.category === 'ticket').length,
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('[/api/agency/stations/[stationId]/stats] GET error:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
