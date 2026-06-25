'use client';

/**
 * Agent Dashboard — Vue d'ensemble pour l'agent embarquement.
 *
 * Adapté de BusGo agent/page.tsx pour SmarticketS.
 *
 * Affiche:
 *   - KPIs : trajets du jour, billets à valider, billets total
 *   - Liste des prochains départs (avec statut, plateforme, places)
 *   - Lien vers la page d'embarquement détaillée
 *
 * Tout est fetché depuis l'API SmarticketS existante :
 *   - /api/agent/trajets  (à créer si nécessaire, sinon fallback /api/departures)
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Clock,
  ScanLine,
  Ticket,
  MapPin,
  Users,
  Bus,
  Loader2,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

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
  agency?: { name: string };
  ticketsBoarded?: number;
  ticketsTotal?: number;
}

const STATUS_LABELS: Record<string, { label: string; variant: 'secondary' | 'default' | 'destructive' | 'outline' }> = {
  SCHEDULED: { label: 'Programmé', variant: 'secondary' },
  BOARDING: { label: 'Embarquement', variant: 'default' },
  DEPARTED: { label: 'Parti', variant: 'outline' },
  DELAYED: { label: 'Retardé', variant: 'destructive' },
  CANCELLED: { label: 'Annulé', variant: 'destructive' },
  ARRIVED: { label: 'Arrivé', variant: 'outline' },
  IMMINENT_ARRIVAL: { label: 'Arrivée imminente', variant: 'default' },
};

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

function isToday(dateStr: string): boolean {
  try {
    const d = new Date(dateStr);
    const today = new Date();
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  } catch {
    return false;
  }
}

export default function AgentDashboard() {
  const { user } = useAuth();
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDepartures = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      // Try the dedicated agent endpoint first, fallback to admin/departures
      let res = await fetch('/api/agent/trajets', { credentials: 'include' });
      if (!res.ok) {
        // Fallback to admin departures endpoint
        res = await fetch('/api/admin/departures', { credentials: 'include' });
      }
      if (!res.ok) {
        throw new Error(`Erreur ${res.status}`);
      }
      const data = await res.json();
      // Handle both {data: [...]} and [...] shapes
      const list: Departure[] = Array.isArray(data) ? data : data.data || data.departures || [];
      // Filter to today only
      const todayList = list.filter((d) => {
        const timeField = d.scheduledTime || (d as { departureTime?: string }).departureTime;
        return timeField && isToday(timeField);
      });
      setDepartures(todayList);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDepartures();
    // Refresh every 30 seconds
    const interval = setInterval(fetchDepartures, 30_000);
    return () => clearInterval(interval);
  }, [fetchDepartures]);

  // KPIs
  const todayCount = departures.length;
  const boardingCount = departures.filter((d) => d.status === 'BOARDING').length;
  const totalTickets = departures.reduce(
    (acc, d) => acc + (d.ticketsTotal ?? (d.totalSeats - d.availableSeats)),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Tableau de bord Agent
        </h1>
        <p className="text-muted-foreground">
          Bienvenue, {user?.name || user?.email}. Gérez vos embarquements du jour.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Trajets aujourd&apos;hui
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayCount}</div>
            {boardingCount > 0 && (
              <p className="text-xs text-amber-600 mt-1">
                {boardingCount} en embarquement
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              À embarquer
            </CardTitle>
            <ScanLine className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{boardingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">départs en cours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Passagers total
            </CardTitle>
            <Users className="h-4 w-4 text-sky-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTickets}</div>
            <p className="text-xs text-muted-foreground mt-1">billets vendus</p>
          </CardContent>
        </Card>
      </div>

      {/* Prochains départs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bus className="h-5 w-5" />
            Prochains départs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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
              <p className="text-muted-foreground text-sm">
                Aucun trajet prévu aujourd&apos;hui.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {departures
                .sort((a, b) => {
                  const ta = new Date(a.scheduledTime).getTime();
                  const tb = new Date(b.scheduledTime).getTime();
                  return ta - tb;
                })
                .map((departure) => {
                  const statusInfo = STATUS_LABELS[departure.status] || {
                    label: departure.status,
                    variant: 'outline' as const,
                  };
                  const booked = departure.ticketsTotal ?? (departure.totalSeats - departure.availableSeats);
                  const occupancyRate = departure.totalSeats > 0
                    ? Math.round((booked / departure.totalSeats) * 100)
                    : 0;

                  return (
                    <Link
                      key={departure.id}
                      href={`/agent/embarquement/${departure.id}`}
                      className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors group"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Time */}
                        <div className="flex flex-col items-center justify-center min-w-[60px]">
                          <span className="text-sm font-bold">
                            {formatTime(departure.scheduledTime)}
                          </span>
                          {departure.delayMinutes > 0 && (
                            <span className="text-[10px] text-rose-600">
                              +{departure.delayMinutes}min
                            </span>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 text-sm font-medium truncate">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">
                              Ligne {departure.lineNumber} → {departure.destination}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            {departure.platform && (
                              <span className="text-xs text-muted-foreground">
                                Quai {departure.platform}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {booked}/{departure.totalSeats} places ({occupancyRate}%)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Status + action */}
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={statusInfo.variant} className="capitalize">
                          {statusInfo.label}
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </Link>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/agent/trajets">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardContent className="flex items-center gap-3 p-4">
              <Clock className="h-8 w-8 text-amber-600" />
              <div>
                <p className="font-medium">Voir tous mes trajets</p>
                <p className="text-xs text-muted-foreground">Historique et à venir</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/agent/embarquement">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardContent className="flex items-center gap-3 p-4">
              <ScanLine className="h-8 w-8 text-emerald-600" />
              <div>
                <p className="font-medium">Scanner un billet</p>
                <p className="text-xs text-muted-foreground">Embarquement rapide</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
