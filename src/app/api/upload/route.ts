import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { existsSync } from 'fs';

/* ═══════════════════════════════════════════════════════════════
   Configuration
   ═══════════════════════════════════════════════════════════════ */
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'];
const ALL_ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];
const MAX_SIZE = 50 * 1024 * 1024; // 50 MB
const UPLOAD_DIR = join(process.cwd(), 'public', 'upload');

/* ═══════════════════════════════════════════════════════════════
   MIME → Extension mapping
   ═══════════════════════════════════════════════════════════════ */
const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
};

/* ═══════════════════════════════════════════════════════════════
   Sanitize filename — strip any path separators and suspicious chars
   ═══════════════════════════════════════════════════════════════ */
function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.{2,}/g, '.');
}

/* ═══════════════════════════════════════════════════════════════
   POST — Upload a single file
   ═══════════════════════════════════════════════════════════════ */
export async function POST(request: NextRequest) {
  try {
    /* ── 1. Auth ─────────────────────────────────────────── */
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      );
    }

    /* ── 2. Parse FormData ──────────────────────────────── */
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: 'Fichier manquant. Envoyez un champ "file" en multipart/form-data.' },
        { status: 400 }
      );
    }

    /* ── 3. Validate MIME type ──────────────────────────── */
    const mimeType = file.type;
    if (!ALL_ALLOWED_TYPES.includes(mimeType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Type MIME non autorisé : "${mimeType}". Types acceptés : images (jpeg, png, gif, webp) et vidéos (mp4, webm).`,
        },
        { status: 400 }
      );
    }

    /* ── 4. Validate file size ───────────────────────────── */
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: `Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(1)} MB). Taille maximale : 50 MB.`,
        },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { success: false, error: 'Fichier vide (0 octet).' },
        { status: 400 }
      );
    }

    /* ── 5. Determine media type ───────────────────────── */
    const explicitType = formData.get('type') as string | null;
    const isImage = ALLOWED_IMAGE_TYPES.includes(mimeType);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(mimeType);
    const mediaType = explicitType === 'VIDEO' && isVideo
      ? 'VIDEO'
      : explicitType === 'IMAGE' && isImage
        ? 'IMAGE'
        : isImage
          ? 'IMAGE'
          : 'VIDEO';

    /* ── 6. Generate unique filename ───────────────────── */
    const ext = MIME_EXT[mimeType] || 'bin';
    const originalSanitized = sanitizeFilename(file.name.replace(/\.[^.]+$/, ''));
    const uniqueName = `${Date.now()}-${randomUUID()}-${originalSanitized || 'file'}.${ext}`;

    /* ── 7. Ensure upload directory exists ──────────────── */
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    /* ── 8. Read file buffer and write to disk ──────────── */
    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = join(UPLOAD_DIR, uniqueName);
    await writeFile(filePath, buffer);

    /* ── 9. Return success response ─────────────────────── */
    return NextResponse.json({
      success: true,
      url: `/upload/${uniqueName}`,
      type: mediaType,
      filename: uniqueName,
      size: file.size,
    });
  } catch (error) {
    console.error('[/api/upload] POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur lors du téléchargement du fichier.' },
      { status: 500 }
    );
  }
}
