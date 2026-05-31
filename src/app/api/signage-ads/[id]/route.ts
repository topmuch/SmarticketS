import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// PUT: Mettre à jour une pub
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    // Check if ad exists
    const existing = await db.signageAd.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Publicité introuvable' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.mediaType !== undefined) updateData.mediaType = body.mediaType;
    if (body.mediaUrl !== undefined) updateData.mediaUrl = body.mediaUrl;
    if (body.videoUrl !== undefined) updateData.videoUrl = body.videoUrl;
    if (body.imageUrl !== undefined) updateData.imageUrl = body.imageUrl;
    if (body.mobileImageUrl !== undefined) updateData.mobileImageUrl = body.mobileImageUrl;
    if (body.duration !== undefined) updateData.duration = body.duration;
    if (body.interval !== undefined) updateData.interval = body.interval;
    if (body.startDate !== undefined) updateData.startDate = new Date(body.startDate);
    if (body.endDate !== undefined) updateData.endDate = body.endDate ? new Date(body.endDate) : null;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.priority !== undefined) updateData.priority = body.priority;

    const ad = await db.signageAd.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(ad);
  } catch (error) {
    console.error('[/api/signage-ads] PUT error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE: Supprimer une pub
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.signageAd.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Publicité introuvable' }, { status: 404 });
    }

    await db.signageAd.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[/api/signage-ads] DELETE error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
