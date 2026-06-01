'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  Phone,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Clock,
  Users,
  X,
  Loader2,
  RefreshCw,
  MapPin,
  Bus,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════ */
interface MissingPassenger {
  passengerName: string;
  seatNumber: string;
  ticketId: string;
  controlCode: string;
  passengerPhone: string;
}

interface DepartureAlert {
  departureId: string;
  destination: string;
  lineNumber: string;
  scheduledTime: string;
  effectiveTime: string;
  platform: string | null;
  status: string;
  delayMinutes: number;
  totalSold: number;
  totalScanned: number;
  missingCount: number;
  minutesBeforeDeparture: number;
  missingPassengers: MissingPassenger[];
}

interface MissingAlertsData {
  totalAlerts: number;
  totalMissing: number;
  alerts: DepartureAlert[];
  checkedAt: string;
}

/* ═══════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════ */
function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function cleanPhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

function getTimeLabel(minutes: number): string {
  if (minutes <= 0) return 'Départ imminent !';
  if (minutes === 1) return 'Dans 1 minute';
  return `Dans ${minutes} minutes`;
}

function getTimeColor(minutes: number): string {
  if (minutes <= 5) return 'text-red-600 dark:text-red-400';
  if (minutes <= 10) return 'text-amber-600 dark:text-amber-400';
  return 'text-yellow-600 dark:text-yellow-400';
}

/* ═══════════════════════════════════════════════════════════════
   Component: MissingPassengerAlert
   ═══════════════════════════════════════════════════════════════ */
export default function MissingPassengerAlert({
  agencyId,
}: {
  agencyId: string;
}) {
  const [data, setData] = useState<MissingAlertsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTrips, setExpandedTrips] = useState<Set<string>>(new Set());
  const [markingTickets, setMarkingTickets] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState(false);

  // ─── Fetch alerts (polling every 30s) ─────────────────
  const fetchAlerts = useCallback(async () => {
    if (!agencyId) return;
    try {
      const res = await fetch(
        `/api/dashboard/missing-alerts?agencyId=${encodeURIComponent(agencyId)}`
      );
      if (!res.ok) throw new Error('Erreur de chargement');
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30_000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  // ─── Toggle trip expansion ──────────────────────────
  const toggleTrip = (departureId: string) => {
    setExpandedTrips((prev) => {
      const next = new Set(prev);
      if (next.has(departureId)) {
        next.delete(departureId);
      } else {
        next.add(departureId);
      }
      return next;
    });
  };

  // ─── Mark passenger present ─────────────────────────
  const markPresent = async (
    departureId: string,
    ticketId: string,
    passengerName: string
  ) => {
    setMarkingTickets((prev) => new Set(prev).add(ticketId));

    try {
      const res = await fetch(
        `/api/dashboard/trips/${encodeURIComponent(departureId)}/mark-present`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticketId }),
        }
      );

      if (res.ok) {
        // Immediately refresh to show updated data
        await fetchAlerts();
      } else {
        const err = await res.json();
        alert(err.error || 'Erreur lors du marquage');
      }
    } catch {
      alert('Erreur réseau');
    } finally {
      setMarkingTickets((prev) => {
        const next = new Set(prev);
        next.delete(ticketId);
        return next;
      });
    }
  };

  // ─── Contact passenger ──────────────────────────────
  const contactPassenger = (phone: string) => {
    const cleaned = cleanPhone(phone);
    if (!cleaned) return;
    window.open(`tel:+${cleaned}`, '_self');
  };

  // ─── Render ─────────────────────────────────────────
  if (dismissed || loading) return null;

  if (error) {
    return (
      <div className="mb-6 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between">
        <span className="text-sm text-slate-500">Impossible de charger les alertes passagers</span>
        <button
          onClick={fetchAlerts}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Réessayer"
        >
          <RefreshCw className="w-4 h-4 text-slate-400" />
        </button>
      </div>
    );
  }

  if (!data || data.totalAlerts === 0) return null;

  return (
    <div className="mb-6 space-y-3 animate-slide-up">
      {/* ═══ GLOBAL ALERT BANNER ═══ */}
      <div className="relative bg-gradient-to-r from-red-50 via-red-50 to-orange-50 dark:from-red-500/10 dark:via-red-500/10 dark:to-orange-500/10 border-2 border-red-200 dark:border-red-800 rounded-xl overflow-hidden">
        {/* Pulsing red accent bar */}
        <div className="absolute top-0 left-0 w-1 h-full bg-red-500 animate-pulse" />

        <div className="p-4 sm:p-5 pl-6">
          {/* Header row */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-red-800 dark:text-red-300">
                  ⚠️ Passagers non embarqués
                </h3>
                <p className="text-sm text-red-700 dark:text-red-400 mt-0.5">
                  {data.totalMissing} passager{data.totalMissing > 1 ? 's' : ''} en attente pour{' '}
                  {data.totalAlerts} départ{data.totalAlerts > 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={fetchAlerts}
                className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                title="Actualiser"
              >
                <RefreshCw className="w-4 h-4 text-red-500" />
              </button>
              <button
                onClick={() => setDismissed(true)}
                className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                title="Masquer"
              >
                <X className="w-4 h-4 text-red-500" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ TRIP ALERTS ═══ */}
      {data.alerts.map((trip) => {
        const isExpanded = expandedTrips.has(trip.departureId);
        const fillRate = trip.totalSold > 0
          ? Math.round((trip.totalScanned / trip.totalSold) * 100)
          : 100;

        return (
          <div
            key={trip.departureId}
            className="bg-white dark:bg-slate-900 rounded-xl border border-red-100 dark:border-red-900/50 overflow-hidden shadow-sm"
          >
            {/* Trip header — clickable to expand */}
            <button
              onClick={() => toggleTrip(trip.departureId)}
              className="w-full px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Bus icon + time */}
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex flex-col items-center justify-center shrink-0">
                  <Bus className="w-4 h-4 text-white" />
                  <span className="text-[10px] font-bold text-white leading-none">
                    {formatTime(trip.effectiveTime)}
                  </span>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-800 dark:text-white truncate">
                      {trip.destination}
                    </span>
                    {trip.platform && (
                      <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 text-xs font-medium rounded-md">
                        Quai {trip.platform}
                      </span>
                    )}
                    {trip.delayMinutes > 0 && (
                      <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-medium rounded-md">
                        +{trip.delayMinutes}min
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-1">
                    <span className={`text-xs font-medium flex items-center gap-1 ${getTimeColor(trip.minutesBeforeDeparture)}`}>
                      <Clock className="w-3 h-3" />
                      {getTimeLabel(trip.minutesBeforeDeparture)}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {trip.totalScanned}/{trip.totalSold} embarqués
                    </span>
                    {/* Progress bar */}
                    <div className="w-20 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden hidden sm:block">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          fillRate >= 80 ? 'bg-emerald-500' :
                          fillRate >= 50 ? 'bg-amber-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${fillRate}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right side: count + chevron */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="flex items-center gap-1 px-3 py-1 bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 rounded-lg text-sm font-bold">
                  <Users className="w-3.5 h-3.5" />
                  {trip.missingCount}
                </span>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </button>

            {/* ═══ MISSING PASSENGERS TABLE ═══ */}
            {isExpanded && (
              <div className="border-t border-red-100 dark:border-red-900/50">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/50">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Passager
                        </th>
                        <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:table-cell">
                          Siège
                        </th>
                        <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell">
                          Code
                        </th>
                        <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {trip.missingPassengers.map((p) => {
                        const isMarking = markingTickets.has(p.ticketId);
                        return (
                          <tr
                            key={p.ticketId}
                            className="border-t border-slate-100 dark:border-slate-800 hover:bg-red-50/50 dark:hover:bg-red-500/5 transition-colors"
                          >
                            {/* Passenger info */}
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center shrink-0">
                                  <UserCheck className="w-4 h-4 text-red-500" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-slate-800 dark:text-white truncate">
                                    {p.passengerName}
                                  </p>
                                  <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                                    📱 {p.passengerPhone}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* Seat */}
                            <td className="px-3 py-3 text-center hidden sm:table-cell">
                              <span className="inline-flex items-center justify-center w-10 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm font-mono font-medium text-slate-700 dark:text-slate-300">
                                {p.seatNumber}
                              </span>
                            </td>

                            {/* Control code */}
                            <td className="px-3 py-3 text-center hidden md:table-cell">
                              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                                {p.controlCode.slice(0, 3)}-{p.controlCode.slice(3)}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="px-5 py-3">
                              <div className="flex items-center justify-end gap-2">
                                {/* Contact button */}
                                {p.passengerPhone && (
                                  <button
                                    onClick={() => contactPassenger(p.passengerPhone)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 border border-blue-200 dark:border-blue-800 transition-colors"
                                    title={`Appeler ${p.passengerPhone}`}
                                  >
                                    <Phone className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Contacter</span>
                                  </button>
                                )}

                                {/* Mark present button */}
                                <button
                                  onClick={() =>
                                    markPresent(
                                      trip.departureId,
                                      p.ticketId,
                                      p.passengerName
                                    )
                                  }
                                  disabled={isMarking}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Marquer comme présent"
                                >
                                  {isMarking ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <UserCheck className="w-3.5 h-3.5" />
                                  )}
                                  <span className="hidden sm:inline">
                                    {isMarking ? 'Validation...' : 'Présent'}
                                  </span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Footer */}
                <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{trip.missingCount} passager{trip.missingCount > 1 ? 's' : ''} non embarqué{trip.missingCount > 1 ? 's' : ''}</span>
                  </div>
                  <button
                    onClick={() => {
                      const allTicketIds = trip.missingPassengers.map((p) => p.ticketId);
                      allTicketIds.forEach((ticketId) =>
                        markPresent(trip.departureId, ticketId, '')
                      );
                    }}
                    className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    Tout marquer présent
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Auto-refresh indicator */}
      <div className="text-center">
        <span className="text-[10px] text-slate-400 dark:text-slate-600">
          Actualisation automatique toutes les 30 secondes
        </span>
      </div>
    </div>
  );
}
