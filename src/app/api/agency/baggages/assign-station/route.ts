import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// ─── Zod Schema ──────────────────────────────────────────

const assignSchema = z.object({
  baggageIds: z.array(z.string().min(1)).min(1, 'Au moins un ID requis'),
  stationId: z.string().min(1, 'L\'ID de la gare est requis'),
  agencyId: z.string().min(1, 'L\'ID de l\'agence est requis'),
});

// ─── POST /api/agency/baggages/assign-station ────────────
// Assign multiple baggages to a station

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = assignSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Erreur de validation', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { baggageIds, stationId, agencyId } = parsed.data;

    // Verify station belongs to agency
    const station = await db.station.findUnique({
      where: { id: stationId },
      select: { id: true, agencyId: true, name: true },
    });

    if (!station) {
      return NextResponse.json(
        { error: 'Gare introuvable' },
        { status: 404 }
      );
    }

    if (station.agencyId !== agencyId) {
      return NextResponse.json(
        { error: 'Accès non autorisé' },
        { status: 403 }
      );
    }

    // Update baggages in bulk
    const result = await db.baggage.updateMany({
      where: {
        id: { in: baggageIds },
        agencyId,
        // Only assign baggages that are not already assigned to a station
        stationId: null,
      },
      data: {
        stationId,
      },
    });

    return NextResponse.json({
      assignedCount: result.count,
      stationName: station.name,
      message: `${result.count} QR code(s) assigné(s) à la gare "${station.name}"`,
    });
  } catch (error) {
    console.error('[/api/agency/baggages/assign-station] POST error:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
