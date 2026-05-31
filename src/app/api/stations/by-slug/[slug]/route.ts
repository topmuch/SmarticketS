import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// ─── GET /api/stations/by-slug/[slug] ──────────────────────────
// Get a station by its slug (for signage display URL)
// ?all=true to include inactive stations

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('all') === 'true';

    const station = await db.station.findUnique({
      where: { slug },
      include: {
        agency: {
          select: { id: true, name: true, slug: true },
        },
        _count: {
          select: {
            departuresAsOrigin: true,
            departuresAsDest: true,
          },
        },
      },
    });

    // Not found
    if (!station) {
      return NextResponse.json(
        { error: 'Gare introuvable' },
        { status: 404 }
      );
    }

    // Inactive and not requesting all
    if (!station.isActive && !includeInactive) {
      return NextResponse.json(
        { error: 'Gare introuvable' },
        { status: 404 }
      );
    }

    return NextResponse.json({ station });
  } catch (error) {
    console.error('[/api/stations/by-slug/[slug]] GET error:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
