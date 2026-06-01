'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Bell,
  AlertTriangle,
  CheckCircle,
  Clock,
  Package,
  TrendingDown,
  Users,
  X,
  Loader2,
  RefreshCw,
  ChevronRight,
  Bus,
  ArrowRight,
  ShieldAlert,
  Filter,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   Types
   ═════════════════════════════════════════════════════════════════ */
interface AlertItem {
  id: string;
  type: string;
  severity: 'critical' | 'warning' | 'info';
  category: string;
  title: string;
  message: string;
  tripId: string | null;
  baggageId: string | null;
  payload: Record<string, unknown> | null;
  status: 'new' | 'read' | 'resolved';
  resolvedAt: string | null;
  resolvedBy: string | null;
  createdAt: string;
}

interface AlertCounts {
  new: number;
  read: number;
  resolved: number;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Config Maps
   ═══════════════════════════════════════════════════════════════════════════ */
const SEVERITY_CONFIG: Record<string, {
  color: string;
  bg: string;
  border: string;
  icon: React.ReactNode;
  label: string;
}> = {
  critical: {
    color: 'text-red-700 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-500/10',
    border: 'border-red-200 dark:border-red-800',
    icon: <ShieldAlert className="w-4 h-4" />,
    label: 'Critique',
  },
  warning: {
    color: 'text-amber-700 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    border: 'border-amber-200 dark:border-amber-800',
    icon: <AlertTriangle className="w-4 h-4" />,
    label: 'Attention',
  },
  info: {
    color: 'text-blue-700 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    border: 'border-blue-200 dark:border-blue-800',
    icon: <Info className="w-4 h-4" />,
    label: 'Info',
  },
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  BUS_PRESQUE_PLEIN: <Bus className="w-4 h-4" />,
  RECETTE_ANORMALE: <TrendingDown className="w-4 h-4" />,
  RETARD_DETECTE: <Clock className="w-4 h-4" />,
  CLIENT_MECONTENT: <Users className="w-4 h-4" />,
  COLIS_EN_SOUFFRANCE: <Package className="w-4 h-4" />,
};

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  ventes: { label: 'Ventes', color: 'bg-emerald-500' },
  operations: { label: 'Opérations', color: 'bg-orange-500' },
  clients: { label: 'Clients', color: 'bg-violet-500' },
  colis: { label: 'Colis', color: 'bg-cyan-500' },
};

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Il y a ${days}j`;
}

/* ═════════════════════════════════════════════════════════════════════════
   Component: AlertCenter
   ═════════════════════════════════════════════════════════════════════════ */
export default function AlertCenter() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [counts, setCounts] = useState<AlertCounts>({ new: 0, read: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [activeStatus, setActiveStatus] = useState<string>('all');
  const [isOpen, setIsOpen] = useState(false);
  const [resolving, setResolving] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (activeFilter !== 'all') params.set('category', activeFilter);
      if (activeStatus !== 'all') params.set('status', activeStatus);
      // Also trigger evaluation on fetch (lazy check)
      params.set('_t', Date.now().toString()); // cache buster

      const res = await fetch(`/api/alerts?${params}`);
      if (!res.ok) throw new Error('Erreur de chargement');
      const data = await res.json();
      setAlerts(data.alerts || []);
      setCounts(data.counts || { new: 0, read: 0, resolved: 0 });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, [activeFilter, activeStatus]);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30_000); // Polling 30s
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  // Also trigger server-side evaluation periodically
  useEffect(() => {
    const evalInterval = setInterval(() => {
      fetch('/api/alerts/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType: 'check_delays' }),
      }).catch(() => {});
    }, 60_000); // Every 60s
    return () => clearInterval(evalInterval);
  }, []);

  // ─── Resolve alert ─────────────────────────────────
  const resolveAlert = async (alertId: string) => {
    setResolving(alertId);
    try {
      const res = await fetch(`/api/alerts/${alertId}/resolve`, {
        method: 'POST',
      });
      if (res.ok) {
        await fetchAlerts();
      } else {
        const err = await res.json();
        alert(err.error || 'Erreur');
      }
    } catch {
      alert('Erreur réseau');
    } finally {
      setResolving(null);
    }
  };

  // ─── Filtered alerts ─────────────────────────────────
  const filteredAlerts = useMemo(() => {
    let result = alerts;
    if (activeStatus === 'all') {
      result = result.filter((a) => a.status !== 'resolved');
    } else {
      result = result.filter((a) => a.status === activeStatus);
    }
    return result;
  }, [alerts, activeStatus]);

  const newCount = counts.new;
  const totalActive = counts.new + counts.read;

  // ─── Category filter buttons ───────────────────────────
  const categories = [
    { key: 'all', label: 'Toutes', color: 'bg-slate-600' },
    { key: 'ventes', ...CATEGORY_CONFIG.ventes },
    { key: 'operations', ...CATEGORY_CONFIG.operations },
    { key: 'clients', ...CATEGORY_CONFIG.clients },
    { key: 'colis', ...CATEGORY_CONFIG.colis },
  ];

  const statusTabs = [
    { key: 'all', label: 'Actives' },
    { key: 'new', label: `Nouvelles (${counts.new})` },
    { key: 'read', label: `Lues (${counts.read})` },
    { key: 'resolved', label: `Traitées (${counts.resolved})` },
  ];

  return (
    <div className="mb-6">
      {/* ═══ TRIGGER BUTTON ═══ */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full relative bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50 transition-all duration-300 group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25">
            <Bell className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">
              Centre d'Alertes
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {totalActive > 0
                ? `${totalActive} alerte${totalActive > 1 ? 's' : ''} active${totalActive !== newCount ? ` (${newCount} nouvelle${newCount > 1 ? 's' : ''})` : 'Aucune alerte active'}`
            }
          </div>
        </div>

        <div className="flex items-center gap-3">
          {newCount > 0 && (
            <span className="flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full bg-red-500 text-white text-xs font-bold animate-pulse">
              {newCount}
            </span>
          )}
          {isOpen ? (
            <X className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
          ) : (
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
          )}
        </div>
      </button>

      {/* ═══ EXPANDED PANEL ═══ */}
      {isOpen && (
        <div className="mt-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 animate-slide-up">
          {/* Toolbar */}
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
            {/* Category filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto flex-1 min-w-0 pb-0.5">
              {categories.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setActiveFilter(cat.key)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                    activeFilter === cat.key
                      ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${cat.color}`} />
                  {cat.label}
                </button>
              ))}
            </div>
            <button
              onClick={fetchAlerts}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
              title="Actualiser"
            >
              <RefreshCw className={`w-4 h-4 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Status tabs */}
          <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 flex gap-1 overflow-x-auto">
            {statusTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveStatus(tab.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
                  activeStatus === tab.key
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Alert list */}
          <div className="max-h-96 overflow-y-auto custom-scrollbar">
            {loading && (
              <div className="flex items-center justify-center py-12 gap-2">
                <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                <span className="text-sm text-slate-400">Chargement...</span>
              </div>
            )}

            {!loading && error && (
              <div className="flex items-center justify-center py-12 px-4">
                <span className="text-sm text-red-500">{error}</span>
                <button onClick={fetchAlerts} className="ml-2 text-sm text-blue-500 underline">
                  Réessayer
                </button>
              </div>
            )}

            {!loading && !error && filteredAlerts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <CheckCircle className="w-10 h-10 text-emerald-500 mb-3" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  Tout est en ordre !
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  Aucune alerte en cours
                </p>
              </div>
            )}

            {!loading && !error && filteredAlerts.map((alert) => {
              const sev = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.warning;
              const typeIcon = TYPE_ICONS[alert.type] || <Bell className="w-4 h-4" />;
              const isResolving = resolving === alert.id;

              return (
                <div
                  key={alert.id}
                  className={`border-b border-slate-100 dark:border-slate-800 last:border-b-0 px-4 py-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${
                    alert.status === 'resolved' ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${sev.bg}`}
                    >
                      <span className={sev.color}>{typeIcon}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className={`text-sm font-bold ${sev.color}`}>
                          {alert.title}
                        </h4>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${sev.bg} ${sev.color}`}>
                          {sev.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2">
                        {alert.message}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {relativeTime(alert.createdAt)}
                        </span>
                        {alert.payload?.destination && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                            <ArrowRight className="w-3 h-3" />
                            {alert.payload.destination as string}
                          </span>
                        )}
                        {alert.payload?.platform && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                            <Bus className="w-3 h-3" />
                            Quai {alert.payload.platform as string}
                          </span>
                        )}
                        {alert.payload?.delayMinutes && (
                          <span className="text-[10px] text-red-500 dark:text-red-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            +{alert.payload.delayMinutes as string}min
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                      {alert.status !== 'resolved' && (
                        <button
                          onClick={() => resolveAlert(alert.id)}
                          disabled={isResolving}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Marquer traité"
                        >
                          {isResolving ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle className="w-3.5 h-3.5" />
                          )}
                          <span className="hidden sm:inline">Traité</span>
                        </button>
                      )}
                      {alert.status === 'resolved' && (
                        <span className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium text-slate-400 bg-slate-50 dark:bg-slate-800">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                          {alert.resolvedBy ? `Par ${alert.resolvedBy}` : 'Traité'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 dark:text-slate-600">
              Actualisation automatique toutes les 30 secondes
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-600">
              {filteredAlerts.length} alerte{filteredAlerts.length > 1 ? 's' : ''} affichée{filteredAlerts.length !== alerts.length ? ` (filtré)` : ''}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
