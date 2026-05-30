import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier' }, { status: 400 });
    }

    // Valider le type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Type non autorisé. Utilisez JPG, PNG, GIF, WebP ou MP4.' },
        { status: 400 }
      );
    }

    // Limiter la taille (50 MB)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'Fichier trop volumineux (max 50 MB)' }, { status: 400 });
    }

    // Générer un nom unique
    const ext = file.name.split('.').pop() || 'bin';
    const filename = `${randomUUID()}.${ext}`;

    // Créer le dossier
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'ads');
    await mkdir(uploadDir, { recursive: true });

    // Sauvegarder le fichier
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filepath = join(uploadDir, filename);
    await writeFile(filepath, buffer);

    const publicUrl = `/uploads/ads/${filename}`;

    return NextResponse.json({
      success: true,
      filename,
      url: publicUrl,
      type: file.type.startsWith('image') ? 'IMAGE' : 'VIDEO',
      size: file.size,
    });
  } catch (error) {
    console.error('[/api/upload] POST error:', error);
    return NextResponse.json({ error: 'Erreur lors de l\'upload' }, { status: 500 });
  }
}
