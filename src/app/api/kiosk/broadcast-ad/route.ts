import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/kiosk/broadcast-ad
 * Superadmin forces a specific ad to display immediately on all kiosks.
 * Forwards the payload to the kiosk-service via HTTP (port 3004).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { adId, adTitle, mediaType, mediaUrl, imageUrl, videoUrl, mobileImageUrl, duration } = body;

    if (!adId || !adTitle || !mediaType || !mediaUrl) {
      return NextResponse.json(
        { error: 'Champs requis manquants: adId, adTitle, mediaType, mediaUrl' },
        { status: 400 }
      );
    }

    // Forward to kiosk-service via HTTP (it will broadcast via WebSocket to all kiosks)
    const kioskServiceUrl = process.env.KIOSK_SERVICE_URL || 'http://localhost:3004';

    try {
      const res = await fetch(`${kioskServiceUrl}/api/internal/broadcast-ad`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adId,
          adTitle,
          mediaType,
          mediaUrl,
          imageUrl: imageUrl || null,
          videoUrl: videoUrl || null,
          mobileImageUrl: mobileImageUrl || null,
          duration: duration || 15,
          stationSlug: body.stationSlug || undefined,
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) {
        return NextResponse.json(
          { error: 'Kiosk service unavailable' },
          { status: 502 }
        );
      }
    } catch {
      // Kiosk service not reachable — return success anyway (ad is already in rotation)
    }

    return NextResponse.json({ success: true, adId, adTitle });
  } catch (error) {
    console.error('[/api/kiosk/broadcast-ad] POST error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
