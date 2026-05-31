import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST - Unassign baggages from station (set stationId to null)
export async function POST(request: NextRequest) {
  try {
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
