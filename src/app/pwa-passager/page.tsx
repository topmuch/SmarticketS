'use client';

/**
 * PWA Passager — Dashboard
 *
 * Affiche:
 *   - Le billet (n°, siège, destination, heure)
 *   - Le statut du bus (à l'heure, en retard)
 *   - Le numéro de l'agent (lien tel: direct)
 *   - Le chronomètre (démarre au 1er message d'embarquement)
 *   - Bouton "Scanner" pour scanner le QR de l'agent (embarquement)
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bus, Ticket, Clock, Phone, MapPin, ScanLine, Volume2, VolumeX,
  AlertCircle, CheckCircle2, User, Loader2, Timer,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BusGoSWRegistration } from '@/components/busgo/pwa-sw-registration';

interface PassengerData {
  ticket: {
    id: string;
    paperTicketNumber: string | null;
    passengerName: string;
    seatNumber: string;
    destination: string;
    controlCode: string;
    ticketStatus: string;
    boardedAt: string | null;
    isLate: boolean;
    lateMinutes: number;
  };
  departure: {
    id: string;
    destination: string;
    scheduledTime: string;
    platform: string | null;
    lineNumber: string;
    status: string;
    delayMinutes: number;
    agentPhone: string | null;
    agentName: string | null;
    boardingStartedAt: string | null;
    departedAt: string | null;
  };
}

export default function PwaPassagerDashboard() {
  const router = useRouter();
  const [data, setData] = useState<PassengerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  // Fetch ticket data
  const fetchData = useCallback(async () => {
    const ticketId = localStorage.getItem('busgo_ticket_id');
    if (!ticketId) {
      router.push('/pwa-passager/install');
      return;
    }

    try {
      // Use the busgo trajets API to get departure details
      const departureId = localStorage.getItem('busgo_departure_id');
      if (!departureId) {
        setError('Données de billet manquantes');
        setLoading(false);
        return;
      }

      const res = await fetch(`/api/busgo/trajets/${departureId}`, {
        credentials: 'include',
      });

      if (!res.ok) {
        // Fallback: try to get from localStorage (set during install)
        setError('Impossible de charger les données. Reinstallez la PWA.');
        setLoading(false);
        return;
      }

      const result = await res.json();
      const dep = result.data;

      // Find this passenger's ticket in the departure
      const ticket = dep.tickets?.find((t: { id: string }) => t.id === ticketId);
      if (!ticket) {
        setError('Billet non trouvé dans ce départ');
        setLoading(false);
        return;
      }

      setData({
        ticket: {
          id: ticket.id,
          paperTicketNumber: ticket.paperTicketNumber || null,
          passengerName: ticket.passengerName,
          seatNumber: ticket.seatNumber,
          destination: ticket.destination,
          controlCode: ticket.controlCode,
          ticketStatus: ticket.status,
          boardedAt: ticket.validatedAt || null,
          isLate: ticket.isLate || false,
          lateMinutes: ticket.lateMinutes || 0,
        },
        departure: {
          id: dep.id,
          destination: dep.destination,
          scheduledTime: dep.scheduledTime,
          platform: dep.platform,
          lineNumber: dep.lineNumber,
          status: dep.status,
          delayMinutes: dep.delayMinutes || 0,
          agentPhone: dep.agentPhone || null,
          agentName: dep.agentName || null,
          boardingStartedAt: dep.boardingStartedAt || null,
          departedAt: dep.departedAt || null,
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Chronometer: update every second
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-amber-50">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-amber-50 p-4 gap-4">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-destructive text-center">{error || 'Erreur'}</p>
        <Button onClick={() => router.push('/pwa-passager/install')} variant="outline">
          Réinstaller la PWA
        </Button>
      </div>
    );
  }

  // Calculate chronometer
  const departureDate = new Date(data.departure.scheduledTime);
  if (data.departure.delayMinutes > 0) {
    departureDate.setMinutes(departureDate.getMinutes() + data.departure.delayMinutes);
  }
  if (data.ticket.lateMinutes > 0) {
    departureDate.setMinutes(departureDate.getMinutes() + data.ticket.lateMinutes);
  }
  const diffMs = departureDate.getTime() - now;
  const diffMin = Math.floor(diffMs / 60000);
  const diffSec = Math.floor((diffMs % 60000) / 1000);
  const hasDeparted = diffMs <= 0 || data.departure.status === 'DEPARTED';
  const isBoarding = data.departure.status === 'BOARDING' || (diffMin <= 90 && diffMin > 0);
  const isBoarded = data.ticket.ticketStatus === 'BOARDED' || !!data.ticket.boardedAt;

  const formatChrono = () => {
    if (hasDeparted) return 'Départ!';
    if (diffMin >= 60) {
      const h = Math.floor(diffMin / 60);
      const m = diffMin % 60;
      return `${h}h ${m.toString().padStart(2, '0')}min`;
    }
    if (diffMin > 0) {
      return `${diffMin}min ${diffSec.toString().padStart(2, '0')}s`;
    }
    return `${diffSec}s`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-4">
      <BusGoSWRegistration />
      <div className="max-w-md mx-auto space-y-4">
        {/* Header */}
        <div className="text-center pt-4">
          <div className="inline-flex items-center gap-2 bg-amber-600 text-white px-4 py-1.5 rounded-full text-sm font-bold">
            <Bus className="h-4 w-4" />
            BusGo
          </div>
        </div>

        {/* Chronometer */}
        {!hasDeparted && (
          <Card className={`border-2 ${isBoarding ? 'border-amber-400 bg-amber-50' : 'border-blue-200 bg-blue-50'}`}>
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground uppercase font-medium mb-2">
                <Timer className="h-3 w-3" />
                {isBoarding ? 'Embarquement en cours' : 'Départ dans'}
              </div>
              <div className={`text-4xl font-bold tabular-nums ${isBoarding ? 'text-amber-600' : 'text-blue-600'} ${diffMin <= 5 && diffMin > 0 ? 'animate-pulse text-rose-600' : ''}`}>
                {formatChrono()}
              </div>
              {data.ticket.lateMinutes > 0 && (
                <Badge variant="outline" className="mt-2 text-rose-600 border-rose-300">
                  +{data.ticket.lateMinutes}min de retard accordées
                </Badge>
              )}
            </CardContent>
          </Card>
        )}

        {/* Billet */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Ticket className="h-4 w-4 text-amber-600" />
              Mon billet
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">N° ticket</span>
              <span className="font-mono font-bold">{data.ticket.paperTicketNumber || data.ticket.controlCode}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Passager</span>
              <span className="font-medium">{data.ticket.passengerName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Siège</span>
              <span className="font-bold text-lg text-amber-600">{data.ticket.seatNumber}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Ligne</span>
              <span className="font-medium">{data.departure.lineNumber}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Destination</span>
              <span className="font-medium flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {data.departure.destination}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Départ</span>
              <span className="font-medium">
                {new Date(data.departure.scheduledTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            {data.departure.platform && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Quai</span>
                <span className="font-medium">{data.departure.platform}</span>
              </div>
            )}
            {data.departure.delayMinutes > 0 && (
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-2 text-center text-sm text-rose-700">
                ⏰ Retard de {data.departure.delayMinutes} minutes
              </div>
            )}
          </CardContent>
        </Card>

        {/* Statut embarquement */}
        <Card className={`${isBoarded ? 'border-emerald-300 bg-emerald-50' : ''}`}>
          <CardContent className="p-4 flex items-center gap-3">
            {isBoarded ? (
              <>
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                <div>
                  <p className="font-medium text-emerald-700">Embarqué ✓</p>
                  <p className="text-xs text-emerald-600">
                    {data.ticket.boardedAt && new Date(data.ticket.boardedAt).toLocaleTimeString('fr-FR')}
                  </p>
                </div>
              </>
            ) : hasDeparted ? (
              <>
                <AlertCircle className="h-8 w-8 text-rose-600" />
                <div>
                  <p className="font-medium text-rose-700">Bus parti</p>
                  <p className="text-xs text-rose-600">Vous n'avez pas embarqué</p>
                </div>
              </>
            ) : (
              <>
                <ScanLine className="h-8 w-8 text-amber-600" />
                <div>
                  <p className="font-medium">Pas encore embarqué</p>
                  <p className="text-xs text-muted-foreground">Scannez le QR de l'agent en montant</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Bouton Scanner QR agent */}
        {!isBoarded && !hasDeparted && (
          <Button
            className="w-full bg-amber-600 hover:bg-amber-700 text-white h-14 text-base"
            onClick={() => router.push('/pwa-passager/scan')}
          >
            <ScanLine className="h-5 w-5 mr-2" />
            Scanner le QR de l'agent
          </Button>
        )}

        {/* Agent contact */}
        {data.departure.agentPhone && (
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase font-medium mb-2">Contact agent</p>
              <a
                href={`tel:${data.departure.agentPhone}`}
                className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 hover:bg-amber-100 transition-colors"
              >
                <div className="bg-amber-600 text-white rounded-full p-2">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">{data.departure.agentName || 'Agent'}</p>
                  <p className="text-sm text-amber-700">{data.departure.agentPhone}</p>
                </div>
              </a>
              <p className="text-xs text-muted-foreground mt-2">
                En cas de retard, appelez l'agent.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
