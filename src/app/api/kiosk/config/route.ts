import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

const CONFIG_KEYS = {
  volume: 'kiosk_volume',
  muted: 'kiosk_muted',
  generalMessage: 'kiosk_generalMessage',
  generalMessageInterval: 'kiosk_generalMessageInterval',
  alertSoundEnabled: 'kiosk_alertSoundEnabled',
};

/* ═══════════════════════════════════════════════════════════════
   GET — Retrieve kiosk config
   ═══════════════════════════════════════════════════════════════ */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const agencyId = url.searchParams.get('agencyId');

    if (!agencyId) {
      return NextResponse.json({ error: 'agencyId requis' }, { status: 400 });
    }

    // Fetch all kiosk settings
    const settings = await db.setting.findMany({
      where: {
        key: { startsWith: 'kiosk_' },
      },
    });

    const settingsMap: Record<string, string> = {};
    for (const s of settings) {
      settingsMap[s.key] = s.value;
    }

    return NextResponse.json({
      volume: parseInt(settingsMap[CONFIG_KEYS.volume] || '100', 10),
      muted: settingsMap[CONFIG_KEYS.muted] === 'true',
      generalMessage: settingsMap[CONFIG_KEYS.generalMessage] || '',
      generalMessageInterval: parseInt(
        settingsMap[CONFIG_KEYS.generalMessageInterval] || '10',
        10,
      ),
      alertSoundEnabled: settingsMap[CONFIG_KEYS.alertSoundEnabled] !== 'false',
    });
  } catch (error) {
    console.error('[/api/kiosk/config] GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/* ═══════════════════════════════════════════════════════════════
   PUT — Update kiosk config
   ═══════════════════════════════════════════════════════════════ */
export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }

    const body = await req.json();
    const { agencyId, volume, muted, generalMessage, generalMessageInterval, alertSoundEnabled } = body;

    const effectiveAgencyId = agencyId || session.agencyId;
    if (!effectiveAgencyId) {
      return NextResponse.json({ error: 'agencyId requis' }, { status: 400 });
    }

    // Upsert each setting
    const upserts = [
      db.setting.upsert({
        where: { key: CONFIG_KEYS.volume },
        update: { value: String(volume ?? 100) },
        create: { key: CONFIG_KEYS.volume, value: String(volume ?? 100) },
      }),
      db.setting.upsert({
        where: { key: CONFIG_KEYS.muted },
        update: { value: String(muted ?? false) },
        create: { key: CONFIG_KEYS.muted, value: String(muted ?? false) },
      }),
      db.setting.upsert({
        where: { key: CONFIG_KEYS.generalMessage },
        update: { value: String(generalMessage ?? '') },
        create: { key: CONFIG_KEYS.generalMessage, value: String(generalMessage ?? '') },
      }),
      db.setting.upsert({
        where: { key: CONFIG_KEYS.generalMessageInterval },
        update: { value: String(generalMessageInterval ?? 10) },
        create: { key: CONFIG_KEYS.generalMessageInterval, value: String(generalMessageInterval ?? 10) },
      }),
      db.setting.upsert({
        where: { key: CONFIG_KEYS.alertSoundEnabled },
        update: { value: String(alertSoundEnabled ?? true) },
        create: { key: CONFIG_KEYS.alertSoundEnabled, value: String(alertSoundEnabled ?? true) },
      }),
    ];

    await Promise.all(upserts);

    return NextResponse.json({
      success: true,
      volume: volume ?? 100,
      muted: muted ?? false,
      generalMessage: generalMessage ?? '',
      generalMessageInterval: generalMessageInterval ?? 10,
      alertSoundEnabled: alertSoundEnabled ?? true,
    });
  } catch (error) {
    console.error('[/api/kiosk/config] PUT error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
