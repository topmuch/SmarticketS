import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ─── GET /api/agency/baggages/list ───────────────────────────────────────
// Filtered, paginated baggage list with optional station info
// Query: ?agencyId=xxx&stationId=yyy&status=zzz&category=www&search=query&page=1&limit=20

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agencyId = searchParams.get('agencyId');
    const stationIdParam = searchParams.get('stationId');
    const stationId = stationIdParam && stationIdParam !== 'null' ? stationIdParam : undefined;
    const filterUnassigned = stationIdParam === 'null'; // stationId=null → unassigned only
    const status = searchParams.get('status') || undefined;
    const category = searchParams.get('category') || undefined;
    const search = searchParams.get('search') || undefined;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    if (!agencyId) {
      return NextResponse.json(
        { error: 'Agency ID is required' },
        { status: 400 }
      );
    }

    // ── Build where clause ──
    const where: Record<string, unknown> = { agencyId };

    if (filterUnassigned) {
      where.stationId = null;
    } else if (stationId) {
      where.stationId = stationId;
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    if (category && category !== 'all') {
      where.category = category;
    }

    if (search) {
      // SQLite LIKE is case-insensitive for ASCII by default — no mode needed
      where.OR = [
        { reference: { contains: search } },
        { travelerFirstName: { contains: search } },
        { travelerLastName: { contains: search } },
      ];
    }

    // ── Parallel: count + paginated results ──
    const [total, baggages] = await Promise.all([
      db.baggage.count({ where }),
      db.baggage.findMany({
        where,
        select: {
          id: true,
          reference: true,
          type: true,
          category: true,
          status: true,
          travelerFirstName: true,
          travelerLastName: true,
          destination: true,
          createdAt: true,
          activatedAt: true,
          stationId: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    // ── If stationId is set, fetch station info once ──
    let station: { name: string; slug: string } | null = null;
    if (stationId) {
      const stationData = await db.station.findUnique({
        where: { id: stationId },
        select: { name: true, slug: true },
      });
      if (stationData) {
        station = stationData;
      }
    }

    // ── Build response ──
    return NextResponse.json({
      baggages,
      total,
      page,
      limit,
      station,
    });
  } catch (error) {
    console.error('[/api/agency/baggages/list] GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
