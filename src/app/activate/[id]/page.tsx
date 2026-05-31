'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Ticket, Package, ArrowRight, QrCode } from 'lucide-react';
import { motion } from 'framer-motion';
import ActivationHeader from '@/components/activation/ActivationHeader';
import { notificationSound } from '@/lib/notification-sound';

// API pour récupérer les données du QR
async function fetchBaggageData(qrCode: string) {
  const res = await fetch(`/api/arrivee/${encodeURIComponent(qrCode)}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data;
}

function ActivateChoiceContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const qrCode = ((params?.id as string) || '').toUpperCase().trim();
  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [baggageData, setBaggageData] = useState<any>(null);
  const hasQrCode = qrCode.length > 0;
  const [checking, setChecking] = useState(true);
  const [notFound, setNotFound] = useState(!hasQrCode);

  // Pre-load audio on page mount
  useEffect(() => {
    notificationSound.unlock();
  }, []);

  // Check status and auto-redirect based on category
  useEffect(() => {
    if (!hasQrCode) {
      return;
    }

    const checkStatus = async () => {
      try {
        const data = await fetchBaggageData(qrCode);

        if (data?.success && data?.colis) {
          setBaggageData(data);
          const status = data.colis.status;

          // If already in_transit or delivered → redirect to retrieve
          if (status === 'in_transit' || status === 'delivered') {
            router.replace(`/retrieve/${qrCode}`);
            return;
          }

          // Always show the choice page — let the user pick Ticket or Colis
          setChecking(false);
        } else {
          setNotFound(true);
        }
      } catch {
        // If check fails, let user continue with choice page
      } finally {
        setChecking(false);
      }
    };

    checkStatus();
  }, [hasQrCode, qrCode, router]);

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

  // Not found
  if (notFound) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a1a2e] to-[#16213e]">
        <ActivationHeader qrCode={qrCode} onLangChange={setLang} currentLang={lang} />
        <div className="flex items-center justify-center py-24 sm:py-32">
          <div className="text-center space-y-4 px-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-red-500/20 rounded-full">
              <QrCode className="w-10 h-10 text-red-400" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              QR Code introuvable
            </h2>
            <p className="text-sm text-white/70">
              Ce code ne correspond à aucun colis ou ticket enregistré.
            </p>
            <p className="text-xs font-mono text-white/50">#{qrCode}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1a2e] to-[#16213e]">
      <ActivationHeader qrCode={qrCode} onLangChange={setLang} currentLang={lang} />

      <main className="max-w-[600px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8 sm:mb-12"
        >
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">
            {lang === 'fr' ? 'Que souhaitez-vous activer ?' : 'What do you want to activate?'}
          </h2>
          <p className="text-sm sm:text-base text-white/60">
            {lang === 'fr'
              ? 'Choisissez le type d\'activation pour ce code QR'
              : 'Choose the activation type for this QR code'}
          </p>
        </motion.div>

        {/* Choice Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {/* Ticket Card */}
          <motion.button
            onClick={() => router.push(`/activate/ticket/${qrCode}`)}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="group relative bg-[#1da1f3] hover:bg-[#1b91de] border-2 border-[#1da1f3]/50 hover:border-[#1da1f3]/80 rounded-2xl p-6 sm:p-8 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-[#1da1f3]/30 active:scale-[0.98]"
          >
            <div className="flex flex-col items-center sm:items-start gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/15 rounded-2xl flex items-center justify-center group-hover:bg-white/25 transition-colors">
                <Ticket className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-xl sm:text-2xl font-extrabold text-white mb-1">
                  🎫 Ticket
                </h3>
                <p className="text-sm text-white/70 leading-snug">
                  {lang === 'fr'
                    ? 'Activer un billet de transport passager'
                    : 'Activate a passenger transport ticket'}
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-white/50 group-hover:text-white group-hover:translate-x-1 transition-all self-center sm:self-end" />
            </div>
          </motion.button>

          {/* Colis Card */}
          <motion.button
            onClick={() => router.push(`/activate/parcel/${qrCode}`)}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="group relative bg-[#FF1D8D] hover:bg-[#e6187d] border-2 border-[#FF1D8D]/50 hover:border-[#FF1D8D]/80 rounded-2xl p-6 sm:p-8 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-[#FF1D8D]/30 active:scale-[0.98]"
          >
            <div className="flex flex-col items-center sm:items-start gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/15 rounded-2xl flex items-center justify-center group-hover:bg-white/25 transition-colors">
                <Package className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-xl sm:text-2xl font-extrabold text-white mb-1">
                  📦 Colis
                </h3>
                <p className="text-sm text-white/70 leading-snug">
                  {lang === 'fr'
                    ? 'Activer l\'envoi d\'un colis entre deux villes'
                    : 'Activate a parcel shipment between cities'}
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-white/50 group-hover:text-white group-hover:translate-x-1 transition-all self-center sm:self-end" />
            </div>
          </motion.button>
        </div>

        {/* Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-8 sm:mt-12 text-center"
        >
          <p className="text-xs text-white/40 font-mono">
            {lang === 'fr' ? 'Référence' : 'Reference'}: #{qrCode}
          </p>
        </motion.div>
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
      <ActivateChoiceContent />
    </Suspense>
  );
}
