import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureSeeded } from '@/lib/auto-seed';

export const dynamic = 'force-dynamic';

/* ═══════════════════════════════════════════════════════════════
   Senegalese city coordinates for weather
   ═══════════════════════════════════════════════════════════════ */
const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
  'dakar':    { lat: 14.6937, lon: -17.4441 },
  'mbour':    { lat: 14.4174, lon: -16.7078 },
  'saint-louis': { lat: 16.0336, lon: -16.4833 },
  'thies':    { lat: 14.7953, lon: -16.9297 },
  'touba':    { lat: 14.8536, lon: -15.8889 },
  'kaolack':  { lat: 14.1522, lon: -16.0758 },
  'ziguinchor': { lat: 12.5833, lon: -16.2639 },
  'diourbel': { lat: 14.4936, lon: -16.2383 },
  'louga':    { lat: 15.6122, lon: -16.2194 },
  'kolda':    { lat: 12.8869, lon: -14.9483 },
  'tambacounda': { lat: 13.7706, lon: -13.6678 },
  'kedougou': { lat: 12.5636, lon: -12.1717 },
  'matam':    { lat: 15.6583, lon: -13.2967 },
  'podor':    { lat: 16.6275, lon: -14.9661 },
  'bignona':  { lat: 12.8169, lon: -16.2272 },
  'richard-toll': { lat: 16.4636, lon: -15.7164 },
  'rufisque': { lat: 14.7186, lon: -17.2478 },
  'joal-fadiouth': { lat: 14.1667, lon: -16.8333 },
  'saly':     { lat: 14.5453, lon: -16.8347 },
};

/* WMO Weather interpretation codes (simplified) */
function getWeatherEmoji(code: number): string {
  if (code === 0) return '☀️';       // Clear sky
  if (code <= 3) return '⛅';       // Partly cloudy
  if (code <= 48) return '🌫️';      // Fog
  if (code <= 57) return '🌧️';      // Drizzle
  if (code <= 67) return '🌧️';      // Rain
  if (code <= 77) return '🌨️';      // Snow
  if (code <= 82) return '🌧️';      // Rain showers
  if (code <= 86) return '🌨️';      // Snow showers
  if (code <= 99) return '⛈️';      // Thunderstorm
  return '🌡️';
}

// Normalize city name for coordinate lookup (strip accents, lowercase)
function normalizeCity(name: string): string {
  return name
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents
    .toLowerCase()
    .trim();
}

async function fetchWeatherForCities(cities: string[]): Promise<Record<string, { temp: number; emoji: string; description: string }>> {
  const result: Record<string, { temp: number; emoji: string; description: string }> = {};

  // Build a lookup map: normalized -> coords
  const coordLookup: Record<string, { lat: number; lon: number }> = {};
  for (const [key, coords] of Object.entries(CITY_COORDS)) {
    coordLookup[normalizeCity(key)] = coords;
  }

  // Batch fetch weather for up to 10 unique cities
  const uniqueCities = [...new Set(cities)].slice(0, 10);

  const fetches = uniqueCities.map(async (city) => {
    const coords = coordLookup[normalizeCity(city)];
    if (!coords) return;

    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,weather_code&timezone=UTC`;
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (!res.ok) return;

      const data = await res.json() as {
        current?: { temperature_2m?: number; weather_code?: number };
      };
      if (data.current) {
        const temp = Math.round(data.current.temperature_2m ?? 0);
        const code = data.current.weather_code ?? 0;
        result[normalizeCity(city)] = {
          temp,
          emoji: getWeatherEmoji(code),
          description: code === 0 ? 'Dégagé' : code <= 3 ? 'Nuageux' : code <= 67 ? 'Pluie' : 'Variable',
        };
      }
    } catch {
      // Weather fetch is non-critical — fail silently
    }
  });

  await Promise.allSettled(fetches);
  return result;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // ─── AUTO-SEED: If DB is empty, seed it on first request ───
    await ensureSeeded();

    // ─── QUERY PARAMS ───
    const url = new URL(req.url);
    const viewMode = url.searchParams.get('view') || 'departures'; // departures | supervision | map

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

    // 3. Départs (outbound from this station)
    const outboundDepartures = await db.departure.findMany({
      where: {
        originStationId: station.id,
        scheduledTime: { gte: startOfDay },
      },
      include: {
        destinationStation: { select: { name: true, city: true } },
        agency: { select: { name: true } },
      },
      orderBy: { scheduledTime: 'asc' },
    });

    // 4. Arrivées (inbound to this station)
    const inboundDepartures = await db.departure.findMany({
      where: {
        destinationStationId: station.id,
        scheduledTime: { gte: startOfDay },
      },
      include: {
        originStation: { select: { name: true, city: true } },
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

    let tickerMessages: { id?: string; text: string; priority: 'info' | 'urgent' | 'emergency'; active: boolean }[] = [];
    try {
      tickerMessages = JSON.parse(settingsMap['signage_tickerMessages'] || '[]');
    } catch {
      tickerMessages = [];
    }

    // Separate emergency messages from ticker
    const emergencyMessages = tickerMessages.filter(m => m.priority === 'emergency' && m.active);
    const regularTicker = tickerMessages.filter(m => m.priority !== 'emergency');

    const logoUrl = settingsMap['signage_logoUrl'] || '';

    // ─── WEATHER: Fetch for all unique destinations ───
    const allDestinations: string[] = [];
    for (const dep of outboundDepartures) {
      const ds = (dep as Record<string, unknown>).destinationStation as { city?: string } | null;
      const city = ds?.city || dep.destination;
      if (city) allDestinations.push(city);
    }
    // Deduplicate while preserving order
    const uniqueDestCities = [...new Set(allDestinations.map(normalizeCity))];

    const weatherData = await fetchWeatherForCities(allDestinations);

    // 6. Process departures with dynamic status + countdown seconds
    const processedDepartures: {
      id: string;
      departureType: string;
      lineNumber: string;
      origin: string;
      destination: string;
      destinationCity: string;
      destinationStationName: string;
      scheduledTime: string;
      effectiveTime: string;
      platform: string | null;
      status: string;
      delayMinutes: number;
      countdownMin: number;
      countdownSec: number; // Feature 1: live countdown seconds
      shouldPlayAlert: boolean;
      availableSeats: number;
      totalSeats: number;
      fillRate: number;
      weather: { temp: number; emoji: string; description: string } | null; // Feature 2
    }[] = [];

    for (const dep of outboundDepartures) {
      const scheduled = new Date(dep.scheduledTime);
      const delayMinutes = dep.delayMinutes || 0;
      const effectiveTime = new Date(scheduled.getTime() + delayMinutes * 60000);
      const diffMs = effectiveTime.getTime() - now.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      const diffSec = Math.floor((diffMs % 60000) / 1000);

      let computedStatus: string;
      let shouldPlayAlert = false;

      // Feature 3: Auto-delay detection — if delayMinutes > 0, mark DELAYED
      if (dep.status === 'DELAYED' || delayMinutes > 0) {
        computedStatus = 'DELAYED';
        if (diffMin <= 5 && diffMin > -3) {
          computedStatus = 'BOARDING';
          shouldPlayAlert = diffMin > 0;
        } else if (diffMin <= -3) {
          computedStatus = 'DEPARTED';
        }
      } else if (diffMin > 5) {
        computedStatus = 'SCHEDULED';
      } else if (diffMin <= 5 && diffMin > -3) {
        computedStatus = 'BOARDING';
        shouldPlayAlert = diffMin > 0;
      } else if (diffMin > -60) {
        computedStatus = 'DEPARTED';
      } else {
        continue;
      }

      if (dep.status === 'CANCELLED') {
        computedStatus = 'CANCELLED';
        shouldPlayAlert = false;
      }

      const ds = (dep as Record<string, unknown>).destinationStation as { name?: string; city?: string } | null;
      const destCity = ds?.city || dep.destination;
      const weatherKey = normalizeCity(destCity);

      processedDepartures.push({
        id: dep.id,
        departureType: dep.departureType || 'OUTBOUND',
        lineNumber: dep.lineNumber,
        origin: station.name,
        destination: dep.destination,
        destinationCity: destCity,
        destinationStationName: ds?.name || dep.destination,
        scheduledTime: scheduled.toTimeString().slice(0, 5),
        effectiveTime: effectiveTime.toTimeString().slice(0, 5),
        platform: dep.platform,
        status: computedStatus,
        delayMinutes,
        countdownMin: computedStatus === 'DEPARTED' ? Math.abs(diffMin) : Math.max(0, diffMin),
        countdownSec: computedStatus === 'DEPARTED' ? 0 : Math.max(0, diffSec),
        shouldPlayAlert,
        availableSeats: dep.availableSeats,
        totalSeats: dep.totalSeats,
        fillRate: dep.totalSeats > 0 ? Math.round(((dep.totalSeats - dep.availableSeats) / dep.totalSeats) * 100) : 0,
        weather: weatherData[weatherKey] || null,
      });
    }

    // 7. Process arrivals
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

      if (dep.status === 'DELAYED' || delayMinutes > 0) {
        computedStatus = 'DELAYED';
        if (diffMin <= 5 && diffMin > -3) computedStatus = 'BOARDING';
        else if (diffMin <= -3) computedStatus = 'DEPARTED';
      } else if (diffMin > 5) {
        computedStatus = 'SCHEDULED';
      } else if (diffMin <= 5 && diffMin > -3) {
        computedStatus = 'BOARDING';
      } else if (diffMin > -60) {
        computedStatus = 'DEPARTED';
      } else {
        continue;
      }

      if (dep.status === 'CANCELLED') {
        computedStatus = 'CANCELLED';
      }

      const os = (dep as Record<string, unknown>).originStation as { name?: string } | null;
      processedArrivals.push({
        id: dep.id,
        lineNumber: dep.lineNumber,
        origin: dep.destination,
        originStationName: os?.name || dep.destination,
        destination: station.name,
        scheduledTime: scheduled.toTimeString().slice(0, 5),
        effectiveTime: effectiveTime.toTimeString().slice(0, 5),
        platform: dep.platform,
        status: computedStatus,
        delayMinutes,
      });
    }

    // 8. Tomorrow preview
    const tomorrowStart = new Date(now);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    tomorrowStart.setHours(0, 0, 0, 0);

    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const nextDayDepartures = await db.departure.findMany({
      where: {
        originStationId: station.id,
        scheduledTime: { gte: tomorrowStart, lte: tomorrowEnd },
        status: { not: 'CANCELLED' },
      },
      include: { destinationStation: { select: { name: true } } },
      orderBy: { scheduledTime: 'asc' },
      take: 3,
    });

    const nextDayPreview = nextDayDepartures.map((d) => ({
      id: d.id,
      time: new Date(d.scheduledTime).toTimeString().slice(0, 5),
      destination: (d as Record<string, unknown>).destinationStation
        ? ((d as Record<string, unknown>).destinationStation as { name: string }).name
        : d.destination,
      lineNumber: d.lineNumber,
      isNextDay: true,
    }));

    // 9. Feature 5: Supervision data — group by platform
    const platforms = [...new Set(processedDepartures.map(d => d.platform).filter(Boolean) as string[])].sort();
    const supervisionPlatforms = platforms.map(p => ({
      name: p,
      departures: processedDepartures.filter(d => d.platform === p),
    }));

    // 10. Feature 6: Station map data
    const stationMap = {
      name: station.name,
      platforms: platforms.map((p, idx) => ({
        id: p,
        label: `Quai ${p}`,
        x: 10 + (idx % 3) * 30,  // Grid positions (%)
        y: 20 + Math.floor(idx / 3) * 25,
        currentCount: processedDepartures.filter(d => d.platform === p && d.status !== 'DEPARTED' && d.status !== 'CANCELLED').length,
      })),
    };

    // 11. Check for pending broadcast messages (from API fallback)
    const broadcastSetting = await db.setting.findUnique({
      where: { key: 'kiosk_broadcast_global' },
    });
    if (broadcastSetting?.value) {
      try {
        const bc = JSON.parse(broadcastSetting.value);
        // Only show broadcasts less than 5 minutes old
        if (bc.timestamp && Date.now() - bc.timestamp < 5 * 60 * 1000) {
          const exists = regularTicker.some((m: { id?: string }) => m.id === `bc-${bc.timestamp}`);
          if (!exists) {
            regularTicker.push({
              id: `bc-${bc.timestamp}`,
              text: bc.text,
              priority: 'info' as const,
              active: true,
            });
          }
        }
      } catch { /* ignore parse errors */ }
    }

    // 12. Build response
    return NextResponse.json({
      stationId: station.id,
      stationName: station.name,
      city: station.city,
      slug: station.slug,
      viewMode,
      currentTime: now.toTimeString().slice(0, 8),
      currentDate: now.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      currentTimestamp: now.getTime(), // Feature 1: for client-side live countdown
      departures: processedDepartures,
      arrivals: processedArrivals,
      alertSoundEnabled,
      tickerMessages: regularTicker,
      emergencyMessages, // Feature 4: separated emergency messages
      logoUrl,
      nextDayPreview,
      nextDayFirstDeparture: nextDayPreview.length > 0 ? nextDayPreview[0].time : null,
      // Feature 5: Supervision data
      supervisionPlatforms,
      platformCount: platforms.length,
      // Feature 6: Station map data
      stationMap,
    });
  } catch (error) {
    console.error('[/api/signage-slug] GET error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
