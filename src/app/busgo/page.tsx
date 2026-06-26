'use client';

/**
 * BusGo Dashboard Agent — Refonte complète.
 *
 * ZONE B: KPIs actionnables (prochain départ + embarquement + alertes)
 * ZONE C: Liste intelligente avec onglets (À venir / En cours / Terminés)
 * ZONE D: Actions secondaires (Scanner + Rapport)
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Clock, ScanLine, MapPin, Bus, Loader2, AlertCircle, ChevronRight,
  Play, CheckCircle2, UserCheck, Navigation, BarChart3, Bell,
  Calendar, Users,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Departure {
  id: string;
  lineNumber: string;
  destination: string;
  scheduledTime: string;
  platform: string | null;
  status: string;
  availableSeats: number;
  totalSeats: number;
  delayMinutes: number;
  agentName: string | null;
  agentPhone: string | null;
  ticketsBoarded?: number;
  ticketsTotal?: number;
}

type Tab = 'upcoming' | 'active' | 'completed';

function isToday(dateStr: string): boolean {
  try {
    const d = new Date(dateStr);
    const today = new Date();
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  } catch { return false; }
}

function getMinutesUntil(iso: string): number {
  return Math.floor((new Date(iso).getTime() - Date.now()) / 60000);
}

export default function BusGoDashboard() {
  const { user } = useAuth();
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('upcoming');

  const fetchDepartures = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/busgo/trajets', { credentials: 'include' });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const data = await res.json();
      const list: Departure[] = Array.isArray(data) ? data : data.data || [];
      setDepartures(list.filter((d) => d.scheduledTime && isToday(d.scheduledTime)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDepartures();
    const interval = setInterval(fetchDepartures, 30_000);
    return () => clearInterval(interval);
  }, [fetchDepartures]);

  const handleAction = async (dep: Departure, action: string) => {
    setActionLoading(dep.id);
    try {
      await fetch(`/api/busgo/trajets/${dep.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action }),
      });
      const labels: Record<string, string> = {
        'start-boarding': 'Embarquement démarré !',
        'depart': 'Départ confirmé ! 🚌',
      };
      toast.success(labels[action] || 'Action effectuée');
      fetchDepartures();
    } catch { toast.error('Erreur'); }
    finally { setActionLoading(null); }
  };

  // Filter by tab
  const upcoming = departures.filter(d => d.status === 'SCHEDULED' || d.status === 'DELAYED')
    .sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());
  const active = departures.filter(d => d.status === 'BOARDING');
  const completed = departures.filter(d => d.status === 'DEPARTED' || d.status === 'CANCELLED');

  const displayed = activeTab === 'upcoming' ? upcoming : activeTab === 'active' ? active : completed;

  // KPI: prochain départ
  const nextDep = upcoming[0];
  const nextDepMin = nextDep ? getMinutesUntil(nextDep.scheduledTime) : null;
  const isUrgent = nextDepMin !== null && nextDepMin <= 15 && nextDepMin > 0;

  // KPI: embarquement en cours
  const activeBoarding = active[0];
  const boardedCount = activeBoarding?.ticketsBoarded ?? 0;
  const totalCount = activeBoarding?.ticketsTotal ?? activeBoarding?.totalSeats ?? 0;
  const occupancyRate = totalCount > 0 ? Math.round((boardedCount / totalCount) * 100) : 0;

  // KPI: alertes
  const delayedCount = departures.filter(d => d.delayMinutes > 0).length;
  const totalPassengers = departures.reduce((acc, d) => acc + (d.ticketsTotal ?? (d.totalSeats - d.availableSeats)), 0);
  const boardedPassengers = departures.reduce((acc, d) => acc + (d.ticketsBoarded ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* ═══ ZONE B: KPIs actionnables ═══ */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Carte 1: Prochain départ */}
        {nextDep ? (
          <Card className={cn(
            'border-2 transition-all hover:-translate-y-0.5 cursor-pointer',
            isUrgent
              ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20 animate-pulse'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
          )} onClick={() => router.push(`/busgo/embarquement/${nextDep.id}`)}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Prochain départ</span>
                {isUrgent && <Badge className="bg-orange-500 text-white text-xs animate-pulse">URGENT</Badge>}
              </div>
              <div className="text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
                {new Date(nextDep.scheduledTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </div>
              <p className="text-sm font-medium mt-1 text-slate-700 dark:text-slate-300">
                Ligne {nextDep.lineNumber} → {nextDep.destination}
              </p>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                {nextDep.platform && <span>Quai {nextDep.platform}</span>}
                {nextDepMin !== null && nextDepMin > 0 && <span className="font-bold text-orange-500">Dans {nextDepMin} min</span>}
                {nextDep.delayMinutes > 0 && <span className="text-rose-500">+{nextDep.delayMinutes}min retard</span>}
              </div>
              <Button size="sm" className={cn('w-full mt-3', isUrgent ? 'bg-orange-500 hover:bg-orange-600' : 'bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600')}>
                <Play className="h-3 w-3 mr-1" /> Gérer l'embarquement
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <CardContent className="p-5 text-center">
              <Bus className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500 dark:text-slate-400">Aucun départ à venir</p>
              <Link href="/busgo/trajets" className="text-xs text-orange-500 hover:underline mt-2 inline-block">→ Créer un trajet</Link>
            </CardContent>
          </Card>
        )}

        {/* Carte 2: Embarquement en cours */}
        {activeBoarding ? (
          <Card className="border-2 border-amber-300 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800 hover:-translate-y-0.5 transition-all cursor-pointer"
            onClick={() => router.push(`/busgo/embarquement/${activeBoarding.id}`)}>
            <CardContent className="p-5">
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide">Embarquement en cours</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{boardedCount}</span>
                <span className="text-sm text-slate-500 dark:text-slate-400">/ {totalCount} passagers</span>
              </div>
              <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mt-2">
                <div className={cn('h-full rounded-full transition-all duration-500', occupancyRate === 100 ? 'bg-emerald-500' : 'bg-amber-500')} style={{ width: `${occupancyRate}%` }} />
              </div>
              <p className="text-sm font-medium mt-2 text-slate-700 dark:text-slate-300">{activeBoarding.lineNumber} → {activeBoarding.destination}</p>
              <Button size="sm" variant="outline" className="w-full mt-3 border-amber-300 text-amber-700 dark:text-amber-400">
                Voir liste passagers
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <CardContent className="p-5 text-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm text-slate-500 dark:text-slate-400">Aucun embarquement actif</p>
            </CardContent>
          </Card>
        )}

        {/* Carte 3: Alertes */}
        <Card className={cn(
          'border-2 transition-all hover:-translate-y-0.5 cursor-pointer',
          delayedCount > 0
            ? 'border-rose-300 bg-rose-50 dark:bg-rose-900/10 dark:border-rose-800'
            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
        )} onClick={() => router.push('/busgo/incidents')}>
          <CardContent className="p-5">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Alertes</span>
            {delayedCount > 0 ? (
              <>
                <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-2">{delayedCount}</div>
                <p className="text-sm text-rose-600 dark:text-rose-400">retard{delayedCount > 1 ? 's' : ''} signalé{delayedCount > 1 ? 's' : ''}</p>
                <Button size="sm" variant="outline" className="w-full mt-3 border-rose-300 text-rose-600 dark:text-rose-400">Voir détails</Button>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-8 w-8 text-emerald-400 mt-2" />
                <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">✅ Tout va bien</p>
                <p className="text-xs text-slate-400 mt-1">{boardedPassengers}/{totalPassengers} passagers embarqués</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ═══ ZONE C: Liste intelligente avec onglets ═══ */}
      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-700">
          {([
            { key: 'upcoming', label: 'À venir', count: upcoming.length },
            { key: 'active', label: 'En cours', count: active.length },
            { key: 'completed', label: 'Terminés', count: completed.length },
          ] as Array<{ key: Tab; label: string; count: number }>).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.key
                  ? 'border-orange-500 text-orange-500'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              )}
            >
              {tab.label} {tab.count > 0 && <span className="ml-1 text-xs">({tab.count})</span>}
            </button>
          ))}
        </div>

        <CardContent className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-sm text-rose-500 py-4">
              <AlertCircle className="h-4 w-4" /> {error}
            </div>
          ) : displayed.length === 0 ? (
            <div className="text-center py-8">
              <Bus className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {activeTab === 'upcoming' ? 'Aucun trajet à venir aujourd\'hui.' :
                 activeTab === 'active' ? 'Aucun embarquement en cours.' :
                 'Aucun trajet terminé.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {displayed.map(dep => {
                const minUntil = getMinutesUntil(dep.scheduledTime);
                const isDepUrgent = minUntil <= 15 && minUntil > 0 && dep.status === 'SCHEDULED';
                const isCompleted = dep.status === 'DEPARTED' || dep.status === 'CANCELLED';
                const boarded = dep.ticketsBoarded ?? Math.max(0, dep.totalSeats - dep.availableSeats);
                const total = dep.ticketsTotal ?? dep.totalSeats;

                return (
                  <div
                    key={dep.id}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border p-3 transition-all hover:bg-slate-50 dark:hover:bg-slate-700/50',
                      isCompleted && 'opacity-50',
                      isDepUrgent && 'border-orange-300 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/10',
                      dep.status === 'BOARDING' && 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10'
                    )}
                  >
                    {/* Time */}
                    <div className="flex flex-col items-center justify-center min-w-[55px]">
                      <span className="text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100">
                        {new Date(dep.scheduledTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {dep.delayMinutes > 0 && <span className="text-[10px] text-rose-500 font-bold">+{dep.delayMinutes}min</span>}
                      {isDepUrgent && <span className="text-[10px] text-orange-500 font-bold">Dans {minUntil}min</span>}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 text-sm font-medium truncate text-slate-900 dark:text-slate-100">
                        <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                        <span className="truncate">Ligne {dep.lineNumber} → {dep.destination}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {dep.platform && <span>Quai {dep.platform}</span>}
                        <span>{dep.availableSeats}/{dep.totalSeats} places</span>
                        {dep.status === 'BOARDING' && <span className="text-amber-500 font-medium">{boarded}/{total} embarqués</span>}
                      </div>
                    </div>

                    {/* Status + actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {dep.status === 'SCHEDULED' && (
                        <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-xs" disabled={actionLoading === dep.id}
                          onClick={(e) => { e.stopPropagation(); handleAction(dep, 'start-boarding'); }}>
                          {actionLoading === dep.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3 mr-1" />}
                          Démarrer
                        </Button>
                      )}
                      {dep.status === 'BOARDING' && (
                        <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-xs" disabled={actionLoading === dep.id}
                          onClick={(e) => { e.stopPropagation(); handleAction(dep, 'depart'); }}>
                          {actionLoading === dep.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                          Clôturer
                        </Button>
                      )}
                      <Link href={`/busgo/embarquement/${dep.id}`}>
                        <Button size="sm" variant="ghost" className="text-slate-400">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══ ZONE D: Actions secondaires ═══ */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/busgo/scanner">
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:-translate-y-0.5 transition-all cursor-pointer">
            <CardContent className="p-6 flex flex-col items-center gap-2">
              <div className="bg-orange-500 text-white rounded-2xl p-4">
                <ScanLine className="h-8 w-8" />
              </div>
              <p className="font-bold text-lg text-slate-900 dark:text-slate-100">Scanner QR</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center">Accès direct caméra</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/busgo/rapports">
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:-translate-y-0.5 transition-all cursor-pointer">
            <CardContent className="p-6 flex flex-col items-center gap-2">
              <div className="bg-slate-700 dark:bg-slate-600 text-white rounded-2xl p-4">
                <BarChart3 className="h-8 w-8" />
              </div>
              <p className="font-bold text-lg text-slate-900 dark:text-slate-100">Rapport du jour</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center">Ventes & embarquements</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}

// Need router import
import { useRouter } from 'next/navigation';
