'use client';

/**
 * PWA Passager — Scanner QR de l'agent
 *
 * Le passager scanne le QR code affiché par l'agent (contient l'ID du départ).
 * Le système marque le passager comme embarqué.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ScanLine, Loader2, CheckCircle2, AlertCircle, ArrowLeft, Bus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

export default function PwaPassagerScanPage() {
  const router = useRouter();
  const [manualCode, setManualCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    alreadyBoarded?: boolean;
  } | null>(null);

  const handleScan = async (departureId: string) => {
    const ticketId = localStorage.getItem('busgo_ticket_id');
    if (!ticketId) {
      router.push('/pwa-passager/install');
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
            ? 'Vous êtes déjà embarqué'
            : `Embarqué ✓ Siège ${data.ticket.seatNumber}`,
          alreadyBoarded: data.alreadyBoarded,
        });
        setTimeout(() => router.push('/pwa-passager'), 2000);
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

  // Handle manual code entry (fallback if camera not available)
  const handleManualSubmit = () => {
    if (manualCode.trim()) {
      handleScan(manualCode.trim());
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-4">
      <div className="max-w-md mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 pt-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/pwa-passager')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="inline-flex items-center gap-2 bg-amber-600 text-white px-3 py-1 rounded-full text-sm font-bold">
            <Bus className="h-4 w-4" />
            Scanner
          </div>
        </div>

        {/* Result */}
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

        {/* Scanner area */}
        {!result?.success && (
          <Card>
            <CardContent className="p-6">
              <div className="text-center mb-4">
                <ScanLine className="h-16 w-16 text-amber-600 mx-auto mb-2" />
                <p className="font-medium">Scannez le QR code affiché par l'agent</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Le QR code est affiché sur le téléphone de l'agent à l'entrée du bus
                </p>
              </div>

              {/* Manual code entry (fallback) */}
              <div className="space-y-2 mt-6">
                <p className="text-xs text-muted-foreground text-center">
                  Ou saisissez le code manuellement:
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Code départ"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                    className="text-center font-mono"
                  />
                  <Button
                    onClick={handleManualSubmit}
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
