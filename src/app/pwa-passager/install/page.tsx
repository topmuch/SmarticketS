'use client';

/**
 * PWA Passager — Installation
 *
 * Le passager scanne le QR code du guichetier → arrive sur cette page.
 * Le QR contient toutes les infos (nom, siège, etc.) en base64.
 * Le passager saisit son n° de téléphone pour confirmer.
 * La PWA s'installe et redirige vers le dashboard passager.
 */

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Bus, Phone, Loader2, CheckCircle2, AlertCircle, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PwaPassagerInstallPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [qrData, setQrData] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decodedInfo, setDecodedInfo] = useState<{
    n: string; s: string; d: string; h: string;
  } | null>(null);

  useEffect(() => {
    const data = searchParams.get('data');
    if (data) {
      setQrData(data);
      try {
        const payload = JSON.parse(Buffer.from(data, 'base64').toString('utf-8'));
        setDecodedInfo({
          n: payload.n,
          s: payload.s,
          d: payload.d,
          h: payload.h,
        });
      } catch {
        setError('QR code invalide');
      }
    } else {
      setError('Aucune donnée QR reçue. Demandez au guichetier de vous montrer le QR code.');
    }
  }, [searchParams]);

  const handleInstall = async () => {
    if (!qrData || !phone) {
      setError('Veuillez saisir votre numéro de téléphone');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Register Web Push subscription if available
      let pushSubscription = null;
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const reg = await navigator.serviceWorker.ready;
        try {
          pushSubscription = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: undefined, // Will be set when VAPID keys are configured
          });
          pushSubscription = pushSubscription.toJSON();
        } catch {
          // Push not available — continue without it
        }
      }

      const res = await fetch('/api/pwa-passager/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrData,
          phone,
          pushSubscription,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur');
      }

      // Store ticket ID in localStorage for the PWA dashboard
      localStorage.setItem('busgo_ticket_id', data.ticket.id);
      localStorage.setItem('busgo_departure_id', data.departure.id);

      // Redirect to passenger dashboard
      router.push('/pwa-passager');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto bg-amber-600 rounded-xl p-3 w-fit mb-2">
            <Bus className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-xl">BusGo — Installation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {decodedInfo && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
              <p className="text-xs text-muted-foreground font-medium uppercase">Informations du billet</p>
              <div className="text-sm space-y-1">
                <p><span className="font-medium">Nom:</span> {decodedInfo.n}</p>
                <p><span className="font-medium">Siège:</span> {decodedInfo.s}</p>
                <p><span className="font-medium">Destination:</span> {decodedInfo.d}</p>
                <p><span className="font-medium">Départ:</span> {new Date(decodedInfo.h).toLocaleString('fr-FR')}</p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              Confirmez votre numéro de téléphone
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
            <p className="text-xs text-muted-foreground">
              Le numéro doit correspondre à celui enregistré au guichet.
            </p>
          </div>

          <Button
            className="w-full bg-amber-600 hover:bg-amber-700 text-white"
            onClick={handleInstall}
            disabled={loading || !qrData || !phone}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Installation...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Installer et confirmer
              </>
            )}
          </Button>

          <div className="text-center text-xs text-muted-foreground pt-2 border-t">
            <p>📱 Cette application s'installera sur votre téléphone.</p>
            <p>Vous recevrez des notifications vocales avant l'embarquement.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
