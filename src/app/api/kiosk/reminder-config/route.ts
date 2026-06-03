import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

const CONFIG_KEY = 'kiosk_reminderConfig';

/* ═══════════════════════════════════════════════════════════════
   GET — Retrieve reminder configuration
   ═══════════════════════════════════════════════════════════════ */
export async function GET() {
  try {
    const setting = await db.setting.findUnique({
      where: { key: CONFIG_KEY },
    });

    if (!setting) {
      // Return default config
      return NextResponse.json({
        reminders: {
          BAGAGES: { enabled: true, intervalMinutes: 45 },
          VALEURS: { enabled: true, intervalMinutes: 90 },
          CLOTURE_BILLETTERIE: { enabled: true, intervalMinutes: 0 },
          PLUIE: { enabled: false, intervalMinutes: 30 },
          FESTIVE: { enabled: false, intervalMinutes: 30 },
        },
        closingTime: '20:00',
        isRaining: false,
        isHolidayMode: false,
        holidayStartDate: null,
        holidayEndDate: null,
      });
    }

    const config = JSON.parse(setting.value);
    return NextResponse.json(config);
  } catch (error) {
    console.error('[/api/kiosk/reminder-config] GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/* ═══════════════════════════════════════════════════════════════
   PUT — Update reminder configuration
   ═══════════════════════════════════════════════════════════════ */
export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Non authentifié' }, { status: 401 });
    }

    const body = await req.json();
    const {
      reminders,
      closingTime,
      isRaining,
      isHolidayMode,
      holidayStartDate,
      holidayEndDate,
    } = body;

    // Build the config object
    const config = {
      reminders: reminders || {},
      closingTime: closingTime || '20:00',
      isRaining: isRaining ?? false,
      isHolidayMode: isHolidayMode ?? false,
      holidayStartDate: holidayStartDate || null,
      holidayEndDate: holidayEndDate || null,
    };

    // Persist to database
    await db.setting.upsert({
      where: { key: CONFIG_KEY },
      update: { value: JSON.stringify(config) },
      create: { key: CONFIG_KEY, value: JSON.stringify(config) },
    });

    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error('[/api/kiosk/reminder-config] PUT error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
