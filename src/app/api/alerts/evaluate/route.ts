import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { evaluateAlerts } from '@/lib/alertEngine';
import { validateBody } from '@/lib/validation';
import { evaluateAlertSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

/**
 * POST /api/alerts/evaluate
 *
 * Trigger alert evaluation for a specific rule type.
 * Body: { eventType: string, payload?: object, agencyId?: string }
 *
 * After creating alerts via evaluateAlerts(), forwards new alerts to the
 * alert-service WebSocket via HTTP POST so they are broadcast in real-time.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = validateBody(evaluateAlertSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error, details: parsed.details }, { status: 400 });
    }

    const { eventType, payload } = parsed.data;
    const targetAgencyId = parsed.data.agencyId || session.agencyId || '';
    if (!targetAgencyId) {
      return NextResponse.json({ error: 'Aucune agence associée' }, { status: 400 });
    }

    const result = await evaluateAlerts(eventType, payload, targetAgencyId);

    // Forward new alerts to the alert-service for WebSocket broadcast
    if (result.created > 0 && result.alerts.length > 0) {
      try {
        const alertServiceUrl = `http://localhost:3003/api/internal/evaluate`;
        // W15 fix: removed hardcoded dev fallback 'smartickets-dev-only'
        // If INTERNAL_SECRET is not set, skip forwarding (safer than using a known secret)
        const internalSecret = process.env.INTERNAL_SECRET;
        if (!internalSecret) {
          console.warn('[alerts/evaluate] INTERNAL_SECRET not set — skipping alert-service forward');
        } else {
          const forwardRes = await fetch(alertServiceUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${internalSecret}`,
            },
            body: JSON.stringify({
              eventType,
              agencyId: targetAgencyId,
              payload,
            }),
            signal: AbortSignal.timeout(5000),
          });

          if (!forwardRes.ok) {
            console.warn(
              `[/api/alerts/evaluate] Failed to forward to alert-service: ${forwardRes.status}`
            );
          }
        }
      } catch (forwardError) {
        // Non-blocking: don't fail the main request if alert-service is down
        console.warn(
          '[/api/alerts/evaluate] Alert-service unreachable (non-blocking):',
          forwardError instanceof Error ? forwardError.message : forwardError
        );
      }
    }

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[/api/alerts/evaluate] POST error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
