import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const VOICES_DIR = path.join(process.cwd(), 'public', 'audio', 'voices');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a'];

const SETTING_KEYS = {
  url: 'kiosk_customVoiceUrl',
  name: 'kiosk_customVoiceName',
  uploadedAt: 'kiosk_customVoiceUploadedAt',
} as const;

/* ═══════════════════════════════════════════════════════════════
   GET — Retrieve current custom voice info
   ═══════════════════════════════════════════════════════════════ */
export async function GET() {
  try {
    const settings = await db.setting.findMany({
      where: {
        key: { in: [SETTING_KEYS.url, SETTING_KEYS.name, SETTING_KEYS.uploadedAt] },
      },
    });

    const map: Record<string, string> = {};
    for (const s of settings) {
      map[s.key] = s.value;
    }

    return NextResponse.json({
      url: map[SETTING_KEYS.url] || null,
      name: map[SETTING_KEYS.name] || null,
      uploadedAt: map[SETTING_KEYS.uploadedAt] || null,
    });
  } catch (error) {
    console.error('[/api/kiosk/voice] GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/* ═══════════════════════════════════════════════════════════════
   POST — Upload a custom voice recording
   ═══════════════════════════════════════════════════════════════ */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'Fichier requis (champ "file")' },
        { status: 400 },
      );
    }

    // Validate extension
    const originalName = file.name;
    const ext = path.extname(originalName).toLowerCase();
    if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: `Type de fichier non supporté. Formats acceptés : ${ALLOWED_EXTENSIONS.join(', ')}` },
        { status: 400 },
      );
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Fichier trop volumineux. Taille maximale : 5 MB` },
        { status: 400 },
      );
    }

    // Ensure voices directory exists
    await fs.mkdir(VOICES_DIR, { recursive: true });

    // Generate unique filename
    const uniqueId = crypto.randomUUID().slice(0, 8);
    const filename = `voice-${Date.now()}-${uniqueId}${ext}`;
    const filePath = path.join(VOICES_DIR, filename);

    // Write file to disk
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    // Build public URL path
    const voiceUrl = `/audio/voices/${filename}`;

    // Persist metadata in Settings
    const now = new Date().toISOString();

    await db.setting.upsert({
      where: { key: SETTING_KEYS.url },
      update: { value: voiceUrl },
      create: { key: SETTING_KEYS.url, value: voiceUrl },
    });
    await db.setting.upsert({
      where: { key: SETTING_KEYS.name },
      update: { value: originalName },
      create: { key: SETTING_KEYS.name, value: originalName },
    });
    await db.setting.upsert({
      where: { key: SETTING_KEYS.uploadedAt },
      update: { value: now },
      create: { key: SETTING_KEYS.uploadedAt, value: now },
    });

    return NextResponse.json({
      success: true,
      url: voiceUrl,
      name: originalName,
    });
  } catch (error) {
    console.error('[/api/kiosk/voice] POST error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/* ═══════════════════════════════════════════════════════════════
   DELETE — Remove custom voice file & clear settings
   ═══════════════════════════════════════════════════════════════ */
export async function DELETE() {
  try {
    // Read current voice URL to know which file to delete
    const urlSetting = await db.setting.findUnique({
      where: { key: SETTING_KEYS.url },
    });

    if (urlSetting?.value) {
      // Resolve the file on disk
      const filename = path.basename(urlSetting.value);
      const filePath = path.join(VOICES_DIR, filename);

      // Best-effort file removal
      try {
        await fs.unlink(filePath);
      } catch {
        // File may already be gone — continue cleanup
      }
    }

    // Clear all three setting keys
    await db.setting.deleteMany({
      where: {
        key: { in: [SETTING_KEYS.url, SETTING_KEYS.name, SETTING_KEYS.uploadedAt] },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[/api/kiosk/voice] DELETE error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
