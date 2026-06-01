'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Monitor,
  Clock,
  Bell,
  MapPin,
  Volume2,
  Tv,
  Eye,
  CheckCircle,
  ArrowRight,
  ExternalLink,
  Maximize,
  Settings,
  Users,
  Megaphone,
  MessageSquare,
  Timer,
  CloudSun,
  AlertTriangle,
} from 'lucide-react';
import SecondaryPageLayout from '@/components/landing/SecondaryPageLayout';
import FadeIn from '@/components/landing/FadeIn';

/* ────────────────────────────────────────────
   DATA
   ──────────────────────────────────────────── */

const keyFeatures = [
  {
    icon: Clock,
    title: 'Horaires en Direct',
    description:
      'Les départs et arrivées se mettent à jour automatiquement toutes les 15 secondes. Fini les tableaux manuels et les retards d\'information.',
    gradient: 'from-[#FF6B35] to-[#e55a28]',
  },
  {
    icon: Bell,
    title: 'Alertes Embarquement',
    description:
      'Des alertes visuelles et sonores se déclenchent automatiquement quand l\'embarquement d\'un départ est ouvert. Les voyageurs ne ratent plus leur bus.',
    gradient: 'from-[#3B82F6] to-[#2563EB]',
  },
  {
    icon: Tv,
    title: 'Format Télévision',
    description:
      'Un affichage professionnel de type aéroport, avec thème sombre et typographie lisible à distance. Conçu pour les grands écrans de gare.',
    gradient: 'from-[#0A2540] to-[#1a365d]',
  },
  {
    icon: Settings,
    title: 'Gestion à Distance',
    description:
      'Configurez vos écrans, gares et contenus directement depuis le tableau de bord admin. Aucune intervention technique sur site nécessaire.',
    gradient: 'from-[#00A887] to-[#008f72]',
  },
  {
    icon: Timer,
    title: 'Compte à Rebours Live',
    description:
      'Chaque départ affiche un compte à rebours en temps réel (MM:SS) avec code couleur : vert, jaune, orange, rouge selon l\'urgence.',
    gradient: 'from-[#7c3aed] to-[#6d28d9]',
  },
  {
    icon: CloudSun,
    title: 'Météo Destination',
    description:
      'Conditions météo en temps réel pour chaque ville d\'arrivée. Les voyageurs connaissent la température et le temps qu\'il fait à destination.',
    gradient: 'from-[#06b6d4] to-[#0891b2]',
  },
  {
    icon: AlertTriangle,
    title: 'Retards Automatiques',
    description:
      'Détection et affichage instantané des retards avec badge coloré (jaune, orange, rouge). L\'heure prévue de départ est mise à jour automatiquement.',
    gradient: 'from-[#f59e0b] to-[#d97706]',
  },
  {
    icon: Megaphone,
    title: 'Annonces d\'Urgence',
    description:
      'Bandeau défilant rouge en plein écran pour les messages critiques (accident, grève, fermeture). Auto-dismiss et alerte sonore.',
    gradient: 'from-[#ef4444] to-[#dc2626]',
  },
];

const benefits = [
  {
    text: 'Affichage automatique des départs et arrivées',
    icon: Monitor,
  },
  {
    text: 'Compte à rebours temps réel (MM:SS)',
    icon: Timer,
  },
  {
    text: 'Météo en temps réel pour chaque destination',
    icon: CloudSun,
  },
  {
    text: 'Détection automatique des retards',
    icon: AlertTriangle,
  },
  {
    text: 'Annonces vocales automatiques (embarquement)',
    icon: Volume2,
  },
  {
    text: 'Bandeau défilant pour messages urgents',
    icon: Megaphone,
  },
  {
    text: 'Mode kiosk — plein écran sans navigation',
    icon: Maximize,
  },
  {
    text: 'Compatible TV, écran PC, tablette',
    icon: Tv,
  },
  {
    text: 'Publicités intégrées (revenus additionnels)',
    icon: Eye,
  },
];

const fakeDepartures = [
  {
    time: '08:00',
    destination: 'Saint-Louis',
    line: 'Ligne 2',
    platform: 'Quai A',
    seats: '12 places',
    status: 'À l\'heure',
    statusColor: '#22c55e',
  },
  {
    time: '08:30',
    destination: 'Thiès',
    line: 'Ligne 5',
    platform: 'Quai B',
    seats: '5 places',
    status: 'À l\'heure',
    statusColor: '#22c55e',
  },
  {
    time: '09:15',
    destination: 'Louga',
    line: 'Ligne 3',
    platform: 'Quai C',
    seats: 'Complet',
    status: 'Complet',
    statusColor: '#ef4444',
  },
];

const fakeArrivals = [
  {
    time: '07:45',
    origin: 'Kaolack',
    line: 'Ligne 7',
    platform: 'Quai D',
    status: 'Arrivé',
    statusColor: '#22c55e',
  },
  {
    time: '08:10',
    origin: 'Ziguinchor',
    line: 'Ligne 1',
    platform: 'Quai A',
    status: 'En route',
    statusColor: '#f59e0b',
  },
  {
    time: '08:45',
    origin: 'Tambacounda',
    line: 'Ligne 9',
    platform: 'Quai B',
    status: 'En retard',
    statusColor: '#ef4444',
  },
];

/* ────────────────────────────────────────────
   ANIMATION VARIANTS
   ──────────────────────────────────────────── */

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
};

/* ────────────────────────────────────────────
   CLOCK COMPONENT (mockup only)
   ──────────────────────────────────────────── */

function LiveClock() {
  const [time, setTime] = useState('');

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="font-mono text-sm sm:text-base tracking-wider">
      {time}
    </span>
  );
}

/* ────────────────────────────────────────────
   PAGE COMPONENT
   ──────────────────────────────────────────── */

export default function EcransAffichagePage() {
  return (
    <SecondaryPageLayout
      title="Écrans d'Affichage"
      subtitle="Des écrans de gare intelligents qui affichent en temps réel les départs et arrivées de bus. Information voyageurs automatisée, professionnelle et accessible."
    >
      {/* ──────── 1. KEY FEATURES ──────── */}
      <section className="mb-20 sm:mb-28">
        <FadeIn className="text-center mb-10 sm:mb-14">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#0A2540] mb-3">
            Fonctionnalités clés
          </h2>
          <p className="text-[#475569] text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Tout ce dont votre gare a besoin pour informer les voyageurs en
            temps réel, sans intervention manuelle.
          </p>
        </FadeIn>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6"
        >
          {keyFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                variants={cardVariants}
                whileHover={{ y: -6, scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className={`relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br ${feature.gradient} text-white shadow-lg hover:shadow-xl transition-shadow duration-300`}
              >
                {/* Decorative circle */}
                <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full" />
                <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-white/5 rounded-full" />

                {/* Icon */}
                <div className="relative z-10 w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-white" />
                </div>

                {/* Content */}
                <h3 className="relative z-10 text-lg font-bold mb-2 leading-snug">
                  {feature.title}
                </h3>
                <p className="relative z-10 text-white/85 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* ──────── 2. SCREEN MOCKUP ──────── */}
      <section className="mb-20 sm:mb-28">
        <FadeIn className="text-center mb-10 sm:mb-14">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#0A2540] mb-3">
            Aperçu de l&apos;écran d&apos;affichage
          </h2>
          <p className="text-[#475569] text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Voici à quoi ressemble l&apos;écran de gare en conditions réelles. Un
            affichage professionnel, lisible à distance, inspiré des départs
            d&apos;aéroport.
          </p>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="relative">
            {/* Monitor frame */}
            <div className="mx-auto max-w-4xl">
              {/* Screen bezel */}
              <div className="rounded-2xl overflow-hidden shadow-[0_16px_64px_rgba(0,0,0,0.25)] border border-gray-700/30">
                {/* Top bar (browser-like) */}
                <div className="bg-[#1a1d27] px-4 py-2.5 flex items-center gap-2 border-b border-white/5">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-[#ef4444]" />
                    <div className="w-3 h-3 rounded-full bg-[#f59e0b]" />
                    <div className="w-3 h-3 rounded-full bg-[#22c55e]" />
                  </div>
                  <div className="flex-1 text-center">
                    <span className="text-white/30 text-xs font-mono">
                      smartickets.sn/affichage/gare-peters
                    </span>
                  </div>
                </div>

                {/* Actual screen content */}
                <div className="bg-[#0b0f19] p-4 sm:p-6 lg:p-8 min-h-[400px] sm:min-h-[480px]">
                  {/* Station header */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 mb-6 sm:mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-[#00A887] flex items-center justify-center">
                        <Monitor className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-base sm:text-lg lg:text-xl tracking-tight">
                          GARE ROUTIÈRE PETERS
                        </h3>
                        <p className="text-white/40 text-xs sm:text-sm">
                          Dakar, Sénégal
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-white/60">
                      <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <LiveClock />
                    </div>
                  </div>

                  {/* Two-column board */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    {/* DEPARTURES column */}
                    <div>
                      <div className="bg-gradient-to-r from-[#FF6B35] to-[#e55a28] rounded-t-lg px-4 py-2 sm:py-2.5 flex items-center gap-2">
                        <ArrowRight className="w-4 h-4 text-white" />
                        <span className="text-white font-bold text-sm sm:text-base tracking-wide uppercase">
                          Départs
                        </span>
                      </div>
                      <div className="bg-[#111827] rounded-b-lg divide-y divide-white/5">
                        {fakeDepartures.map((dep, i) => (
                          <div
                            key={i}
                            className="px-3 sm:px-4 py-3 sm:py-3.5 flex items-center gap-3 sm:gap-4"
                          >
                            {/* Time */}
                            <span className="text-white font-mono font-bold text-sm sm:text-base min-w-[3rem]">
                              {dep.time}
                            </span>
                            {/* Destination + line */}
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-semibold text-xs sm:text-sm truncate">
                                {dep.destination}
                              </p>
                              <p className="text-white/40 text-[10px] sm:text-xs">
                                {dep.line}
                              </p>
                            </div>
                            {/* Platform + seats */}
                            <div className="text-right hidden sm:block">
                              <p className="text-white/60 text-xs">
                                {dep.platform}
                              </p>
                              <p className="text-white/40 text-[10px]">
                                {dep.seats}
                              </p>
                            </div>
                            {/* Status badge */}
                            <span
                              className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 sm:py-1 rounded-full whitespace-nowrap"
                              style={{
                                backgroundColor: `${dep.statusColor}20`,
                                color: dep.statusColor,
                              }}
                            >
                              {dep.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ARRIVALS column */}
                    <div>
                      <div className="bg-gradient-to-r from-[#3B82F6] to-[#2563EB] rounded-t-lg px-4 py-2 sm:py-2.5 flex items-center gap-2">
                        <ArrowRight className="w-4 h-4 text-white rotate-180" />
                        <span className="text-white font-bold text-sm sm:text-base tracking-wide uppercase">
                          Arrivées
                        </span>
                      </div>
                      <div className="bg-[#111827] rounded-b-lg divide-y divide-white/5">
                        {fakeArrivals.map((arr, i) => (
                          <div
                            key={i}
                            className="px-3 sm:px-4 py-3 sm:py-3.5 flex items-center gap-3 sm:gap-4"
                          >
                            {/* Time */}
                            <span className="text-white font-mono font-bold text-sm sm:text-base min-w-[3rem]">
                              {arr.time}
                            </span>
                            {/* Origin + line */}
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-semibold text-xs sm:text-sm truncate">
                                {arr.origin}
                              </p>
                              <p className="text-white/40 text-[10px] sm:text-xs">
                                {arr.line}
                              </p>
                            </div>
                            {/* Platform */}
                            <div className="text-right hidden sm:block">
                              <p className="text-white/60 text-xs">
                                {arr.platform}
                              </p>
                            </div>
                            {/* Status badge */}
                            <span
                              className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 sm:py-1 rounded-full whitespace-nowrap"
                              style={{
                                backgroundColor: `${arr.statusColor}20`,
                                color: arr.statusColor,
                              }}
                            >
                              {arr.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Ticker bar */}
                  <div className="mt-4 sm:mt-6 bg-[#111827] rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 flex items-center gap-2 sm:gap-3 overflow-hidden">
                    <span className="bg-[#FF6B35] text-white text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded shrink-0">
                      INFO
                    </span>
                    <div className="overflow-hidden whitespace-nowrap flex-1">
                      <p className="text-white/50 text-xs sm:text-sm animate-marquee inline-block">
                        📢 Attention : le départ pour Tambacounda prévu à 09:15 est complet.
                        Merci de vous diriger vers un autre trajet. — SmarticketS, la billetterie
                        intelligente pour les gares du Sénégal.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stand/foot of monitor */}
              <div className="mx-auto w-32 h-4 bg-gray-700/30 rounded-b-xl" />
              <div className="mx-auto w-48 h-2 bg-gray-700/20 rounded-b-2xl" />
            </div>
          </div>
        </FadeIn>

        {/* CTA under mockup */}
        <FadeIn delay={0.2} className="mt-8 text-center">
          <Link
            href="/demo-affichage"
            className="inline-flex items-center gap-2 text-[#00A887] hover:text-[#008f72] font-semibold text-sm sm:text-base transition-colors group"
          >
            <ExternalLink className="w-4 h-4" />
            Voir la démo en direct
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </FadeIn>
      </section>

      {/* ──────── 3. BENEFITS GRID ──────── */}
      <section className="mb-20 sm:mb-28">
        <FadeIn className="text-center mb-10 sm:mb-14">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#0A2540] mb-3">
            Avantages complets
          </h2>
          <p className="text-[#475569] text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Une solution complète qui transforme votre gare en un hub
            d&apos;information moderne et automatisé.
          </p>
        </FadeIn>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5"
        >
          {benefits.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <motion.div
                key={benefit.text}
                variants={cardVariants}
                whileHover={{ y: -4 }}
                className="flex items-start gap-3.5 p-4 sm:p-5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl hover:shadow-md transition-shadow duration-300"
              >
                <div className="shrink-0 w-10 h-10 rounded-lg bg-[#00A887]/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-[#00A887]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[#1A1A1A] text-sm font-medium leading-snug">
                    {benefit.text}
                  </p>
                </div>
                <CheckCircle className="w-5 h-5 text-[#00A887] shrink-0 mt-0.5" />
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* ──────── 4. CTA SECTION ──────── */}
      <section>
        <FadeIn>
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#00A887] to-[#008f72] p-8 sm:p-10 lg:p-14 text-center shadow-[0_12px_48px_rgba(0,168,135,0.25)]">
            {/* Decorative elements */}
            <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full" />
            <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-white/5 rounded-full" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/5 rounded-full blur-3xl" />

            <div className="relative z-10">
              <div className="w-14 h-14 mx-auto mb-5 sm:mb-6 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Monitor className="w-7 h-7 text-white" />
              </div>

              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3 sm:mb-4 leading-tight">
                Équipez votre gare d&apos;écrans intelligents
              </h2>
              <p className="text-white/80 text-base sm:text-lg max-w-xl mx-auto mb-8 sm:mb-10 leading-relaxed">
                Rejoignez les gares qui utilisent déjà SmarticketS pour
                moderniser l&apos;information voyageurs. Installation rapide, support
                7j/7.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
                <a
                  href="https://wa.me/221784858226"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 bg-white text-[#00A887] font-bold text-sm sm:text-base px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl hover:bg-white/90 shadow-lg hover:shadow-xl transition-all duration-300 group"
                >
                  <MessageSquare className="w-5 h-5" />
                  Contacter via WhatsApp
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </a>

                <Link
                  href="/demo-affichage"
                  className="inline-flex items-center gap-2.5 bg-white/15 backdrop-blur-sm text-white font-semibold text-sm sm:text-base px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl border border-white/20 hover:bg-white/25 transition-all duration-300 group"
                >
                  <ExternalLink className="w-4 h-4" />
                  Voir la démo
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </FadeIn>
      </section>
    </SecondaryPageLayout>
  );
}
