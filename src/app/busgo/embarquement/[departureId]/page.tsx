'use client';

/**
 * BusGo Embarquement — Vue transporteur/agent.
 *
 * Affiche:
 *   - QR code de l'agent (statique par départ) pour que les passagers scannent
 *   - Liste des passagers avec statut (embarqué / en attente / absent / retard)
 *   - Bouton "Retard client +5min" par passager
 *   - Détection des absents à H-0
 *   - Chronomètre avant départ
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Bus, MapPin, Clock, QrCode, Users, UserCheck, UserX,
  Loader2, AlertCircle, Phone, Plus, Timer, ScanLine, Bell,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { DepartureTimer } from '@/components/busgo/departure-timer';
import { useAgentVocalAlerts } from '@/hooks/use-agent-vocal-alerts';
import { cn } from '@/lib/utils';

interface Passenger {
  id: string;
  passengerName: string;
  passengerPhone: string;
  seatNumber: string;
  status: string;
  validatedAt: string | null;
  pwaInstalled: boolean;
  isLate: boolean;
  lateMinutes: number;
}

interface DepartureData {
  id: string;
  lineNumber: string;
  destination: string;
  scheduledTime: string;
  platform: string | null;
  status: string;
  totalSeats: number;
  delayMinutes: number;
  agentName: string | null;
  agentPhone: string | null;
  boardingStartedAt: string | null;
  tickets: Passenger[];
  stats: { total: number; boarded: number; active: number; absent: number; cancelled: number };
}

export default function EmbarquementPage() {
  const params = useParams<{ departureId: string }>();
  const router = useRouter();
  const [departure, setDeparture] = useState<DepartureData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retardingId, setRetardingId] = useState<string | null>(null);

  const { announceMissingPassenger } = useAgentVocalAlerts();

  const fetchDeparture = useCallback(async () => {
    if (!params.departureId) return;
    try {
      const res = await fetch(`/api/busgo/trajets/${params.departureId}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Erreur');
      const data = await res.json();
      setDeparture(data.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, [params.departureId]);

  useEffect(() => {
    fetchDeparture();
    const interval = setInterval(fetchDeparture, 10_000);
    return () => clearInterval(interval);
  }, [fetchDeparture]);

  const handleRetard = async (ticketId: string, passengerName: string, seatNumber: string) => {
    setRetardingId(ticketId);
    try {
      const res = await fetch('/api/busgo/embarquement/retard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ticketId, minutes: 5 }),
      });
      if (!res.ok) throw new Error('Erreur');
      toast.success(`${passengerName} (siège ${seatNumber}) a 5 min de retard`);
      fetchDeparture();
    } catch {
      toast.error('Erreur');
    } finally {
      setRetardingId(null);
    }
  };

  // Generate agent QR data (just the departure ID)
  const agentQrData = params.departureId || '';

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    );
  }

  if (error || !departure) {
    return (
      <div className="flex flex-col items-center py-12 gap-3">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-destructive">{error || 'Départ introuvable'}</p>
        <Button variant="outline" onClick={() => router.push('/busgo')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Retour
        </Button>
      </div>
    );
  }

  const boarded = departure.tickets.filter((t) => t.status === 'BOARDED');
  const waiting = departure.tickets.filter((t) => t.status === 'ACTIVE');
  const late = departure.tickets.filter((t) => t.isLate);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/busgo')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Ligne {departure.lineNumber}</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" /> → {departure.destination}
          </p>
        </div>
      </div>

      {/* Timer */}
      <DepartureTimer
        scheduledTime={departure.scheduledTime}
        delayMinutes={departure.delayMinutes}
      />

      {/* QR code de l'agent */}
      <Card className="border-2 border-amber-300">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <QrCode className="h-4 w-4 text-amber-600" />
            QR Code à scanner par les passagers
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <div className="bg-white p-4 rounded-xl inline-block border-2 border-amber-200">
            {/* Simple visual QR placeholder — in production, use qrcode.react */}
            <div className="w-48 h-48 bg-amber-50 rounded-lg flex items-center justify-center border-2 border-dashed border-amber-300">
              <QrCode className="h-24 w-24 text-amber-600" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Affichez ce QR code aux passagers pour qu'ils l'embarquent
          </p>
          <p className="text-xs font-mono text-amber-700 mt-1">
            Code: {agentQrData.slice(-8).toUpperCase()}
          </p>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="bg-emerald-50 dark:bg-emerald-900/20">
          <CardContent className="p-3 text-center">
            <UserCheck className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
            <div className="font-bold text-lg text-emerald-700">{boarded.length}</div>
            <div className="text-xs text-muted-foreground">Embarqués</div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 dark:bg-blue-900/20">
          <CardContent className="p-3 text-center">
            <Users className="h-5 w-5 text-blue-600 mx-auto mb-1" />
            <div className="font-bold text-lg text-blue-700">{waiting.length}</div>
            <div className="text-xs text-muted-foreground">En attente</div>
          </CardContent>
        </Card>
        <Card className="bg-rose-50 dark:bg-rose-900/20">
          <CardContent className="p-3 text-center">
            <Clock className="h-5 w-5 text-rose-600 mx-auto mb-1" />
            <div className="font-bold text-lg text-rose-700">{late.length}</div>
            <div className="text-xs text-muted-foreground">En retard</div>
          </CardContent>
        </Card>
      </div>

      {/* Liste passagers en attente */}
      {waiting.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Passagers en attente ({waiting.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {waiting.map((p) => (
                <div
                  key={p.id}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border p-3',
                    p.isLate && 'border-rose-300 bg-rose-50 dark:bg-rose-900/20'
                  )}
                >
                  <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg w-10 h-10 flex items-center justify-center font-bold text-sm shrink-0">
                    {p.seatNumber}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{p.passengerName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{p.passengerPhone}</span>
                      {p.pwaInstalled ? (
                        <Badge variant="outline" className="text-xs text-emerald-600">📱 PWA</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground">Pas installée</Badge>
                      )}
                      {p.isLate && (
                        <Badge variant="outline" className="text-xs text-rose-600">+{p.lateMinutes}min</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <a href={`tel:${p.passengerPhone}`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600">
                        <Phone className="h-3.5 w-3.5" />
                      </Button>
                    </a>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-amber-600"
                      disabled={retardingId === p.id}
                      onClick={() => handleRetard(p.id, p.passengerName, p.seatNumber)}
                      title="Retard client +5min"
                    >
                      {retardingId === p.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Plus className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Passagers embarqués */}
      {boarded.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-emerald-700">Embarqués ({boarded.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {boarded.map((p) => (
                <div key={p.id} className="flex items-center gap-3 rounded-lg p-2 bg-emerald-50/50 dark:bg-emerald-900/10">
                  <div className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 rounded-lg w-8 h-8 flex items-center justify-center font-bold text-xs">
                    {p.seatNumber}
                  </div>
                  <span className="text-sm font-medium">{p.passengerName}</span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 ml-auto" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
