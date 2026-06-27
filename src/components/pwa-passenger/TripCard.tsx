'use client';

/**
 * TripCard — Single departure card for the BusGo Live Board (passenger PWA).
 *
 * FitNexus dashboard style:
 *   - White background, rounded-xl, border border-gray-200, shadow-sm
 *   - Left border accent (4px) coloured by status
 *   - Horizontal flex layout:
 *       · Left: departure time (2xl bold dark gray) + time remaining (xs gray)
 *       · Center: route info (origin → destination, line, platform badge, seats)
 *       · Right: status badge (rounded-full, coloured bg with opacity) + arrow
 *   - GPS indicator: small green dot with "En route" text
 *   - Hover: shadow-md, transition-all duration-200
 *   - DEPARTED: opacity-60
 */

import { Clock, MapPin, Users, Navigation, ArrowRight, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LiveTrip } from '@/stores/live-board-store';

export interface TripCardProps {
  trip: LiveTrip;
  isBoarding?: boolean;
  onClick?: () => void;
}

// --- Status style maps ----------------------------------------------------

// Left border accent colour (4px) — by status
const STATUS_BORDER: Record<string, string> = {
  BOARDING: 'border-l-orange-500',
  SCHEDULED: 'border-l-green-500',
  ON_TIME: 'border-l-green-500',
  DELAYED: 'border-l-red-500',
  DEPARTED: 'border-l-gray-400',
  CANCELLED: 'border-l-gray-300',
};

// Status badge: rounded-full, coloured bg with opacity, matching text
const STATUS_BADGE: Record<string, string> = {
  BOARDING: 'bg-orange-100 text-orange-700',
  SCHEDULED: 'bg-green-100 text-green-700',
  ON_TIME: 'bg-green-100 text-green-700',
  DELAYED: 'bg-red-100 text-red-700',
  DEPARTED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

const STATUS_LABELS: Record<string, string> = {
  BOARDING: 'Embarquement',
  SCHEDULED: "À l'heure",
  ON_TIME: "À l'heure",
  DELAYED: 'Retard',
  DEPARTED: 'Parti',
  CANCELLED: 'Annulé',
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
  // Parent (LiveBoard) re-renders every tick so this stays fresh.
  const now = Date.now();

  const isDeparted = trip.status === 'DEPARTED' || !!trip.departedAt;
  const isCancelled = trip.status === 'CANCELLED';
  const boardingActive = isBoarding || trip.status === 'BOARDING';
  const hasGps = !!trip.gpsPosition;
  const occupied = trip.totalSeats - trip.availableSeats;
  const occupancyPct = trip.totalSeats > 0 ? Math.round((occupied / trip.totalSeats) * 100) : 0;
  const occupancyHigh = occupancyPct >= 90;

  const statusKey = trip.status in STATUS_BORDER ? trip.status : 'SCHEDULED';

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
        'relative overflow-hidden rounded-xl border border-gray-200 border-l-4 bg-white px-4 py-4',
        'shadow-sm transition-all duration-200 ease-out',
        STATUS_BORDER[statusKey],
        isDeparted && 'opacity-60',
        isCancelled && 'opacity-60',
        onClick && 'cursor-pointer hover:shadow-md hover:border-gray-300 active:scale-[0.99]',
      )}
    >
      <div className="flex items-center gap-4">
        {/* Left: departure time + countdown */}
        <div className="flex w-20 shrink-0 flex-col">
          <span className="text-2xl font-bold tabular-nums leading-none text-gray-800">
            {formatTime(trip.scheduledTime)}
          </span>
          {trip.delayMinutes > 0 ? (
            <span className="mt-1 text-[11px] font-semibold text-red-600">
              +{trip.delayMinutes}min
            </span>
          ) : (
            <span
              className={cn(
                'mt-1 inline-flex items-center gap-1 text-[11px] font-medium',
                boardingActive ? 'text-orange-600' : isDeparted ? 'text-gray-400' : 'text-gray-500',
              )}
            >
              <Clock className="h-3 w-3" />
              {timeRemaining(trip, now)}
            </span>
          )}
        </div>

        {/* Center: route + line + platform + seats */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-sm">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            <span className="truncate font-medium text-gray-600">{trip.origin}</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            <span className="truncate font-semibold text-gray-800">{trip.destination}</span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-blue-50 px-1.5 py-0.5 text-[11px] font-semibold text-blue-700">
              Ligne {trip.lineNumber}
            </span>

            {trip.platform && (
              <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-1.5 py-0.5 text-[11px] font-semibold text-gray-700">
                <MapPin className="h-3 w-3" />
                Quai {trip.platform}
              </span>
            )}

            <span
              className={cn(
                'inline-flex items-center gap-1 text-[11px] font-medium',
                occupancyHigh ? 'text-pink-600' : 'text-gray-500',
              )}
            >
              <Users className="h-3 w-3" />
              {occupied}/{trip.totalSeats}
            </span>

            {hasGps && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <Navigation className="h-3 w-3" />
                En route
                {typeof trip.etaMinutes === 'number' && trip.etaMinutes > 0 && (
                  <span className="text-emerald-600/80">· {trip.etaMinutes}min</span>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Right: status badge + arrow */}
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide',
              STATUS_BADGE[statusKey],
            )}
          >
            {STATUS_LABELS[statusKey] ?? statusKey}
          </span>
          {onClick && (
            <ChevronRight className="h-4 w-4 text-gray-300 transition-colors group-hover:text-gray-400" />
          )}
        </div>
      </div>
    </Card>
  );
}

export default TripCard;
