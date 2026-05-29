'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Loader2, ArrowLeft, QrCode } from 'lucide-react';
import Link from 'next/link';
import TicketActivationForm from '@/components/activation/TicketActivationForm';
import ActivationHeader from '@/components/activation/ActivationHeader';
import { notificationSound } from '@/lib/notification-sound';

async function fetchBaggageData(qrCode: string) {
  const res = await fetch(`/api/arrivee/${encodeURIComponent(qrCode)}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data;
}

function TicketActivateContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const qrCode = ((params?.id as string) || '').toUpperCase().trim();
  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [baggageData, setBaggageData] = useState<any>(null);
  const [agencyId, setAgencyId] = useState<string>('');
  const [baggageId, setBaggageId] = useState<string>('');
  const [checking, setChecking] = useState(true);
  const [checkError, setCheckError] = useState('');

  // Pre-load audio
  useEffect(() => {
    notificationSound.unlock();
  }, []);

  // Check if returning from /sending (WhatsApp notification flow)
  const notifiedParam = searchParams.get('notified');
  const isReturningFromNotify = notifiedParam === 'sender' || notifiedParam === 'receiver';

  // Fetch baggage data
  useEffect(() => {
    if (!qrCode) {
      setChecking(false);
      return;
    }

    if (isReturningFromNotify) {
      setChecking(false);
      return;
    }

    const checkStatus = async () => {
      try {
        const data = await fetchBaggageData(qrCode);

        if (data?.success && data?.colis) {
          setBaggageData(data);
          setAgencyId(data.colis.agencyId || '');
          setBaggageId(data.colis.id || '');

          const status = data.colis.status;
          if (status === 'in_transit' || status === 'delivered') {
            setCheckError('already_activated');
            setChecking(false);
            return;
          }
        } else {
          setCheckError('not_found');
        }
      } catch {
        // Continue without data
      } finally {
        setChecking(false);
      }
    };

    checkStatus();
  }, [qrCode, isReturningFromNotify]);

  // Loading
  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a1a2e] to-[#16213e]">
        <ActivationHeader qrCode={qrCode} onLangChange={setLang} currentLang={lang} />
        <div className="flex items-center justify-center py-24 sm:py-32">
          <div className="text-center">
            <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 text-white animate-spin mx-auto mb-3" />
            <p className="text-sm sm:text-base text-white">Chargement...</p>
          </div>
        </div>
      </div>
    );
  }

  // Already activated
  if (checkError === 'already_activated') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a1a2e] to-[#16213e]">
        <ActivationHeader qrCode={qrCode} onLangChange={setLang} currentLang={lang} />
        <div className="flex items-center justify-center py-24 sm:py-32 px-6">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-500/20 rounded-full">
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white">Ce ticket est déjà activé</h2>
            <p className="text-sm text-white/70 font-mono">#{qrCode}</p>
            <Link
              href={`/retrieve/${qrCode}`}
              className="inline-flex items-center gap-2 px-6 h-12 bg-[#FF6B35] hover:bg-[#e65a28] text-white rounded-xl font-bold text-sm transition-colors no-underline shadow-lg shadow-orange-500/20"
            >
              🔐 Voir les détails
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Not found
  if (checkError === 'not_found') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a1a2e] to-[#16213e]">
        <ActivationHeader qrCode={qrCode} onLangChange={setLang} currentLang={lang} />
        <div className="flex items-center justify-center py-24 sm:py-32 px-6">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/20 rounded-full">
              <QrCode className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white">QR Code introuvable</h2>
            <Link
              href={`/activate/${qrCode}`}
              className="inline-flex items-center gap-2 px-6 h-12 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-sm transition-colors no-underline"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1a2e] to-[#16213e]">
      <ActivationHeader qrCode={qrCode} onLangChange={setLang} currentLang={lang} />

      {/* Back button */}
      <div className="max-w-[600px] mx-auto px-3 sm:px-4 pt-3">
        <Link
          href={`/activate/${qrCode}`}
          className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white transition-colors no-underline"
        >
          <ArrowLeft className="w-4 h-4" />
          {lang === 'fr' ? 'Changer de type' : 'Change type'}
        </Link>
      </div>

      <main className="max-w-[600px] mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-24">
        <TicketActivationForm
          baggageId={baggageId || qrCode}
          agencyId={agencyId}
          reference={qrCode}
        />
      </main>
    </div>
  );
}

export default function TicketActivatePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-[#1a1a2e] to-[#16213e]">
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        </div>
      }
    >
      <TicketActivateContent />
    </Suspense>
  );
}
