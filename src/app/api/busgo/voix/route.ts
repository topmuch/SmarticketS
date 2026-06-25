import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

/**
 * GET /api/busgo/voix
 * Récupère la config vocale BusGo de l'agence.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session || !session.agencyId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    let config = await db.busGoVoiceConfig.findUnique({
      where: { agencyId: session.agencyId },
    });

    if (!config) {
      // Create default config
      config = await db.busGoVoiceConfig.create({
        data: {
          agencyId: session.agencyId,
          messageH130Text: 'Embarquement pour {destination} à {heure}. En cas de retard, contactez l\'agent au {agentPhone}.',
          messageH5Text: 'Embarquement imminent pour {destination}. Veuillez vous présenter au quai {platform}.',
          messageDepartText: 'Le bus pour {destination} part maintenant. Bon voyage.',
          messageAbsentText: 'Le bus pour {destination} va partir dans quelques minutes. Présentez-vous immédiatement au quai {platform}.',
        },
      });
    }

    return NextResponse.json({ data: config });
  } catch (error) {
    console.error('[API /api/busgo/voix GET]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * POST /api/busgo/voix
 * Met à jour la config vocale (textes TTS + URLs MP3 + agent phone).
 *
 * Body: {
 *   dingDongUrl?, messageH130Text?, messageH130AudioUrl?,
 *   messageH5Text?, messageH5AudioUrl?,
 *   messageDepartText?, messageDepartAudioUrl?,
 *   messageAbsentText?, messageAbsentAudioUrl?
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.agencyId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();

    const config = await db.busGoVoiceConfig.upsert({
      where: { agencyId: session.agencyId },
      update: {
        ...(body.dingDongUrl !== undefined && { dingDongUrl: body.dingDongUrl }),
        ...(body.messageH130Text !== undefined && { messageH130Text: body.messageH130Text }),
        ...(body.messageH130AudioUrl !== undefined && { messageH130AudioUrl: body.messageH130AudioUrl }),
        ...(body.messageH5Text !== undefined && { messageH5Text: body.messageH5Text }),
        ...(body.messageH5AudioUrl !== undefined && { messageH5AudioUrl: body.messageH5AudioUrl }),
        ...(body.messageDepartText !== undefined && { messageDepartText: body.messageDepartText }),
        ...(body.messageDepartAudioUrl !== undefined && { messageDepartAudioUrl: body.messageDepartAudioUrl }),
        ...(body.messageAbsentText !== undefined && { messageAbsentText: body.messageAbsentText }),
        ...(body.messageAbsentAudioUrl !== undefined && { messageAbsentAudioUrl: body.messageAbsentAudioUrl }),
      },
      create: {
        agencyId: session.agencyId,
        ...body,
      },
    });

    return NextResponse.json({ data: config });
  } catch (error) {
    console.error('[API /api/busgo/voix POST]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
