import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Stats for sidebar badges (grouped by status + category)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agencyId = searchParams.get('agencyId');

    if (!agencyId) {
      return NextResponse.json({ error: 'Agency ID is required' }, { status: 400 });
    }

    // Single query: group by status AND category
    const stats = await db.baggage.groupBy({
      by: ['status', 'category'],
      where: { agencyId },
      _count: { id: true },
    });

    // Helper to sum _count.id for matching entries
    const sum = (matchStatus: string | null, matchCategory: string | null) =>
      stats
        .filter(
          (s) =>
            (matchStatus === null || s.status === matchStatus) &&
            (matchCategory === null || s.category === matchCategory)
        )
        .reduce((acc, s) => acc + s._count.id, 0);

    const result = {
      pending: sum('pending_activation', null),
      active: sum('active', null),
      inTransit: {
        parcel: sum('in_transit', 'parcel'),
        ticket: sum('in_transit', 'ticket'),
        hajj: sum('in_transit', 'hajj'),
        total: sum('in_transit', null),
      },
      delivered: sum('delivered', null),
      lost: sum('lost', null),
      found: sum('found', null),
      blocked: sum('blocked', null),
      total: stats.reduce((acc, s) => acc + s._count.id, 0),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Get baggage stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
