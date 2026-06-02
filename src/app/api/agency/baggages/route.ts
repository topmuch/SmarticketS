import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { normalizeStatus, isPending, isActive, statusFilterIn } from '@/lib/status';
import { getSession } from '@/lib/session';

// GET - List all baggages for an agency
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const agencyId = searchParams.get('agencyId') || session.agencyId;

    if (session.role !== 'admin' && session.role !== 'superadmin' && session.agencyId !== agencyId) {
      return NextResponse.json({ success: false, error: 'Accès non autorisé' }, { status: 403 });
    }
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const stationId = searchParams.get('stationId');

    if (!agencyId) {
      return NextResponse.json(
        { error: 'Agency ID is required' },
        { status: 400 }
      );
    }

    // Build where clause — NO status filter by default (show ALL baggages)
    const where: Record<string, unknown> = { agencyId };

    // Station filter: specific station or "null" for unassigned baggages
    if (stationId === 'null') {
      where.stationId = null;
    } else if (stationId) {
      where.stationId = stationId;
    }

    // If a specific status filter is requested, match BOTH French and English variants
    if (status && status !== 'all') {
      where.status = statusFilterIn(status as 'pending_activation' | 'active' | 'scanned' | 'lost' | 'found' | 'blocked');
    }

    // Category filter: parcel | ticket | hajj
    if (category && category !== 'all') {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { reference: { contains: search } },
        { travelerFirstName: { contains: search } },
        { travelerLastName: { contains: search } },
      ];
    }

    const baggages = await db.baggage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Normalize statuses in response (frontend always gets English format)
    const normalizedBaggages = baggages.map(b => ({
      ...b,
      status: normalizeStatus(b.status),
    }));

    // Calculate stats using normalized statuses + category breakdown
    const stats = {
      total: normalizedBaggages.length,
      pending: normalizedBaggages.filter(b => isPending(b.status)).length,
      active: normalizedBaggages.filter(b => isActive(b.status)).length,
      scanned: normalizedBaggages.filter(b => b.status === 'scanned').length,
      lost: normalizedBaggages.filter(b => b.status === 'lost').length,
      found: normalizedBaggages.filter(b => b.status === 'found').length,
      delivered: normalizedBaggages.filter(b => b.status === 'delivered').length,
      inTransit: normalizedBaggages.filter(b => b.status === 'in_transit').length,
      byCategory: {
        parcel: normalizedBaggages.filter(b => b.category === 'parcel').length,
        ticket: normalizedBaggages.filter(b => b.category === 'ticket').length,
        hajj: normalizedBaggages.filter(b => b.category === 'hajj').length,
      },
    };

    return NextResponse.json({
      baggages: normalizedBaggages,
      stats
    });

  } catch (error) {
    console.error('Get baggages error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
