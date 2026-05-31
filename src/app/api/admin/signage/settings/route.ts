import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

// ─── Settings Schema ─────────────────────────────────────────────────────

const signageSettingsSchema = z.object({
  stationName: z.string().min(1, 'Le nom de la station est requis').max(100),
  alertThresholdMinutes: z
    .number()
    .int()
    .min(1, 'Minimum 1 minute')
    .max(30, 'Maximum 30 minutes')
    .default(5),
  alertSoundEnabled: z.boolean().default(true),
  tickerMessages: z
    .array(
      z.object({
        id: z.string(),
        text: z.string().min(1).max(200),
        priority: z.enum(['info', 'urgent']).default('info'),
        active: z.boolean().default(true),
      }),
    )
    .default([]),
  logoUrl: z.string().url().optional().or(z.literal('')),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().or(z.literal('')),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().or(z.literal('')),
});

// ─── Default Settings ──────────────────────────────────────────────────────

const DEFAULTS = {
  stationName: 'Gare Routière',
  alertThresholdMinutes: 5,
  alertSoundEnabled: true,
  tickerMessages: [] as z.infer<typeof signageSettingsSchema>['tickerMessages'],
  logoUrl: '',
  primaryColor: '#1e3a5f',
  secondaryColor: '#2563eb',
};

// ─── Helper: Read all settings from Setting table ──────────────────────────

async function readAllSettings(): Promise<z.infer<typeof signageSettingsSchema>> {
  const settings = await db.setting.findMany({
    where: {
      key: {
        startsWith: 'signage_',
      },
    },
  });

  const map: Record<string, string> = {};
  for (const s of settings) {
    map[s.key] = s.value;
  }

  return {
    stationName: map['signage_stationName'] || DEFAULTS.stationName,
    alertThresholdMinutes: parseInt(map['signage_alertThresholdMinutes'] || String(DEFAULTS.alertThresholdMinutes)) || DEFAULTS.alertThresholdMinutes,
    alertSoundEnabled: map['signage_alertSoundEnabled'] !== 'false',
    tickerMessages: (() => {
      try {
        return JSON.parse(map['signage_tickerMessages'] || '[]');
      } catch {
        return DEFAULTS.tickerMessages;
      }
    })(),
    logoUrl: map['signage_logoUrl'] || DEFAULTS.logoUrl,
    primaryColor: map['signage_primaryColor'] || DEFAULTS.primaryColor,
    secondaryColor: map['signage_secondaryColor'] || DEFAULTS.secondaryColor,
  };
}

// ─── Helper: Upsert a setting ──────────────────────────────────────────────

async function upsertSetting(key: string, value: string) {
  await db.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

// ─── GET: Retrieve signage settings ──────────────────────────────────────

export async function GET() {
  try {
    const settings = await readAllSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('[/api/admin/signage/settings] GET error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 },
    );
  }
}

// ─── PUT: Update signage settings ──────────────────────────────────────────

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const data = signageSettingsSchema.parse(body);

    // Save each setting individually
    await upsertSetting('signage_stationName', data.stationName);
    await upsertSetting('signage_alertThresholdMinutes', String(data.alertThresholdMinutes));
    await upsertSetting('signage_alertSoundEnabled', String(data.alertSoundEnabled));
    await upsertSetting('signage_tickerMessages', JSON.stringify(data.tickerMessages));
    await upsertSetting('signage_logoUrl', data.logoUrl || '');
    await upsertSetting('signage_primaryColor', data.primaryColor || '');
    await upsertSetting('signage_secondaryColor', data.secondaryColor || '');

    return NextResponse.json({
      success: true,
      settings: data,
    });
  } catch (error) {
    console.error('[/api/admin/signage/settings] PUT error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'validation', message: error.issues[0].message },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 },
    );
  }
}
