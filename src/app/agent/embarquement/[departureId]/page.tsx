'use client';

/**
 * Page d'embarquement détaillée — /agent/embarquement/[departureId]
 *
 * Adapté de BusGo agent/embarquement/[trajetId]/page.tsx pour SmarticketS.
 *
 * Affiche :
 *   - Header avec ligne, destination, heure, plateforme, statut
 *   - DepartureTimer (countdown T-15/T-5/T-2)
 *   - Plan de sièges visuel (SeatMap)
 *   - Liste des passagers (avec recherche)
 *   - Scanner QR (input manuel + scan caméra si html5-qrcode dispo)
 *   - Boutons d'action : Démarrer embarquement, Marquer départ
 *   - Modal passager manquant (auto à T-5min)
 *   - Notifications de retard
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Bus,
  MapPin,
  Clock,
  ScanLine,
  Search,
  Phone,
  UserCheck,
  UserX,
  Loader2,
  AlertCircle,
  Play,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { DepartureTimer } from '@/components/agent/departure-timer';
import { SeatMap, type SeatTicket } from '@/components/agent/seat-map';
import { MissingPassengerModal, type MissingPassenger } from '@/components/agent/missing-passenger-modal';
import {
  RetardNotifications,
  useDelayNotifications,
} from '@/components/agent/retard-notifications';
import { useAgentVocalAlerts } from '@/hooks/use-agent-vocal-alerts';
import { useKioskSocket } from '@/hooks/use-kiosk-socket';
import { AnnouncementPriority } from '@/lib/audioSystem';
import { cn } from '@/lib/utils';

interface Passenger {
  id: string;
  passengerName: string;
  passengerPhone: string;
  passengerAge: number;
  seatNumber: string;
  platform: string | null;
  destination: string;
  controlCode: string;
  status: string;
  validatedAt: string | null;
  luggageCount: number;
  luggageWeightKg: number;
  hasParentalAuth: boolean;
}

interface DepartureDetail {
  id: string;
  lineNumber: string;
  destination: string;
  scheduledTime: string;
  platform: string | null;
  status: string;
  availableSeats: number;
  totalSeats: number;
  delayMinutes: number;
  route: { name: string; origin: string; destination: string; price: number | null } | null;
  originStation: { name: string; slug: string } | null;
  destinationStation: { name: string; slug: string } | null;
  tickets: Passenger[];
  stats: {
    total: number;
    boarded: number;
    active: number;
    absent: number;
    cancelled: number;
  };
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

const TICKET_STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  BOARDED: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
  ABSENT: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300',
  CANCELLED: 'bg-gray-100 dark:bg-gray-900/30 text-gray-500 line-through',
};

export default function EmbarquementPage() {
  const params = useParams<{ departureId: string }>();
  const router = useRouter();
  const departureId = params.departureId;

  const [departure, setDeparture] = useState<DepartureDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [scanInput, setScanInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [missingModalOpen, setMissingModalOpen] = useState(false);
  const [missingPassengers, setMissingPassengers] = useState<MissingPassenger[]>([]);
  const [snoozeUntil, setSnoozeUntil] = useState<number | null>(null);

  const { announceBoarding, announceImminent, announceMissingPassenger, announceCustom } =
    useAgentVocalAlerts();

  const { notifications, addNotification, dismissNotification } = useDelayNotifications();

  // WebSocket for real-time updates
  const { isConnected } = useKioskSocket({
    enabled: !!departure,
    onEvent: (event, data) => {
      // Refresh data on any ticket-related event
      if (
        event === 'ticket:validated' ||
        event === 'ticket:cancelled' ||
        event === 'passenger:boarded'
      ) {
        fetchDeparture();
      }
    },
  });

  const fetchDeparture = useCallback(async () => {
    if (!departureId) return;
    try {
      const res = await fetch(`/api/agent/trajets/${departureId}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Erreur ${res.status}`);
      }
      const data = await res.json();
      setDeparture(data.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [departureId]);

  useEffect(() => {
    fetchDeparture();
    const interval = setInterval(fetchDeparture, 15_000); // refresh every 15s
    return () => clearInterval(interval);
  }, [fetchDeparture]);

  // Detect missing passengers at T-5min
  useEffect(() => {
    if (!departure || snoozeUntil) return;

    const departureDate = new Date(departure.scheduledTime);
    if (departure.delayMinutes > 0) {
      departureDate.setMinutes(departureDate.getMinutes() + departure.delayMinutes);
    }
    const minutesToDeparture = Math.floor((departureDate.getTime() - Date.now()) / 60000);

    // T-5min or less → show missing passengers
    if (minutesToDeparture <= 5 && minutesToDeparture >= -2) {
      const missing = departure.tickets
        .filter((t) => t.status === 'ACTIVE')
        .map<MissingPassenger>((t) => ({
          id: t.id,
          passengerName: t.passengerName,
          passengerPhone: t.passengerPhone,
          seatNumber: t.seatNumber,
          destination: t.destination,
          controlCode: t.controlCode,
        }));

      if (missing.length > 0 && missing.length !== missingPassengers.length) {
        setMissingPassengers(missing);
        setMissingModalOpen(true);
        // Announce first missing passenger
        if (missing[0]) {
          announceMissingPassenger(missing[0].passengerName, missing[0].seatNumber);
        }
      }
    }
  }, [departure, snoozeUntil, missingPassengers.length, announceMissingPassenger]);

  // Handle scan
  const handleScan = async () => {
    if (!scanInput.trim()) return;
    setScanning(true);
    try {
      const res = await fetch('/api/agent/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          qrCode: scanInput.trim(),
          departureId,
        }),
      });

      const data = await res.json();

      if (res.status === 200 && data.success) {
        toast.success(
          `✓ ${data.ticket.passengerName} embarqué (siège ${data.ticket.seatNumber})`
        );
        announceCustom(
          `Passager ${data.ticket.passengerName}, siège ${data.ticket.seatNumber}, embarqué.`,
          AnnouncementPriority.NORMAL
        );
        setScanInput('');
        await fetchDeparture();
      } else if (res.status === 409) {
        toast.warning(`⚠️ ${data.ticket.passengerName} déjà embarqué`);
      } else if (res.status === 404) {
        toast.error('Billet introuvable');
      } else if (res.status === 403 && data.code === 'WRONG_DEPARTURE') {
        toast.error('Ce billet appartient à un autre départ');
      } else {
        toast.error(data.error || 'Erreur de scan');
      }
    } catch (e) {
      toast.error('Erreur réseau');
      console.error(e);
    } finally {
      setScanning(false);
    }
  };

  // Update ticket status
  const updateTicketStatus = async (ticketId: string, status: 'BOARDED' | 'ABSENT' | 'ACTIVE' | 'CANCELLED') => {
    try {
      const res = await fetch('/api/agent/scan', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ticketId, status }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur');
      }

      toast.success(
        status === 'BOARDED' ? 'Passager marqué embarqué' :
        status === 'ABSENT' ? 'Passager marqué absent' :
        'Statut mis à jour'
      );

      // Remove from missing list if present
      setMissingPassengers((prev) => prev.filter((p) => p.id !== ticketId));
      if (missingPassengers.length <= 1) {
        setMissingModalOpen(false);
      }

      await fetchDeparture();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    }
  };

  // Update departure status (start boarding, depart, etc.)
  const updateDepartureStatus = async (action: 'start-boarding' | 'depart') => {
    if (!departure) return;
    try {
      const res = await fetch(`/api/agent/trajets/${departureId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur');
      }

      toast.success(
        action === 'start-boarding' ? 'Embarquement démarré' : 'Départ confirmé'
      );

      if (action === 'start-boarding') {
        announceBoarding(departure.destination, departure.scheduledTime, departure.platform);
      }

      await fetchDeparture();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    }
  };

  // Signal delay
  const signalDelay = async (depId: string, minutes: number) => {
    const res = await fetch(`/api/agent/trajets/${depId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'delay', delayMinutes: minutes }),
    });
    if (!res.ok) throw new Error('Erreur');
    await fetchDeparture();
  };

  // Filter tickets by search
  const filteredTickets = departure?.tickets.filter(
    (t) =>
      !search ||
      t.passengerName.toLowerCase().includes(search.toLowerCase()) ||
      t.seatNumber.includes(search) ||
      t.controlCode.toLowerCase().includes(search.toLowerCase()) ||
      t.passengerPhone.includes(search)
  ) ?? [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Chargement du départ...</span>
      </div>
    );
  }

  if (error || !departure) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-destructive font-medium">
          {error || 'Départ introuvable'}
        </p>
        <Button variant="outline" onClick={() => router.push('/agent')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour au dashboard
        </Button>
      </div>
    );
  }

  const statusInfo = STATUS_LABELS[departure.status] || {
    label: departure.status,
    variant: 'outline' as const,
  };

  const seatTickets: SeatTicket[] = departure.tickets.map((t) => ({
    id: t.id,
    seatNumber: t.seatNumber,
    passengerName: t.passengerName,
    ticketStatus: t.status,
  }));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/agent')}
          className="shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold truncate">
              Ligne {departure.lineNumber}
            </h1>
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
            {isConnected && (
              <Badge variant="outline" className="text-blue-600 border-blue-300">
                Live
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="h-3 w-3" />
            {departure.route?.origin || departure.originStation?.name || '—'} → {departure.destination}
          </p>
        </div>
      </div>

      {/* Timer */}
      <DepartureTimer
        scheduledTime={departure.scheduledTime}
        delayMinutes={departure.delayMinutes}
        onT15={() => announceBoarding(departure.destination, departure.scheduledTime, departure.platform)}
        onT5={() => announceImminent(departure.destination)}
        onT2={() => announceCustom('Dernier appel pour l\'embarquement. Tous les passagers à bord.', AnnouncementPriority.HIGH)}
        onDeparted={() => announceCustom('Le bus part maintenant. Bon voyage.', AnnouncementPriority.NORMAL)}
      />

      {/* Delay notifications */}
      {notifications.length > 0 && (
        <RetardNotifications
          notifications={notifications}
          onDismiss={dismissNotification}
          onSignalDelay={signalDelay}
        />
      )}

      {/* Quick actions */}
      <div className="flex gap-2 flex-wrap">
        {departure.status === 'SCHEDULED' && (
          <Button
            onClick={() => updateDepartureStatus('start-boarding')}
            className="bg-amber-600 hover:bg-amber-700"
          >
            <Play className="h-4 w-4 mr-2" />
            Démarrer embarquement
          </Button>
        )}
        {(departure.status === 'BOARDING' || departure.status === 'DELAYED') && (
          <Button
            onClick={() => updateDepartureStatus('depart')}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Confirmer le départ
          </Button>
        )}
      </div>

      {/* Scanner QR */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ScanLine className="h-4 w-4 text-emerald-600" />
            Scanner un billet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Code billet (ex: STK-XXXX)"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleScan()}
              className="font-mono"
              autoFocus
            />
            <Button
              onClick={handleScan}
              disabled={scanning || !scanInput.trim()}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {scanning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ScanLine className="h-4 w-4" />
              )}
              <span className="ml-2 hidden sm:inline">Valider</span>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Saisissez le code du billet ou scannez le QR code avec votre caméra.
          </p>
        </CardContent>
      </Card>

      {/* Plan de sièges */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bus className="h-4 w-4 text-blue-600" />
            Plan du bus — {departure.stats.boarded}/{departure.stats.total} embarqués
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SeatMap
            totalSeats={departure.totalSeats}
            tickets={seatTickets}
            onSeatClick={(t) => setSelectedTicketId(t.id)}
            selectedSeatId={selectedTicketId}
          />
        </CardContent>
      </Card>

      {/* Liste des passagers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Passagers ({filteredTickets.length})
          </CardTitle>
          <div className="mt-2 relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher (nom, siège, code, téléphone)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredTickets.length === 0 ? (
            <p className="text-center py-6 text-sm text-muted-foreground">
              {departure.tickets.length === 0
                ? 'Aucun billet vendu pour ce départ.'
                : 'Aucun passager ne correspond à la recherche.'}
            </p>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {filteredTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border p-3 transition-colors',
                    selectedTicketId === ticket.id && 'ring-2 ring-primary',
                    ticket.status === 'BOARDED' && 'bg-emerald-50/50 dark:bg-emerald-900/10',
                    ticket.status === 'ABSENT' && 'bg-rose-50/50 dark:bg-rose-900/10'
                  )}
                >
                  {/* Seat number */}
                  <div
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm shrink-0',
                      TICKET_STATUS_COLORS[ticket.status] || 'bg-gray-100 text-gray-700'
                    )}
                  >
                    {ticket.seatNumber}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{ticket.passengerName}</span>
                      <span className="text-xs text-muted-foreground">
                        {ticket.passengerAge} ans
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                      <span>→ {ticket.destination}</span>
                      {ticket.luggageCount > 0 && (
                        <span>🧳 {ticket.luggageCount} bagage{ticket.luggageCount > 1 ? 's' : ''}</span>
                      )}
                      {ticket.hasParentalAuth && <span className="text-amber-600">Mineur</span>}
                    </div>
                  </div>

                  {/* Status badge */}
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-xs shrink-0',
                      TICKET_STATUS_COLORS[ticket.status]
                    )}
                  >
                    {ticket.status === 'ACTIVE' && 'À embarquer'}
                    {ticket.status === 'BOARDED' && '✓ Embarqué'}
                    {ticket.status === 'ABSENT' && '✗ Absent'}
                    {ticket.status === 'CANCELLED' && 'Annulé'}
                  </Badge>

                  {/* Actions */}
                  <div className="flex gap-1 shrink-0">
                    <a href={`tel:${ticket.passengerPhone}`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600">
                        <Phone className="h-3.5 w-3.5" />
                      </Button>
                    </a>
                    {ticket.status === 'ACTIVE' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-emerald-600"
                        onClick={() => updateTicketStatus(ticket.id, 'BOARDED')}
                        title="Marquer embarqué"
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {(ticket.status === 'ACTIVE' || ticket.status === 'BOARDED') && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-rose-600"
                        onClick={() => updateTicketStatus(ticket.id, 'ABSENT')}
                        title="Marquer absent"
                      >
                        <UserX className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal passager manquant */}
      <MissingPassengerModal
        passengers={missingPassengers}
        minutesToDeparture={
          Math.floor(
            (new Date(departure.scheduledTime).getTime() +
              departure.delayMinutes * 60000 -
              Date.now()) /
              60000
          )
        }
        onMarkAbsent={(id) => updateTicketStatus(id, 'ABSENT')}
        onMarkBoarded={(id) => updateTicketStatus(id, 'BOARDED')}
        onSnooze={() => {
          setMissingModalOpen(false);
          setSnoozeUntil(Date.now() + 60_000); // snooze 1 min
          setTimeout(() => setSnoozeUntil(null), 60_000);
        }}
        onClose={() => setMissingModalOpen(false)}
      />
    </div>
  );
}
