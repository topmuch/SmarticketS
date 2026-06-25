import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

/**
 * POST /api/busgo/upload
 *
 * Upload d'un fichier audio MP3 pour les annonces BusGo.
 * Sauvegarde dans /public/sounds/busgo/ et retourne l'URL publique.
 *
 * FormData: file (audio/mp3, audio/mpeg, audio/wav)
 * Returns: { url: "/sounds/busgo/uuid-filename.mp3" }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 });
    }

    // Valider le type MIME
    const allowedTypes = ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/m4a'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Type non autorisé: ${file.type}. Formats acceptés: MP3, WAV, OGG, M4A` },
        { status: 400 }
      );
    }

    // Valider la taille (max 10 MB)
    const maxSize = 10 * 1024 * 1024; // 10 MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `Fichier trop volumineux: ${Math.round(file.size / 1024 / 1024)}MB. Max: 10MB` },
        { status: 400 }
      );
    }

    // Générer un nom de fichier unique
    const ext = file.name.split('.').pop()?.toLowerCase() || 'mp3';
    const filename = `${randomUUID()}.${ext}`;
    const uploadDir = join(process.cwd(), 'public', 'sounds', 'busgo');

    // Créer le dossier s'il n'existe pas
    await mkdir(uploadDir, { recursive: true });

    // Sauvegarder le fichier
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filepath = join(uploadDir, filename);
    await writeFile(filepath, buffer);

    // URL publique
    const url = `/sounds/busgo/${filename}`;

    console.log(`[BusGo Upload] Fichier sauvegardé: ${url} (${Math.round(file.size / 1024)}KB)`);

    return NextResponse.json({
      success: true,
      url,
      filename: file.name,
      size: file.size,
    });
  } catch (error) {
    console.error('[API /api/busgo/upload]', error);
    return NextResponse.json(
      { error: 'Erreur serveur', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
