'use client';

/**
 * BusGo Embarquement (index) — Liste les trajets du jour avec statuts dynamiques.
 *
 * Affichage:
 *   - H-1h avant: "Embarquement en cours" (amber, clignotant)
 *   - H-0 (imminent): "Embarquement imminent" (rouge, clignotant rapide)
 *   - Après départ: "Bus parti" (gris)
 *   - Programmé: "Programmé" (bleu)
 *   - Annulé: "Annulé" (rouge)
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Clock, MapPin, Loader2, Bus, ChevronRight, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Departure {
  id: string;
  lineNumber: string;
  destination: string;
  scheduledTime: string;
  platform: string | null;
  status: string;
  delayMinutes: number;
  availableSeats: number;
  totalSeats: number;
}

function getDynamicStatus(dep: Departure): {
  label: string;
  color: string;
  bg: string;
  blink: boolean;
} {
  if (dep.status === 'CANCELLED') {
    return { label: 'Annulé', color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/20', blink: false };
  }
  if (dep.status === 'DEPARTED') {
    return { label: '🚌 Bus parti', color: 'text-gray-500', bg: 'bg-gray-50 dark:bg-gray-900/20', blink: false };
  }

  const now = new Date();
  const departureDate = new Date(dep.scheduledTime);
  if (dep.delayMinutes > 0) {
    departureDate.setMinutes(departureDate.getMinutes() + dep.delayMinutes);
  }
  const diffMs = departureDate.getTime() - now.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMs <= 0 && dep.status !== 'DEPARTED') {
    // Imminent — rouge clignotant
    return {
      label: '⚠️ Embarquement imminent',
      color: 'text-rose-700 dark:text-rose-400',
      bg: 'bg-rose-100 dark:bg-rose-900/30 border-rose-400',
      blink: true,
    };
  }

  if (diffMin <= 60 || dep.status === 'BOARDING') {
    // Embarquement en cours — amber clignotant
    return {
      label: '🚪 Embarquement en cours',
      color: 'text-amber-700 dark:text-amber-400',
      bg: 'bg-amber-100 dark:bg-amber-900/30 border-amber-400',
      blink: true,
    };
  }

  if (dep.status === 'DELAYED') {
    return { label: 'Retardé', color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/20', blink: false };
  }

  // Programmé
  return { label: 'Programmé', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', blink: false };
}

export default function BusGoEmbarquementIndex() {
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setTick] = useState(0); // Force re-render every 10s for dynamic status

  const fetchDepartures = useCallback(async () => {
    try {
      const res = await fetch('/api/busgo/trajets?dateFilter=today', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      setDepartures(Array.isArray(data) ? data : data.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartures();
    const interval = setInterval(fetchDepartures, 15_000);
    // Force re-render every 10s to update dynamic statuses
    const tickInterval = setInterval(() => setTick((t) => t + 1), 10_000);
    return () => {
      clearInterval(interval);
      clearInterval(tickInterval);
    };
  }, [fetchDepartures]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Embarquement</h1>
        <p className="text-muted-foreground">Sélectionnez un trajet pour gérer l'embarquement.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bus className="h-5 w-5 text-amber-600" />
            Trajets du jour
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
            </div>
          ) : departures.length === 0 ? (
            <div className="text-center py-8">
              <Bus className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-muted-foreground text-sm mb-4">Aucun trajet aujourd'hui.</p>
              <Link href="/busgo/trajets">
                <button className="text-amber-600 hover:underline text-sm font-medium">
                  → Créer un trajet
                </button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {departures.map((d) => {
                const dyn = getDynamicStatus(d);
                return (
                  <Link
                    key={d.id}
                    href={`/busgo/embarquement/${d.id}`}
                    className={cn(
                      'flex items-center justify-between rounded-lg border-2 p-3 transition-colors group',
                      dyn.bg,
                      dyn.blink && 'animate-pulse'
                    )}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Clock className={cn('h-4 w-4 shrink-0', dyn.color)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-sm font-medium truncate">
                          <MapPin className={cn('h-3 w-3 shrink-0', dyn.color)} />
                          <span className="truncate">Ligne {d.lineNumber} → {d.destination}</span>
                        </div>
                        <p className={cn('text-xs mt-0.5', dyn.color)}>
                          {new Date(d.scheduledTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          {d.platform && ` · Quai ${d.platform}`}
                          {` · ${d.availableSeats}/${d.totalSeats} places`}
                          {d.delayMinutes > 0 && ` · +${d.delayMinutes}min retard`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn('text-xs font-bold', dyn.color)}>
                        {dyn.label}
                      </span>
                      <ChevronRight className={cn('h-4 w-4 group-hover:text-amber-600', dyn.color)} />
                    </div>
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
