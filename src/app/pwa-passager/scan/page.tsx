'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ScanLine, Loader2, CheckCircle2, AlertCircle, ArrowLeft, Bus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

function ScanComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [manualCode, setManualCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    alreadyBoarded?: boolean;
  } | null>(null);

  const depFromUrl = searchParams.get('dep') || '';

  useEffect(() => {
    if (depFromUrl) {
      handleScan(depFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depFromUrl]);

  const handleScan = async (departureId: string) => {
    const ticketId = typeof window !== 'undefined'
      ? localStorage.getItem('busgo_ticket_id')
      : null;

    if (!ticketId) {
      setResult({ success: false, message: 'Aucun billet trouvé. Réinstallez la PWA.' });
      return;
    }

    if (!departureId) {
      setResult({ success: false, message: 'Code de départ manquant' });
      return;
    }

    setScanning(true);
    setResult(null);

    try {
      const res = await fetch('/api/busgo/embarquement/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ departureId, ticketId }),
      });

      const data = await res.json();

      if (res.ok) {
        setResult({
          success: true,
          message: data.alreadyBoarded
            ? 'Vous êtes déjà embarqué ✓'
            : `Embarqué ✓ Siège ${data.ticket.seatNumber}`,
          alreadyBoarded: data.alreadyBoarded,
        });
        setTimeout(() => router.push('/pwa-passager'), 3000);
      } else {
        setResult({
          success: false,
          message: data.error || 'Erreur lors du scan',
        });
      }
    } catch {
      setResult({ success: false, message: 'Erreur réseau' });
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-4">
      <div className="max-w-md mx-auto space-y-4">
        <div className="flex items-center gap-3 pt-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/pwa-passager')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="inline-flex items-center gap-2 bg-amber-600 text-white px-3 py-1 rounded-full text-sm font-bold">
            <Bus className="h-4 w-4" />
            Scanner
          </div>
        </div>

        {result && (
          <Card className={result.success ? 'border-emerald-300 bg-emerald-50' : 'border-rose-300 bg-rose-50'}>
            <CardContent className="p-6 text-center">
              {result.success ? (
                <>
                  <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto mb-2" />
                  <p className="font-medium text-emerald-700">{result.message}</p>
                </>
              ) : (
                <>
                  <AlertCircle className="h-12 w-12 text-rose-600 mx-auto mb-2" />
                  <p className="font-medium text-rose-700">{result.message}</p>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {!result?.success && (
          <Card>
            <CardContent className="p-6">
              <div className="text-center mb-4">
                <ScanLine className="h-16 w-16 text-amber-600 mx-auto mb-2" />
                <p className="font-medium">Scannez le QR code de l'agent</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Le QR est affiché sur le téléphone de l'agent à l'entrée du bus.
                  Vous pouvez aussi saisir le code manuellement.
                </p>
              </div>

              {/* Saisie manuelle */}
              <div className="space-y-2 mt-6">
                <p className="text-xs text-muted-foreground text-center">
                  Saisissez le code affiché par l'agent:
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Code départ"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleScan(manualCode.trim())}
                    className="text-center font-mono"
                  />
                  <Button
                    onClick={() => handleScan(manualCode.trim())}
                    disabled={scanning || !manualCode.trim()}
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : 'OK'}
                  </Button>
                </div>
              </div>

              {scanning && (
                <div className="flex items-center justify-center gap-2 mt-4 text-sm text-amber-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Embarquement en cours...
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function ScanLoading() {
  return (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
    </div>
  );
}

export default function PwaPassagerScanPage() {
  return (
    <Suspense fallback={<ScanLoading />}>
      <ScanComponent />
    </Suspense>
  );
}
