'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Lock, Delete, X, AlertTriangle, ShieldCheck } from 'lucide-react';

interface PinKeypadProps {
  /** Called with the 6-digit PIN when user submits */
  onSubmit: (
    pin: string
  ) => Promise<{
    success: boolean;
    error?: string;
    attemptsLeft?: number;
    blocked?: boolean;
  }>;
  /** Close the modal without submitting */
  onCancel: () => void;
  /** Called to resend PIN via WhatsApp (optional) */
  onResendPin?: () => Promise<void>;
  /** Called to contact agency (optional) */
  onContactAgency?: () => void;
  /** Receiver name for display */
  receiverName?: string;
}

export default function PinKeypad({
  onSubmit,
  onCancel,
  onResendPin,
  onContactAgency,
  receiverName,
}: PinKeypadProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [errorType, setErrorType] = useState<'warning' | 'error'>('warning');
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const autoSubmitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const hasInteractedRef = useRef(false);

  // ── Body scroll lock ──────────────────────────────────────────────
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // ── ESC key to close ──────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  // ── Cleanup auto-submit timer ─────────────────────────────────────
  useEffect(() => {
    return () => {
      if (autoSubmitTimerRef.current) {
        clearTimeout(autoSubmitTimerRef.current);
      }
    };
  }, []);

  // ── Click sound via Web Audio API ─────────────────────────────────
  const playClickSound = useCallback(() => {
    if (!hasInteractedRef.current) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.05);
      gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.08);
    } catch {
      // Silently fail if Web Audio API is not available
    }
  }, []);

  // ── Haptic feedback ───────────────────────────────────────────────
  const triggerHaptic = useCallback(() => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(10);
      }
    } catch {
      // Silently fail
    }
  }, []);

  // ── Combined feedback ─────────────────────────────────────────────
  const triggerFeedback = useCallback(() => {
    hasInteractedRef.current = true;
    triggerHaptic();
    playClickSound();
  }, [triggerHaptic, playClickSound]);

  // ── Handle digit press ────────────────────────────────────────────
  const handleDigit = useCallback(
    (digit: string) => {
      if (isSubmitting || isBlocked) return;
      if (pin.length >= 6) return;

      triggerFeedback();

      const newPin = pin + digit;
      setPin(newPin);
      setError('');
      setErrorType('warning');

      // Auto-submit when 6 digits entered
      if (newPin.length === 6) {
        setIsSubmitting(true);
        autoSubmitTimerRef.current = setTimeout(async () => {
          try {
            const result = await onSubmit(newPin);
            if (!result.success) {
              setIsSubmitting(false);
              if (result.blocked) {
                setIsBlocked(true);
                setAttemptsLeft(0);
                setError('🔒 Trop de tentatives. Contactez l\'agence.');
                setErrorType('error');
                setPin('');
              } else {
                const left = result.attemptsLeft ?? Math.max(0, attemptsLeft - 1);
                setAttemptsLeft(left);
                setError(
                  left > 0
                    ? `⚠️ Code incorrect. ${left} tentative${left > 1 ? 's' : ''} restante${left > 1 ? 's' : ''}.`
                    : '🔒 Trop de tentatives. Contactez l\'agence.'
                );
                setErrorType(left > 0 ? 'warning' : 'error');
                if (left <= 0) {
                  setIsBlocked(true);
                }
                setPin('');
              }
            }
            // If success, the parent handles the result (e.g. closes modal)
          } catch {
            setIsSubmitting(false);
            setError('⚠️ Erreur de connexion. Réessayez.');
            setErrorType('warning');
            setPin('');
          }
        }, 300);
      }
    },
    [pin, isSubmitting, isBlocked, onSubmit, attemptsLeft, triggerFeedback]
  );

  // ── Handle delete ─────────────────────────────────────────────────
  const handleDelete = useCallback(() => {
    if (isSubmitting || isBlocked) return;
    triggerFeedback();
    setPin((prev) => prev.slice(0, -1));
    setError('');
  }, [isSubmitting, isBlocked, triggerFeedback]);

  // ── Handle manual submit ──────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (isSubmitting || isBlocked || pin.length < 6) return;

    setIsSubmitting(true);
    try {
      const result = await onSubmit(pin);
      if (!result.success) {
        if (result.blocked) {
          setIsBlocked(true);
          setAttemptsLeft(0);
          setError('🔒 Trop de tentatives. Contactez l\'agence.');
          setErrorType('error');
          setPin('');
        } else {
          const left = result.attemptsLeft ?? Math.max(0, attemptsLeft - 1);
          setAttemptsLeft(left);
          setError(
            left > 0
              ? `⚠️ Code incorrect. ${left} tentative${left > 1 ? 's' : ''} restante${left > 1 ? 's' : ''}.`
              : '🔒 Trop de tentatives. Contactez l\'agence.'
          );
          setErrorType(left > 0 ? 'warning' : 'error');
          if (left <= 0) {
            setIsBlocked(true);
          }
          setPin('');
        }
      }
    } catch {
      setError('⚠️ Erreur de connexion. Réessayez.');
      setErrorType('warning');
      setPin('');
    } finally {
      setIsSubmitting(false);
    }
  }, [pin, isSubmitting, isBlocked, onSubmit, attemptsLeft]);

  // ── Handle resend PIN ─────────────────────────────────────────────
  const handleResendPin = useCallback(async () => {
    if (isResending || !onResendPin) return;
    setIsResending(true);
    try {
      await onResendPin();
    } catch {
      // Parent handles error
    } finally {
      setIsResending(false);
    }
  }, [isResending, onResendPin]);

  // ── Key values ────────────────────────────────────────────────────
  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['cancel', '0', 'delete'],
  ] as const;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-label="Saisie du code de retrait"
    >
      <div className="rounded-t-3xl sm:rounded-2xl w-full max-w-sm bg-white shadow-2xl animate-in slide-in-from-bottom duration-300 sm:animate-in sm:slide-in-from-bottom-4">
        {/* ── Header ──────────────────────────────────────────── */}
        <div className="relative p-6 pb-4">
          {/* Close button */}
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Fermer"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>

          {/* Title */}
          <div className="flex items-center gap-3 mb-1">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#25D366]/10">
              <Lock className="w-5 h-5 text-[#25D366]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                🔐 Code de retrait
              </h2>
              {receiverName && (
                <p className="text-sm text-gray-500">
                  Pour <span className="font-medium text-gray-700">{receiverName}</span>
                </p>
              )}
            </div>
          </div>

          <p className="text-sm text-gray-500 mt-2">
            Demandez les 6 chiffres au destinataire
          </p>
        </div>

        {/* ── PIN Display ─────────────────────────────────────── */}
        <div className="px-6 pb-2">
          <div className="flex justify-center gap-3" role="group" aria-label="Code PIN saisi">
            {Array.from({ length: 6 }, (_, i) => {
              const isFilled = i < pin.length;
              const isAutoSubmitting = isSubmitting && i === pin.length - 1;
              return (
                <div
                  key={i}
                  className={`
                    relative w-11 h-14 rounded-xl border-2 flex items-center justify-center
                    transition-all duration-200 ease-out
                    ${
                      isFilled
                        ? 'border-[#25D366] bg-[#25D366]/10 scale-105'
                        : 'border-gray-300 bg-gray-50'
                    }
                    ${isAutoSubmitting ? 'animate-pulse' : ''}
                  `}
                >
                  {isFilled && (
                    <span
                      className="text-[#25D366] text-2xl font-bold animate-in zoom-in-50 duration-150"
                      aria-hidden="true"
                    >
                      ●
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Error Display ───────────────────────────────────── */}
        {error && (
          <div className="px-6 pb-2">
            <div
              className={`
                flex items-center gap-2 rounded-xl p-3 text-sm
                ${
                  errorType === 'error'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }
              `}
              role="alert"
            >
              {errorType === 'error' ? (
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-500" />
              ) : (
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-500" />
              )}
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* ── Numeric Keypad ──────────────────────────────────── */}
        <div className="px-6 py-4">
          <div className="grid grid-cols-3 gap-3">
            {keys.map((row, rowIndex) =>
              row.map((key) => {
                if (key === 'cancel') {
                  return (
                    <button
                      key={`cancel-${rowIndex}`}
                      type="button"
                      onClick={onCancel}
                      disabled={isSubmitting}
                      className="
                        h-16 rounded-xl text-sm font-medium
                        text-gray-400 hover:text-gray-600 hover:bg-gray-100
                        active:bg-gray-200 active:scale-95
                        transition-all duration-100
                        disabled:opacity-50 disabled:cursor-not-allowed
                      "
                      aria-label="Annuler"
                    >
                      Annuler
                    </button>
                  );
                }

                if (key === 'delete') {
                  return (
                    <button
                      key="delete"
                      type="button"
                      onClick={handleDelete}
                      disabled={isSubmitting || isBlocked || pin.length === 0}
                      className="
                        h-16 rounded-xl
                        flex items-center justify-center
                        bg-gray-100 text-gray-600
                        hover:bg-gray-200
                        active:bg-gray-300 active:scale-95
                        transition-all duration-100
                        disabled:opacity-40 disabled:cursor-not-allowed
                      "
                      aria-label="Supprimer le dernier chiffre"
                    >
                      <Delete className="w-6 h-6" />
                    </button>
                  );
                }

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleDigit(key)}
                    disabled={isSubmitting || isBlocked}
                    className="
                      h-16 rounded-xl
                      text-2xl font-semibold text-gray-900
                      bg-white border-2 border-gray-200
                      hover:border-gray-300 hover:bg-gray-50
                      active:bg-gray-200 active:scale-95 active:border-gray-400
                      transition-all duration-100
                      disabled:opacity-40 disabled:cursor-not-allowed
                    "
                    aria-label={`Chiffre ${key}`}
                  >
                    {key}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Submit Button ───────────────────────────────────── */}
        <div className="px-6 pb-4">
          {isBlocked ? (
            <button
              type="button"
              disabled
              className="
                w-full h-14 rounded-xl
                flex items-center justify-center gap-2
                bg-red-500 text-white
                text-base font-semibold
                cursor-not-allowed opacity-80
              "
            >
              <Lock className="w-5 h-5" />
              🔒 Bloqué
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || pin.length < 6}
              className={`
                w-full h-14 rounded-xl
                flex items-center justify-center gap-2
                text-base font-semibold text-white
                transition-all duration-200
                ${
                  pin.length === 6 && !isSubmitting
                    ? 'bg-[#25D366] hover:bg-[#1EBE57] active:bg-[#1AAF4F] shadow-lg shadow-[#25D366]/25'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }
                disabled:shadow-none
              `}
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Vérification…
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  ✅ Valider le code
                </>
              )}
            </button>
          )}
        </div>

        {/* ── Footer Links ────────────────────────────────────── */}
        {(onResendPin || onContactAgency) && (
          <div className="border-t border-gray-100 px-6 py-4">
            <div className="flex items-center justify-center gap-6">
              {onResendPin && (
                <button
                  type="button"
                  onClick={handleResendPin}
                  disabled={isResending || isBlocked}
                  className="
                    flex items-center gap-1.5
                    text-sm font-medium text-[#25D366]
                    hover:underline
                    active:opacity-70
                    transition-opacity duration-100
                    disabled:opacity-40 disabled:cursor-not-allowed
                  "
                >
                  {isResending ? (
                    <svg
                      className="animate-spin h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  ) : (
                    '🔄'
                  )}
                  {isResending ? 'Envoi en cours…' : 'Renvoyer le PIN'}
                </button>
              )}

              {onContactAgency && (
                <button
                  type="button"
                  onClick={onContactAgency}
                  disabled={isBlocked}
                  className="
                    flex items-center gap-1.5
                    text-sm font-medium text-gray-500
                    hover:text-gray-700 hover:underline
                    active:opacity-70
                    transition-all duration-100
                    disabled:opacity-40 disabled:cursor-not-allowed
                  "
                >
                  📞 Contacter l&apos;agence
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
