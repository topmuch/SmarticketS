import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET: Récupérer les pubs actives pour l'affichage gare
// ?all=true — admin: lister toutes les pubs
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const all = searchParams.get('all') === 'true';
    const now = new Date();

    if (all) {
      // Admin: return all ads ordered by priority desc then created desc
      const ads = await db.signageAd.findMany({
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      });
      return NextResponse.json(ads);
    }

    const ads = await db.signageAd.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        OR: [
          { endDate: { gte: now } },
          { endDate: null },
        ],
      },
      orderBy: { priority: 'desc' },
      take: 10,
    });

    return NextResponse.json(ads);
  } catch (error) {
    console.error('[/api/signage-ads] GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST: Créer une pub (Superadmin uniquement)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.title || !body.mediaType || !body.mediaUrl || !body.startDate) {
      return NextResponse.json(
        { error: 'Champs requis manquants: title, mediaType, mediaUrl, startDate' },
        { status: 400 }
      );
    }

    const ad = await db.signageAd.create({
      data: {
        title: body.title,
        mediaType: body.mediaType,
        mediaUrl: body.mediaUrl,
        duration: body.duration || 10,
        interval: body.interval || 30,
        startDate: new Date(body.startDate),
        endDate: body.endDate ? new Date(body.endDate) : null,
        priority: body.priority || 0,
        isActive: body.isActive !== undefined ? body.isActive : true,
        createdBy: body.createdBy || 'system',
      },
    });

    return NextResponse.json(ad, { status: 201 });
  } catch (error) {
    console.error('[/api/signage-ads] POST error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
