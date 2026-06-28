import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

/**
 * GET /api/admin/busgo-offres
 * Liste toutes les offres (admin).
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session || !['superadmin', 'admin'].includes(session.role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const offers = await db.busGoSponsoredOffer.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ data: offers });
  } catch (error) {
    console.error('[API admin/busgo-offres GET]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * POST /api/admin/busgo-offres
 * Crée une offre (alias de /api/busgo/offers POST).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !['superadmin', 'admin'].includes(session.role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, imageUrl, partnerName, actionUrl, actionLabel, targetAudience, startDate, endDate, priority } = body;

    if (!title || !description || !partnerName || !actionUrl) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 });
    }

    const offer = await db.busGoSponsoredOffer.create({
      data: {
        title,
        description,
        imageUrl: imageUrl || null,
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
    console.error('[API admin/busgo-offres POST]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/busgo-offres?id=xxx
 * Met à jour une offre (isActive, priority, etc).
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !['superadmin', 'admin'].includes(session.role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 });

    const body = await request.json();
    const updated = await db.busGoSponsoredOffer.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl }),
        ...(body.partnerName !== undefined && { partnerName: body.partnerName }),
        ...(body.actionUrl !== undefined && { actionUrl: body.actionUrl }),
        ...(body.actionLabel !== undefined && { actionLabel: body.actionLabel }),
        ...(body.targetAudience !== undefined && { targetAudience: body.targetAudience }),
        ...(body.startDate !== undefined && { startDate: new Date(body.startDate) }),
        ...(body.endDate !== undefined && { endDate: body.endDate ? new Date(body.endDate) : null }),
        ...(body.priority !== undefined && { priority: body.priority }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('[API admin/busgo-offres PATCH]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/busgo-offres?id=xxx
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !['superadmin', 'admin'].includes(session.role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 });

    await db.busGoOfferClick.deleteMany({ where: { offerId: id } });
    await db.busGoSponsoredOffer.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API admin/busgo-offres DELETE]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
