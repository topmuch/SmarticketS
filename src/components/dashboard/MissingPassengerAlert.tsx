'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertTriangle,
  UserX,
  Phone,
  CheckCircle2,
  Clock,
  Users,
  Eye,
  Loader2,
  RefreshCw,
  MapPin,
  Bus,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

/* ============================================================
   Types
   ============================================================ */

interface MissingPassenger {
  passengerName: string;
  seatNumber: string;
  ticketId: string;
  baggageId: string;
  controlCode: string;
  passengerPhone: string;
  status: 'MISSING';
}

interface TripAlert {
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
  isAlert: boolean;
  missingPassengers: MissingPassenger[];
}

interface ApiResponse {
  success: boolean;
  totalAlerts: number;
  totalMissing: number;
  alerts: TripAlert[];
  checkedAt: string;
}

/* ============================================================
   Constants
   ============================================================ */

const POLL_INTERVAL_MS = 30_000; // 30 seconds

const formatTime = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const formatMinutesBefore = (min: number) => {
  if (min <= 0) return 'En cours';
  if (min === 1) return '1 min';
  return `${min} min`;
};

/* ============================================================
   Sub-components
   ============================================================ */

function AlertBanner({ totalMissing, totalAlerts, lastChecked, onRefresh, loading }: {
  totalMissing: number;
  totalAlerts: number;
  lastChecked: string;
  onRefresh: () => void;
  loading: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-xl border-2 border-red-200 bg-gradient-to-r from-red-50 to-orange-50"
    >
      {/* Animated pulse overlay */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-2 -left-2 w-8 h-8 rounded-full bg-red-400/20"
          animate={{ scale: [1, 2.5], opacity: [0.4, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <motion.div
          className="absolute -top-1 right-20 w-6 h-6 rounded-full bg-orange-400/20"
          animate={{ scale: [1, 2], opacity: [0.3, 0] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.7 }}
        />
      </div>

      <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <div className="w-12 h-12 rounded-xl bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/30">
              <UserX className="w-6 h-6 text-white" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-5 w-5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-5 w-5 bg-red-600 text-white text-[10px] font-bold items-center justify-center">
                {totalMissing}
              </span>
            </span>
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-red-900">
              Passagers Manquants
            </h3>
            <p className="text-sm text-red-700/80">
              {totalMissing} passager{totalMissing > 1 ? 's' : ''} non validé{totalMissing > 1 ? 's' : ''} sur {totalAlerts} départ{totalAlerts > 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-red-500/60">
            Dernière vérification : {formatTime(lastChecked)}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={onRefresh}
            disabled={loading}
            className="ml-auto border-red-200 text-red-700 hover:bg-red-100 hover:text-red-800 flex-shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function TripAlertCard({ alert, onMarkPresent }: {
  alert: TripAlert;
  onMarkPresent: (ticketId: string, passengerName: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const validatedPct = alert.totalSold > 0
    ? Math.round((alert.totalScanned / alert.totalSold) * 100)
    : 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-red-100 shadow-md overflow-hidden">
        {/* Trip Header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left"
        >
          <CardHeader className="pb-3 pt-4 px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="destructive" className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {alert.missingCount} MANQUANT{alert.missingCount > 1 ? 'S' : ''}
                </Badge>
                <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                  <Bus className="w-3 h-3 mr-1" />
                  {alert.lineNumber}
                </Badge>
                <Badge variant="outline" className="border-slate-200 text-xs">
                  <MapPin className="w-3 h-3 mr-1" />
                  {alert.destination}
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <Clock className="w-3 h-3" />
                  {formatTime(alert.effectiveTime)}
                  <span className="text-red-600 font-semibold ml-1">
                    ({formatMinutesBefore(alert.minutesBeforeDeparture)})
                  </span>
                </span>
                {alert.platform && (
                  <Badge variant="outline" className="border-emerald-200 text-emerald-700 text-xs">
                    Quai {alert.platform}
                  </Badge>
                )}
                <div className="flex-shrink-0 text-slate-400">
                  {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>
            </div>
          </CardHeader>
        </button>

        {/* Progress bar */}
        <div className="px-4 sm:px-6 pb-3">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span>Progression embarquement</span>
            <span className="font-semibold">
              {alert.totalScanned}/{alert.totalSold} ({validatedPct}%)
            </span>
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${validatedPct >= 90 ? 'bg-emerald-500' : validatedPct >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
              initial={{ width: 0 }}
              animate={{ width: `${validatedPct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Missing passengers table */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <CardContent className="px-4 sm:px-6 pb-4 pt-0">
                <div className="overflow-x-auto rounded-lg border border-red-100">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-red-50/80">
                        <th className="text-left py-2.5 px-3 font-semibold text-red-800 text-xs uppercase tracking-wider">Passager</th>
                        <th className="text-center py-2.5 px-3 font-semibold text-red-800 text-xs uppercase tracking-wider">Siège</th>
                        <th className="text-center py-2.5 px-3 font-semibold text-red-800 text-xs uppercase tracking-wider">Code Ctrl</th>
                        <th className="text-right py-2.5 px-3 font-semibold text-red-800 text-xs uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-red-50">
                      {alert.missingPassengers.map((p, i) => (
                        <motion.tr
                          key={p.ticketId}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="hover:bg-red-50/40 transition-colors"
                        >
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                                <UserX className="w-4 h-4 text-red-500" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-slate-800 truncate">{p.passengerName}</p>
                                <p className="text-xs text-slate-400">{p.passengerPhone}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="inline-flex items-center justify-center w-10 h-7 rounded-md bg-slate-100 text-xs font-bold text-slate-700">
                              {p.seatNumber}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="text-xs font-mono text-slate-500">{p.controlCode}</span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2.5 text-xs gap-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const waUrl = `https://wa.me/${p.passengerPhone.replace(/[^0-9+]/g, '')}?text=${encodeURIComponent(`Bonjour ${p.passengerName.split(' ')[0]}, votre départ pour ${alert.destination} est dans ${alert.minutesBeforeDeparture} minutes (Quai ${alert.platform || '-'}). Veuillez vous présenter à l'embarquement. — SmarticketS`)}`;
                                  window.open(waUrl, '_blank');
                                }}
                              >
                                <Phone className="w-3 h-3" />
                                <span className="hidden sm:inline">Contacter</span>
                              </Button>
                              <Button
                                size="sm"
                                className="h-7 px-2.5 text-xs gap-1 bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/20"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onMarkPresent(p.ticketId, p.passengerName);
                                }}
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                <span className="hidden sm:inline">Marquer Présent</span>
                              </Button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary footer */}
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {alert.totalSold} vendus
                  </span>
                  <span className="flex items-center gap-1 text-emerald-600">
                    <Eye className="w-3 h-3" />
                    {alert.totalScanned} validés
                  </span>
                  <span className="flex items-center gap-1 text-red-600 font-semibold">
                    <UserX className="w-3 h-3" />
                    {alert.missingCount} manquants
                  </span>
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

function EmptyState({ onRefresh, loading }: { onRefresh: () => void; loading: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <Card className="border-emerald-100 shadow-sm">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-1">
            Tous les passagers sont à bord
          </h3>
          <p className="text-sm text-slate-500 mb-4 max-w-md mx-auto">
            Aucun passager manquant détecté sur les prochains départs.
            Le système vérifie automatiquement toutes les 30 secondes.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={onRefresh}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Vérifier maintenant
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ============================================================
   Main Component: MissingPassengerAlert
   ============================================================ */

export default function MissingPassengerAlert({ agencyId }: { agencyId?: string }) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingTicketId, setMarkingTicketId] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      // W11 fix: use authenticated /api/dashboard/missing-alerts endpoint
      // (was hitting /api/demo/missing-passengers which is public and demo-only)
      const url = agencyId
        ? `/api/dashboard/missing-alerts?agencyId=${encodeURIComponent(agencyId)}`
        : '/api/dashboard/missing-alerts';
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json: ApiResponse = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      console.error('[MissingPassengerAlert] Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  // Initial fetch + polling
  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const handleMarkPresent = async (ticketId: string, passengerName: string) => {
    setMarkingTicketId(ticketId);
    try {
      const res = await fetch('/api/demo/mark-present', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId }),
      });
      const json = await res.json();
      if (json.success) {
        // Refresh alerts after marking
        await fetchAlerts();
      }
    } catch (err) {
      console.error('[mark-present] Error:', err);
    } finally {
      setMarkingTicketId(null);
    }
  };

  // Loading state
  if (loading && !data) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
          <span className="text-sm text-slate-600">Vérification des passagers en cours...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !data) {
    return (
      <Card className="border-red-100">
        <CardContent className="p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-3" />
          <p className="text-sm text-red-600 mb-3">{error}</p>
          <Button size="sm" variant="outline" onClick={fetchAlerts} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            Réessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  // No alerts
  if (data.totalAlerts === 0) {
    return <EmptyState onRefresh={fetchAlerts} loading={loading} />;
  }

  // Has alerts
  return (
    <div className="space-y-4">
      <AlertBanner
        totalMissing={data.totalMissing}
        totalAlerts={data.totalAlerts}
        lastChecked={data.checkedAt}
        onRefresh={fetchAlerts}
        loading={loading}
      />

      <div className="space-y-3">
        {data.alerts.map((alert) => (
          <TripAlertCard
            key={alert.departureId}
            alert={alert}
            onMarkPresent={handleMarkPresent}
          />
        ))}
      </div>

      {/* Marking overlay */}
      <AnimatePresence>
        {markingTicketId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white rounded-xl shadow-2xl p-6 flex flex-col items-center gap-3"
            >
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <p className="text-sm font-medium text-slate-700">Validation en cours...</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
