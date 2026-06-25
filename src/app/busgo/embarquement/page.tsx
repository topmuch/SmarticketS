'use client';

/**
 * BusGo Embarquement (index) — Liste les trajets du jour avec lien vers l'embarquement.
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Clock, MapPin, Loader2, AlertCircle, Bus, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Departure {
  id: string;
  lineNumber: string;
  destination: string;
  scheduledTime: string;
  platform: string | null;
  status: string;
  availableSeats: number;
  totalSeats: number;
}

const STATUS_LABELS: Record<string, { label: string; variant: 'secondary' | 'default' | 'destructive' | 'outline' }> = {
  SCHEDULED: { label: 'Programmé', variant: 'secondary' },
  BOARDING: { label: 'Embarquement', variant: 'default' },
  DEPARTED: { label: 'Parti', variant: 'outline' },
  DELAYED: { label: 'Retardé', variant: 'destructive' },
};

export default function BusGoEmbarquementIndex() {
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => { fetchDepartures(); }, [fetchDepartures]);

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
                const statusInfo = STATUS_LABELS[d.status] || { label: d.status, variant: 'outline' as const };
                return (
                  <Link
                    key={d.id}
                    href={`/busgo/embarquement/${d.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-sm font-medium truncate">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">Ligne {d.lineNumber} → {d.destination}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(d.scheduledTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          {d.platform && ` · Quai ${d.platform}`}
                          {` · ${d.availableSeats}/${d.totalSeats} places`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-amber-600" />
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
