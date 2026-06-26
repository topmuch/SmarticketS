import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/busgo/offers/click
 * Track a click on a sponsored offer.
 * Body: { offerId }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { offerId } = body as { offerId: string };

    if (!offerId) {
      return NextResponse.json({ error: 'offerId requis' }, { status: 400 });
    }

    // Log the click
    await db.busGoOfferClick.create({
      data: {
        offerId,
        userAgent: request.headers.get('user-agent') || null,
      },
    });

    // Increment click count
    await db.busGoSponsoredOffer.update({
      where: { id: offerId },
      data: { clicksCount: { increment: 1 } },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API /api/busgo/offers/click]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
