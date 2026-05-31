'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  MapPin,
  User,
  Navigation,
  Clock,
  Package,
  Weight,
  Check,
  Loader2,
  AlertTriangle,
  MessageCircle,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────

interface DeliveryItem {
  id: string;
  reference: string;
  departureCity: string | null;
  destination: string | null;
  receiverName: string | null;
  receiverWhatsapp: string | null;
  pickupAddress: string | null;
  colisType: string | null;
  colisTypeOther: string | null;
  colisWeight: number | null;
  colisColor: string | null;
  paymentStatus: string;
  estimatedArrival: string | null;
  departureTime: string | null;
  whatsappOwner: string | null;
  travelerFirstName: string | null;
  travelerLastName: string | null;
  retrievalPin: string | null;
}

type PageState = 'loading' | 'pin_entry' | 'confirming' | 'success' | 'error_pin' | 'error_network' | 'not_found';

// ─── Constants ────────────────────────────────────────────────────────────

const PIN_LENGTH = 6;
const MAX_PIN_ATTEMPTS = 5;

// ─── Helpers ──────────────────────────────────────────────────────────────

function getColisTypeLabel(colisType: string | null, colisTypeOther: string | null): string {
  if (colisType === 'OTHER' && colisTypeOther) return colisTypeOther;
  const labels: Record<string, string> = {
    VALISE: 'Valise',
    SAC: 'Sac',
    CARTON: 'Carton',
    BACKPACK: 'Sac à dos',
    CABIN: 'Cabine',
  };
  return colisType ? labels[colisType] || colisType : 'Colis';
}

function formatWhatsAppLink(phone: string | null | undefined, message?: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/[^0-9+]/g, '');
  const encoded = message ? encodeURIComponent(message) : '';
  return `https://wa.me/${cleaned}${encoded ? `?text=${encoded}` : ''}`;
}

// ─── Main Component ──────────────────────────────────────────────────────

export default function DriverDeliverPage() {
  const params = useParams();
  const router = useRouter();
  const parcelId = params.id as string;

  const [parcel, setParcel] = useState<DeliveryItem | null>(null);
  const [pageState, setPageState] = useState<PageState>('loading');
  const [pin, setPin] = useState<string[]>(Array(PIN_LENGTH).fill(''));
  const [remainingAttempts, setRemainingAttempts] = useState(MAX_PIN_ATTEMPTS);
  const [pinError, setPinError] = useState('');
  const [deliveredAt, setDeliveredAt] = useState('');
  const [shakePin, setShakePin] = useState(false);

  const digitRefs = useRef<(HTMLInputElement | null)[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // ─── Fetch parcel data ──────────────────────────────────────────────

  useEffect(() => {
    const fetchParcel = async () => {
      try {
        const res = await fetch('/api/driver/deliveries');
        if (res.status === 401 || res.status === 403) {
          router.replace('/driver/login');
          return;
        }
        if (!res.ok) throw new Error('Erreur réseau');
        const data = await res.json();
        const found = (data.deliveries || []).find(
          (d: DeliveryItem) => d.id === parcelId,
        );
        if (!found) {
          setPageState('not_found');
          return;
        }
        setParcel(found);
        setPageState('pin_entry');
      } catch {
        setPageState('error_network');
      }
    };
    fetchParcel();
  }, [parcelId, router]);

  // ─── Web Audio API ──────────────────────────────────────────────────

  const playDing = useCallback(() => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, ctx.currentTime);
      gain1.gain.setValueAtTime(0.3, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.4);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.15);
      gain2.gain.setValueAtTime(0.25, ctx.currentTime + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      osc2.start(ctx.currentTime + 0.15);
      osc2.stop(ctx.currentTime + 0.6);
    } catch {
      // Audio not available
    }
  }, []);

  // ─── Haptic feedback ────────────────────────────────────────────────

  const triggerHaptic = useCallback((pattern: number | number[] = 10) => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    } catch {
      // Silently fail
    }
  }, []);

  // ─── PIN digit handler ──────────────────────────────────────────────

  const handleDigitInput = useCallback(
    (index: number, value: string) => {
      // Only allow digits
      if (value && !/^\d$/.test(value)) return;

      const newPin = [...pin];

      if (value) {
        newPin[index] = value;
        triggerHaptic(10);
        // Auto-advance to next input
        if (index < PIN_LENGTH - 1) {
          digitRefs.current[index + 1]?.focus();
        }
      } else {
        newPin[index] = '';
      }

      setPin(newPin);
      setPinError('');
    },
    [pin, triggerHaptic],
  );

  // ─── Handle backspace ──────────────────────────────────────────────

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace' && !pin[index] && index > 0) {
        digitRefs.current[index - 1]?.focus();
      }
    },
    [pin],
  );

  // ─── Numeric keypad button ──────────────────────────────────────────

  const handleKeypadDigit = useCallback(
    (digit: string) => {
      // Find first empty slot
      const emptyIndex = pin.findIndex((d) => d === '');
      if (emptyIndex === -1) return;
      handleDigitInput(emptyIndex, digit);
    },
    [pin, handleDigitInput],
  );

  const handleKeypadBackspace = useCallback(() => {
    // Find last filled slot
    let lastIndex = -1;
    for (let i = PIN_LENGTH - 1; i >= 0; i--) {
      if (pin[i]) {
        lastIndex = i;
        break;
      }
    }
    if (lastIndex === -1) return;
    const newPin = [...pin];
    newPin[lastIndex] = '';
    setPin(newPin);
    setPinError('');
    triggerHaptic(10);
    digitRefs.current[lastIndex]?.focus();
  }, [pin, triggerHaptic]);

  // ─── Confirm delivery ───────────────────────────────────────────────

  const handleConfirm = useCallback(async () => {
    const pinValue = pin.join('');
    if (pinValue.length !== PIN_LENGTH || pageState !== 'pin_entry') return;

    setPageState('confirming');
    triggerHaptic(20);

    try {
      const res = await fetch(`/api/driver/deliver/${parcelId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinValue }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setDeliveredAt(data.deliveredAt || new Date().toISOString());
        setPageState('success');
        playDing();
        triggerHaptic([50, 50, 100]);
      } else if (res.status === 400 && data.wrongPin) {
        const remaining = data.remainingAttempts ?? remainingAttempts - 1;
        setRemainingAttempts(remaining);
        setPinError(`Code incorrect (${remaining} tentative${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''})`);
        setPageState('error_pin');
        triggerHaptic([100, 50, 100]);
        // Shake animation
        setShakePin(true);
        setTimeout(() => setShakePin(false), 600);
        // Clear PIN
        setPin(Array(PIN_LENGTH).fill(''));
        // Return to pin entry after a short delay
        setTimeout(() => setPageState('pin_entry'), 1500);
      } else if (res.status === 429) {
        setPinError('Trop de tentatives. Contactez le support.');
        setPageState('error_pin');
        triggerHaptic([200, 100, 200]);
        setShakePin(true);
        setTimeout(() => setShakePin(false), 600);
      } else {
        setPinError(data.error || 'Erreur lors de la confirmation');
        setPageState('error_pin');
        setShakePin(true);
        setTimeout(() => setShakePin(false), 600);
        setTimeout(() => setPageState('pin_entry'), 1500);
      }
    } catch {
      setPageState('error_network');
      triggerHaptic([100, 100]);
    }
  }, [pin, parcelId, pageState, remainingAttempts, playDing, triggerHaptic]);

  // ─── Keypad layout ──────────────────────────────────────────────────

  const keypadKeys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['backspace', '0', 'confirm'],
  ] as const;

  const pinComplete = pin.every((d) => d !== '');

  // ─── Format delivery time ────────────────────────────────────────────

  const formatDeliveryTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }) + ' à ' + d.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  // ─── Loading state ──────────────────────────────────────────────────

  if (pageState === 'loading') {
    return (
      <div className="min-h-screen bg-[#111827] flex flex-col">
        <header className="bg-[#0d1117] border-b border-gray-800 px-4 py-3 safe-top">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-800 animate-pulse" />
            <div className="h-4 w-44 rounded bg-gray-800 animate-pulse" />
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
        </main>
      </div>
    );
  }

  // ─── Not found state ────────────────────────────────────────────────

  if (pageState === 'not_found') {
    return (
      <div className="min-h-screen bg-[#111827] flex flex-col">
        <header className="bg-[#0d1117] border-b border-gray-800 px-4 py-3 safe-top">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="w-10 h-10 rounded-xl bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
              aria-label="Retour"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </button>
            <h1 className="text-base font-bold">Colis introuvable</h1>
          </div>
        </header>
        <main className="flex-1 flex flex-col items-center justify-center px-4">
          <AlertTriangle className="w-12 h-12 text-amber-400 mb-4" />
          <p className="text-gray-300 text-center mb-6">
            Ce colis n&apos;existe pas ou n&apos;est plus en transit.
          </p>
          <button
            onClick={() => router.replace('/driver/deliveries')}
            className="px-6 py-3 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 active:scale-[0.98] transition-all"
          >
            Retour à la liste
          </button>
        </main>
      </div>
    );
  }

  // ─── Network error state ───────────────────────────────────────────

  if (pageState === 'error_network') {
    return (
      <div className="min-h-screen bg-[#111827] flex flex-col">
        <header className="bg-[#0d1117] border-b border-gray-800 px-4 py-3 safe-top">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="w-10 h-10 rounded-xl bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
              aria-label="Retour"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </button>
            <h1 className="text-base font-bold">Erreur connexion</h1>
          </div>
        </header>
        <main className="flex-1 flex flex-col items-center justify-center px-4">
          <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
          <p className="text-gray-300 text-center mb-6">
            Impossible de charger les données. Vérifiez votre connexion.
          </p>
          <button
            onClick={() => router.replace('/driver/deliveries')}
            className="px-6 py-3 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 active:scale-[0.98] transition-all"
          >
            Réessayer
          </button>
        </main>
      </div>
    );
  }

  // ─── Success state ─────────────────────────────────────────────────

  if (pageState === 'success') {
    return (
      <div className="min-h-screen bg-[#111827] flex flex-col">
        <header className="bg-[#0d1117] border-b border-gray-800 px-4 py-3 safe-top">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/20">
              <Check className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-base font-bold">Livraison confirmée</h1>
              <p className="text-[11px] text-gray-400 -mt-0.5">SmarticketS Chauffeur</p>
            </div>
          </div>
        </header>
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-lg mx-auto w-full">
          {/* Success icon */}
          <div className="w-24 h-24 rounded-full bg-emerald-500/15 border-2 border-emerald-500 flex items-center justify-center mb-6">
            <Check className="w-12 h-12 text-emerald-400" />
          </div>

          <h2 className="text-xl font-bold text-white mb-1">
            Colis livré avec succès
          </h2>
          <p className="text-sm text-gray-400 mb-6 text-center">
            {parcel?.reference} &mdash; {formatDeliveryTime(deliveredAt)}
          </p>

          {/* WhatsApp links */}
          {parcel && (
            <div className="w-full space-y-3 mb-8">
              {/* Sender link */}
              {parcel.whatsappOwner && (
                <a
                  href={formatWhatsAppLink(
                    parcel.whatsappOwner,
                    `Votre colis ${parcel.reference} a été livré avec succès à ${parcel.receiverName || 'son destinataire'}. SmarticketS`,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 w-full bg-[#1f2937] border border-gray-700 rounded-xl px-4 py-3 hover:border-emerald-500/30 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-green-500/15 flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Notifier l&apos;expéditeur</p>
                    <p className="text-[11px] text-gray-500">
                      {parcel.travelerFirstName} {parcel.travelerLastName || ''}
                    </p>
                  </div>
                </a>
              )}

              {/* Receiver link */}
              {parcel.receiverWhatsapp && (
                <a
                  href={formatWhatsAppLink(
                    parcel.receiverWhatsapp,
                    `Votre colis ${parcel.reference} est arrivé ! Merci d'avoir utilisé SmarticketS.`,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 w-full bg-[#1f2937] border border-gray-700 rounded-xl px-4 py-3 hover:border-emerald-500/30 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-green-500/15 flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Notifier le destinataire</p>
                    <p className="text-[11px] text-gray-500">
                      {parcel.receiverName}
                    </p>
                  </div>
                </a>
              )}
            </div>
          )}

          {/* Return button */}
          <button
            onClick={() => router.replace('/driver/deliveries')}
            className="w-full h-14 rounded-xl bg-amber-500 text-white font-bold text-base hover:bg-amber-600 active:scale-[0.98] transition-all shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Retour à la liste
          </button>
        </main>
      </div>
    );
  }

  // ─── Main deliver page (pin_entry / confirming / error_pin) ────────

  return (
    <div className="min-h-screen bg-[#111827] flex flex-col">
      {/* ─── Header ──────────────────────────────────────────────── */}
      <header className="bg-[#0d1117] border-b border-gray-800 px-4 py-3 safe-top">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button
            onClick={() => router.replace('/driver/deliveries')}
            className="w-10 h-10 rounded-xl bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
            aria-label="Retour à la liste des livraisons"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <h1 className="text-base font-bold">Confirmer la livraison</h1>
        </div>
      </header>

      {/* ─── Main Content ─────────────────────────────────────────── */}
      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full space-y-4">
        {/* ─── Parcel summary card ────────────────────────────────── */}
        {parcel && (
          <div className="bg-[#1f2937] border border-gray-700 rounded-2xl p-4 space-y-2.5">
            {/* Reference */}
            <div className="font-mono text-sm font-bold text-amber-400 tracking-wider">
              {parcel.reference}
            </div>

            {/* Route */}
            <div className="flex items-start gap-2">
              <Navigation className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-200">
                <span className="font-medium">{parcel.departureCity || '—'}</span>
                <span className="mx-1.5 text-gray-500">&rarr;</span>
                <span className="font-medium">{parcel.destination || '—'}</span>
              </div>
            </div>

            {/* Receiver */}
            <div className="flex items-center gap-2 text-sm">
              <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span className="text-gray-300">
                {parcel.receiverName || 'Destinataire non renseigné'}
              </span>
            </div>

            {/* Pickup address */}
            {parcel.pickupAddress && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-400 line-clamp-1">{parcel.pickupAddress}</span>
              </div>
            )}

            {/* Details row */}
            <div className="flex items-center gap-3 pt-2 border-t border-gray-700/50">
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-gray-700/50 text-gray-300">
                {getColisTypeLabel(parcel.colisType, parcel.colisTypeOther)}
              </span>
              {parcel.colisWeight != null && (
                <span className="flex items-center gap-1 text-[11px] text-gray-400">
                  <Weight className="w-3 h-3" />
                  {parcel.colisWeight} kg
                </span>
              )}
              <span
                className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  parcel.paymentStatus === 'SENDER_PAID'
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-amber-500/15 text-amber-400'
                }`}
              >
                {parcel.paymentStatus === 'SENDER_PAID' ? 'Payé' : 'Paiement récept.'}
              </span>
            </div>
          </div>
        )}

        {/* ─── PIN Input Section ───────────────────────────────────── */}
        <div
          className={`bg-[#1f2937] border border-gray-700 rounded-2xl p-5 ${
            shakePin ? 'animate-[shake_0.5s_ease-in-out]' : ''
          }`}
        >
          <p className="text-center text-sm font-semibold text-gray-300 mb-1">
            Saisir le code du destinataire
          </p>
          <p className="text-center text-[11px] text-gray-500 mb-5">
            Demandez le code à 6 chiffres au destinataire
          </p>

          {/* Digit boxes */}
          <div className="flex items-center justify-center gap-2 mb-2">
            {pin.map((digit, i) => (
              <input
                key={i}
                ref={(el) => {
                  digitRefs.current[i] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitInput(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onFocus={(e) => e.target.select()}
                className={`w-12 h-14 rounded-xl text-center text-2xl font-bold font-mono focus:outline-none transition-all ${
                  digit
                    ? 'bg-amber-500/20 border-2 border-amber-500 text-amber-300'
                    : 'bg-[#111827] border-2 border-gray-600 text-white'
                } focus:ring-2 focus:ring-amber-500/30`}
                aria-label={`Chiffre ${i + 1}`}
              />
            ))}
          </div>

          {/* PIN error message */}
          {pinError && (
            <p className="text-center text-sm text-red-400 mt-3" role="alert">
              <AlertTriangle className="w-4 h-4 inline mr-1 -mt-0.5" />
              {pinError}
            </p>
          )}
        </div>

        {/* ─── Numeric Keypad ──────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-2.5">
          {keypadKeys.map((row, rowIdx) =>
            row.map((key) => {
              if (key === 'backspace') {
                return (
                  <button
                    key="backspace"
                    type="button"
                    onClick={handleKeypadBackspace}
                    disabled={pageState === 'confirming'}
                    className="h-[56px] rounded-xl flex items-center justify-center bg-[#374151] text-gray-300 hover:bg-[#4b5563] active:bg-[#6b7280] active:scale-95 transition-all duration-100 disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Effacer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                      <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
                      <line x1="18" y1="9" x2="12" y2="15" />
                      <line x1="12" y1="9" x2="18" y2="15" />
                    </svg>
                  </button>
                );
              }

              if (key === 'confirm') {
                return (
                  <button
                    key="confirm"
                    type="button"
                    onClick={handleConfirm}
                    disabled={!pinComplete || pageState === 'confirming'}
                    className={`h-[56px] rounded-xl flex items-center justify-center font-bold text-base transition-all duration-100 disabled:opacity-30 disabled:cursor-not-allowed ${
                      pinComplete && pageState !== 'confirming'
                        ? 'bg-amber-500 text-white hover:bg-amber-600 active:bg-amber-700 active:scale-95 shadow-lg shadow-amber-500/25'
                        : 'bg-[#374151] text-gray-500'
                    }`}
                    aria-label="Confirmer la livraison"
                  >
                    {pageState === 'confirming' ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <Check className="w-6 h-6" />
                    )}
                  </button>
                );
              }

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleKeypadDigit(key)}
                  disabled={pageState === 'confirming'}
                  className="h-[56px] rounded-xl flex items-center justify-center text-2xl font-semibold text-white bg-[#374151] hover:bg-[#4b5563] active:bg-[#6b7280] active:scale-95 transition-all duration-100 disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label={`Chiffre ${key}`}
                >
                  {key}
                </button>
              );
            }),
          )}
        </div>

        {/* ─── Full-width confirm button ───────────────────────────── */}
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!pinComplete || pageState === 'confirming'}
          className={`w-full h-14 rounded-xl flex items-center justify-center gap-2 font-bold text-base transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed ${
            pinComplete && pageState !== 'confirming'
              ? 'bg-amber-500 text-white hover:bg-amber-600 active:bg-amber-700 active:scale-[0.98] shadow-lg shadow-amber-500/25'
              : 'bg-[#1f2937] text-gray-500 border border-gray-700'
          }`}
          aria-label="Confirmer la livraison"
        >
          {pageState === 'confirming' ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Confirmation en cours...
            </>
          ) : (
            <>
              <Package className="w-5 h-5" />
              CONFIRMER LA LIVRAISON
            </>
          )}
        </button>
      </main>

      {/* ─── Footer ────────────────────────────────────────────────── */}
      <footer className="bg-[#0d1117] border-t border-gray-800 px-4 py-2.5 safe-bottom">
        <div className="max-w-lg mx-auto text-center">
          <p className="text-[10px] text-gray-500">
            <Clock className="w-3 h-3 inline -mt-0.5 mr-1" />
            {remainingAttempts} tentative{remainingAttempts > 1 ? 's' : ''} restante{remainingAttempts > 1 ? 's' : ''}
          </p>
        </div>
      </footer>
    </div>
  );
}
