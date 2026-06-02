import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

/* ═══════════════════════════════════════════════════════════════
   POST — Broadcast general message to kiosk screens
   Fallback API when WebSocket kiosk-service is not running.
   Stores broadcast in settings, picked up by kiosk on next poll.
   ═══════════════════════════════════════════════════════════════ */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }

    const body = await req.json();
    const { text, stationSlug, agencyId } = body;

    // Verify agency ownership
    const effectiveAgencyId = agencyId || session.agencyId;
    if (session.role !== 'admin' && session.role !== 'superadmin' && session.agencyId !== effectiveAgencyId) {
      return NextResponse.json({ success: false, error: 'Accès non autorisé' }, { status: 403 });
    }

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Message requis' }, { status: 400 });
    }

    // Import db dynamically
    const { db } = await import('@/lib/db');

    const broadcastData = JSON.stringify({
      text: text.trim(),
      timestamp: Date.now(),
      agencyId: agencyId || null,
    });

    // Store per-station broadcast
    await db.setting.upsert({
      where: { key: `kiosk_broadcast_${stationSlug || 'all'}` },
      update: { value: broadcastData },
      create: { key: `kiosk_broadcast_${stationSlug || 'all'}`, value: broadcastData },
    });

    // Also store global broadcast for any station to pick up
    await db.setting.upsert({
      where: { key: 'kiosk_broadcast_global' },
      update: { value: broadcastData },
      create: { key: 'kiosk_broadcast_global', value: broadcastData },
    });

    return NextResponse.json({ success: true, message: 'Message diffusé' });
  } catch (error) {
    console.error('[/api/kiosk/broadcast] POST error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
