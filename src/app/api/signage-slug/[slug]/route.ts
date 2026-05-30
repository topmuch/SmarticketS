import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // 1. Find station by slug
    const station = await db.station.findUnique({
      where: { slug },
      include: { agency: true },
    });

    if (!station || !station.isActive) {
      return NextResponse.json(
        { error: 'Station non trouvée' },
        { status: 404 }
      );
    }

    const now = new Date();

    // 2. Current date range
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    // 3. Départs (outbound from this station)
    const outboundDepartures = await db.departure.findMany({
      where: {
        originStationId: station.id,
        scheduledTime: {
          gte: startOfDay,
        },
      },
      include: {
        destinationStation: { select: { name: true } },
        agency: { select: { name: true } },
      },
      orderBy: { scheduledTime: 'asc' },
    });

    // 4. Arrivées (inbound to this station)
    const inboundDepartures = await db.departure.findMany({
      where: {
        destinationStationId: station.id,
        scheduledTime: {
          gte: startOfDay,
        },
      },
      include: {
        originStation: { select: { name: true } },
        agency: { select: { name: true } },
      },
      orderBy: { scheduledTime: 'asc' },
    });

    // 5. Read signage settings
    const signageSettings = await db.setting.findMany({
      where: { key: { startsWith: 'signage_' } },
    });
    const settingsMap: Record<string, string> = {};
    for (const s of signageSettings) {
      settingsMap[s.key] = s.value;
    }

    const alertSoundEnabled = settingsMap['signage_alertSoundEnabled'] !== 'false';

    let tickerMessages: unknown[] = [];
    try {
      tickerMessages = JSON.parse(settingsMap['signage_tickerMessages'] || '[]');
    } catch {
      tickerMessages = [];
    }

    const logoUrl = settingsMap['signage_logoUrl'] || '';

    // 6. Process departures with dynamic status calculation
    const processedDepartures: {
      id: string;
      departureType: string;
      lineNumber: string;
      origin: string;
      destination: string;
      destinationStationName: string;
      scheduledTime: string;
      effectiveTime: string;
      platform: string | null;
      status: string;
      delayMinutes: number;
      countdownMin: number;
      shouldPlayAlert: boolean;
      availableSeats: number;
      totalSeats: number;
    }[] = [];

    for (const dep of outboundDepartures) {
      const scheduled = new Date(dep.scheduledTime);
      const delayMinutes = dep.delayMinutes || 0;
      const effectiveTime = new Date(scheduled.getTime() + delayMinutes * 60000);
      const diffMin = Math.floor((effectiveTime.getTime() - now.getTime()) / 60000);

      let computedStatus: string;
      let shouldPlayAlert = false;

      if (diffMin > 5) {
        computedStatus = 'SCHEDULED';
      } else if (diffMin <= 5 && diffMin > -3) {
        computedStatus = 'BOARDING';
        shouldPlayAlert = diffMin > 0;
      } else if (diffMin <= -3 && diffMin > -15) {
        computedStatus = 'DEPARTED';
      } else if (diffMin <= -15) {
        continue; // archived, skip
      } else {
        computedStatus = 'SCHEDULED';
      }

      // Override: if manually cancelled, keep CANCELLED
      if (dep.status === 'CANCELLED') {
        computedStatus = 'CANCELLED';
        shouldPlayAlert = false;
      }

      processedDepartures.push({
        id: dep.id,
        departureType: dep.departureType || 'OUTBOUND',
        lineNumber: dep.lineNumber,
        origin: station.name,
        destination: dep.destination,
        destinationStationName: (dep as Record<string, unknown>).destinationStation ? ((dep as Record<string, unknown>).destinationStation as { name: string }).name : dep.destination,
        scheduledTime: scheduled.toTimeString().slice(0, 5),
        effectiveTime: effectiveTime.toTimeString().slice(0, 5),
        platform: dep.platform,
        status: computedStatus,
        delayMinutes,
        countdownMin: computedStatus === 'DEPARTED' ? Math.abs(diffMin) : Math.max(0, diffMin),
        shouldPlayAlert,
        availableSeats: dep.availableSeats,
        totalSeats: dep.totalSeats,
      });
    }

    // 7. Process arrivals with dynamic status calculation
    const processedArrivals: {
      id: string;
      lineNumber: string;
      origin: string;
      originStationName: string;
      destination: string;
      scheduledTime: string;
      effectiveTime: string;
      platform: string | null;
      status: string;
      delayMinutes: number;
    }[] = [];

    for (const dep of inboundDepartures) {
      const scheduled = new Date(dep.scheduledTime);
      const delayMinutes = dep.delayMinutes || 0;
      const effectiveTime = new Date(scheduled.getTime() + delayMinutes * 60000);
      const diffMin = Math.floor((effectiveTime.getTime() - now.getTime()) / 60000);

      let computedStatus: string;

      if (diffMin > 5) {
        computedStatus = 'SCHEDULED';
      } else if (diffMin <= 5 && diffMin > -3) {
        computedStatus = 'BOARDING';
      } else if (diffMin <= -3 && diffMin > -15) {
        computedStatus = 'DEPARTED';
      } else if (diffMin <= -15) {
        continue; // archived, skip
      } else {
        computedStatus = 'SCHEDULED';
      }

      // Override: if manually cancelled, keep CANCELLED
      if (dep.status === 'CANCELLED') {
        computedStatus = 'CANCELLED';
      }

      processedArrivals.push({
        id: dep.id,
        lineNumber: dep.lineNumber,
        origin: dep.destination,
        originStationName: (dep as Record<string, unknown>).originStation ? ((dep as Record<string, unknown>).originStation as { name: string }).name : dep.destination,
        destination: station.name,
        scheduledTime: scheduled.toTimeString().slice(0, 5),
        effectiveTime: effectiveTime.toTimeString().slice(0, 5),
        platform: dep.platform,
        status: computedStatus,
        delayMinutes,
      });
    }

    // 8. Build response
    return NextResponse.json({
      stationId: station.id,
      stationName: station.name,
      city: station.city,
      slug: station.slug,
      currentTime: now.toTimeString().slice(0, 8),
      currentDate: now.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      departures: processedDepartures,
      arrivals: processedArrivals,
      alertSoundEnabled,
      tickerMessages,
      logoUrl,
    });
  } catch (error) {
    console.error('[/api/signage-slug] GET error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
