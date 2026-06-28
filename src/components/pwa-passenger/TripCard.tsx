'use client';

/**
 * TripCard — Single departure card for the BusGo Live Board (passenger PWA).
 *
 * App-native dark style:
 *   - Large orange departure time + relative countdown
 *   - Origin → Destination with MapPin
 *   - Platform badge, passenger count, GPS live indicator
 *   - Status badge (BOARDING / ON_TIME / DELAYED / DEPARTED / CANCELLED)
 *   - Left border coloured when boarding, opacity-60 when departed
 *   - Tactile press feedback (active:scale-[0.98])
 */

import { Clock, MapPin, Users, Navigation, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { LiveTrip } from '@/stores/live-board-store';

export interface TripCardProps {
  trip: LiveTrip;
  isBoarding?: boolean;
  onClick?: () => void;
}

// --- Status style map -----------------------------------------------------

const STATUS_STYLES: Record<string, string> = {
  BOARDING: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
  ON_TIME: 'bg-green-500/20 text-green-400 border-green-500/50',
  SCHEDULED: 'bg-green-500/20 text-green-400 border-green-500/50',
  DELAYED: 'bg-red-500/20 text-red-400 border-red-500/50',
  DEPARTED: 'bg-slate-700/50 text-slate-400 border-slate-600',
  CANCELLED: 'bg-gray-800 text-gray-500 border-gray-700',
};

const STATUS_LABELS: Record<string, string> = {
  BOARDING: '🟠 EMBARQUEMENT',
  SCHEDULED: "✅ À l'heure",
  ON_TIME: "✅ À l'heure",
  DELAYED: '⚠️ Retard',
  DEPARTED: '🏁 Parti',
  CANCELLED: '❌ Annulé',
};

// --- Helpers --------------------------------------------------------------

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '--:--';
    return d.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return '--:--';
  }
}

/** "Dans 15 min" / "Dans 1h 30min" / "Parti" / "Imminent" */
function timeRemaining(trip: LiveTrip, now: number): string {
  if (trip.status === 'DEPARTED' || trip.departedAt) return 'Parti';
  if (trip.status === 'CANCELLED') return 'Annulé';

  const departureDate = new Date(trip.scheduledTime);
  if (trip.delayMinutes > 0) {
    departureDate.setMinutes(departureDate.getMinutes() + trip.delayMinutes);
  }

  const diffMs = departureDate.getTime() - now;
  if (diffMs <= 0) {
    return trip.status === 'BOARDING' ? 'Embarquement' : 'Imminent';
  }

  const totalMin = Math.floor(diffMs / 60_000);
  if (totalMin < 1) return 'Imminent';
  if (totalMin < 60) return `Dans ${totalMin} min`;

  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m === 0 ? `Dans ${h}h` : `Dans ${h}h ${m}min`;
}

// --- Component ------------------------------------------------------------

export function TripCard({ trip, isBoarding, onClick }: TripCardProps) {
  // Avoid hydration mismatch / re-render noise: derive "now" at render time.
  // Parent (LiveBoard) re-renders every tick so this stays fresh.
  const now = Date.now();

  const isDeparted = trip.status === 'DEPARTED' || !!trip.departedAt;
  const isCancelled = trip.status === 'CANCELLED';
  const boardingActive = isBoarding || trip.status === 'BOARDING';
  const hasGps = !!trip.gpsPosition;
  const occupied = trip.totalSeats - trip.availableSeats;
  const occupancyPct = trip.totalSeats > 0 ? Math.round((occupied / trip.totalSeats) * 100) : 0;
  const occupancyHigh = occupancyPct >= 90;

  const statusKey = trip.status in STATUS_STYLES ? trip.status : 'SCHEDULED';

  return (
    <Card
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        'relative overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-800/60 px-4 py-3.5',
        'transition-all duration-200 ease-out',
        'shadow-sm shadow-black/20 backdrop-blur',
        boardingActive
          ? 'border-l-4 border-l-orange-500'
          : 'border-l-4 border-l-slate-600',
        isDeparted && 'opacity-60',
        isCancelled && 'opacity-60',
        onClick && 'cursor-pointer hover:bg-slate-800 active:scale-[0.98] hover:border-slate-600',
      )}
    >
      {/* Top row: time + countdown + status badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-2xl font-bold tabular-nums leading-none text-white">
            {formatTime(trip.scheduledTime)}
            {trip.delayMinutes > 0 && (
              <span className="ml-2 text-sm font-semibold text-red-400">
                +{trip.delayMinutes}min
              </span>
            )}
          </span>
          <span
            className={cn(
              'mt-1 inline-flex items-center gap-1 text-xs font-medium',
              boardingActive ? 'text-orange-400' : isDeparted ? 'text-slate-500' : 'text-slate-400',
            )}
          >
            <Clock className="h-3 w-3" />
            {timeRemaining(trip, now)}
          </span>
        </div>

        <Badge
          variant="outline"
          className={cn(
            'border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide',
            STATUS_STYLES[statusKey],
          )}
        >
          {STATUS_LABELS[statusKey] ?? statusKey}
        </Badge>
      </div>

      {/* Route: origin → destination */}
      <div className="mt-3 flex items-center gap-1.5 text-sm">
        <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-500" />
        <span className="font-medium text-slate-200 truncate">{trip.origin}</span>
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-500" />
        <span className="font-semibold text-white truncate">{trip.destination}</span>
        <span className="ml-auto shrink-0 rounded-md bg-slate-700/70 px-1.5 py-0.5 text-[10px] font-semibold text-slate-300">
          Ligne {trip.lineNumber}
        </span>
      </div>

      {/* Bottom row: platform + passengers + GPS */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {trip.platform && (
          <Badge
            variant="outline"
            className="border-slate-600 bg-slate-900/70 px-2 py-0.5 text-[11px] font-semibold text-slate-200"
          >
            <MapPin className="h-3 w-3" />
            Quai {trip.platform}
          </Badge>
        )}

        <span
          className={cn(
            'inline-flex items-center gap-1 text-[11px] font-medium',
            occupancyHigh ? 'text-orange-400' : 'text-slate-400',
          )}
        >
          <Users className="h-3 w-3" />
          {occupied}/{trip.totalSeats} places
        </span>

        {hasGps && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/15 px-2 py-0.5 text-[11px] font-semibold text-green-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
            <Navigation className="h-3 w-3" />
            En route
            {typeof trip.etaMinutes === 'number' && trip.etaMinutes > 0 && (
              <span className="text-green-400/80">· ETA {trip.etaMinutes} min</span>
            )}
          </span>
        )}
      </div>

      {/* Subtle boarding shimmer */}
      {boardingActive && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-orange-400 to-orange-600"
        />
      )}
    </Card>
  );
}

export default TripCard;
