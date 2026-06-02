import { NextRequest, NextResponse } from 'next/server';
import { getEmailSettings, saveEmailSettings } from '@/lib/email';
import { getSession } from '@/lib/session';

// GET - Retrieve email settings
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

    const settings = await getEmailSettings();
    
    // Mask sensitive data
    const safeSettings = settings ? {
      ...settings,
      smtpPassword: settings.smtpPassword ? '••••••••' : null,
    } : null;

    return NextResponse.json({ settings: safeSettings });
  } catch (error) {
    console.error('Error fetching email settings:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des paramètres email' },
      { status: 500 }
    );
  }
}

// PUT - Update email settings
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
    
    // Validate provider
    const validProviders = ['console', 'smtp'];
    if (body.provider && !validProviders.includes(body.provider)) {
      return NextResponse.json(
        { error: 'Provider invalide' },
        { status: 400 }
      );
    }

    // Prepare settings data
    const settingsData: {
      provider?: string;
      fromEmail?: string;
      fromName?: string;
      recipientColisEmail?: string | null;
      recipientSystemEmail?: string | null;
      smtpHost?: string | null;
      smtpPort?: number | null;
      smtpUser?: string | null;
      smtpPassword?: string | null;
      smtpEncryption?: string;
    } = {};

    if (body.provider) settingsData.provider = body.provider;
    if (body.fromEmail) settingsData.fromEmail = body.fromEmail;
    if (body.fromName) settingsData.fromName = body.fromName;
    if (body.recipientColisEmail !== undefined) settingsData.recipientColisEmail = body.recipientColisEmail || null;
    if (body.recipientSystemEmail !== undefined) settingsData.recipientSystemEmail = body.recipientSystemEmail || null;
    
    // SMTP settings
    if (body.smtpHost !== undefined) settingsData.smtpHost = body.smtpHost || null;
    if (body.smtpPort !== undefined) settingsData.smtpPort = body.smtpPort ? parseInt(body.smtpPort) : null;
    if (body.smtpUser !== undefined) settingsData.smtpUser = body.smtpUser || null;
    if (body.smtpPassword !== undefined && body.smtpPassword !== '••••••••') {
      settingsData.smtpPassword = body.smtpPassword || null;
    }
    if (body.smtpEncryption) settingsData.smtpEncryption = body.smtpEncryption;

    let savedSettings;
    try {
      savedSettings = await saveEmailSettings(settingsData as Parameters<typeof saveEmailSettings>[0]);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('❌ saveEmailSettings threw:', message);
      return NextResponse.json(
        { error: `Erreur lors de la sauvegarde: ${message}` },
        { status: 500 }
      );
    }

    if (!savedSettings) {
      console.error('❌ saveEmailSettings returned null, settingsData:', JSON.stringify(settingsData));
      return NextResponse.json(
        { error: 'Erreur lors de la sauvegarde des paramètres email. Vérifiez les champs saisis.' },
        { status: 500 }
      );
    }

    // Return masked settings
    const safeSettings = {
      ...savedSettings,
      smtpPassword: savedSettings.smtpPassword ? '••••••••' : null,
    };

    return NextResponse.json({ 
      success: true, 
      settings: safeSettings,
      message: 'Paramètres email enregistrés avec succès'
    });
  } catch (error) {
    console.error('Error saving email settings:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la sauvegarde des paramètres email' },
      { status: 500 }
    );
  }
}
