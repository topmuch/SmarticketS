'use client';

/**
 * BusGo Dashboard Agent — Écran d'accueil avec:
 *   - Liste des trajets du jour
 *   - Statut du bus (En attente / Embarquement / Prêt / En route)
 *   - Compteur passagers (attendu vs embarqué) + barre de progression
 *   - Boutons "Démarrer l'embarquement" / "Clôturer"
 *   - Lien rapide vers le scanner QR
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Clock, ScanLine, Ticket, MapPin, Users, Bus, Loader2, AlertCircle,
  ChevronRight, Play, CheckCircle2, UserCheck, Navigation,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  SCHEDULED: { label: 'En attente', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', icon: Clock },
  BOARDING: { label: 'Embarquement en cours', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', icon: ScanLine },
  DEPARTED: { label: 'En route', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: Navigation },
  DELAYED: { label: 'Retardé', color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20', icon: AlertCircle },
  CANCELLED: { label: 'Annulé', color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/20', icon: AlertCircle },
};

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

function isToday(dateStr: string): boolean {
  try {
    const d = new Date(dateStr);
    const today = new Date();
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  } catch { return false; }
}

export default function BusGoDashboard() {
  const { user } = useAuth();
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchDepartures = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      let res = await fetch('/api/busgo/trajets', { credentials: 'include' });
      if (!res.ok) {
        res = await fetch('/api/busgo/trajets?dateFilter=all', { credentials: 'include' });
      }
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const data = await res.json();
      const list: Departure[] = Array.isArray(data) ? data : data.data || [];
      const todayList = list.filter((d) => d.scheduledTime && isToday(d.scheduledTime));
      setDepartures(todayList);
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
      const res = await fetch(`/api/busgo/trajets/${dep.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error('Erreur');
      const labels: Record<string, string> = {
        'start-boarding': 'Embarquement démarré !',
        'depart': 'Départ confirmé ! Bon voyage 🚌',
      };
      toast.success(labels[action] || 'Action effectuée');
      fetchDepartures();
    } catch {
      toast.error('Erreur');
    } finally {
      setActionLoading(null);
    }
  };

  // KPIs
  const todayCount = departures.length;
  const boardingCount = departures.filter((d) => d.status === 'BOARDING').length;
  const departedCount = departures.filter((d) => d.status === 'DEPARTED').length;
  const totalPassengers = departures.reduce((acc, d) => acc + (d.ticketsTotal ?? (d.totalSeats - d.availableSeats)), 0);
  const boardedPassengers = departures.reduce((acc, d) => acc + (d.ticketsBoarded ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tableau de bord Agent</h1>
        <p className="text-muted-foreground">Bienvenue, {user?.name || user?.email}. Gérez vos embarquements du jour.</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Trajets aujourd'hui</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayCount}</div>
            {boardingCount > 0 && <p className="text-xs text-amber-600 mt-1">{boardingCount} en embarquement</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">À embarquer</CardTitle>
            <ScanLine className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{boardingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">départs en cours</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Passagers embarqués</CardTitle>
            <UserCheck className="h-4 w-4 text-sky-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{boardedPassengers}</div>
            <p className="text-xs text-muted-foreground mt-1">sur {totalPassengers} attendus</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Bus partis</CardTitle>
            <Navigation className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{departedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">trajets terminés</p>
          </CardContent>
        </Card>
      </div>

      {/* Prochains départs avec barre de progression */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bus className="h-5 w-5" />
            Trajets du jour
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
              <span className="ml-2 text-sm text-muted-foreground">Chargement...</span>
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-sm text-destructive py-4">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          ) : departures.length === 0 ? (
            <div className="text-center py-8">
              <Bus className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">Aucun trajet prévu aujourd'hui.</p>
              <Link href="/busgo/trajets" className="text-amber-600 hover:underline text-sm font-medium mt-2 inline-block">
                → Créer un trajet
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {departures
                .sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime())
                .map((dep) => {
                  const statusCfg = STATUS_CONFIG[dep.status] || STATUS_CONFIG.SCHEDULED;
                  const StatusIcon = statusCfg.icon;
                  const boarded = dep.ticketsBoarded ?? Math.max(0, dep.totalSeats - dep.availableSeats);
                  const total = dep.ticketsTotal ?? dep.totalSeats;
                  const occupancyRate = total > 0 ? Math.round((boarded / total) * 100) : 0;
                  const isBoarding = dep.status === 'BOARDING';
                  const isDeparted = dep.status === 'DEPARTED';
                  const isScheduled = dep.status === 'SCHEDULED';

                  return (
                    <div
                      key={dep.id}
                      className={cn(
                        'rounded-lg border-2 p-4 transition-colors',
                        statusCfg.bg,
                        isBoarding && 'border-amber-400 animate-pulse'
                      )}
                    >
                      {/* Top row: time + line + destination + status */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex flex-col items-center justify-center min-w-[55px]">
                            <span className="text-lg font-bold">{formatTime(dep.scheduledTime)}</span>
                            {dep.delayMinutes > 0 && <span className="text-[10px] text-rose-600">+{dep.delayMinutes}min</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 text-sm font-medium truncate">
                              <MapPin className="h-3 w-3 shrink-0" />
                              <span className="truncate">Ligne {dep.lineNumber} → {dep.destination}</span>
                            </div>
                            <div className="flex items-center gap-3 mt-0.5">
                              {dep.platform && <span className="text-xs text-muted-foreground">Quai {dep.platform}</span>}
                              <span className="text-xs text-muted-foreground">{dep.availableSeats}/{dep.totalSeats} places</span>
                              {dep.agentPhone && <span className="text-xs text-amber-600">Agent: {dep.agentName || dep.agentPhone}</span>}
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline" className={cn('text-xs shrink-0', statusCfg.color)}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusCfg.label}
                        </Badge>
                      </div>

                      {/* Progress bar: passagers embarqués */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Passagers embarqués</span>
                          <span className={cn('font-bold', occupancyRate === 100 ? 'text-emerald-600' : occupancyRate > 0 ? 'text-amber-600' : 'text-muted-foreground')}>
                            {boarded} / {total}
                          </span>
                        </div>
                        <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all duration-500',
                              occupancyRate === 100 ? 'bg-emerald-500' : 'bg-amber-500'
                            )}
                            style={{ width: `${occupancyRate}%` }}
                          />
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2">
                        {/* Démarrer embarquement */}
                        {isScheduled && (
                          <Button
                            size="sm"
                            className="flex-1 bg-amber-600 hover:bg-amber-700"
                            disabled={actionLoading === dep.id}
                            onClick={() => handleAction(dep, 'start-boarding')}
                          >
                            {actionLoading === dep.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
                            Démarrer l'embarquement
                          </Button>
                        )}

                        {/* Clôturer (confirmer départ) */}
                        {(isBoarding || dep.status === 'DELAYED') && (
                          <Button
                            size="sm"
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                            disabled={actionLoading === dep.id}
                            onClick={() => handleAction(dep, 'depart')}
                          >
                            {actionLoading === dep.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                            Clôturer — Bus parti
                          </Button>
                        )}

                        {/* Scanner */}
                        {!isDeparted && (
                          <Link href={`/busgo/embarquement/${dep.id}`}>
                            <Button size="sm" variant="outline" className="border-amber-300 text-amber-700">
                              <ScanLine className="h-4 w-4 mr-1" />
                              Scanner
                            </Button>
                          </Link>
                        )}

                        {/* Voir détails */}
                        <Link href={`/busgo/embarquement/${dep.id}`}>
                          <Button size="sm" variant="ghost">
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

      {/* Quick actions */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Link href="/busgo/trajets">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardContent className="flex items-center gap-3 p-4">
              <Clock className="h-8 w-8 text-amber-600" />
              <div>
                <p className="font-medium">Tous mes trajets</p>
                <p className="text-xs text-muted-foreground">Créer, modifier, supprimer</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/busgo/guichet">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardContent className="flex items-center gap-3 p-4">
              <Ticket className="h-8 w-8 text-emerald-600" />
              <div>
                <p className="font-medium">Vendre un billet</p>
                <p className="text-xs text-muted-foreground">Guichet</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/busgo/notifications">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardContent className="flex items-center gap-3 p-4">
              <Users className="h-8 w-8 text-violet-600" />
              <div>
                <p className="font-medium">Notifications</p>
                <p className="text-xs text-muted-foreground">Templates passagers</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
