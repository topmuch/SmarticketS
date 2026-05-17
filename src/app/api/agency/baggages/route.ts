import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { normalizeStatus, isPending, isActive, statusFilterIn } from '@/lib/status';

// GET - List all baggages for an agency
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agencyId = searchParams.get('agencyId');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    if (!agencyId) {
      return NextResponse.json(
        { error: 'Agency ID is required' },
        { status: 400 }
      );
    }

    // Build where clause — NO status filter by default (show ALL baggages)
    const where: Record<string, unknown> = { agencyId };

    // If a specific status filter is requested, match BOTH French and English variants
    if (status && status !== 'all') {
      where.status = statusFilterIn(status as 'pending_activation' | 'active' | 'scanned' | 'lost' | 'found' | 'blocked');
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

    // Calculate stats using normalized statuses
    const stats = {
      total: normalizedBaggages.length,
      pending: normalizedBaggages.filter(b => isPending(b.status)).length,
      active: normalizedBaggages.filter(b => isActive(b.status)).length,
      scanned: normalizedBaggages.filter(b => b.status === 'scanned').length,
      lost: normalizedBaggages.filter(b => b.status === 'lost').length,
      found: normalizedBaggages.filter(b => b.status === 'found').length,
      delivered: normalizedBaggages.filter(b => b.status === 'delivered').length,
      inTransit: normalizedBaggages.filter(b => b.status === 'in_transit').length,
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
