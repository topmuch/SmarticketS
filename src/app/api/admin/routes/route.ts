import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';
import { z } from 'zod';

// ─── Zod Schemas ───────────────────────────────────────────────

const createRouteSchema = z.object({
  name: z.string().min(1, 'Le nom de la route est requis'),
  origin: z.string().min(1, "La ville d'origine est requise"),
  destination: z.string().min(1, 'La destination est requise'),
  isRoundTrip: z.boolean().optional().default(false),
  durationMinutes: z.coerce.number().int().positive().optional().nullable(),
  distanceKm: z.coerce.number().int().positive().optional().nullable(),
  price: z.coerce.number().int().min(0).optional().nullable(),
});

const updateRouteSchema = z.object({
  id: z.string().min(1, "L'ID de la route est requis"),
  name: z.string().min(1, 'Le nom de la route est requis').optional(),
  origin: z.string().min(1, "La ville d'origine est requise").optional(),
  destination: z.string().min(1, 'La destination est requise').optional(),
  isRoundTrip: z.boolean().optional(),
  durationMinutes: z.coerce.number().int().positive().optional().nullable(),
  distanceKm: z.coerce.number().int().positive().optional().nullable(),
  price: z.coerce.number().int().min(0).optional().nullable(),
});

// ─── Helpers ───────────────────────────────────────────────────

function authorizedRoles(): string[] {
  return ['superadmin', 'agency'];
}

function buildWhereClause(
  user: NonNullable<Awaited<ReturnType<typeof getSession>>>,
  agencyIdParam: string | null
): { agencyId: string } | Record<string, never> {
  // Agency role: always force their own agencyId
  if (user.role === 'agency') {
    if (!user.agencyId) {
      throw new Error('Agence non associée à ce compte');
    }
    return { agencyId: user.agencyId };
  }

  // Superadmin: filter by agencyId param if provided, otherwise return all
  if (agencyIdParam) {
    return { agencyId: agencyIdParam };
  }

  return {}; // No filter — return all
}

// ─── GET /api/admin/routes ─────────────────────────────────────
// List all routes for the agency (or all if superadmin without agencyId)

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getSession();
    if (!currentUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (!authorizedRoles().includes(currentUser.role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const agencyIdParam = searchParams.get('agencyId');

    const whereClause = buildWhereClause(currentUser, agencyIdParam);

    const routes = await db.route.findMany({
      where: whereClause,
      include: {
        agency: {
          select: { id: true, name: true, slug: true },
        },
        _count: {
          select: { departures: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ routes });

  } catch (error) {
    console.error('[/api/admin/routes] GET error:', error);

    if (error instanceof Error && error.message === 'Agence non associée à ce compte') {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

// ─── POST /api/admin/routes ────────────────────────────────────
// Create a new route linked to the agency

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getSession();
    if (!currentUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (!authorizedRoles().includes(currentUser.role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    // Agency role must have an agencyId
    if (currentUser.role === 'agency' && !currentUser.agencyId) {
      return NextResponse.json(
        { error: 'Agence non associée à ce compte' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = createRouteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Erreur de validation', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Agency users: force agencyId from session; superadmin can specify via body
    const agencyId = currentUser.role === 'agency'
      ? currentUser.agencyId!
      : (body.agencyId as string);

    if (!agencyId) {
      return NextResponse.json(
        { error: "L'ID de l'agence est requis" },
        { status: 400 }
      );
    }

    // Verify agency exists
    const agency = await db.agency.findUnique({
      where: { id: agencyId },
      select: { id: true },
    });

    if (!agency) {
      return NextResponse.json(
        { error: 'Agence introuvable' },
        { status: 404 }
      );
    }

    const route = await db.route.create({
      data: {
        name: data.name,
        origin: data.origin,
        destination: data.destination,
        isRoundTrip: data.isRoundTrip,
        durationMinutes: data.durationMinutes ?? null,
        distanceKm: data.distanceKm ?? null,
        price: data.price ?? null,
        agencyId,
      },
      include: {
        agency: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    return NextResponse.json({ route }, { status: 201 });

  } catch (error) {
    console.error('[/api/admin/routes] POST error:', error);

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

// ─── PUT /api/admin/routes ─────────────────────────────────────
// Update a route (id in body)

export async function PUT(request: NextRequest) {
  try {
    const currentUser = await getSession();
    if (!currentUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (!authorizedRoles().includes(currentUser.role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    if (currentUser.role === 'agency' && !currentUser.agencyId) {
      return NextResponse.json(
        { error: 'Agence non associée à ce compte' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = updateRouteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Erreur de validation', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { id, ...updateData } = parsed.data;

    // Verify the route exists and belongs to the user's agency
    const existingRoute = await db.route.findUnique({
      where: { id },
      select: { id: true, agencyId: true },
    });

    if (!existingRoute) {
      return NextResponse.json(
        { error: 'Route introuvable' },
        { status: 404 }
      );
    }

    // Agency role: enforce ownership
    if (currentUser.role === 'agency' && existingRoute.agencyId !== currentUser.agencyId) {
      return NextResponse.json(
        { error: 'Accès refusé — route non associée à votre agence' },
        { status: 403 }
      );
    }

    const route = await db.route.update({
      where: { id },
      data: {
        ...(updateData.name !== undefined && { name: updateData.name }),
        ...(updateData.origin !== undefined && { origin: updateData.origin }),
        ...(updateData.destination !== undefined && { destination: updateData.destination }),
        ...(updateData.isRoundTrip !== undefined && { isRoundTrip: updateData.isRoundTrip }),
        ...(updateData.durationMinutes !== undefined && { durationMinutes: updateData.durationMinutes }),
        ...(updateData.distanceKm !== undefined && { distanceKm: updateData.distanceKm }),
        ...(updateData.price !== undefined && { price: updateData.price }),
      },
      include: {
        agency: {
          select: { id: true, name: true, slug: true },
        },
        _count: {
          select: { departures: true },
        },
      },
    });

    return NextResponse.json({ route });

  } catch (error) {
    console.error('[/api/admin/routes] PUT error:', error);

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

// ─── DELETE /api/admin/routes?id=xxx ──────────────────────────
// Delete a route (id as query param)

export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getSession();
    if (!currentUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    if (!authorizedRoles().includes(currentUser.role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    if (currentUser.role === 'agency' && !currentUser.agencyId) {
      return NextResponse.json(
        { error: 'Agence non associée à ce compte' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: "L'ID de la route est requis" },
        { status: 400 }
      );
    }

    // Verify the route exists and belongs to the user's agency
    const existingRoute = await db.route.findUnique({
      where: { id },
      select: {
        id: true,
        agencyId: true,
        _count: { select: { departures: true } },
      },
    });

    if (!existingRoute) {
      return NextResponse.json(
        { error: 'Route introuvable' },
        { status: 404 }
      );
    }

    // Agency role: enforce ownership
    if (currentUser.role === 'agency' && existingRoute.agencyId !== currentUser.agencyId) {
      return NextResponse.json(
        { error: 'Accès refusé — route non associée à votre agence' },
        { status: 403 }
      );
    }

    // Prevent deletion if route has linked departures
    if (existingRoute._count.departures > 0) {
      return NextResponse.json(
        {
          error: 'Impossible de supprimer cette route',
          message: `Cette route a ${existingRoute._count.departures} départ(s) associé(s). Supprimez-les d'abord.`,
        },
        { status: 409 }
      );
    }

    await db.route.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, deletedId: id });

  } catch (error) {
    console.error('[/api/admin/routes] DELETE error:', error);

    // Prisma P2004: Foreign key constraint failed
    if (error && typeof error === 'object' && 'code' in error && (error as any).code === 'P2004') {
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
