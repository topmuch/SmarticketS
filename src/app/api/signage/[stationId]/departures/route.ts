import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ stationId: string }> }
) {
  try {
    const { stationId } = await params;
    const now = new Date();

    // Début et fin de journée
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    // Récupérer les départs de la gare
    const departures = await db.departure.findMany({
      where: {
        agencyId: stationId,
        scheduledTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        agency: { select: { name: true } },
      },
      orderBy: { scheduledTime: 'asc' },
    });

    // ─── Read signage settings ──────────────────────────────────
    const signageSettings = await db.setting.findMany({
      where: { key: { startsWith: 'signage_' } },
    });
    const settingsMap: Record<string, string> = {};
    for (const s of signageSettings) {
      settingsMap[s.key] = s.value;
    }

    const stationName = settingsMap['signage_stationName'] || 'Gare Routière';
    const alertSoundEnabled = settingsMap['signage_alertSoundEnabled'] !== 'false';

    let tickerMessages: { id: string; text: string; priority: string; active: boolean }[] = [];
    try {
      tickerMessages = JSON.parse(settingsMap['signage_tickerMessages'] || '[]');
    } catch {
      tickerMessages = [];
    }

    const logoUrl = settingsMap['signage_logoUrl'] || '';
    const primaryColor = settingsMap['signage_primaryColor'] || '#0f172a';
    const secondaryColor = settingsMap['signage_secondaryColor'] || '#1e293b';

    // ─── Calcul dynamique des statuts (LOGIQUE CORRIGÉE) ───────
    const processed: {
      id: string;
      departureType: string;
      lineNumber: string;
      destination: string;
      scheduledTime: string;
      effectiveTime: string;
      status: string;
      delayMinutes: number;
      countdownMin: number;
      shouldPlayAlert: boolean;
    }[] = [];

    for (const dep of departures) {
      const scheduled = new Date(dep.scheduledTime);
      const delayMinutes = dep.delayMinutes || 0;
      const effectiveTime = new Date(scheduled.getTime() + delayMinutes * 60000);
      const diffMin = Math.floor((effectiveTime.getTime() - now.getTime()) / 60000);

      let computedStatus: string;
      let shouldPlayAlert = false;

      if (diffMin > 5) {
        // Plus de 5 min avant → À l'heure
        computedStatus = 'SCHEDULED';
      } else if (diffMin > 0 && diffMin <= 5) {
        // Entre 0 et 5 min avant → Embarquement (déclencher alerte)
        computedStatus = 'BOARDING';
        shouldPlayAlert = true;
      } else if (diffMin <= 0 && diffMin > -3) {
        // De l'heure exacte jusqu'à +3 min → Embarquement continue
        computedStatus = 'BOARDING';
        shouldPlayAlert = false;
      } else if (diffMin > -60) {
        // ✅ PATCH: Garde visible 60 min après le départ (au lieu de -15)
        computedStatus = 'DEPARTED';
        shouldPlayAlert = false;
      } else {
        // Plus de 60 min après → Archivé, masquer
        continue; // skip this departure
      }

      // Si le depart a été manuellement marqué CANCELLED, le garder
      if (dep.status === 'CANCELLED') {
        computedStatus = 'CANCELLED';
        shouldPlayAlert = false;
      }

      processed.push({
        id: dep.id,
        departureType: dep.departureType || 'OUTBOUND',
        lineNumber: dep.lineNumber,
        destination: dep.destination,
        scheduledTime: scheduled.toTimeString().slice(0, 5),
        effectiveTime: effectiveTime.toTimeString().slice(0, 5),
        status: computedStatus,
        delayMinutes,
        countdownMin: computedStatus === 'DEPARTED' ? Math.abs(diffMin) : Math.max(0, diffMin),
        shouldPlayAlert,
      });
    }

    return NextResponse.json({
      stationId,
      stationName,
      currentTime: now.toTimeString().slice(0, 8),
      currentDate: now.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      departures: processed,
      totalDepartures: processed.length,
      boardingCount: processed.filter(d => d.status === 'BOARDING').length,
      departedCount: processed.filter(d => d.status === 'DEPARTED').length,
      alertSoundEnabled,
      tickerMessages,
      logoUrl,
      primaryColor,
      secondaryColor,
    });
  } catch (error) {
    console.error('[/api/signage/departures] GET error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
