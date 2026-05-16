'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import ActivationHeader from '@/components/activation/ActivationHeader';
import ActivationForm from '@/components/activation/ActivationForm';

export default function ActivatePage() {
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

          // If already in_transit → redirect to arrival page
          if (status === 'in_transit') {
            router.replace(`/arrivee/${qrCode}`);
            return;
          }

          // If already delivered → redirect to tracking page
          if (status === 'delivered') {
            router.replace(`/suivi/${qrCode}`);
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
      <div className="min-h-screen bg-gradient-to-b from-[#F8FAFC] to-white">
        <ActivationHeader qrCode={qrCode} onLangChange={setLang} currentLang={lang} />
        <div className="flex items-center justify-center py-32">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500">Vérification en cours...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F8FAFC] to-white">
      <ActivationHeader qrCode={qrCode} onLangChange={setLang} currentLang={lang} />

      <main className="max-w-[600px] mx-auto px-4 py-6 pb-20">
        <ActivationForm qrCode={qrCode} lang={lang} />
      </main>
    </div>
  );
}
