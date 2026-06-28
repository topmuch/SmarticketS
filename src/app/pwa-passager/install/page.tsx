'use client';

/**
 * PWA Passager — Installation (Onboarding Wizard)
 *
 * Étapes:
 *   0. Bienvenue (affiche les infos du billet)
 *   1. Confirmation téléphone
 *   2. Activation notifications (Web Push permission)
 *   3. Installation PWA (install prompt)
 *   4. Redirection vers dashboard
 */

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Bus, Phone, Loader2, CheckCircle2, AlertCircle, Bell, ArrowRight, ArrowLeft,
  Smartphone, Volume2, ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function InstallForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [qrData, setQrData] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decodedInfo, setDecodedInfo] = useState<{
    n: string; s: string; d: string; h: string;
  } | null>(null);
  const [step, setStep] = useState(0); // 0=bienvenue, 1=phone, 2=notifications, 3=install
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [departureId, setDepartureId] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const data = searchParams.get('data');
    if (data) {
      setQrData(data);
      try {
        const payload = JSON.parse(atob(data));
        setDecodedInfo({ n: payload.n, s: payload.s, d: payload.d, h: payload.h });
      } catch {
        setError('QR code invalide');
      }
    } else {
      setError('Aucune donnée QR reçue. Demandez au guichetier de vous montrer le QR code.');
    }

    // Capture PWA install prompt
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [searchParams]);

  const handleConfirmPhone = async () => {
    if (!qrData || !phone) {
      setError('Veuillez saisir votre numéro de téléphone');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      let pushSubscription = null;
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
          // C3 fix: fetch VAPID public key and pass as applicationServerKey
          // Without this, the subscription cannot be used by the server to send push.
          const vapidRes = await fetch('/api/pwa-passager/vapid-public-key');
          if (vapidRes.ok) {
            const { publicKey } = await vapidRes.json();
            if (publicKey) {
              // Convert base64 to Uint8Array for applicationServerKey
              const applicationServerKey = Uint8Array.from(
                atob(publicKey.replace(/-/g, '+').replace(/_/g, '/')),
                (c) => c.charCodeAt(0)
              );
              const reg = await navigator.serviceWorker.ready;
              const sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey,
              });
              pushSubscription = sub.toJSON();
            }
          }
        } catch { /* Push not available or VAPID not configured */ }
      }

      const res = await fetch('/api/pwa-passager/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrData, phone, pushSubscription }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');

      localStorage.setItem('busgo_ticket_id', data.ticket.id);
      localStorage.setItem('busgo_departure_id', data.departure.id);
      // Save controlCode for passenger-route auth (no session needed)
      if (data.ticket.controlCode) {
        localStorage.setItem('busgo_control_code', data.ticket.controlCode);
      }

      // FIX: play ding-dong BEFORE the welcome TTS message
      // (was missing — passenger heard TTS but no ding-dong chime)
      try {
        const { playDingDong } = await import('@/lib/audioSystem');
        playDingDong();
      } catch { /* ding-dong failure is non-fatal */ }

      // Wait 1.5s for ding-dong to finish, then speak welcome message
      setTimeout(() => {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const welcomeText = `Bonjour ${data.ticket.passengerName}. Bienvenue. Votre billet est confirmé. Embarquement prévu à ${new Date(data.departure.scheduledTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}. Votre siège est le numéro ${data.ticket.seatNumber}.`;
          const utterance = new SpeechSynthesisUtterance(welcomeText);
          utterance.lang = 'fr-FR';
          utterance.rate = 0.9;
          utterance.volume = 1.0;
          window.speechSynthesis.speak(utterance);
        }
      }, 1500);
      setTicketId(data.ticket.id);
      setDepartureId(data.departure.id);
      setStep(2); // Go to notifications step
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const handleEnableNotifications = async () => {
    try {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          // Try to register push subscription
          if ('serviceWorker' in navigator && 'PushManager' in window) {
            // C3 fix: fetch VAPID public key for applicationServerKey
            const vapidRes = await fetch('/api/pwa-passager/vapid-public-key');
            if (vapidRes.ok) {
              const { publicKey } = await vapidRes.json();
              if (publicKey) {
                const applicationServerKey = Uint8Array.from(
                  atob(publicKey.replace(/-/g, '+').replace(/_/g, '/')),
                  (c) => c.charCodeAt(0)
                );
                const reg = await navigator.serviceWorker.ready;
                const sub = await reg.pushManager.subscribe({
                  userVisibleOnly: true,
                  applicationServerKey,
                });
                // Send subscription to server (now the route exists — was 404 before C3 fix)
                await fetch('/api/pwa-passager/register-push', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    ticketId,
                    subscription: sub.toJSON(),
                    userAgent: navigator.userAgent,
                  }),
                }).catch(() => {}); // Non-blocking
              }
            }
          }
        }
      }
    } catch { /* Ignore errors */ }
    setStep(3); // Go to install step
  };

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    }
    // Redirect to dashboard regardless
    // FIX (audit #8): redirect to /ticket page (not home) since welcome=1 is handled there
    router.push('/pwa-passager/ticket?welcome=1');
  };

  const steps = ['Bienvenue', 'Téléphone', 'Notifications', 'Installation'];

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto bg-amber-600 rounded-xl p-3 w-fit mb-2">
          <Bus className="h-8 w-8 text-white" />
        </div>
        <CardTitle className="text-xl">BusGo</CardTitle>
        <div className="flex items-center justify-center gap-1 mt-2">
          {steps.map((_, i) => (
            <div key={i} className={`w-8 h-1 rounded-full ${i <= step ? 'bg-amber-600' : 'bg-muted'}`} />
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 0: Bienvenue */}
        {step === 0 && decodedInfo && (
          <div className="space-y-4 text-center">
            <div>
              <h2 className="text-lg font-bold">Bienvenue {decodedInfo.n} !</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Votre billet a été enregistré. Confirmons votre numéro de téléphone pour activer les notifications.
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2 text-left">
              <p className="text-xs text-muted-foreground font-medium uppercase">Votre billet</p>
              <div className="text-sm space-y-1">
                <p><span className="font-medium">Nom:</span> {decodedInfo.n}</p>
                <p><span className="font-medium">Siège:</span> {decodedInfo.s}</p>
                <p><span className="font-medium">Destination:</span> {decodedInfo.d}</p>
                <p><span className="font-medium">Départ:</span> {new Date(decodedInfo.h).toLocaleString('fr-FR')}</p>
              </div>
            </div>
            <Button className="w-full bg-amber-600 hover:bg-amber-700" onClick={() => setStep(1)}>
              Continuer <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Step 1: Téléphone */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="text-center">
              <Phone className="h-8 w-8 text-amber-600 mx-auto mb-2" />
              <h2 className="font-bold">Confirmez votre téléphone</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Le numéro doit correspondre à celui enregistré au guichet.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-1">
                <Phone className="h-3 w-3" /> Numéro de téléphone
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Ex: 77 123 45 67"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="text-lg"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(0)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button
                className="flex-1 bg-amber-600 hover:bg-amber-700"
                onClick={handleConfirmPhone}
                disabled={loading || !phone}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Confirmer
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Notifications */}
        {step === 2 && (
          <div className="space-y-4 text-center">
            <Bell className="h-12 w-12 text-amber-600 mx-auto" />
            <div>
              <h2 className="font-bold">Activez les notifications</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Vous recevrez des <strong>annonces vocales</strong> 1h30 et 5 minutes avant votre départ.
                Le numéro de l'agent sera inclus au cas où vous auriez du retard.
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-left space-y-1 text-xs">
              <p className="flex items-center gap-1"><Volume2 className="h-3 w-3 text-amber-600" /> 🔔 H-1h30: Annonce d'embarquement + n° agent</p>
              <p className="flex items-center gap-1"><Volume2 className="h-3 w-3 text-amber-600" /> 🔔 H-5min: Embarquement imminent</p>
              <p className="flex items-center gap-1"><Volume2 className="h-3 w-3 text-amber-600" /> 🔔 H-0: Départ du bus</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(3)}>Plus tard</Button>
              <Button className="flex-1 bg-amber-600 hover:bg-amber-700" onClick={handleEnableNotifications}>
                <Bell className="h-4 w-4 mr-2" /> Activer les notifications
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Installation */}
        {step === 3 && (
          <div className="space-y-4 text-center">
            <Smartphone className="h-12 w-12 text-amber-600 mx-auto" />
            <div>
              <h2 className="font-bold">Installez l'application</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Ajoutez BusGo à votre écran d'accueil pour un accès rapide et recevoir les notifications même quand l'app est fermée.
              </p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-2 text-sm text-emerald-700">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>Votre billet est confirmé. Vous pouvez maintenant accéder à votre dashboard.</span>
            </div>
            <div className="flex gap-2">
              {deferredPrompt ? (
                <Button className="flex-1 bg-amber-600 hover:bg-amber-700" onClick={handleInstallPWA}>
                  <Smartphone className="h-4 w-4 mr-2" /> Installer l'app
                </Button>
              ) : (
                <Button className="flex-1 bg-amber-600 hover:bg-amber-700" onClick={() => router.push('/pwa-passager/ticket?welcome=1')}>
                  Aller au dashboard <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
            {deferredPrompt && (
              <button onClick={() => router.push('/pwa-passager/ticket?welcome=1')} className="text-xs text-muted-foreground hover:underline">
                Continuer sans installer
              </button>
            )}
          </div>
        )}

        {/* Step 0 fallback (no decodedInfo) */}
        {step === 0 && !decodedInfo && !error && (
          <div className="text-center py-4">
            <Loader2 className="h-8 w-8 animate-spin text-amber-600 mx-auto" />
            <p className="text-sm text-muted-foreground mt-2">Chargement...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InstallLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto" />
        <p className="mt-4 text-sm text-muted-foreground">Chargement...</p>
      </div>
    </div>
  );
}

export default function PwaPassagerInstallPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center p-4">
      <Suspense fallback={<InstallLoading />}>
        <InstallForm />
      </Suspense>
    </div>
  );
}
