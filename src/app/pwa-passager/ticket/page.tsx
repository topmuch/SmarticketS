'use client';

/**
 * PWA Passager — Dashboard Principal complet.
 *
 * Affiche:
 *   - Statut du voyage (À l'heure, En retard, Embarquement, Parti)
 *   - QR code du billet
 *   - Compte à rebours jusqu'au départ
 *   - Progression: "Billet confirmé" → "Embarquement en cours" → "Bus parti"
 *   - Informations détaillées (n° ticket, trajet, date, quai, prix, nom)
 *   - Contact chauffeur (appel + message)
 *   - Boutons: Scanner, Messages, Settings, FAQ
 *   - Installation PWA (beforeinstallprompt)
 */

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Bus, Ticket, Clock, Phone, MapPin, ScanLine, Volume2, VolumeX,
  AlertCircle, CheckCircle2, User, Loader2, Timer, Bell, Settings,
  MessageCircle, HelpCircle, Download, Wallet, Navigation, Star,
  Share2, Copy, QrCode,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QRCodeSVG } from 'qrcode.react';
import { BusGoSWRegistration } from '@/components/busgo/pwa-sw-registration';
import { OfferList, useSponsoredOffers } from '@/components/busgo/offer-card';
import { usePassengerTtsAlerts } from '@/hooks/use-passenger-tts-alerts';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
  route?: {
    origin: string;
    destination: string;
    price: number | null;
    durationMinutes: number | null;
  } | null;
}

type VoyageStatus = 'confirmed' | 'boarding' | 'departed' | 'delayed' | 'cancelled';

function getVoyageStatus(data: PassengerData, now: number): {
  status: VoyageStatus;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  blink: boolean;
  progress: number; // 0-100
} {
  const dep = data.departure;
  const departureDate = new Date(dep.scheduledTime);
  if (dep.delayMinutes > 0) departureDate.setMinutes(departureDate.getMinutes() + dep.delayMinutes);
  if (data.ticket.lateMinutes > 0) departureDate.setMinutes(departureDate.getMinutes() + data.ticket.lateMinutes);
  const diffMs = departureDate.getTime() - now;
  const diffMin = Math.floor(diffMs / 60000);

  if (dep.status === 'CANCELLED') {
    return { status: 'cancelled', label: 'Voyage annulé', color: 'text-rose-700', bgColor: 'bg-rose-50 dark:bg-rose-900/20', borderColor: 'border-rose-400', blink: false, progress: 0 };
  }
  if (dep.status === 'DEPARTED' || dep.departedAt) {
    return { status: 'departed', label: '🚌 Bus parti — Bon voyage !', color: 'text-emerald-700', bgColor: 'bg-emerald-50 dark:bg-emerald-900/20', borderColor: 'border-emerald-400', blink: false, progress: 100 };
  }
  if (data.ticket.ticketStatus === 'BOARDED') {
    return { status: 'boarding', label: '✅ Embarqué — En attente de départ', color: 'text-amber-700', bgColor: 'bg-amber-50 dark:bg-amber-900/20', borderColor: 'border-amber-400', blink: false, progress: 75 };
  }
  if (dep.status === 'BOARDING' || dep.boardingStartedAt || diffMin <= 60) {
    return { status: 'boarding', label: '🚪 Embarquement en cours', color: 'text-amber-700', bgColor: 'bg-amber-50 dark:bg-amber-900/20', borderColor: 'border-amber-400', blink: true, progress: 50 };
  }
  if (dep.status === 'DELAYED' || dep.delayMinutes > 0) {
    return { status: 'delayed', label: `⏰ Retard de ${dep.delayMinutes} min`, color: 'text-orange-700', bgColor: 'bg-orange-50 dark:bg-orange-900/20', borderColor: 'border-orange-400', blink: false, progress: 25 };
  }

  return { status: 'confirmed', label: '✅ Billet confirmé', color: 'text-blue-700', bgColor: 'bg-blue-50 dark:bg-blue-900/20', borderColor: 'border-blue-400', blink: false, progress: 25 };
}

export default function PwaPassagerDashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-amber-50"><Loader2 className="h-8 w-8 animate-spin text-amber-600" /></div>}>
      <DashboardInner />
    </Suspense>
  );
}

function DashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<PassengerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const { offers: sponsoredOffers } = useSponsoredOffers('passenger');
  const [welcomeShown, setWelcomeShown] = useState(false);

  // FIX: écouter les events kiosk en temps réel pour les annonces vocales TTS
  // (boarding, departed, delay, cancel) + ding-dong avant chaque annonce
  const passengerTicketId = typeof window !== 'undefined' ? localStorage.getItem('busgo_ticket_id') : null;
  const passengerDepartureId = data?.departure?.id || (typeof window !== 'undefined' ? localStorage.getItem('busgo_departure_id') : null);
  usePassengerTtsAlerts({
    ticketId: passengerTicketId,
    departureId: passengerDepartureId,
    enabled: !!passengerTicketId,
  });

  const fetchData = useCallback(async () => {
    const ticketId = localStorage.getItem('busgo_ticket_id');
    if (!ticketId) {
      router.push('/pwa-passager/install');
      return;
    }
    const departureId = localStorage.getItem('busgo_departure_id');
    if (!departureId) {
      setError('Données de billet manquantes');
      setLoading(false);
      return;
    }

    try {
      // FIX (audit #1): use passenger-dedicated route (no staff auth required)
      // Previously called /api/busgo/trajets/${departureId} which requires a staff session → 401
      const controlCode = typeof window !== 'undefined' ? localStorage.getItem('busgo_control_code') : null;
      const ccParam = controlCode ? `&controlCode=${encodeURIComponent(controlCode)}` : '';
      const res = await fetch(`/api/pwa-passager/ticket/${ticketId}?${ccParam}`.replace('?&', '?'));
      if (!res.ok) {
        setError('Impossible de charger les données');
        setLoading(false);
        return;
      }
      const result = await res.json();

      setData({
        ticket: {
          id: result.ticket.id,
          paperTicketNumber: result.ticket.paperTicketNumber || null,
          passengerName: result.ticket.passengerName,
          seatNumber: result.ticket.seatNumber,
          destination: result.ticket.destination,
          controlCode: result.ticket.controlCode,
          ticketStatus: result.ticket.ticketStatus,
          boardedAt: result.ticket.boardedAt || null,
          isLate: result.ticket.isLate || false,
          lateMinutes: result.ticket.lateMinutes || 0,
        },
        departure: result.departure
          ? {
              id: result.departure.id,
              destination: result.departure.destination,
              scheduledTime: result.departure.scheduledTime,
              platform: result.departure.platform,
              lineNumber: result.departure.lineNumber,
              status: result.departure.status,
              delayMinutes: result.departure.delayMinutes || 0,
              agentPhone: result.departure.agentPhone || null,
              agentName: result.departure.agentName || null,
              boardingStartedAt: result.departure.boardingStartedAt || null,
              departedAt: result.departure.departedAt || null,
            }
          : null,
        route: result.departure?.route || null,
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

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Welcome message + TTS on first load after install
  // Also handles SW cold-open TTS (?tts=1&ttsMessage=...&alertType=...)
  useEffect(() => {
    const welcome = searchParams.get('welcome');
    const ttsParam = searchParams.get('tts');
    const ttsMessage = searchParams.get('ttsMessage');
    const alertType = searchParams.get('alertType');

    // FIX (audit bonus): auto-play TTS when SW opens PWA from a push notification click
    // The SW sets ?tts=1&ttsMessage=...&alertType=... when user taps "🔊 Écouter"
    if (ttsParam === '1' && ttsMessage && !welcomeShown) {
      setWelcomeShown(true);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(decodeURIComponent(ttsMessage));
        u.lang = 'fr-FR';
        u.rate = 0.9;
        u.volume = 1.0;
        window.speechSynthesis.speak(u);
      }
      toast.info(`🔊 ${alertType || 'Annonce'}: ${decodeURIComponent(ttsMessage).substring(0, 80)}`);
      // Clean the URL
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    if (welcome === '1' && data && !welcomeShown) {
      setWelcomeShown(true);

      // Fetch the welcome notification from the log (passenger-dedicated route, no auth)
      fetch(`/api/pwa-passager/notifications/log?ticketId=${data.ticket.id}&type=purchase_confirm`)
        .then(res => res.json())
        .then(logData => {
          if (logData.data && logData.data.length > 0) {
            const notif = logData.data[0];
            // Display notification
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('BusGo — Bienvenue', {
                body: notif.messageText,
                icon: '/icons/icon-192.png',
                tag: 'busgo-welcome',
              });
            }

            // FIX: play ding-dong BEFORE the welcome TTS
            import('@/lib/audioSystem')
              .then(({ playDingDong }) => {
                try { playDingDong(); } catch { /* non-fatal */ }
                // Wait 1.5s for ding-dong, then speak
                setTimeout(() => {
                  if ('speechSynthesis' in window) {
                    window.speechSynthesis.cancel();
                    const u = new SpeechSynthesisUtterance(notif.ttsText);
                    u.lang = 'fr-FR';
                    u.rate = 0.9;
                    u.volume = 1.0;
                    window.speechSynthesis.speak(u);
                  }
                }, 1500);
              })
              .catch(() => {
                // Fallback: speak without ding-dong if audioSystem fails to load
                if ('speechSynthesis' in window) {
                  window.speechSynthesis.cancel();
                  const u = new SpeechSynthesisUtterance(notif.ttsText);
                  u.lang = 'fr-FR';
                  u.rate = 0.9;
                  u.volume = 1.0;
                  window.speechSynthesis.speak(u);
                }
              });

            // Toast
            toast.success(notif.messageText);
          }
        })
        .catch(() => {});
    }
  }, [searchParams, data, welcomeShown]);

  useEffect(() => {
    const handler = (e: any) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
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

  const voyageStatus = getVoyageStatus(data, now);
  const isBoarded = data.ticket.ticketStatus === 'BOARDED' || !!data.ticket.boardedAt;
  const hasDeparted = data.departure.status === 'DEPARTED' || !!data.departure.departedAt;

  // Chronometer
  const departureDate = new Date(data.departure.scheduledTime);
  if (data.departure.delayMinutes > 0) departureDate.setMinutes(departureDate.getMinutes() + data.departure.delayMinutes);
  if (data.ticket.lateMinutes > 0) departureDate.setMinutes(departureDate.getMinutes() + data.ticket.lateMinutes);
  const diffMs = departureDate.getTime() - now;
  const diffMin = Math.floor(diffMs / 60000);
  const diffSec = Math.floor((diffMs % 60000) / 1000);

  const formatChrono = () => {
    if (hasDeparted) return 'Départ!';
    if (diffMin >= 60) {
      const h = Math.floor(diffMin / 60);
      const m = diffMin % 60;
      return `${h}h ${m.toString().padStart(2, '0')}min`;
    }
    if (diffMin > 0) return `${diffMin}min ${diffSec.toString().padStart(2, '0')}s`;
    return `${diffSec}s`;
  };

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-4">
      <BusGoSWRegistration />
      <div className="max-w-md mx-auto space-y-4">
        {/* Header */}
        <div className="text-center pt-4">
          <div className="inline-flex items-center gap-2 bg-amber-600 text-white px-4 py-1.5 rounded-full text-sm font-bold">
            <Bus className="h-4 w-4" />
            {data.route?.origin ? `${data.route.origin} → ${data.departure.destination}` : `BusGo → ${data.departure.destination}`}
          </div>
        </div>

        {/* Statut du voyage — couleur dynamique */}
        <Card className={cn('border-2', voyageStatus.borderColor, voyageStatus.bgColor, voyageStatus.blink && 'animate-pulse')}>
          <CardContent className="p-4 text-center">
            <p className={cn('font-bold text-lg', voyageStatus.color)}>{voyageStatus.label}</p>
            {data.departure.delayMinutes > 0 && !hasDeparted && (
              <Badge variant="outline" className="mt-2 text-orange-600 border-orange-300">
                +{data.departure.delayMinutes}min retard
              </Badge>
            )}
            {data.ticket.lateMinutes > 0 && !hasDeparted && (
              <Badge variant="outline" className="mt-2 ml-1 text-rose-600 border-rose-300">
                +{data.ticket.lateMinutes}min (votre retard)
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Barre de progression */}
        <div className="flex items-center gap-2">
          {[
            { label: 'Confirmé', done: true, icon: CheckCircle2 },
            { label: 'Embarquement', done: voyageStatus.progress >= 50, icon: ScanLine },
            { label: 'Bus parti', done: voyageStatus.progress >= 100, icon: Bus },
          ].map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={i} className="flex-1 text-center">
                <div className={cn(
                  'mx-auto w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors',
                  step.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-muted border-muted-foreground/20 text-muted-foreground'
                )}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className={cn('text-xs mt-1', step.done ? 'text-emerald-600 font-medium' : 'text-muted-foreground')}>{step.label}</p>
              </div>
            );
          })}
        </div>

        {/* Chronomètre */}
        {!hasDeparted && (
          <Card className={cn('border-2', diffMin <= 5 && diffMin > 0 ? 'border-rose-400 bg-rose-50 animate-pulse' : 'border-amber-300 bg-amber-50')}>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground uppercase font-medium mb-1">
                <Timer className="h-3 w-3" />
                {isBoarded ? 'Départ dans' : 'Embarquement dans'}
              </div>
              <div className={cn('text-3xl font-bold tabular-nums', diffMin <= 5 && diffMin > 0 ? 'text-rose-600' : 'text-amber-600')}>
                {formatChrono()}
              </div>
            </CardContent>
          </Card>
        )}

        {/* QR Code du billet + Partage WhatsApp */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <QrCode className="h-4 w-4 text-amber-600" />
              Mon billet QR Code
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-3">
            {/* QR Code */}
            <div className="bg-white p-3 rounded-xl inline-block border-2 border-amber-200">
              <QRCodeSVG
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/pwa-passager/install?data=${btoa(JSON.stringify({
                  t: data.ticket.id,
                  n: data.ticket.passengerName,
                  s: data.ticket.seatNumber,
                  d: data.departure.destination,
                  c: data.ticket.controlCode,
                }))}`}
                size={160}
                level="M"
              />
            </div>

            {/* Infos billet */}
            <div className="grid grid-cols-2 gap-2 text-sm text-left">
              <div><span className="text-muted-foreground">N° ticket:</span> <span className="font-mono font-bold">{data.ticket.paperTicketNumber || data.ticket.controlCode}</span></div>
              <div><span className="text-muted-foreground">Siège:</span> <span className="font-bold text-lg text-amber-600">{data.ticket.seatNumber}</span></div>
              <div><span className="text-muted-foreground">Passager:</span> <span className="font-medium">{data.ticket.passengerName}</span></div>
              <div><span className="text-muted-foreground">Ligne:</span> <span className="font-medium">{data.departure.lineNumber}</span></div>
              <div><span className="text-muted-foreground">Départ:</span> <span className="font-medium">{new Date(data.departure.scheduledTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span></div>
              {data.departure.platform && <div><span className="text-muted-foreground">Quai:</span> <span className="font-medium">{data.departure.platform}</span></div>}
            </div>

            {/* Code de contrôle */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
              <p className="text-xs text-muted-foreground">Code de contrôle</p>
              <p className="font-mono font-bold text-amber-700 text-lg tracking-wider">{data.ticket.controlCode}</p>
            </div>

            {/* Boutons de partage */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => {
                  const ticketUrl = `${window.location.origin}/pwa-passager/install?data=${btoa(JSON.stringify({
                    t: data.ticket.id,
                    n: data.ticket.passengerName,
                    s: data.ticket.seatNumber,
                    d: data.departure.destination,
                    c: data.ticket.controlCode,
                  }))}`;
                  const waText = encodeURIComponent(`🎫 Mon billet BusGo\n\nPassager: ${data.ticket.passengerName}\nSiège: ${data.ticket.seatNumber}\nDestination: ${data.departure.destination}\nDépart: ${new Date(data.departure.scheduledTime).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}\nCode: ${data.ticket.controlCode}\n\nLien du billet: ${ticketUrl}`);
                  window.open(`https://wa.me/?text=${waText}`, '_blank');
                }}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Partager WhatsApp
              </Button>
              <Button
                variant="outline"
                className="border-amber-300 text-amber-700 hover:bg-amber-50"
                onClick={() => {
                  const ticketUrl = `${window.location.origin}/pwa-passager/install?data=${btoa(JSON.stringify({
                    t: data.ticket.id,
                    n: data.ticket.passengerName,
                    s: data.ticket.seatNumber,
                    d: data.departure.destination,
                    c: data.ticket.controlCode,
                  }))}`;
                  navigator.clipboard.writeText(ticketUrl);
                  toast.success('Lien du billet copié !');
                }}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copier le lien
              </Button>
            </div>

            {/* Bouton partage natif (si disponible) */}
            {typeof navigator !== 'undefined' && navigator.share && (
              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={() => {
                  navigator.share({
                    title: 'Mon billet BusGo',
                    text: `Billet ${data.ticket.passengerName} - Siège ${data.ticket.seatNumber} - ${data.departure.destination}`,
                    url: `${window.location.origin}/pwa-passager/install?data=${btoa(JSON.stringify({
                      t: data.ticket.id,
                      n: data.ticket.passengerName,
                      s: data.ticket.seatNumber,
                      d: data.departure.destination,
                      c: data.ticket.controlCode,
                    }))}`,
                  }).catch(() => {});
                }}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Partager...
              </Button>
            )}

            {data.ticket.ticketStatus === 'BOARDED' && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 text-sm text-emerald-700 flex items-center justify-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Embarqué à {data.ticket.boardedAt ? new Date(data.ticket.boardedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Boutons d'action */}
        {!isBoarded && !hasDeparted && (
          <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white h-14 text-base" onClick={() => router.push('/pwa-passager/scan')}>
            <ScanLine className="h-5 w-5 mr-2" />
            Scanner le QR de l'agent
          </Button>
        )}

        {/* Communication directe */}
        <div className="grid grid-cols-2 gap-3">
          {data.departure.agentPhone && (
            <a href={`tel:${data.departure.agentPhone}`}>
              <Card className="hover:bg-amber-50 transition-colors cursor-pointer h-full">
                <CardContent className="p-4 flex flex-col items-center gap-2">
                  <div className="bg-amber-600 text-white rounded-full p-2">
                    <Phone className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-medium">Appeler l'agent</p>
                  <p className="text-xs text-muted-foreground">{data.departure.agentName || data.departure.agentPhone}</p>
                </CardContent>
              </Card>
            </a>
          )}
          <button onClick={() => router.push('/pwa-passager/messages')}>
            <Card className="hover:bg-amber-50 transition-colors cursor-pointer h-full">
              <CardContent className="p-4 flex flex-col items-center gap-2">
                <div className="bg-blue-600 text-white rounded-full p-2">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium">Messages</p>
                <p className="text-xs text-muted-foreground">Contacter le chauffeur</p>
              </CardContent>
            </Card>
          </button>
        </div>

        {/* Liens rapides */}
        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => router.push('/pwa-passager/settings')}>
            <Card className="hover:bg-muted/50 transition-colors">
              <CardContent className="p-3 text-center">
                <Settings className="h-5 w-5 mx-auto text-muted-foreground" />
                <p className="text-xs mt-1">Paramètres</p>
              </CardContent>
            </Card>
          </button>
          <button onClick={() => router.push('/pwa-passager/faq')}>
            <Card className="hover:bg-muted/50 transition-colors">
              <CardContent className="p-3 text-center">
                <HelpCircle className="h-5 w-5 mx-auto text-muted-foreground" />
                <p className="text-xs mt-1">FAQ / Aide</p>
              </CardContent>
            </Card>
          </button>
          {deferredPrompt && (
            <button onClick={handleInstallPWA}>
              <Card className="hover:bg-amber-50 transition-colors border-amber-200">
                <CardContent className="p-3 text-center">
                  <Download className="h-5 w-5 mx-auto text-amber-600" />
                  <p className="text-xs mt-1 text-amber-600 font-medium">Installer</p>
                </CardContent>
              </Card>
            </button>
          )}
        </div>

        {/* Sponsored offers */}
        {sponsoredOffers.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Offres du moment</p>
            <OfferList offers={sponsoredOffers} variant="card" />
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground pt-4">
          © {new Date().getFullYear()} BusGo — Notifications vocales gratuites
        </p>
      </div>
    </div>
  );
}
