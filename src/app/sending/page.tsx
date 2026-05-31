'use client';

import { Suspense, useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Loader2,
  ArrowLeft,
  CheckCircle,
  ExternalLink,
  QrCode,
  Package,
} from 'lucide-react';
import { notificationSound } from '@/lib/notification-sound';

// ═══════════════════════════════════════════════════
//  WHATSAPP SVG PATH
// ═══════════════════════════════════════════════════

const WA_PATH = 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z';

// ═══════════════════════════════════════════════════
//  SENDING CONTENT (requires Suspense for useSearchParams)
// ═══════════════════════════════════════════════════

function SendingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const waLink = searchParams.get('waLink');
  const recipientName = searchParams.get('to') || 'Contact';
  const notificationType = searchParams.get('type') || 'receiver';
  const callbackUrl = searchParams.get('callback') || '/';
  const suiviUrl = searchParams.get('suivi') || '/';

  const [countdown, setCountdown] = useState(5);
  const [totalDelay, setTotalDelay] = useState(5);
  const [isDone, setIsDone] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  const isSender = notificationType === 'sender';
  const accent = isSender ? '#FF6B35' : '#25D366';

  // Initialize delay on mount (outside useEffect to avoid lint)
  const initializedRef = useRef(false);
  if (!initializedRef.current && waLink) {
    initializedRef.current = true;
    const delay = Math.floor(Math.random() * 3) + 3;
    // We set these via a micro-task to avoid render-time side effects
    queueMicrotask(() => {
      setTotalDelay(delay);
      setCountdown(delay);
    });
  }

  useEffect(() => {
    if (!waLink) {
      // No WhatsApp link — redirect immediately
      router.replace(callbackUrl);
      return;
    }

    // 1. Open WhatsApp in new tab
    try {
      window.open(waLink, '_blank');
    } catch {
      // Fallback: open in same tab
      window.location.href = waLink;
      return;
    }

    // 2. Countdown
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsDone(true);
          // 🔊 Play ding sound
          notificationSound.play();
          // Vibrate on mobile
          try { navigator.vibrate?.([200, 100, 200]); } catch { /* noop */ }
          // Auto-redirect after brief pause
          setTimeout(() => {
            setRedirecting(true);
            router.replace(callbackUrl); // Clean history, no back-button loop
          }, 800);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [waLink, callbackUrl, router]);

  const handleReturn = useCallback(() => {
    router.replace(callbackUrl); // Clean history
  }, [callbackUrl, router]);

  const handleTracking = useCallback(() => {
    router.replace(suiviUrl);
  }, [suiviUrl, router]);

  const progress = totalDelay > 0 ? ((totalDelay - countdown) / totalDelay) * 100 : 100;

  // ─── RENDER ───
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F8FAFC] to-white flex flex-col">
      {/* ─── Header ─── */}
      <header className="bg-black text-white sticky top-0 z-50">
        <div className="max-w-[600px] mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#25D366] flex items-center justify-center">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">SmarticketS</span>
          </div>
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{ backgroundColor: `${accent}20`, border: `1px solid ${accent}40` }}
          >
            <span className="text-xs font-semibold" style={{ color: accent }}>
              {redirecting ? '⏳ Retour...' : isDone ? '✅ Envoyé' : 'Envoi...'}
            </span>
          </div>
        </div>
      </header>

      {/* ─── Main Content ─── */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 sm:p-8 text-center space-y-5">
          {/* ── Animated Icon ── */}
          <div className="relative w-20 h-20 mx-auto">
            {/* Spinning ring */}
            {!isDone && (
              <div
                className="absolute inset-0 rounded-full animate-spin"
                style={{
                  border: `3px solid ${accent}25`,
                  borderTopColor: accent,
                }}
              />
            )}
            {/* Inner circle */}
            <div
              className="absolute inset-2 rounded-full flex items-center justify-center transition-colors duration-500"
              style={{ backgroundColor: `${accent}10` }}
            >
              {isDone ? (
                <CheckCircle
                  className="w-9 h-9"
                  style={{ color: accent }}
                />
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  className="w-8 h-8"
                  style={{ color: accent }}
                  fill="currentColor"
                >
                  <path d={WA_PATH} />
                </svg>
              )}
            </div>
          </div>

          {/* ── Title ── */}
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {isDone ? 'Message envoyé !' : 'Envoi en cours...'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {isSender ? "Notification à l'expéditeur" : 'Notification au destinataire'}
            </p>
            <p className="text-base font-semibold text-gray-900 mt-0.5">{recipientName}</p>
          </div>

          {/* ── Info Box ── */}
          <div
            className="rounded-xl p-3.5 text-left"
            style={{ backgroundColor: `${accent}08`, border: `1px solid ${accent}18` }}
          >
            <div className="flex items-start gap-2.5">
              <ExternalLink className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: accent }} />
              <p className="text-sm text-gray-600">
                WhatsApp est ouvert dans un nouvel onglet. Envoyez le message puis revenez ici.
              </p>
            </div>
          </div>

          {/* ── Progress Section ── */}
          {!isDone && (
            <div className="space-y-3">
              {/* Bouncing dots */}
              <div className="flex items-center justify-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full animate-bounce"
                    style={{ backgroundColor: accent, animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>

              {/* Countdown */}
              <p className="text-sm text-gray-500">
                Retour automatique dans{' '}
                <span className="font-bold text-xl" style={{ color: accent }}>
                  {countdown}s
                </span>
              </p>

              {/* Progress bar */}
              <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-1.5 rounded-full transition-all duration-1000 ease-linear"
                  style={{ width: `${progress}%`, backgroundColor: accent }}
                />
              </div>
            </div>
          )}

          {/* ── Action Buttons ── */}
          <div className="space-y-2.5 pt-1">
            {/* Primary button */}
            <button
              onClick={handleReturn}
              disabled={redirecting}
              className="w-full h-14 rounded-2xl font-bold text-base text-white flex items-center justify-center gap-3 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                backgroundColor: accent,
                boxShadow: `0 8px 24px ${accent}35`,
              }}
            >
              {redirecting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Retour en cours...
                </>
              ) : isDone ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Continuer
                </>
              ) : (
                <>
                  <ArrowLeft className="w-5 h-5" />
                  Retourner maintenant
                </>
              )}
            </button>

            {/* Secondary button */}
            <button
              onClick={handleTracking}
              disabled={redirecting}
              className="w-full h-12 rounded-xl font-semibold text-sm text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <Package className="w-4 h-4" />
              Voir le suivi du colis
            </button>
          </div>

          {/* ── Footer Note ── */}
          <p className="text-xs text-gray-400">
            Si WhatsApp ne s&apos;est pas ouvert, vérifiez vos pop-ups
          </p>
        </div>
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════
//  PAGE EXPORT (with Suspense wrapper)
// ═══════════════════════════════════════════════════

export default function SendingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-[#F8FAFC] to-white flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      }
    >
      <SendingContent />
    </Suspense>
  );
}
