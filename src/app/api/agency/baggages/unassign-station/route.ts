import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

// POST - Unassign baggages from station (set stationId to null)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { baggageIds, agencyId } = body;

    // Validate required fields
    if (!baggageIds || !Array.isArray(baggageIds) || baggageIds.length === 0) {
      return NextResponse.json(
        { error: 'baggageIds is required and must be a non-empty array' },
        { status: 400 }
      );
    }

    if (!agencyId) {
      return NextResponse.json(
        { error: 'agencyId is required' },
        { status: 400 }
      );
    }

    // Verify agency ownership
    if (session.role !== 'admin' && session.role !== 'superadmin' && session.agencyId !== agencyId) {
      return NextResponse.json({ success: false, error: 'Accès non autorisé' }, { status: 403 });
    }

    // Update all matching baggages that belong to this agency
    const result = await db.baggage.updateMany({
      where: {
        id: { in: baggageIds },
        agencyId,
        stationId: { not: null }, // Only unassign baggages that are actually assigned
      },
      data: {
        stationId: null,
      },
    });

    return NextResponse.json({
      count: result.count,
      message: `${result.count} baggage(s) unassigned from station successfully`,
    });
  } catch (error) {
    console.error('Unassign baggages from station error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
