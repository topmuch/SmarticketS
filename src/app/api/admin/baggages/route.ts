import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';
import { normalizeStatus } from '@/lib/status';

// GET - List baggages with status filter (admin/superadmin only)
export async function GET(request: NextRequest) {
  try {
    // Auth check: require superadmin or admin
    const user = await getSession();
    if (!user || (user.role !== 'superadmin' && user.role !== 'admin')) {
      return NextResponse.json(
        { error: 'Accès non autorisé' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '200', 10);

    // Build where clause
    const where: Record<string, unknown> = {};

    // Status filter (comma-separated)
    if (statusParam) {
      const statuses = statusParam.split(',').map(s => s.trim()).filter(Boolean);
      if (statuses.length > 0) {
        // Normalize each status and match both French and English variants
        const normalizedStatuses = statuses.map(s => normalizeStatus(s));
        const statusFilters: string[] = [];
        for (const ns of normalizedStatuses) {
          statusFilters.push(ns);
          // Add French aliases
          const frenchAliases: Record<string, string> = {
            delivered: 'LIVRÉ',
            found: 'TROUVÉ',
            in_transit: 'EN_TRANSIT',
          };
          if (frenchAliases[ns]) {
            statusFilters.push(frenchAliases[ns]);
            statusFilters.push(frenchAliases[ns].toLowerCase());
          }
        }
        where.status = { in: statusFilters };
      }
    }

    // Search filter
    if (search) {
      where.OR = [
        { reference: { contains: search } },
        { travelerFirstName: { contains: search } },
        { travelerLastName: { contains: search } },
        { receiverName: { contains: search } },
      ];
    }

    const baggages = await db.baggage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        agency: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    // Normalize statuses
    const normalizedBaggages = baggages.map(b => ({
      ...b,
      status: normalizeStatus(b.status),
    }));

    // Calculate stats
    const allBaggages = normalizedBaggages;
    const stats = {
      total: allBaggages.length,
      delivered: allBaggages.filter(b => b.status === 'delivered').length,
      found: allBaggages.filter(b => b.status === 'found').length,
    };

    return NextResponse.json({
      baggages: normalizedBaggages,
      stats,
    });

  } catch (error) {
    console.error('Get admin baggages error:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
