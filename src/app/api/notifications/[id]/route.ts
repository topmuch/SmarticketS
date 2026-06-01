import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

// DELETE /api/notifications/[id] — Soft-delete (mark as read) a notification
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id } = await params;

    // Verify the notification exists
    const existing = await db.notification.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Notification introuvable' }, { status: 404 });
    }

    // Agency isolation
    if (existing.agencyId && session.agencyId && existing.agencyId !== session.agencyId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    // Soft-delete: mark as read
    await db.notification.update({
      where: { id },
      data: { read: true, updatedAt: new Date() },
    });

    return NextResponse.json({ success: true, deleted: id });
  } catch (error) {
    console.error('[Notifications/[id]] DELETE error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
