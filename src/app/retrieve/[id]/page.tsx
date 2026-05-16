'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  QrCode,
  Loader2,
  CheckCircle,
  Copy,
  ExternalLink,
  Home,
  ShieldAlert,
  Globe,
  Package,
  MapPin,
  Truck,
  User,
  Clock,
  Lock,
} from 'lucide-react';
import Link from 'next/link';

// ═══════════════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════════════

interface ColisData {
  reference: string;
  status: string;
  transportType: string;
  company: string;
  arrivalCity: string;
  departureCity: string;
  departureDate: string | null;
  departureTime: string | null;
  senderName: string;
  senderPhone: string;
  receiverName: string;
  receiverPhone: string;
  pin_masked: string | null;
  pinAttempts: number;
}

// ═══════════════════════════════════════════════════
//  PIN INPUT COMPONENT (inline)
// ═══════════════════════════════════════════════════

function PinInput({
  pinDigits,
  setPinDigits,
  disabled,
}: {
  pinDigits: string[];
  setPinDigits: React.Dispatch<React.SetStateAction<string[]>>;
  disabled: boolean;
}) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...pinDigits];
    newDigits[index] = digit;
    setPinDigits(newDigits);

    // Auto-advance to next
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!pinDigits[index] && index > 0) {
        // Go to previous
        const newDigits = [...pinDigits];
        newDigits[index - 1] = '';
        setPinDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
      } else {
        // Clear current
        const newDigits = [...pinDigits];
        newDigits[index] = '';
        setPinDigits(newDigits);
      }
    }

    // Arrow keys navigation
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length > 0) {
      const newDigits = [...pinDigits];
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pasted[i] || '';
      }
      setPinDigits(newDigits);
      // Focus on next empty or last
      const nextIndex = Math.min(pasted.length, 5);
      inputRefs.current[nextIndex]?.focus();
    }
  };

  return (
    <div className="grid grid-cols-6 gap-2.5">
      {pinDigits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => { inputRefs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          disabled={disabled}
          autoComplete="one-time-code"
          className={[
            'w-full h-14 text-center text-2xl font-bold font-mono',
            'bg-gray-50 border-2 border-gray-200 rounded-xl',
            'focus:outline-none focus:border-[#25D366] focus:ring-2 focus:ring-[#25D366]/20',
            'transition-all duration-200',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            digit ? 'border-[#25D366]/40 bg-[#25D366]/5' : '',
          ].join(' ')}
          aria-label={`Digit ${i + 1}`}
        />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════
//  HEADER COMPONENT
// ═══════════════════════════════════════════════════

function RetrieveHeader({
  qrCode,
  lang,
  onLangChange,
}: {
  qrCode: string;
  lang: 'fr' | 'en';
  onLangChange: (lang: 'fr' | 'en') => void;
}) {
  const t = (fr: string, en: string) => (lang === 'fr' ? fr : en);

  return (
    <header className="bg-black text-white sticky top-0 z-50">
      <div className="max-w-[600px] mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-[#25D366] flex items-center justify-center">
            <QrCode className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight block leading-tight">QRTrans</span>
            {qrCode && (
              <span className="text-[10px] font-mono text-white/40 leading-tight">{qrCode}</span>
            )}
          </div>
        </div>

        {/* Badge + Lang toggle */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[#25D366]/15 border border-[#25D366]/30 rounded-full px-3 py-1.5">
            <Package className="w-3.5 h-3.5 text-[#25D366]" />
            <span className="text-xs font-semibold text-[#25D366]">
              {t('Récupération', 'Retrieval')}
            </span>
          </div>

          <button
            onClick={() => onLangChange(lang === 'fr' ? 'en' : 'fr')}
            className="flex items-center gap-1 text-xs font-medium text-white/70 hover:text-white transition-colors px-2 py-1 rounded-md"
            aria-label="Switch language"
          >
            <Globe className="w-3.5 h-3.5" />
            {lang === 'fr' ? 'EN' : 'FR'}
          </button>
        </div>
      </div>
    </header>
  );
}

// ═══════════════════════════════════════════════════
//  COLIS SUMMARY CARD
// ═══════════════════════════════════════════════════

function ColisSummaryCard({ colis, lang }: { colis: ColisData; lang: 'fr' | 'en' }) {
  const t = (fr: string, en: string) => (lang === 'fr' ? fr : en);

  const transportIcon =
    colis.transportType === 'train' ? '🚆' :
    colis.transportType === 'boat' ? '🚢' :
    colis.transportType === 'bus' ? '🚌' : '✈️';

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const rows = [
    { icon: Package, label: t('Référence', 'Reference'), value: colis.reference },
    { icon: MapPin, label: t('Trajet', 'Route'), value: `${colis.departureCity || '—'} → ${colis.arrivalCity || '—'}` },
    { icon: Truck, label: t('Compagnie', 'Company'), value: colis.company || '—', prefix: transportIcon },
    { icon: User, label: t('Expéditeur', 'Sender'), value: colis.senderName || '—' },
    { icon: User, label: t('Destinataire', 'Receiver'), value: colis.receiverName || '—' },
    { icon: Clock, label: t('Date de départ', 'Departure date'), value: formatDate(colis.departureDate) },
  ];

  return (
    <div className="bg-gray-50 rounded-xl p-5 space-y-3">
      {rows.map((row) => (
        <div key={row.label} className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
            <row.icon className="w-4 h-4 text-gray-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 font-medium">{row.label}</p>
            <p className="text-sm text-gray-900 font-semibold truncate">
              {row.prefix && <span className="mr-1">{row.prefix}</span>}
              {row.value}
            </p>
          </div>
        </div>
      ))}

      {/* PIN masked */}
      {colis.pin_masked && (
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Lock className="w-4 h-4 text-gray-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 font-medium">{t('Code PIN', 'PIN Code')}</p>
            <p className="text-sm text-gray-900 font-mono font-bold tracking-wider">
              {colis.pin_masked}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
//  MAIN PAGE
// ═══════════════════════════════════════════════════

export default function RetrievePage() {
  const params = useParams();
  const reference = ((params?.id as string) || '').toUpperCase().trim();

  // ─── States ───
  const [currentLang, setCurrentLang] = useState<'fr' | 'en'>('fr');
  const [loadingData, setLoadingData] = useState(true);
  const [colis, setColis] = useState<ColisData | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [pinDigits, setPinDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [validating, setValidating] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinBlocked, setPinBlocked] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [successData, setSuccessData] = useState<{
    wa_sender: string;
    wa_receiver: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Re-derive t when lang changes
  const tFn = (fr: string, en: string) =>
    currentLang === 'fr' ? fr : en;

  // ─── Fetch colis data on mount ───
  useEffect(() => {
    if (!reference) {
      setLoadingData(false);
      setFetchError(tFn('Référence invalide.', 'Invalid reference.'));
      return;
    }

    const fetchColis = async () => {
      try {
        setLoadingData(true);
        const res = await fetch(`/api/arrivee/${encodeURIComponent(reference)}`);
        const data = await res.json();

        if (res.ok && data.success) {
          const c = data.colis as ColisData;
          // Enrich with pin_masked and pinAttempts from top-level response
          c.pin_masked = data.pin_masked || null;
          c.pinAttempts = data.pinAttempts ?? 0;

          // If already blocked (>= 3 attempts)
          if (c.pinAttempts >= 3) {
            setPinBlocked(true);
          }

          setColis(c);
        } else {
          setFetchError(data.message || tFn('Colis introuvable.', 'Package not found.'));
        }
      } catch {
        setFetchError(tFn('Erreur de connexion.', 'Connection error.'));
      } finally {
        setLoadingData(false);
      }
    };

    fetchColis();
  }, [reference]);

  // ─── Handle PIN submit ───
  const handleSubmitPin = async () => {
    const pin = pinDigits.join('');
    if (pin.length !== 6) {
      setPinError(tFn('Veuillez saisir 6 chiffres.', 'Please enter 6 digits.'));
      return;
    }

    try {
      setValidating(true);
      setPinError(null);

      const res = await fetch('/api/validate-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference, pin }),
      });

      const data = await res.json();

      if (data.success) {
        setConfirmed(true);
        setSuccessData({ wa_sender: data.wa_sender, wa_receiver: data.wa_receiver });
      } else if (data.blocked) {
        setPinBlocked(true);
        setPinError(tFn('Code bloqué après 3 tentatives. Contactez l\'agence.', 'Code blocked after 3 attempts. Contact the agency.'));
      } else if (data.error) {
        const attemptsLeft = data.attemptsLeft ?? 0;
        if (attemptsLeft <= 0) {
          setPinBlocked(true);
          setPinError(tFn('Code bloqué après 3 tentatives. Contactez l\'agence.', 'Code blocked after 3 attempts. Contact the agency.'));
        } else {
          setPinError(
            tFn(
              `Code incorrect. ${attemptsLeft} tentative${attemptsLeft > 1 ? 's' : ''} restante${attemptsLeft > 1 ? 's' : ''}.`,
              `Incorrect code. ${attemptsLeft} attempt${attemptsLeft > 1 ? 's' : ''} remaining.`
            )
          );
        }
      }
    } catch {
      setPinError(tFn('Erreur serveur. Réessayez.', 'Server error. Please try again.'));
    } finally {
      setValidating(false);
    }
  };

  // ─── Copy tracking link ───
  const handleCopyLink = async () => {
    const url = `${window.location.origin}/suivi/${reference}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ─── Determine status ───
  const isAlreadyDelivered = colis?.status === 'delivered';
  const isNormal = colis && colis.status === 'in_transit' && !confirmed;

  // ═══════════════════════════════════════════════════
  //  RENDER — Loading
  // ═══════════════════════════════════════════════════
  if (loadingData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#F8FAFC] to-white">
        <RetrieveHeader
          qrCode={reference}
          lang={currentLang}
          onLangChange={setCurrentLang}
        />
        <div className="flex items-center justify-center py-32">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500">
              {tFn('Vérification du colis...', 'Verifying package...')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════
  //  RENDER — Main
  // ═══════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F8FAFC] to-white">
      <RetrieveHeader
        qrCode={reference}
        lang={currentLang}
        onLangChange={setCurrentLang}
      />

      <main className="max-w-[600px] mx-auto px-4 py-6 pb-20">
        {/* ─── ERROR: not found ─── */}
        {fetchError && !colis && (
          <div className="text-center py-16 space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-50 rounded-full">
              <span className="text-3xl">❌</span>
            </div>
            <h2 className="text-lg font-bold text-gray-900">{fetchError}</h2>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 h-12 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-semibold text-sm transition-colors no-underline"
            >
              <Home className="w-4 h-4" />
              {tFn("Retour à l'accueil", 'Back to home')}
            </Link>
          </div>
        )}

        {/* ─── ALREADY DELIVERED ─── */}
        {colis && isAlreadyDelivered && (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center animate-in fade-in">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-100 rounded-full mb-3">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <p className="text-sm font-semibold text-emerald-800">
                {tFn('Ce colis a déjà été livré.', 'This package has already been delivered.')}
              </p>
              <Link
                href={`/suivi/${reference}`}
                className="inline-flex items-center gap-2 mt-4 px-5 h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors no-underline"
              >
                <ExternalLink className="w-4 h-4" />
                {tFn('Voir le suivi', 'View tracking')}
              </Link>
            </div>
          </div>
        )}

        {/* ─── NORMAL: colis in_transit ─── */}
        {colis && isNormal && (
          <div className="space-y-5">
            {/* CARTE 1: Colis Summary */}
            <ColisSummaryCard colis={colis} lang={currentLang} />

            {/* CARTE 2: PIN Entry */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-5">
              {/* Title */}
              <div className="text-center space-y-1">
                <h2 className="text-lg font-bold text-gray-900 flex items-center justify-center gap-2">
                  <Lock className="w-5 h-5 text-[#25D366]" />
                  {tFn('Code de Retrait', 'Retrieval Code')}
                </h2>
                <p className="text-sm text-gray-500">
                  {tFn(
                    'Saisissez le code à 6 chiffres reçu par WhatsApp',
                    'Enter the 6-digit code received via WhatsApp'
                  )}
                </p>
              </div>

              {/* PIN Inputs */}
              <PinInput
                pinDigits={pinDigits}
                setPinDigits={setPinDigits}
                disabled={validating || pinBlocked}
              />

              {/* Error display */}
              {pinError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 animate-in fade-in">
                  <ShieldAlert className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm font-medium text-red-700">{pinError}</p>
                </div>
              )}

              {/* Blocked display (separate, prominent) */}
              {pinBlocked && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center space-y-2">
                  <ShieldAlert className="w-8 h-8 text-red-500 mx-auto" />
                  <p className="text-sm font-bold text-red-800">
                    {tFn(
                      'Code bloqué après 3 tentatives. Contactez l\'agence.',
                      'Code blocked after 3 attempts. Contact the agency.'
                    )}
                  </p>
                </div>
              )}

              {/* Submit button */}
              {!pinBlocked && (
                <button
                  onClick={handleSubmitPin}
                  disabled={validating || pinDigits.join('').length < 6}
                  className={[
                    'w-full h-14 rounded-xl font-semibold text-sm text-white',
                    'transition-all duration-200 flex items-center justify-center gap-2',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    validating || pinDigits.join('').length < 6
                      ? 'bg-[#25D366]/60 cursor-not-allowed'
                      : 'bg-[#25D366] hover:bg-[#1fb855] active:scale-[0.98] shadow-md shadow-[#25D366]/25 hover:shadow-lg hover:shadow-[#25D366]/30',
                  ].join(' ')}
                >
                  {validating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {tFn('Vérification...', 'Verifying...')}
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      {tFn('Valider & Confirmer le Retrait', 'Validate & Confirm Retrieval')}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ─── SUCCESS STATE ─── */}
        {colis && confirmed && successData && (
          <div className="space-y-5">
            {/* Success banner */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center space-y-3 animate-in fade-in slide-in-from-bottom-2">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-emerald-800 tracking-tight">
                {tFn('LIVRAISON CONFIRMÉE !', 'DELIVERY CONFIRMED!')}
              </h2>
              <p className="text-sm text-emerald-700">
                {tFn(
                  `Le colis ${colis.reference} a été remis avec succès.`,
                  `Package ${colis.reference} has been successfully delivered.`
                )}
              </p>
            </div>

            {/* Delivery summary */}
            <div className="bg-gray-50 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                {tFn('Résumé de la livraison', 'Delivery summary')}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-500">{tFn('Référence', 'Reference')}</p>
                  <p className="text-sm font-mono font-bold text-gray-900">{colis.reference}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">{tFn('Destinataire', 'Receiver')}</p>
                  <p className="text-sm font-semibold text-gray-900 truncate">{colis.receiverName || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">{tFn('Expéditeur', 'Sender')}</p>
                  <p className="text-sm font-semibold text-gray-900 truncate">{colis.senderName || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">{tFn('Destination', 'Destination')}</p>
                  <p className="text-sm font-semibold text-gray-900 truncate">{colis.arrivalCity || '—'}</p>
                </div>
              </div>
            </div>

            {/* WhatsApp notification buttons */}
            <div className="space-y-2.5">
              <h3 className="text-sm font-semibold text-gray-700">
                {tFn('Notifier par WhatsApp', 'Notify via WhatsApp')}
              </h3>

              {colis.senderPhone && (
                <a
                  href={successData.wa_sender}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 w-full h-12 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/20 rounded-xl px-4 text-sm font-semibold text-[#25D366] transition-colors no-underline"
                >
                  <span className="w-8 h-8 bg-[#25D366] rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                  </span>
                  <span className="flex-1 text-left">
                    {tFn('Notifier l\'expéditeur', 'Notify sender')}
                  </span>
                  <span className="text-xs text-[#25D366]/60 truncate max-w-[120px]">{colis.senderName}</span>
                </a>
              )}

              {colis.receiverPhone && (
                <a
                  href={successData.wa_receiver}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 w-full h-12 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/20 rounded-xl px-4 text-sm font-semibold text-[#25D366] transition-colors no-underline"
                >
                  <span className="w-8 h-8 bg-[#25D366] rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                  </span>
                  <span className="flex-1 text-left">
                    {tFn('Notifier le destinataire', 'Notify receiver')}
                  </span>
                  <span className="text-xs text-[#25D366]/60 truncate max-w-[120px]">{colis.receiverName}</span>
                </a>
              )}
            </div>

            {/* Copy tracking link */}
            <button
              onClick={handleCopyLink}
              className="flex items-center justify-center gap-2 w-full h-12 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 transition-colors"
            >
              <Copy className="w-4 h-4" />
              {copied
                ? tFn('✅ Lien copié !', '✅ Link copied!')
                : tFn('Copier le lien de suivi', 'Copy tracking link')}
            </button>

            {/* Back home */}
            <div className="text-center pt-2">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors no-underline"
              >
                <Home className="w-4 h-4" />
                {tFn("Retour à l'accueil", 'Back to home')}
              </Link>
            </div>
          </div>
        )}

        {/* ─── Status is neither in_transit nor delivered (e.g. pending_activation) ─── */}
        {colis && !isAlreadyDelivered && !isNormal && !confirmed && (
          <div className="text-center py-16 space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-50 rounded-full">
              <ShieldAlert className="w-8 h-8 text-amber-500" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">
              {tFn(
                'Ce colis n\'est pas encore en transit.',
                'This package is not yet in transit.'
              )}
            </h2>
            <p className="text-sm text-gray-500">
              {tFn(
                'La récupération n\'est disponible que lorsque le colis est en transit.',
                'Retrieval is only available when the package is in transit.'
              )}
            </p>
            <Link
              href={`/suivi/${reference}`}
              className="inline-flex items-center gap-2 px-5 h-12 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-semibold text-sm transition-colors no-underline"
            >
              <ExternalLink className="w-4 h-4" />
              {tFn('Voir le suivi', 'View tracking')}
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
