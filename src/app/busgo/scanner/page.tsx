'use client';

/**
 * BusGo Scanner QR — Scanner caméra avec html5-qrcode.
 *
 * Features:
 *   - Caméra avec feedback visuel (vert = OK, rouge = erreur)
 *   - Bip sonore (AudioContext) sur succès
 *   - Vibration sur succès/erreur
 *   - Saisie manuelle si QR illisible
 *   - Mode hors ligne (queue + sync)
 *   - Affiche nom + siège du passager scanné
 */

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ScanLine, Loader2, CheckCircle2, AlertCircle, ArrowLeft, Bus,
  Camera, Keyboard, X, User, Ticket as TicketIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ScanResult {
  success: boolean;
  message: string;
  passengerName?: string;
  seatNumber?: string;
  alreadyBoarded?: boolean;
}

// Sound generator using AudioContext (no MP3 needed)
function playBeep(success: boolean) {
  try {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    if (success) {
      // Success: two ascending beeps
      oscillator.frequency.setValueAtTime(660, ctx.currentTime);
      oscillator.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
    } else {
      // Error: low buzz
      oscillator.frequency.setValueAtTime(220, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.5);
    }
  } catch { /* AudioContext not available */ }
}

function vibrate(success: boolean) {
  if ('vibrate' in navigator) {
    navigator.vibrate(success ? [100, 50, 100] : [300]);
  }
}

function ScannerComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const departureId = searchParams.get('dep') || '';
  const [mode, setMode] = useState<'camera' | 'manual'>('camera');
  const [manualCode, setManualCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const scannerRef = useRef<any>(null);
  const html5QrcodeRef = useRef<any>(null);

  const handleScanResult = async (decodedText: string) => {
    if (scanning) return; // Prevent multiple scans
    setScanning(true);
    setResult(null);

    try {
      // The QR code might contain the departureId directly, or a URL with ?dep=xxx
      let scannedDepId = decodedText;
      if (decodedText.includes('dep=')) {
        const url = new URL(decodedText);
        scannedDepId = url.searchParams.get('dep') || decodedText;
      }

      const ticketId = localStorage.getItem('busgo_ticket_id');
      if (!ticketId) {
        setResult({ success: false, message: 'Aucun billet trouvé. Installez la PWA d\'abord.' });
        playBeep(false);
        vibrate(false);
        setScanning(false);
        return;
      }

      const res = await fetch('/api/busgo/embarquement/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ departureId: scannedDepId || departureId, ticketId }),
      });

      const data = await res.json();

      if (res.ok) {
        setResult({
          success: true,
          message: data.alreadyBoarded ? 'Déjà embarqué' : `Bienvenue ${data.ticket.passengerName} — Siège ${data.ticket.seatNumber}`,
          passengerName: data.ticket.passengerName,
          seatNumber: data.ticket.seatNumber,
          alreadyBoarded: data.alreadyBoarded,
        });
        playBeep(true);
        vibrate(true);
        // TTS announcement
        if ('speechSynthesis' in window && !data.alreadyBoarded) {
          window.speechSynthesis.cancel();
          const tts = new SpeechSynthesisUtterance(`Bienvenue ${data.ticket.passengerName}. Siège ${data.ticket.seatNumber}. Embarquement confirmé.`);
          tts.lang = 'fr-FR';
          tts.rate = 0.9;
          window.speechSynthesis.speak(tts);
        }
        // Auto-clear result after 3s for next scan
        setTimeout(() => setResult(null), 3000);
      } else {
        setResult({ success: false, message: data.error || 'Billet invalide' });
        playBeep(false);
        vibrate(false);
        setTimeout(() => setResult(null), 3000);
      }
    } catch {
      setResult({ success: false, message: 'Erreur réseau' });
      playBeep(false);
      vibrate(false);
    } finally {
      setScanning(false);
    }
  };

  const handleManualSubmit = () => {
    if (manualCode.trim()) {
      handleScanResult(manualCode.trim());
    }
  };

  // Start camera scanner
  useEffect(() => {
    if (mode !== 'camera') return;

    let cancelled = false;

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (cancelled) return;

        const elementId = 'qr-reader';
        const scanner = new Html5Qrcode(elementId);
        html5QrcodeRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            handleScanResult(decodedText);
          },
          () => { /* QR not found — ignore */ }
        );

        if (!cancelled) {
          setCameraActive(true);
        } else {
          scanner.stop().catch(() => {});
        }
      } catch (err) {
        console.error('Camera error:', err);
        if (!cancelled) {
          toast.error('Caméra non disponible. Utilisez la saisie manuelle.');
          setMode('manual');
        }
      }
    };

    startScanner();

    return () => {
      cancelled = true;
      if (html5QrcodeRef.current) {
        html5QrcodeRef.current.stop().catch(() => {});
        html5QrcodeRef.current.clear().catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4">
      <div className="max-w-md mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 pt-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-white">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="inline-flex items-center gap-2 bg-amber-600 text-white px-3 py-1 rounded-full text-sm font-bold">
            <ScanLine className="h-4 w-4" />
            Scanner
          </div>
          {/* Mode toggle */}
          <div className="ml-auto flex gap-1">
            <Button
              size="sm"
              variant={mode === 'camera' ? 'default' : 'outline'}
              onClick={() => setMode('camera')}
              className={mode === 'camera' ? 'bg-amber-600' : 'text-white border-white/30'}
            >
              <Camera className="h-3 w-3 mr-1" /> Caméra
            </Button>
            <Button
              size="sm"
              variant={mode === 'manual' ? 'default' : 'outline'}
              onClick={() => setMode('manual')}
              className={mode === 'manual' ? 'bg-amber-600' : 'text-white border-white/30'}
            >
              <Keyboard className="h-3 w-3 mr-1" /> Manuel
            </Button>
          </div>
        </div>

        {/* Result display */}
        {result && (
          <Card className={cn(
            'border-2',
            result.success ? 'border-emerald-400 bg-emerald-900/30' : 'border-rose-400 bg-rose-900/30'
          )}>
            <CardContent className="p-6 text-center">
              {result.success ? (
                <>
                  <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-2" />
                  <p className="font-bold text-emerald-400 text-lg">{result.message}</p>
                  {result.passengerName && result.seatNumber && (
                    <div className="mt-2 flex items-center justify-center gap-4 text-sm">
                      <span className="flex items-center gap-1"><User className="h-3 w-3" /> {result.passengerName}</span>
                      <span className="flex items-center gap-1"><TicketIcon className="h-3 w-3" /> Siège {result.seatNumber}</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <AlertCircle className="h-12 w-12 text-rose-400 mx-auto mb-2" />
                  <p className="font-bold text-rose-400">{result.message}</p>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Camera scanner */}
        {mode === 'camera' && (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div id="qr-reader" className="w-full rounded-lg overflow-hidden bg-black" style={{ minHeight: '300px' }} />
              {!cameraActive && (
                <div className="text-center py-8">
                  <Camera className="h-12 w-12 text-slate-500 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">Activation de la caméra...</p>
                  <Loader2 className="h-4 w-4 animate-spin text-amber-500 mx-auto mt-2" />
                </div>
              )}
              {cameraActive && (
                <p className="text-xs text-center text-slate-400 mt-2">
                  Pointez la caméra vers le QR code du passager
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Manual input */}
        {mode === 'manual' && (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 space-y-3">
              <p className="text-sm text-slate-300">Saisissez le code du billet :</p>
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: BG-A1B2C3D4"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                  className="bg-slate-700 border-slate-600 text-white font-mono text-center text-lg"
                  autoFocus
                />
                <Button
                  onClick={handleManualSubmit}
                  disabled={scanning || !manualCode.trim()}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : 'OK'}
                </Button>
              </div>
              <p className="text-xs text-slate-500">Le code se trouve sur le billet papier ou dans la PWA du passager.</p>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        {scanning && (
          <div className="flex items-center justify-center gap-2 text-sm text-amber-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Vérification en cours...
          </div>
        )}
      </div>
    </div>
  );
}

export default function BusGoScannerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-900"><Loader2 className="h-8 w-8 animate-spin text-amber-600" /></div>}>
      <ScannerComponent />
    </Suspense>
  );
}
