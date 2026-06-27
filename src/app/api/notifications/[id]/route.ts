import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

/**
 * DELETE /api/notifications/[id] — Permanently delete a notification.
 *
 * W13 fix (audit): previously this route was named DELETE but actually did a
 * soft-delete (set read=true). That was confusing — the API contract said
 * "delete" but the data persisted. Now it actually deletes the record.
 *
 * To mark as read (without deleting), use POST /api/notifications/[id]/read.
 */
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

    // Agency isolation — superadmin can delete any; admin/agent only their agency's
    if (session.role !== 'superadmin') {
      if (existing.agencyId && existing.agencyId !== session.agencyId) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
      }
    }

    // W13 fix: actually DELETE the record (was soft-delete before)
    await db.notification.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, deleted: id });
  } catch (error) {
    console.error('[Notifications/[id]] DELETE error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
