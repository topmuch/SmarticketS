'use client';

/**
 * Agent Trajets — Liste tous les trajets assignés à l'agent (aujourd'hui + à venir).
 *
 * Placeholder pour la Phase 2 — sera enrichi avec filtres, recherche, etc.
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Clock,
  MapPin,
  Loader2,
  AlertCircle,
  Bus,
  Calendar,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) +
      ' à ' +
      d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

export default function AgentTrajetsPage() {
  const { user } = useAuth();
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDepartures = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      let res = await fetch('/api/agent/trajets', { credentials: 'include' });
      if (!res.ok) {
        res = await fetch('/api/admin/departures', { credentials: 'include' });
      }
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const data = await res.json();
      const list: Departure[] = Array.isArray(data) ? data : data.data || data.departures || [];
      setDepartures(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDepartures();
  }, [fetchDepartures]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mes trajets</h1>
        <p className="text-muted-foreground">
          Tous les départs assignés à votre agence.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {departures.length} trajet{departures.length > 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-sm text-destructive py-4">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          ) : departures.length === 0 ? (
            <div className="text-center py-8">
              <Bus className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">Aucun trajet assigné.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {departures.map((departure) => {
                const statusInfo = STATUS_LABELS[departure.status] || {
                  label: departure.status,
                  variant: 'outline' as const,
                };
                return (
                  <Link
                    key={departure.id}
                    href={`/agent/embarquement/${departure.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-sm font-medium truncate">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">
                            Ligne {departure.lineNumber} → {departure.destination}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDateTime(departure.scheduledTime)}
                          {departure.platform && ` · Quai ${departure.platform}`}
                        </p>
                      </div>
                    </div>
                    <Badge variant={statusInfo.variant} className="capitalize">
                      {statusInfo.label}
                    </Badge>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
