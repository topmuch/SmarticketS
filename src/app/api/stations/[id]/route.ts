import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// ─── Zod Schemas ───────────────────────────────────────────────

const updateStationSchema = z.object({
  name: z.string().min(1, 'Le nom de la gare est requis').optional(),
  city: z.string().min(1, 'La ville est requise').optional(),
  address: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

// ─── GET /api/stations/[id] ─────────────────────────────────────
// Get a single station by ID (with departure counts)

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const station = await db.station.findUnique({
      where: { id },
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

    if (!station) {
      return NextResponse.json(
        { error: 'Gare introuvable' },
        { status: 404 }
      );
    }

    return NextResponse.json({ station });
  } catch (error) {
    console.error('[/api/stations/[id]] GET error:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

// ─── PUT /api/stations/[id] ─────────────────────────────────────
// Update a station (does NOT allow changing slug or agencyId)

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify station exists
    const existingStation = await db.station.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingStation) {
      return NextResponse.json(
        { error: 'Gare introuvable' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = updateStationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Erreur de validation', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Build update data — only include fields that are explicitly provided
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const station = await db.station.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json({ station });
  } catch (error) {
    console.error('[/api/stations/[id]] PUT error:', error);

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

// ─── DELETE /api/stations/[id] ──────────────────────────────────
// Delete a station (409 if linked departures exist)

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existingStation = await db.station.findUnique({
      where: { id },
      select: {
        id: true,
        _count: {
          select: {
            departuresAsOrigin: true,
            departuresAsDest: true,
          },
        },
      },
    });

    if (!existingStation) {
      return NextResponse.json(
        { error: 'Gare introuvable' },
        { status: 404 }
      );
    }

    const totalDepartures =
      existingStation._count.departuresAsOrigin +
      existingStation._count.departuresAsDest;

    // Prevent deletion if station has linked departures
    if (totalDepartures > 0) {
      return NextResponse.json(
        {
          error: 'Impossible de supprimer cette gare',
          message: `Cette gare a ${totalDepartures} départ(s) associé(s). Supprimez-les d'abord.`,
        },
        { status: 409 }
      );
    }

    await db.station.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    console.error('[/api/stations/[id]] DELETE error:', error);

    // Prisma P2004: Foreign key constraint failed
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as Record<string, unknown>).code === 'P2004'
    ) {
      return NextResponse.json(
        {
          error: 'Contrainte de base de données',
          message: 'Impossible de supprimer — des ressources dépendantes existent.',
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
