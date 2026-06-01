import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';
import { evaluateAlerts } from '@/lib/alertEngine';

export const dynamic = 'force-dynamic';

/**
 * GET /api/alerts?type=...&status=...&category=...
 *
 * List alerts for the current agency with filters.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const agencyId = session.agencyId;
    if (!agencyId) {
      return NextResponse.json({ error: 'Aucune agence associée' }, { status: 400 });
    }

    const url = new URL(req.url);
    const type = url.searchParams.get('type') || undefined;
    const status = url.searchParams.get('status') || undefined;
    const category = url.searchParams.get('category') || undefined;

    const where: Record<string, unknown> = { agencyId };
    if (type) where.type = type;
    if (status) where.status = status;
    if (category) where.category = category;

    const [alerts, counts] = await Promise.all([
      db.alert.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      db.alert.groupBy({
        by: ['status'],
        where: { agencyId },
        _count: true,
      }),
    ]);

    const totalNew = counts.find((c) => c.status === 'new')?._count || 0;
    const totalRead = counts.find((c) => c.status === 'read')?._count || 0;
    const totalResolved = counts.find((c) => c.status === 'resolved')?._count || 0;

    return NextResponse.json({
      alerts: alerts.map((a) => ({
        id: a.id,
        type: a.type,
        severity: a.severity,
        category: a.category,
        title: a.title,
        message: a.message,
        tripId: a.tripId || null,
        baggageId: a.baggageId || null,
        payload: a.payload ? JSON.parse(a.payload) : null,
        status: a.status,
        resolvedAt: a.resolvedAt,
        resolvedBy: a.resolvedBy,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      })),
      counts: { new: totalNew, read: totalRead, resolved: totalResolved },
    });
  } catch (error) {
    console.error('[/api/alerts] GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
