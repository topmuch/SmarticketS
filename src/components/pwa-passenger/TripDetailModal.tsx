'use client';

/**
 * TripDetailModal — Full-screen bottom sheet for a single trip on the
 * BusGo Live Board (passenger PWA).
 *
 * FitNexus dashboard style:
 *   - White background modal (not dark slate)
 *   - Rounded corners (rounded-2xl)
 *   - Header: "Détails du trajet" in dark gray + close button
 *   - Info card: white with light border, showing time (large teal), route, line, platform
 *   - GPS map: Leaflet with light border styling
 *   - Occupation bar: teal gradient instead of orange
 *   - Buttons: "Réserver" = teal #10B981, "Contacter" = white with border
 *   - Share: text link style
 *
 * Layout:
 *   - Bottom sheet on mobile (rounded-t-2xl, anchored to bottom)
 *   - Centered modal on desktop (sm:rounded-2xl, max-w-md)
 *
 * SSR safety:
 *   - Leaflet's react-leaflet components are dynamically imported with
 *     `ssr: false` (Leaflet touches `window` at module init).
 *   - The marker icon is created client-side via a dynamic `import('leaflet')`.
 *   - The whole modal renders nothing on the server (guarded by `mounted`).
 */

import 'leaflet/dist/leaflet.css';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
import type { DivIcon } from 'leaflet';
import {
  X,
  MapPin,
  Phone,
  Navigation,
  Users,
  Clock,
  ArrowRight,
  Ticket,
  Share2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { LiveTrip } from '@/stores/live-board-store';

// Leaflet components must be loaded client-side only.
const MapContainer = dynamic(() => import('react-leaflet').then((mod) => mod.MapContainer), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-gray-100" />,
});
const TileLayer = dynamic(() => import('react-leaflet').then((mod) => mod.TileLayer), {
  ssr: false,
});
const Marker = dynamic(() => import('react-leaflet').then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then((mod) => mod.Popup), { ssr: false });

export interface TripDetailModalProps {
  trip: LiveTrip;
  onClose: () => void;
}

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

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  } catch {
    return '';
  }
}

// --- Component ------------------------------------------------------------

export function TripDetailModal({ trip, onClose }: TripDetailModalProps) {
  const [mounted, setMounted] = useState(false);
  const [busIcon, setBusIcon] = useState<DivIcon | null>(null);

  // Lock body scroll + mark as mounted (for the slide-up animation)
  useEffect(() => {
    setMounted(true);
    if (typeof document === 'undefined') return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // Close on Escape
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Create the bus marker icon client-side (Leaflet needs `window`)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const L = (await import('leaflet')).default;
        const icon = L.divIcon({
          className: 'busgo-bus-marker',
          html: `
            <div style="
              display:flex;align-items:center;justify-content:center;
              width:36px;height:36px;border-radius:50%;
              background:#10B981;border:3px solid #fff;
              box-shadow:0 4px 12px rgba(16,185,129,0.45);
            ">
              <div style="
                width:10px;height:10px;border-radius:50%;
                background:#fff;
                box-shadow:0 0 0 4px rgba(16,185,129,0.4);
                animation:busgo-ping 1.5s ease-out infinite;
              "></div>
            </div>
            <style>
              @keyframes busgo-ping {
                0%{transform:scale(1);opacity:1}
                75%,100%{transform:scale(2.5);opacity:0}
              }
            </style>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });
        if (!cancelled) setBusIcon(icon);
      } catch {
        /* leaflet failed to load — marker will fall back to default */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleShare = useCallback(async () => {
    const text = `BusGo — ${trip.origin} → ${trip.destination} à ${formatTime(trip.scheduledTime)} (Quai ${trip.platform ?? '—'})`;
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'BusGo Live', text });
      } catch {
        /* user cancelled share */
      }
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        /* clipboard blocked */
      }
    }
  }, [trip]);

  const hasGps = !!trip.gpsPosition && typeof trip.gpsPosition.lat === 'number';
  const gps = trip.gpsPosition;
  const occupied = Math.max(0, trip.totalSeats - trip.availableSeats);
  const occupancyPct = trip.totalSeats > 0 ? Math.min(100, Math.round((occupied / trip.totalSeats) * 100)) : 0;
  const occupancyHigh = occupancyPct >= 90;
  const occupancyMid = occupancyPct >= 70 && !occupancyHigh;

  const statusKey = trip.status;
  const statusLabelMap: Record<string, string> = {
    BOARDING: 'Embarquement',
    SCHEDULED: "À l'heure",
    ON_TIME: "À l'heure",
    DELAYED: 'Retard',
    DEPARTED: 'Parti',
    CANCELLED: 'Annulé',
  };
  const statusBadgeMap: Record<string, string> = {
    BOARDING: 'bg-orange-100 text-orange-700',
    SCHEDULED: 'bg-green-100 text-green-700',
    ON_TIME: 'bg-green-100 text-green-700',
    DELAYED: 'bg-red-100 text-red-700',
    DEPARTED: 'bg-gray-100 text-gray-600',
    CANCELLED: 'bg-gray-100 text-gray-500',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Détails du trajet"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'relative w-full max-w-md transform bg-white shadow-2xl transition-all duration-300 ease-out',
          'max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl',
          mounted ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 sm:translate-y-4',
        )}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white/95 px-5 py-4 backdrop-blur">
          <div className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-gray-200 sm:hidden" aria-hidden />
          <h2 className="text-base font-semibold text-gray-800">Détails du trajet</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-full bg-gray-100 p-2 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 pb-8 pt-4">
          {/* Main info card */}
          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold tabular-nums text-emerald-500">
                    {formatTime(trip.scheduledTime)}
                  </span>
                  {trip.delayMinutes > 0 && (
                    <span className="text-sm font-semibold text-red-600">+{trip.delayMinutes}min</span>
                  )}
                </div>
                <p className="mt-0.5 text-xs capitalize text-gray-500">
                  {formatDate(trip.scheduledTime)}
                </p>
              </div>
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold',
                  statusBadgeMap[statusKey] ?? 'bg-gray-100 text-gray-600',
                )}
              >
                {statusLabelMap[statusKey] ?? statusKey}
              </span>
            </div>

            <div className="mt-4 flex items-center gap-1.5 text-sm">
              <MapPin className="h-4 w-4 shrink-0 text-gray-400" />
              <span className="font-medium text-gray-600">{trip.origin}</span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              <span className="font-semibold text-gray-800">{trip.destination}</span>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 font-semibold text-blue-700">
                <Ticket className="h-3 w-3" /> Ligne {trip.lineNumber}
              </span>
              {trip.platform && (
                <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 font-semibold text-gray-700">
                  <MapPin className="h-3 w-3" /> Quai {trip.platform}
                </span>
              )}
              {trip.agentName && (
                <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 font-medium text-gray-600">
                  Agent · {trip.agentName}
                </span>
              )}
            </div>
          </section>

          {/* GPS map / placeholder */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Position en temps réel
              </h3>
              {hasGps && typeof trip.etaMinutes === 'number' && trip.etaMinutes > 0 && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                  <Navigation className="h-3 w-3" /> ETA {trip.etaMinutes} min
                </span>
              )}
            </div>

            {hasGps && gps && mounted ? (
              <div className="h-56 w-full overflow-hidden rounded-xl border border-gray-200 shadow-sm">
                <MapContainer
                  center={[gps.lat, gps.lng]}
                  zoom={15}
                  scrollWheelZoom={false}
                  className="h-full w-full"
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {busIcon && (
                    <Marker position={[gps.lat, gps.lng]} icon={busIcon}>
                      <Popup>
                        <div className="text-sm">
                          <strong>{trip.lineNumber}</strong> · {trip.origin} → {trip.destination}
                          <br />
                          {typeof trip.etaMinutes === 'number' && trip.etaMinutes > 0
                            ? `Arrivée dans ${trip.etaMinutes} min`
                            : 'En route'}
                        </div>
                      </Popup>
                    </Marker>
                  )}
                </MapContainer>
              </div>
            ) : (
              <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 text-center">
                <MapPin className="h-7 w-7 text-gray-300" />
                <p className="text-sm font-medium text-gray-500">
                  Position GPS non disponible
                </p>
                <p className="text-xs text-gray-400">
                  Le bus n&apos;est pas encore parti ou le suivi est désactivé.
                </p>
              </div>
            )}
          </section>

          {/* Occupation progress */}
          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between text-sm">
              <span className="inline-flex items-center gap-1.5 font-medium text-gray-700">
                <Users className="h-4 w-4 text-gray-400" /> Occupation
              </span>
              <span
                className={cn(
                  'font-semibold tabular-nums',
                  occupancyHigh ? 'text-pink-600' : occupancyMid ? 'text-amber-500' : 'text-emerald-600',
                )}
              >
                {occupied}/{trip.totalSeats}
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className={cn(
                  'h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all',
                  occupancyHigh && 'from-pink-400 to-pink-500',
                  occupancyMid && !occupancyHigh && 'from-amber-400 to-amber-500',
                )}
                style={{ width: `${occupancyPct}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-gray-500">
              {trip.availableSeats} place{trip.availableSeats !== 1 ? 's' : ''} disponible{trip.availableSeats !== 1 ? 's' : ''}
            </p>
          </section>

          {/* Action buttons */}
          <section className="space-y-3">
            {trip.status !== 'DEPARTED' && trip.status !== 'CANCELLED' && (
              <Button
                className="h-12 w-full bg-emerald-500 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-600"
                onClick={() => {
                  /* hook point — parent page handles reservation */
                }}
              >
                Réserver ma place
              </Button>
            )}

            <div className="grid grid-cols-2 gap-2">
              {trip.agentPhone ? (
                <Button
                  asChild
                  variant="outline"
                  className="h-11 border-gray-200 bg-white font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                >
                  <a href={`tel:${trip.agentPhone}`}>
                    <Phone className="h-4 w-4" /> Contacter
                  </a>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  disabled
                  className="h-11 border-gray-200 bg-white font-medium text-gray-400 hover:bg-white"
                >
                  <Phone className="h-4 w-4" /> Contacter
                </Button>
              )}

              <Button
                variant="outline"
                onClick={handleShare}
                className="h-11 border-gray-200 bg-white font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              >
                <Share2 className="h-4 w-4" /> Partager
              </Button>
            </div>
          </section>

          {/* Departed / cancelled notice */}
          {(trip.status === 'DEPARTED' || trip.status === 'CANCELLED') && (
            <div
              className={cn(
                'flex items-center gap-2 rounded-lg border px-3 py-2 text-xs',
                trip.status === 'CANCELLED'
                  ? 'border-gray-200 bg-gray-50 text-gray-600'
                  : 'border-gray-200 bg-gray-50 text-gray-600',
              )}
            >
              <Clock className="h-3.5 w-3.5 shrink-0" />
              {trip.status === 'CANCELLED'
                ? 'Ce trajet a été annulé. Contactez l\'agence pour un réacheminement.'
                : 'Le bus est parti. Bon voyage !'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TripDetailModal;
