import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/busgo/offers?role=passenger
 *
 * Renvoie max 3 offres actives pour l'audience cible.
 * Filtre par dates (start/end) et statut actif.
 * Trie par priorité (desc) puis aléatoire.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role') || 'all';

    const now = new Date();

    const offers = await db.busGoSponsoredOffer.findMany({
      where: {
        isActive: true,
        targetAudience: { in: [role, 'all'] },
        startDate: { lte: now },
        OR: [
          { endDate: null },
          { endDate: { gte: now } },
        ],
      },
      orderBy: [
        { priority: 'desc' },
      ],
      take: 10, // Get more than 3, then randomly pick 3
    });

    // Rule of 3 max: randomly pick 3 from the top priority offers
    const shuffled = offers.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 3);

    return NextResponse.json({ data: selected });
  } catch (error) {
    console.error('[API /api/busgo/offers GET]', error);
    return NextResponse.json({ data: [] });
  }
}

/**
 * POST /api/busgo/offers (admin only)
 * Crée une nouvelle offre sponsorisée.
 */
export async function POST(request: NextRequest) {
  try {
    const { getSession } = await import('@/lib/session');
    const session = await getSession();
    if (!session || !['superadmin', 'admin'].includes(session.role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, imageUrl, videoUrl, partnerName, actionUrl, actionLabel, targetAudience, startDate, endDate, priority } = body;

    if (!title || !description || !partnerName || !actionUrl) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 });
    }

    const offer = await db.busGoSponsoredOffer.create({
      data: {
        title,
        description,
        imageUrl: imageUrl || null,
        videoUrl: videoUrl || null,
        partnerName,
        actionUrl,
        actionLabel: actionLabel || 'Voir',
        targetAudience: targetAudience || 'all',
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        priority: priority || 0,
        isActive: true,
      },
    });

    return NextResponse.json({ data: offer }, { status: 201 });
  } catch (error) {
    console.error('[API /api/busgo/offers POST]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
