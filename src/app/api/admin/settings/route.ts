import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

// Default settings
const defaultSettings = {
  // Company Info
  company_name: 'QRTrans',
  company_address: 'Poissy, France',
  company_phone: '+33 7 45 34 93 39',
  company_email: 'contact@qrtrans.com',
  company_logo: '',
  // SEO
  seo_title: 'QRTrans - Protection intelligente des colis',
  seo_description: 'Protégez vos colis avec un autocollant QR intelligent. Sans application, sans batterie, sans GPS.',
  seo_keywords: 'QR, colis, voyage, hajj, protection, sticker',
  seo_image: '',
  // Localization
  languages: 'fr,en,ar',
  default_language: 'fr',
  currency: 'EUR',
};

// GET - Get all settings
export async function GET() {
  try {
    const currentUser = await getSession();
    if (!currentUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    const isAdmin = ['superadmin', 'admin'].includes(currentUser.role);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const settings = await db.setting.findMany();
    
    // Convert to object
    const settingsMap: Record<string, string> = {};
    for (const setting of settings) {
      settingsMap[setting.key] = setting.value;
    }

    // Merge with defaults
    const result = { ...defaultSettings, ...settingsMap };

    return NextResponse.json({ settings: result });

  } catch (error) {
    console.error('Get settings error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update settings
export async function PUT(request: NextRequest) {
  try {
    const currentUser = await getSession();
    if (!currentUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    const isAdmin = ['superadmin', 'admin'].includes(currentUser.role);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const body = await request.json();
    const { settings } = body;

    // Update each setting
    for (const [key, value] of Object.entries(settings)) {
      await db.setting.upsert({
        where: { key },
        create: { key, value: String(value) },
        update: { value: String(value) }
      });
    }

    // Toujours invalider le cache après toute sauvegarde de paramètres
    try {
      const { invalidateSettingsCache } = await import('@/lib/settings');
      invalidateSettingsCache();
    } catch {
      // Le cache sera automatiquement rafraîchi après le TTL (60s)
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
