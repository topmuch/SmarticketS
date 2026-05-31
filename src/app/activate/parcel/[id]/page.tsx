'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, ArrowLeft, Link as LinkIcon } from 'lucide-react';
import Link from 'next/link';
import ActivationForm from '@/components/activation/ActivationForm';
import ActivationHeader from '@/components/activation/ActivationHeader';
import { notificationSound } from '@/lib/notification-sound';

async function fetchBaggageData(qrCode: string) {
  const res = await fetch(`/api/arrivee/${encodeURIComponent(qrCode)}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data;
}

function ParcelActivateContent() {
  const params = useParams();
  const qrCode = ((params?.id as string) || '').toUpperCase().trim();
  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [checking, setChecking] = useState(true);

  // Pre-load audio
  useEffect(() => {
    notificationSound.unlock();
  }, []);

  // Fetch baggage data (for status check)
  useEffect(() => {
    if (!qrCode) {
      setChecking(false);
      return;
    }

    const checkStatus = async () => {
      try {
        const data = await fetchBaggageData(qrCode);

        if (data?.success && data?.colis) {
          const status = data.colis.status;
          // If already in_transit or delivered, ActivationForm will handle the redirect/display
          // Just let it through — the form handles already_active, already_in_transit, already_delivered
        }
      } catch {
        // Continue without data — let the form handle it
      } finally {
        setChecking(false);
      }
    };

    checkStatus();
  }, [qrCode]);

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
        <ActivationForm qrCode={qrCode} lang={lang} />
      </main>
    </div>
  );
}

export default function ParcelActivatePage() {
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
      <ParcelActivateContent />
    </Suspense>
  );
}
