import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// ─── Zod Schemas ───────────────────────────────────────────────

const createStationSchema = z.object({
  name: z.string().min(1, 'Le nom de la gare est requis'),
  city: z.string().min(1, 'La ville est requise'),
  address: z.string().optional().nullable(),
  agencyId: z.string().min(1, "L'ID de l'agence est requis"),
});

// ─── Helpers ───────────────────────────────────────────────────

/**
 * Slugify a string: lowercase, replace spaces/accents with hyphens,
 * remove special chars, then append a random 4-char suffix for uniqueness.
 * Ex: "Gare Routière Peters" + "Dakar" → "dakar-gare-routiere-peters-x9s2"
 */
function slugify(text: string, city: string): string {
  const combined = `${city} ${text}`;

  const slug = combined
    .toLowerCase()
    // Normalize unicode accents (é → e, ñ → n, etc.)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Replace non-alphanumeric chars (except hyphens) with hyphens
    .replace(/[^a-z0-9]+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Collapse consecutive hyphens
    .replace(/-+/g, '-');

  // Append random 4-char alphanumeric suffix
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }

  return `${slug}-${suffix}`;
}

// ─── GET /api/stations ────────────────────────────────────────
// List stations (supports ?agencyId=xxx filter)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agencyId = searchParams.get('agencyId');

    const whereClause: Record<string, unknown> = {};
    if (agencyId) {
      whereClause.agencyId = agencyId;
    }

    const stations = await db.station.findMany({
      where: whereClause,
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
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ stations });
  } catch (error) {
    console.error('[/api/stations] GET error:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

// ─── POST /api/stations ───────────────────────────────────────
// Create a new station (auto-generates slug)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createStationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Erreur de validation', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Verify agency exists
    const agency = await db.agency.findUnique({
      where: { id: data.agencyId },
      select: { id: true },
    });

    if (!agency) {
      return NextResponse.json(
        { error: 'Agence introuvable' },
        { status: 404 }
      );
    }

    // Generate a unique slug (retry up to 5 times on collision)
    let slug: string;
    let attempts = 0;
    const maxAttempts = 5;

    do {
      slug = slugify(data.name, data.city);
      attempts++;

      const existing = await db.station.findUnique({
        where: { slug },
        select: { id: true },
      });

      if (!existing) break;
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      return NextResponse.json(
        { error: 'Impossible de générer un slug unique. Veuillez réessayer.' },
        { status: 409 }
      );
    }

    const station = await db.station.create({
      data: {
        name: data.name,
        slug,
        city: data.city,
        address: data.address ?? null,
        agencyId: data.agencyId,
      },
      include: {
        agency: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    return NextResponse.json({ station }, { status: 201 });
  } catch (error) {
    console.error('[/api/stations] POST error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Erreur de validation', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
