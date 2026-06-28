import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

/**
 * GET /api/agency/logo/[agencyId]
 * Redirects to the agency logo URL (or 404 if not set).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agencyId: string }> }
) {
  try {
    const { agencyId } = await params;
    const agency = await db.agency.findUnique({
      where: { id: agencyId },
      select: { logoUrl: true },
    });

    if (!agency || !agency.logoUrl) {
      return new NextResponse(null, { status: 404 });
    }

    // Redirect to the logo URL (could be /upload/logos/xxx.png)
    return NextResponse.redirect(new URL(agency.logoUrl, request.url));
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}

/**
 * POST /api/agency/logo
 * Upload a logo for the current user's agency.
 * FormData: file (image/png, image/jpeg, image/webp)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    let agencyId = session.agencyId;
    if (!agencyId) {
      if (session.role !== 'superadmin') {
        return NextResponse.json({ error: 'Aucune agence' }, { status: 403 });
      }
      const firstAgency = await db.agency.findFirst();
      if (!firstAgency) return NextResponse.json({ error: 'Aucune agence' }, { status: 400 });
      agencyId = firstAgency.id;
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 });
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Type non autorisé: ${file.type}. Acceptés: PNG, JPEG, WebP, SVG` },
        { status: 400 }
      );
    }

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'Max 2MB' }, { status: 400 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    const filename = `logo-${randomUUID()}.${ext}`;
    const uploadDir = join(process.cwd(), 'public', 'upload', 'logos');
    await mkdir(uploadDir, { recursive: true });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(join(uploadDir, filename), buffer);

    const url = `/upload/logos/${filename}`;

    await db.agency.update({
      where: { id: agencyId },
      data: { logoUrl: url },
    });

    return NextResponse.json({ success: true, url });
  } catch (error) {
    console.error('[API /api/agency/logo POST]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
