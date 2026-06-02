import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

// ─── Zod Schema ──────────────────────────────────────────────────────────

const assignToStationSchema = z.object({
  agencyId: z.string().min(1, 'Agency ID is required'),
  baggageIds: z
    .array(z.string().min(1))
    .min(1, 'baggageIds must be a non-empty array'),
  stationId: z.string().nullable().optional(), // null = unassign, string = assign
});

// ─── POST /api/agency/baggages/assign-to-station ─────────────────────────
// Assign or unassign baggages to a station
// Body: { agencyId, baggageIds: string[], stationId: string | null }

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = assignToStationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { agencyId, baggageIds, stationId } = parsed.data;

    // ── If assigning to a station, verify station exists & belongs to agency ──
    if (stationId) {
      const station = await db.station.findUnique({
        where: { id: stationId },
        select: { id: true, agencyId: true },
      });

      if (!station || station.agencyId !== agencyId) {
        return NextResponse.json(
          { error: 'Station not found or does not belong to this agency' },
          { status: 404 }
        );
      }
    }

    // ── Verify all baggages belong to the agency ──
    const existingBaggages = await db.baggage.findMany({
      where: {
        id: { in: baggageIds },
        agencyId,
      },
      select: { id: true },
    });

    const existingIds = new Set(existingBaggages.map((b) => b.id));
    const invalidIds = baggageIds.filter((id) => !existingIds.has(id));

    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: 'Some baggages do not belong to this agency', invalidIds },
        { status: 403 }
      );
    }

    // ── Update baggages ──
    const result = await db.baggage.updateMany({
      where: {
        id: { in: baggageIds },
        agencyId,
      },
      data: {
        stationId: stationId ?? null,
      },
    });

    return NextResponse.json({
      success: true,
      updated: result.count,
    });
  } catch (error) {
    console.error('[/api/agency/baggages/assign-to-station] POST error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
