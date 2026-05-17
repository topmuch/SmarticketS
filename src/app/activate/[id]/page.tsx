'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import ActivationHeader from '@/components/activation/ActivationHeader';
import ActivationForm from '@/components/activation/ActivationForm';

function ActivateContent() {
  const params = useParams();
  const router = useRouter();
  const qrCode = ((params?.id as string) || '').toUpperCase().trim();
  const [lang, setLang] = useState<'fr' | 'en'>('fr');

  // Status-based routing: check if colis is already in_transit → redirect to arrivee
  const [checking, setChecking] = useState(true);
  const [checkError, setCheckError] = useState(false);

  useEffect(() => {
    if (!qrCode) {
      setChecking(false);
      return;
    }

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/arrivee/${encodeURIComponent(qrCode)}`);
        const data = await res.json();

        if (res.ok && data.success && data.colis) {
          const status = data.colis.status;

          // If already in_transit → redirect to retrieve page
          if (status === 'in_transit') {
            router.replace(`/retrieve/${qrCode}`);
            return;
          }

          // If already delivered → redirect to retrieve page
          if (status === 'delivered') {
            router.replace(`/retrieve/${qrCode}`);
            return;
          }
        }
      } catch {
        // If check fails, let user continue with form (colis might be pending_activation)
      } finally {
        setChecking(false);
      }
    };

    checkStatus();
  }, [qrCode, router]);

  // Loading: checking status
  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a1a2e] to-[#16213e]">
        <ActivationHeader qrCode={qrCode} onLangChange={setLang} currentLang={lang} />
        <div className="flex items-center justify-center py-24 sm:py-32">
          <div className="text-center">
            <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 text-white animate-spin mx-auto mb-3" />
            <p className="text-sm sm:text-base text-white">Vérification en cours...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1a2e] to-[#16213e]">
      <ActivationHeader qrCode={qrCode} onLangChange={setLang} currentLang={lang} />

      <main className="max-w-[600px] mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-24">
        <ActivationForm qrCode={qrCode} lang={lang} />
      </main>
    </div>
  );
}

export default function ActivatePage() {
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
      <ActivateContent />
    </Suspense>
  );
}
