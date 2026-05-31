import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';
import { z } from 'zod';

// ─── Validation Schemas ────────────────────────────────────────────────

const createDepartureSchema = z.object({
  routeId: z.string().optional(),
  departureType: z.enum(['OUTBOUND', 'RETURN']),
  lineNumber: z.string().min(1, 'Le numéro de ligne est requis'),
  destination: z.string().min(1, 'La destination est requise'),
  scheduledTime: z.string().min(1, 'L\'heure de départ est requise'),
  platform: z.string().optional(),
  availableSeats: z.number().int().min(0).default(45),
  totalSeats: z.number().int().min(1).default(45),
  agencyId: z.string().optional(),
  // Auto-route creation fields
  origin: z.string().optional(),
  price: z.number().optional(),
  isRoundTrip: z.boolean().optional().default(false),
  returnDelayHours: z.number().int().min(1).max(48).optional().default(2),
  // Multi-gare: station linkage
  originStationId: z.string().optional(),
  destinationStationId: z.string().optional(),
});

const updateDepartureSchema = z.object({
  id: z.string().min(1, 'L\'identifiant est requis'),
  routeId: z.string().optional().nullable(),
  departureType: z.enum(['OUTBOUND', 'RETURN']).optional(),
  lineNumber: z.string().min(1).optional(),
  destination: z.string().min(1).optional(),
  scheduledTime: z.string().min(1).optional(),
  platform: z.string().optional().nullable(),
  availableSeats: z.number().int().min(0).optional(),
  totalSeats: z.number().int().min(1).optional(),
  status: z.enum(['SCHEDULED', 'BOARDING', 'DEPARTED', 'CANCELLED', 'DELAYED']).optional(),
  delayMinutes: z.number().int().min(0).optional(),
  // Multi-gare: station linkage
  originStationId: z.string().optional().nullable(),
  destinationStationId: z.string().optional().nullable(),
});

// ─── Helpers ────────────────────────────────────────────────────────────

/**
 * Resolve the effective agencyId for the request.
 * Agency users are forced to their own agency; superadmin uses the query param or body value.
 */
function resolveAgencyId(
  user: NonNullable<Awaited<ReturnType<typeof getSession>>>,
  providedAgencyId?: string | null
): string | NextResponse {
  if (user.role === 'superadmin' || user.role === 'admin') {
    if (!providedAgencyId) {
      return NextResponse.json(
        { error: 'agencyId est requis' },
        { status: 400 }
      );
    }
    return providedAgencyId;
  }
  // Agency user – always use their own agency
  if (!user.agencyId) {
    return NextResponse.json(
      { error: 'Aucune agence associée à votre compte' },
      { status: 403 }
    );
  }
  return user.agencyId;
}

// ─── GET – List departures ────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    if (!['superadmin', 'admin', 'agency'].includes(user.role)) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const agencyIdParam = searchParams.get('agencyId');
    const dateParam = searchParams.get('date');
    const statusParam = searchParams.get('status');

    // Resolve agencyId
    const effectiveAgencyId = resolveAgencyId(user, agencyIdParam);
    if (effectiveAgencyId instanceof NextResponse) return effectiveAgencyId;

    // Build date range filter
    const targetDate = dateParam
      ? new Date(dateParam + 'T00:00:00.000Z')
      : (() => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return today;
        })();

    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);
    nextDay.setHours(0, 0, 0, 0);

    // Build where clause
    const where: Record<string, unknown> = {
      agencyId: effectiveAgencyId,
      scheduledTime: {
        gte: targetDate,
        lt: nextDay,
      },
    };

    if (statusParam) {
      where.status = statusParam;
    }

    const departures = await db.departure.findMany({
      where,
      orderBy: { scheduledTime: 'asc' },
      include: {
        route: {
          select: {
            id: true,
            name: true,
            origin: true,
            destination: true,
          },
        },
        originStation: {
          select: {
            id: true,
            name: true,
            city: true,
            slug: true,
          },
        },
        destinationStation: {
          select: {
            id: true,
            name: true,
            city: true,
            slug: true,
          },
        },
        _count: {
          select: {
            tickets: true,
          },
        },
      },
    });

    // Enrich with computed fields
    const enriched = departures.map((dep) => {
      const soldSeats = dep._count.tickets;
      const fillRate = dep.totalSeats > 0
        ? Math.round((soldSeats / dep.totalSeats) * 100)
        : 0;

      return {
        id: dep.id,
        routeId: dep.routeId,
        route: dep.route,
        departureType: dep.departureType,
        lineNumber: dep.lineNumber,
        destination: dep.destination,
        scheduledTime: dep.scheduledTime.toISOString(),
        platform: dep.platform,
        availableSeats: dep.availableSeats,
        totalSeats: dep.totalSeats,
        status: dep.status,
        delayMinutes: dep.delayMinutes,
        agencyId: dep.agencyId,
        soldSeats,
        fillRate,
        // Multi-gare: station info
        originStationId: dep.originStationId,
        originStation: dep.originStation,
        destinationStationId: dep.destinationStationId,
        destinationStation: dep.destinationStation,
        createdAt: dep.createdAt.toISOString(),
        updatedAt: dep.updatedAt.toISOString(),
      };
    });

    return NextResponse.json({ departures: enriched });
  } catch (error) {
    console.error('[/api/admin/departures] GET error:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

// ─── POST – Create single departure ───────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    if (!['superadmin', 'admin', 'agency'].includes(user.role)) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const contentType = request.headers.get('content-type') || '';

    // ── CSV import endpoint ──
    if (contentType.includes('multipart/form-data')) {
      return handleCsvImport(request, user);
    }

    // ── Single departure creation ──
    const body = await request.json();
    const parsed = createDepartureSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Erreur de validation', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Resolve agencyId
    const effectiveAgencyId = resolveAgencyId(user, data.agencyId);
    if (effectiveAgencyId instanceof NextResponse) return effectiveAgencyId;

    // Validate scheduledTime is in the future
    const scheduledTime = new Date(data.scheduledTime);
    if (isNaN(scheduledTime.getTime())) {
      return NextResponse.json(
        { error: 'Format de date invalide pour scheduledTime' },
        { status: 400 }
      );
    }
    if (scheduledTime <= new Date()) {
      return NextResponse.json(
        { error: 'L\'heure de départ doit être dans le futur' },
        { status: 400 }
      );
    }

    // ─── Auto-route creation: if origin is provided, find or create route ───
    let routeId = data.routeId || null;
    let finalDestination = data.destination;

    if (data.origin && data.origin.trim() && !data.routeId) {
      // Find existing route for this origin → destination pair
      const existingRoute = await db.route.findFirst({
        where: {
          agencyId: effectiveAgencyId,
          origin: data.origin,
          destination: data.destination,
        },
      });

      if (existingRoute) {
        routeId = existingRoute.id;
        finalDestination = existingRoute.destination;
      } else {
        // Auto-create the route
        const newRoute = await db.route.create({
          data: {
            name: `${data.origin} → ${data.destination}`,
            origin: data.origin,
            destination: data.destination,
            isRoundTrip: data.isRoundTrip,
            price: data.price || null,
            agencyId: effectiveAgencyId as string,
          },
        });
        routeId = newRoute.id;
        finalDestination = newRoute.destination;
      }
    } else if (data.routeId) {
      // Legacy: routeId provided explicitly
      const foundRoute = await db.route.findUnique({
        where: { id: data.routeId },
      });
      if (!foundRoute) {
        return NextResponse.json(
          { error: 'Route introuvable' },
          { status: 404 }
        );
      }
      finalDestination = data.destination || foundRoute.destination;
    }

    // ─── Validate station IDs if provided ───
    if (data.originStationId) {
      const stationExists = await db.station.findUnique({
        where: { id: data.originStationId },
      });
      if (!stationExists) {
        return NextResponse.json(
          { error: 'Gare de départ introuvable' },
          { status: 404 }
        );
      }
    }
    if (data.destinationStationId) {
      const stationExists = await db.station.findUnique({
        where: { id: data.destinationStationId },
      });
      if (!stationExists) {
        return NextResponse.json(
          { error: 'Gare d\'arrivée introuvable' },
          { status: 404 }
        );
      }
    }

    // Create the outbound departure
    const departure = await db.departure.create({
      data: {
        routeId,
        departureType: data.departureType || 'OUTBOUND',
        lineNumber: data.lineNumber,
        destination: finalDestination,
        scheduledTime,
        platform: data.platform || null,
        availableSeats: data.availableSeats,
        totalSeats: data.totalSeats,
        agencyId: effectiveAgencyId as string,
        originStationId: data.originStationId || null,
        destinationStationId: data.destinationStationId || null,
      },
      include: {
        route: {
          select: {
            id: true,
            name: true,
            origin: true,
            destination: true,
          },
        },
      },
    });

    // ─── Auto-create return departure if isRoundTrip ───
    let createdReturn = false;
    if (data.isRoundTrip && data.origin) {
      const returnTime = new Date(scheduledTime.getTime() + (data.returnDelayHours || 2) * 3600000);
      await db.departure.create({
        data: {
          routeId,
          departureType: 'RETURN',
          lineNumber: data.lineNumber + 'R',
          destination: data.origin, // Invert: destination becomes origin
          scheduledTime: returnTime,
          platform: data.platform || null,
          availableSeats: data.availableSeats,
          totalSeats: data.totalSeats,
          agencyId: effectiveAgencyId as string,
          // Swap station IDs for return trip
          originStationId: data.destinationStationId || null,
          destinationStationId: data.originStationId || null,
        },
      });
      createdReturn = true;
    }

    return NextResponse.json({ departure, createdReturn }, { status: 201 });
  } catch (error) {
    console.error('[/api/admin/departures] POST error:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

// ─── PUT – Update departure ───────────────────────────────────────────

export async function PUT(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    if (!['superadmin', 'admin', 'agency'].includes(user.role)) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateDepartureSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Erreur de validation', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { id, ...updateData } = parsed.data;

    // Find departure and check ownership
    const existing = await db.departure.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Départ introuvable' },
        { status: 404 }
      );
    }

    // Ownership check: agency user can only update their own departures
    if (user.role === 'agency' && existing.agencyId !== user.agencyId) {
      return NextResponse.json(
        { error: 'Accès non autorisé' },
        { status: 403 }
      );
    }

    // Build the Prisma update payload
    const payload: Record<string, unknown> = {};
    if (updateData.routeId !== undefined) payload.routeId = updateData.routeId;
    if (updateData.departureType !== undefined) payload.departureType = updateData.departureType;
    if (updateData.lineNumber !== undefined) payload.lineNumber = updateData.lineNumber;
    if (updateData.destination !== undefined) payload.destination = updateData.destination;
    if (updateData.scheduledTime !== undefined) {
      const st = new Date(updateData.scheduledTime);
      if (isNaN(st.getTime())) {
        return NextResponse.json(
          { error: 'Format de date invalide pour scheduledTime' },
          { status: 400 }
        );
      }
      payload.scheduledTime = st;
    }
    if (updateData.platform !== undefined) payload.platform = updateData.platform;
    if (updateData.availableSeats !== undefined) payload.availableSeats = updateData.availableSeats;
    if (updateData.totalSeats !== undefined) payload.totalSeats = updateData.totalSeats;
    if (updateData.status !== undefined) payload.status = updateData.status;
    if (updateData.delayMinutes !== undefined) payload.delayMinutes = updateData.delayMinutes;
    // Multi-gare: station linkage
    if (updateData.originStationId !== undefined) payload.originStationId = updateData.originStationId;
    if (updateData.destinationStationId !== undefined) payload.destinationStationId = updateData.destinationStationId;

    const departure = await db.departure.update({
      where: { id },
      data: payload,
      include: {
        route: {
          select: {
            id: true,
            name: true,
            origin: true,
            destination: true,
          },
        },
      },
    });

    return NextResponse.json({ departure });
  } catch (error) {
    console.error('[/api/admin/departures] PUT error:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

// ─── DELETE – Delete departure ─────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    if (!['superadmin', 'admin', 'agency'].includes(user.role)) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'L\'identifiant du départ est requis' },
        { status: 400 }
      );
    }

    // Find departure and check ownership
    const existing = await db.departure.findUnique({
      where: { id },
      include: {
        _count: {
          select: { tickets: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Départ introuvable' },
        { status: 404 }
      );
    }

    // Ownership check
    if (user.role === 'agency' && existing.agencyId !== user.agencyId) {
      return NextResponse.json(
        { error: 'Accès non autorisé' },
        { status: 403 }
      );
    }

    // Check for existing tickets
    if (existing._count.tickets > 0) {
      return NextResponse.json(
        { error: 'Impossible de supprimer un départ avec billets' },
        { status: 409 }
      );
    }

    await db.departure.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[/api/admin/departures] DELETE error:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

// ─── CSV Import Handler ────────────────────────────────────────────────

async function handleCsvImport(
  request: NextRequest,
  user: NonNullable<Awaited<ReturnType<typeof getSession>>>
): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'Fichier CSV requis' },
        { status: 400 }
      );
    }

    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);

    if (lines.length < 2) {
      return NextResponse.json(
        { error: 'Le fichier CSV est vide ou ne contient pas de données' },
        { status: 400 }
      );
    }

    // Parse header row
    const headerLine = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
    const expectedHeaders = [
      'departure_type',
      'line_number',
      'destination',
      'date',
      'time',
      'platform',
      'total_seats',
      'available_seats',
    ];

    // Validate headers
    const missingHeaders = expectedHeaders.filter(
      (h) => !headerLine.includes(h)
    );
    if (missingHeaders.length > 0) {
      return NextResponse.json(
        {
          error: `Colonnes manquantes dans le CSV: ${missingHeaders.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Column indices
    const colIndex: Record<string, number> = {};
    headerLine.forEach((h, i) => {
      colIndex[h] = i;
    });

    // Resolve agencyId for import
    // Try to get agencyId from formData or default to user's agency
    const agencyIdFromForm = formData.get('agencyId') as string | null;
    const effectiveAgencyId = resolveAgencyId(user, agencyIdFromForm);
    if (effectiveAgencyId instanceof NextResponse) return effectiveAgencyId;

    // Track created departures
    let createdCount = 0;
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const columns = parseCsvLine(lines[i]);
      try {
        const departureType = (columns[colIndex['departure_type']] || 'OUTBOUND').trim().toUpperCase();
        const lineNumber = columns[colIndex['line_number']].trim();
        const destination = columns[colIndex['destination']].trim();
        const dateStr = columns[colIndex['date']].trim();
        const timeStr = columns[colIndex['time']].trim();
        const platform = columns[colIndex['platform']]?.trim() || null;
        const totalSeats = parseInt(columns[colIndex['total_seats']] || '45', 10);
        const availableSeats = parseInt(columns[colIndex['available_seats']] || '45', 10);
        const routeId = colIndex['route_id'] !== undefined
          ? columns[colIndex['route_id']]?.trim() || null
          : null;

        // Validate required fields
        if (!lineNumber || !destination || !dateStr || !timeStr) {
          errors.push(`Ligne ${i + 1}: champs requis manquants`);
          continue;
        }

        // Validate departure type
        if (!['OUTBOUND', 'RETURN'].includes(departureType)) {
          errors.push(`Ligne ${i + 1}: departure_type invalide (${departureType})`);
          continue;
        }

        // Parse date and time
        const scheduledTime = parseDateTime(dateStr, timeStr);
        if (!scheduledTime) {
          errors.push(`Ligne ${i + 1}: format date/heure invalide (${dateStr} ${timeStr})`);
          continue;
        }

        // Auto-fill destination from route if routeId provided
        let finalDestination = destination;
        if (routeId) {
          const route = await db.route.findUnique({ where: { id: routeId } });
          if (route) {
            finalDestination = destination || route.destination;
          }
        }

        // Create departure
        await db.departure.create({
          data: {
            routeId: routeId || null,
            departureType: departureType as 'OUTBOUND' | 'RETURN',
            lineNumber,
            destination: finalDestination,
            scheduledTime,
            platform,
            totalSeats: isNaN(totalSeats) ? 45 : totalSeats,
            availableSeats: isNaN(availableSeats) ? 45 : availableSeats,
            agencyId: effectiveAgencyId,
          },
        });

        createdCount++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Ligne ${i + 1}: ${msg}`);
      }
    }

    return NextResponse.json({
      success: true,
      createdCount,
      totalRows: lines.length - 1,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('[/api/admin/departures] CSV import error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'import CSV' },
      { status: 500 }
    );
  }
}

// ─── Utility Functions ──────────────────────────────────────────────────

/**
 * Parse a CSV line handling quoted fields (with commas inside quotes)
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Parse a date string (YYYY-MM-DD) and time string (HH:mm) into a Date object.
 */
function parseDateTime(dateStr: string, timeStr: string): Date | null {
  try {
    const dateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const timeMatch = timeStr.match(/^(\d{2}):(\d{2})$/);

    if (!dateMatch || !timeMatch) return null;

    const year = parseInt(dateMatch[1], 10);
    const month = parseInt(dateMatch[2], 10) - 1;
    const day = parseInt(dateMatch[3], 10);
    const hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);

    const date = new Date(year, month, day, hours, minutes, 0, 0);
    if (isNaN(date.getTime())) return null;
    return date;
  } catch {
    return null;
  }
}
