'use client';

import { useRef, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowLeft,
  Clock,
  ArrowRight,
  Bell,
  Monitor,
  Maximize,
  MessageCircle,
} from 'lucide-react';

const WA_URL =
  'https://wa.me/221784858226?text=Bonjour%20SmarticketS%2C%20je%20souhaite%20en%20savoir%20plus%20sur%20les%20%C3%A9crans%20d%27affichage';

const INFO_CARDS = [
  {
    icon: Clock,
    title: 'Horaires en Temps Réel',
    description:
      'Les données se rafraîchissent automatiquement toutes les 15 secondes pour afficher les informations les plus récentes.',
    color: 'bg-[#00A887]/10 text-[#00A887]',
  },
  {
    icon: ArrowRight,
    title: 'Départs & Arrivées',
    description:
      'Un tableau divisé affichant simultanément les prochains départs et les arrivées en temps réel.',
    color: 'bg-sky-100 text-sky-600',
  },
  {
    icon: Bell,
    title: 'Alertes Embarquement',
    description:
      'Des alertes sonores et visuelles automatiques pour prévenir les voyageurs lors de l\'embarquement.',
    color: 'bg-amber-100 text-amber-600',
  },
];

export default function DemoAffichagePage() {
  const iframeRef = useRef<HTMLDivElement>(null);

  const handleFullscreen = useCallback(() => {
    if (!iframeRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if (iframeRef.current.requestFullscreen) {
      iframeRef.current.requestFullscreen();
    } else if (
      (iframeRef.current as HTMLDivElement & {
        webkitRequestFullscreen?: () => void;
      }).webkitRequestFullscreen
    ) {
      (
        iframeRef.current as HTMLDivElement & {
          webkitRequestFullscreen: () => void;
        }
      ).webkitRequestFullscreen();
    }
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* ── Header Section ── */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-slate-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 h-16">
            <Link
              href="/"
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
              <span className="text-sm font-medium hidden sm:inline">Retour</span>
            </Link>

            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate">
                <Monitor className="w-5 h-5 inline-block mr-2 text-[#00A887]" />
                Écran d&apos;Affichage — Démo en Direct
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* ── Subtitle ── */}
        <div className="text-center mb-8 sm:mb-10">
          <p className="text-slate-500 max-w-2xl mx-auto leading-relaxed">
            Découvrez en temps réel notre système d&apos;affichage de départs et
            arrivées. Cet écran est utilisé dans les gares routières pour informer
            les voyageurs. Les données se rafraîchissent automatiquement.
          </p>
        </div>

        {/* ── Device Mockup ── */}
        <div className="flex flex-col items-center">
          {/* Monitor Frame */}
          <div className="relative w-full max-w-5xl">
            {/* Top bezel shadow */}
            <div className="absolute -top-3 left-8 right-8 h-3 bg-gradient-to-b from-slate-300 to-slate-200 rounded-t-lg" />

            {/* Monitor body */}
            <div className="relative bg-gradient-to-b from-slate-800 via-slate-900 to-slate-800 rounded-xl sm:rounded-2xl p-2 sm:p-3 shadow-2xl shadow-slate-900/30 border border-slate-700/50">
              {/* Inner screen bezel */}
              <div className="relative bg-[#0b0f19] rounded-lg sm:rounded-xl overflow-hidden">
                {/* Fullscreen button overlay */}
                <div className="absolute top-3 right-3 z-20">
                  <Button
                    onClick={handleFullscreen}
                    size="sm"
                    variant="secondary"
                    className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/20 rounded-lg px-3 py-1.5 text-xs font-medium gap-1.5 shadow-lg"
                  >
                    <Maximize className="w-3.5 h-3.5" />
                    Plein Écran
                  </Button>
                </div>

                {/* Live indicator */}
                <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 bg-red-600/90 backdrop-blur-sm px-2.5 py-1 rounded-md">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                  </span>
                  <span className="text-white text-xs font-semibold tracking-wide">
                    EN DIRECT
                  </span>
                </div>

                {/* iframe container for fullscreen */}
                <div ref={iframeRef} className="w-full">
                  <iframe
                    src="/signage-slug/dakar-peters"
                    className="w-full block"
                    style={{ aspectRatio: '16 / 9' }}
                    title="Écran d'affichage SmarticketS"
                    allow="autoplay"
                  />
                </div>
              </div>
            </div>

            {/* Monitor stand — desktop only */}
            <div className="hidden sm:block">
              {/* Stand neck */}
              <div className="mx-auto w-16 h-8 bg-gradient-to-b from-slate-700 to-slate-600 rounded-b-lg" />
              {/* Stand base */}
              <div className="mx-auto w-48 h-3 bg-gradient-to-b from-slate-600 to-slate-700 rounded-b-xl" />
            </div>
          </div>
        </div>

        {/* ── Info Cards ── */}
        <div className="grid sm:grid-cols-3 gap-4 sm:gap-6 mt-12 sm:mt-16">
          {INFO_CARDS.map((card) => (
            <Card
              key={card.title}
              className="bg-white border-slate-200/80 shadow-lg shadow-slate-900/5 hover:shadow-xl hover:shadow-[#00A887]/5 transition-all duration-300 rounded-2xl group"
            >
              <CardContent className="p-6">
                <div
                  className={`w-12 h-12 rounded-xl ${card.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}
                >
                  <card.icon className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  {card.title}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {card.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── CTA Section ── */}
        <div className="mt-16 sm:mt-20 mb-8">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#00A887] via-[#009B7D] to-[#008f72] p-8 sm:p-12 text-center">
            {/* Decorative circles */}
            <div className="absolute -top-16 -right-16 w-48 h-48 bg-white/5 rounded-full" />
            <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-white/5 rounded-full" />

            <div className="relative z-10">
              <Monitor className="w-12 h-12 text-white/80 mx-auto mb-4" />
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                Voulez-vous cet écran dans votre gare&nbsp;?
              </h2>
              <p className="text-white/80 max-w-lg mx-auto mb-8 text-sm sm:text-base leading-relaxed">
                Installez nos écrans d&apos;affichage dans votre gare et offrez à
                vos voyageurs une expérience moderne. Installation rapide,
                données en temps réel, support 24/7.
              </p>
              <a
                href={WA_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="w-full sm:w-auto bg-white hover:bg-white/90 text-[#00A887] font-bold rounded-xl px-8 py-4 text-sm shadow-xl shadow-black/20 transition-all hover:scale-[1.02] gap-2.5">
                  <MessageCircle className="w-5 h-5" />
                  Contactez-nous sur WhatsApp
                </Button>
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-200/80 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-[#00A887]" />
              <span className="font-medium text-slate-700">SmarticketS</span>
              <span>— Écran d&apos;Affichage</span>
            </div>
            <span className="text-xs text-slate-400">
              &copy; {new Date().getFullYear()} SmarticketS. Tous droits réservés.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
