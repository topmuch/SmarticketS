import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

/**
 * FIX (audit #2): previously NO auth on GET/DELETE/POST — anyone on the internet
 * could list every baggage across every agency, or delete entire QR sets.
 * Now requires a valid session + role check (superadmin/admin/agent).
 * Agency isolation: admin/agent see only their agency's QR codes.
 */

// GET - List all QR code sets, optionally filtered by type and grouped by agency
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    const allowedRoles = ['superadmin', 'admin', 'agent'];
    if (!allowedRoles.includes(session.role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'hajj' or 'voyageur'
    const search = searchParams.get('search');
    const agencyId = searchParams.get('agencyId');

    // Agency isolation: non-superadmin can only see their own agency's QR codes
    const effectiveAgencyId = session.role === 'superadmin' ? agencyId : session.agencyId;

    // Build where clause
    const where: Record<string, unknown> = {};
    
    if (type && type !== 'all') {
      where.type = type;
    }
    
    if (effectiveAgencyId) {
      where.agencyId = effectiveAgencyId;
    }
    
    if (search) {
      where.OR = [
        { reference: { contains: search.toUpperCase() } },
        { setId: { contains: search.toUpperCase() } },
        { travelerFirstName: { contains: search } },
        { travelerLastName: { contains: search } },
      ];
    }

    // Get all baggages
    const baggages = await db.baggage.findMany({
      where,
      include: { agency: true },
      orderBy: { createdAt: 'desc' },
    });

    // Group by setId or create virtual sets based on reference prefix (first part before -)
    const setsMap = new Map<string, {
      id: string;
      setId: string;
      type: string;
      agencyId: string | null;
      agencyName: string | null;
      createdAt: Date;
      qrCount: number;
      references: string[];
      status: string;
      travelerName: string | null;
      baggageIds: string[];
    }>();

    baggages.forEach((baggage) => {
      // Use setId if available, otherwise group by reference prefix (e.g., HAJJ26)
      const setId = baggage.setId || baggage.reference.split('-')[0];
      
      if (!setsMap.has(setId)) {
        setsMap.set(setId, {
          id: setId,
          setId: setId,
          type: baggage.type,
          agencyId: baggage.agencyId,
          agencyName: baggage.agency?.name || null,
          createdAt: baggage.createdAt,
          qrCount: 0,
          references: [],
          status: 'generated',
          travelerName: baggage.travelerFirstName 
            ? `${baggage.travelerFirstName} ${baggage.travelerLastName || ''}`.trim()
            : null,
          baggageIds: [],
        });
      }
      
      const set = setsMap.get(setId)!;
      set.qrCount++;
      set.references.push(baggage.reference);
      set.baggageIds.push(baggage.id);
    });

    // Convert to array and sort by date
    const sets = Array.from(setsMap.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Calculate stats
    const stats = {
      totalSets: sets.length,
      totalQr: baggages.length,
      hajjSets: sets.filter(s => s.type === 'hajj').length,
      voyageurSets: sets.filter(s => s.type === 'voyageur').length,
    };

    return NextResponse.json({
      sets,
      stats,
    });

  } catch (error) {
    console.error('Get QR codes error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Internal server error', details: message },
      { status: 500 }
    );
  }
}

// DELETE - Delete a QR code set
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    // Only admin/superadmin can delete QR sets
    if (!['superadmin', 'admin'].includes(session.role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const setId = searchParams.get('setId');

    if (!setId) {
      return NextResponse.json(
        { error: 'Set ID is required' },
        { status: 400 }
      );
    }

    console.log(`[DELETE QR] Attempting to delete set: ${setId}`);

    // Build the where clause - match by setId OR by reference prefix
    const whereClause = {
      OR: [
        { setId: setId },
        { reference: { startsWith: `${setId}-` } }
      ]
    };

    // Find all baggages matching this set
    const baggages = await db.baggage.findMany({
      where: whereClause,
      select: { id: true, reference: true }
    });

    if (baggages.length === 0) {
      console.log(`[DELETE QR] No baggages found for set: ${setId}`);
      return NextResponse.json(
        { error: 'Set not found', setId },
        { status: 404 }
      );
    }

    console.log(`[DELETE QR] Found ${baggages.length} baggages:`, baggages.map(b => b.reference));

    const baggageIds = baggages.map(b => b.id);

    // Delete baggages (ScanLogs will be cascade deleted automatically)
    const deleteResult = await db.baggage.deleteMany({ 
      where: { id: { in: baggageIds } } 
    });

    console.log(`[DELETE QR] Successfully deleted ${deleteResult.count} baggages`);

    return NextResponse.json({ 
      success: true, 
      deletedCount: deleteResult.count,
      setId,
      deletedReferences: baggages.map(b => b.reference)
    });

  } catch (error) {
    console.error('Delete QR code set error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// POST - Bulk delete multiple QR code sets
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    if (!['superadmin', 'admin'].includes(session.role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const body = await request.json();
    const { setIds } = body as { setIds?: string[] };

    if (!setIds || !Array.isArray(setIds) || setIds.length === 0) {
      return NextResponse.json(
        { error: 'setIds array is required' },
        { status: 400 }
      );
    }

    console.log(`[BULK DELETE QR] Attempting to delete ${setIds.length} sets:`, setIds);

    // Build OR conditions for all setIds
    const orConditions = setIds.flatMap(setId => [
      { setId: setId },
      { reference: { startsWith: `${setId}-` } }
    ]);

    // Find all baggages matching these sets
    const baggages = await db.baggage.findMany({
      where: { OR: orConditions },
      select: { id: true, reference: true }
    });

    if (baggages.length === 0) {
      return NextResponse.json(
        { error: 'No baggages found for the provided sets', setIds },
        { status: 404 }
      );
    }

    console.log(`[BULK DELETE QR] Found ${baggages.length} baggages`);

    const baggageIds = baggages.map(b => b.id);

    // Delete all baggages
    const deleteResult = await db.baggage.deleteMany({
      where: { id: { in: baggageIds } }
    });

    console.log(`[BULK DELETE QR] Successfully deleted ${deleteResult.count} baggages`);

    return NextResponse.json({
      success: true,
      deletedCount: deleteResult.count,
      deletedSetCount: setIds.length,
      setIds,
      deletedReferences: baggages.map(b => b.reference)
    });

  } catch (error) {
    console.error('Bulk delete QR codes error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
