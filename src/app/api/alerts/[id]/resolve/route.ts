import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

/**
 * POST /api/alerts/[id]/resolve
 *
 * Mark an alert as resolved with audit trail.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id } = await params;

    const alert = await db.alert.findUnique({ where: { id } });
    if (!alert) {
      return NextResponse.json({ error: 'Alerte non trouvée' }, { status: 404 });
    }

    // Agency isolation
    if (session.role !== 'superadmin' && alert.agencyId !== session.agencyId) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    if (alert.status === 'resolved') {
      return NextResponse.json({ error: 'Alerte déjà traitée' }, { status: 400 });
    }

    const updated = await db.alert.update({
      where: { id },
      data: {
        status: 'resolved',
        resolvedAt: new Date(),
        resolvedBy: session.name || 'Agence',
      },
    });

    return NextResponse.json({
      success: true,
      alert: updated,
    });
  } catch (error) {
    console.error('[/api/alerts/[id]/resolve] POST error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
