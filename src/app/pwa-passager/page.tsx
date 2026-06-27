'use client';

/**
 * PWA Passager — Page d'accueil (Live Board / Gare Digitale)
 *
 * REFONTE TOTALE: la page d'accueil est maintenant un tableau de bord temps réel
 * des départs du jour, avec:
 *   - Mises à jour WebSocket en temps réel (statut bus, GPS, places)
 *   - Recherche et filtres instantanés
 *   - Favoris (destinations épinglées)
 *   - Modal détails avec carte GPS (Leaflet + OpenStreetMap)
 *   - Navigation bottom-bar style App Native
 *
 * L'ancienne vue billet (QR code, countdown, etc.) est déplacée vers
 * /pwa-passager/ticket — accessible via la bottom-nav "Mon Billet".
 */

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { LiveBoard } from '@/components/pwa-passenger/LiveBoard';
import { BusGoSWRegistration } from '@/components/busgo/pwa-sw-registration';
import { toast } from 'sonner';

function PassengerHomePage() {
  const searchParams = useSearchParams();
  const [ticketId, setTicketId] = useState<string | null>(null);

  // Read ticketId from localStorage (set during PWA install)
  useEffect(() => {
    const id = localStorage.getItem('busgo_ticket_id');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTicketId(id);
  }, []);

  // Handle TTS cold-open from SW (?tts=1&ttsMessage=...)
  useEffect(() => {
    const ttsParam = searchParams.get('tts');
    const ttsMessage = searchParams.get('ttsMessage');
    const alertType = searchParams.get('alertType');

    if (ttsParam === '1' && ttsMessage) {
      const decoded = decodeURIComponent(ttsMessage);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(decoded);
        u.lang = 'fr-FR';
        u.rate = 0.9;
        u.volume = 1.0;
        window.speechSynthesis.speak(u);
      }
      toast.info(`🔊 ${alertType || 'Annonce'}: ${decoded.substring(0, 80)}`);
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [searchParams]);

  return (
    <>
      <BusGoSWRegistration />
      <LiveBoard ticketId={ticketId} alertsCount={0} />
    </>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-900">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
        </div>
      }
    >
      <PassengerHomePage />
    </Suspense>
  );
}
