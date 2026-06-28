import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { getSession } from '@/lib/session';
import { randomUUID } from 'crypto';

/**
 * POST /api/busgo/upload
 *
 * Upload d'un fichier audio (MP3/WAV/OGG) pour les annonces BusGo.
 * Utilisé par la page "Voix & Annonces" pour uploader:
 *   - dingDongUrl (chime joué avant chaque annonce)
 *   - messageH130AudioUrl, messageH5AudioUrl, etc.
 *
 * FIX: cette route était manquante (supprimée ou jamais créée) → l'upload
 * retournait "Server action not found" (404).
 *
 * Le fichier est sauvegardé dans /public/sounds/busgo/{uuid}.{ext}
 * et l'URL retournée est /sounds/busgo/{uuid}.{ext}
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/x-m4a', 'audio/aac'];
    const allowedExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac'];
    const fileExt = path.extname(file.name).toLowerCase();

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExt)) {
      return NextResponse.json(
        { error: `Type non autorisé: ${file.type || fileExt}. Formats acceptés: MP3, WAV, OGG, M4A` },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Fichier trop volumineux (max 10MB)' },
        { status: 400 }
      );
    }

    // Ensure directory exists
    const uploadDir = path.join(process.cwd(), 'public', 'sounds', 'busgo');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Generate unique filename
    const ext = fileExt || '.mp3';
    const filename = `${randomUUID()}${ext}`;
    const filepath = path.join(uploadDir, filename);

    // Write file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await writeFile(filepath, buffer);

    // Return the public URL
    const url = `/sounds/busgo/${filename}`;

    console.log(`[upload] Audio file uploaded: ${file.name} → ${url} (${file.size} bytes)`);

    return NextResponse.json({
      success: true,
      url,
      filename: file.name,
      size: file.size,
    });
  } catch (error) {
    console.error('[API /api/busgo/upload]', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de l\'upload' },
      { status: 500 }
    );
  }
}
