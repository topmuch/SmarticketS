import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { evaluateAlerts } from '@/lib/alertEngine';

export const dynamic = 'force-dynamic';

/**
 * POST /api/alerts/evaluate
 *
 * Trigger alert evaluation for a specific rule type.
 * Body: { eventType: string, payload?: object, agencyId?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await req.json();
    const { eventType, payload, agencyId } = body;

    if (!eventType || typeof eventType !== 'string') {
      return NextResponse.json({ error: 'eventType requis' }, { status: 400 });
    }

    const targetAgencyId = agencyId || session.agencyId || '';
    if (!targetAgencyId) {
      return NextResponse.json({ error: 'Aucune agence associée' }, { status: 400 });
    }

    const result = await evaluateAlerts(eventType, payload, targetAgencyId);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[/api/alerts/evaluate] POST error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
