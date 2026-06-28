import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

const DEFAULT_TEMPLATES = [
  {
    notificationType: 'purchase_confirm',
    textTemplate: 'Bonjour {passenger_name}! Bienvenue chez {company_name}. Votre billet est confirmé. Trajet: {departure_city} → {arrival_city}. Date: {date} à {time}. Quai: {platform}. Consultez votre QR code dans l\'application.',
    ttsTemplate: 'Bonjour, bienvenue chez {company_name}. Votre billet a été confirmé avec succès. Votre bus partira à {time} depuis le quai {platform}. Merci de votre confiance.',
  },
  {
    notificationType: 'reminder_1h',
    textTemplate: '🚌 Rappel: Votre bus {company_name} part dans 1h! Embarquement en cours au quai {platform}. Présentez-vous maintenant avec votre QR code.',
    ttsTemplate: 'Attention passager. Votre bus part dans une heure. L\'embarquement est en cours au quai {platform}. Veuillez vous présenter immédiatement avec votre ticket ou QR code.',
  },
  {
    notificationType: 'bags_45min',
    textTemplate: '⚠️ N\'oubliez pas vos bagages! Vérifiez vos effets personnels avant l\'embarquement. Surveillance recommandée. Départ dans 45 minutes.',
    ttsTemplate: 'Rappel important. N\'oubliez pas vos bagages et objets personnels. Restez vigilant et surveillez vos affaires. Le départ est dans quarante-cinq minutes.',
  },
  {
    notificationType: 'boarding_30min',
    textTemplate: '🚨 URGENT: Embarquement en cours! Départ imminent dans 30 minutes. Quai {platform}. Si vous êtes en retard, contactez le chauffeur via l\'application.',
    ttsTemplate: 'Dernier appel. L\'embarquement est en cours. Le départ est imminent dans trente minutes. Rendez-vous immédiatement au quai {platform}. En cas de retard, contactez votre chauffeur via l\'application.',
  },
  {
    notificationType: 'departure_5min',
    textTemplate: '⏰ DÉPART DANS 5 MINUTES! Dernière chance pour embarquer. Le bus va partir. Contactez le chauffeur si vous arrivez en retard.',
    ttsTemplate: 'Attention! Le bus part dans cinq minutes. C\'est votre dernière chance pour embarquer. Si vous êtes en route, contactez immédiatement le chauffeur via l\'application.',
  },
];

/**
 * GET /api/busgo/notification-templates
 * Récupère tous les templates de notification de l'agence.
 * Crée les templates par défaut s'ils n'existent pas.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    let agencyId = session.agencyId;
    if (!agencyId) {
      const firstAgency = await db.agency.findFirst();
      if (!firstAgency) return NextResponse.json({ error: 'Aucune agence' }, { status: 400 });
      agencyId = firstAgency.id;
    }

    let templates = await db.busGoNotificationTemplate.findMany({
      where: { agencyId },
      orderBy: { notificationType: 'asc' },
    });

    // Create defaults if none exist
    if (templates.length === 0) {
      const agency = await db.agency.findUnique({ where: { id: agencyId }, select: { name: true } });
      const companyName = agency?.name || 'BusGo';

      for (const def of DEFAULT_TEMPLATES) {
        await db.busGoNotificationTemplate.create({
          data: {
            agencyId,
            notificationType: def.notificationType,
            language: 'fr',
            textTemplate: def.textTemplate.replace('{company_name}', companyName),
            ttsTemplate: def.ttsTemplate.replace('{company_name}', companyName),
            isActive: true,
          },
        });
      }

      templates = await db.busGoNotificationTemplate.findMany({
        where: { agencyId },
        orderBy: { notificationType: 'asc' },
      });
    }

    return NextResponse.json({ data: templates });
  } catch (error) {
    console.error('[API notification-templates GET]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * POST /api/busgo/notification-templates
 * Met à jour un template (textTemplate, ttsTemplate, isActive).
 * Body: { id, textTemplate?, ttsTemplate?, isActive? }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    let agencyId = session.agencyId;
    if (!agencyId) {
      const firstAgency = await db.agency.findFirst();
      if (!firstAgency) return NextResponse.json({ error: 'Aucune agence' }, { status: 400 });
      agencyId = firstAgency.id;
    }

    const body = await request.json();
    const { id, textTemplate, ttsTemplate, isActive } = body as {
      id: string;
      textTemplate?: string;
      ttsTemplate?: string;
      isActive?: boolean;
    };

    if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 });

    const template = await db.busGoNotificationTemplate.findUnique({ where: { id } });
    if (!template || template.agencyId !== agencyId) {
      return NextResponse.json({ error: 'Template non trouvé' }, { status: 404 });
    }

    const updated = await db.busGoNotificationTemplate.update({
      where: { id },
      data: {
        ...(textTemplate !== undefined && { textTemplate }),
        ...(ttsTemplate !== undefined && { ttsTemplate }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('[API notification-templates POST]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
