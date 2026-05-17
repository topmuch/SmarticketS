'use client';

import FadeIn from './FadeIn';

const services = [
  {
    emoji: '📱',
    title: 'Activation QR Express',
    description:
      'Scan, formulaire digital, mise en route en 30s. Zéro papier.',
    bg: 'bg-[#00a885]',
    hoverShadow: 'hover:shadow-[0_8px_32px_rgba(0,168,133,0.35)]',
  },
  {
    emoji: '💬',
    title: 'Notifications WhatsApp Automatisées',
    description:
      "Expéditeur & destinataire informés à chaque étape via wa.me.",
    bg: 'bg-[#25D366]',
    hoverShadow: 'hover:shadow-[0_8px_32px_rgba(37,211,102,0.35)]',
  },
  {
    emoji: '🔐',
    title: 'Code PIN de Retrait Sécurisé',
    description:
      'Validation à 6 chiffres exigée à la livraison. Anti-fraude intégrée.',
    bg: 'bg-[#8a2be2]',
    hoverShadow: 'hover:shadow-[0_8px_32px_rgba(138,43,226,0.35)]',
  },
  {
    emoji: '📍',
    title: 'Suivi GPS & Géolocalisation',
    description:
      'Position du colis en temps réel. Historique des scans horodatés.',
    bg: 'bg-[#3B82F6]',
    hoverShadow: 'hover:shadow-[0_8px_32px_rgba(59,130,246,0.35)]',
  },
  {
    emoji: '📊',
    title: 'Dashboard Agence Temps Réel',
    description:
      'Flotte, chauffeurs, statuts, export CSV. Pilotage complet.',
    bg: 'bg-[#ff8c00]',
    hoverShadow: 'hover:shadow-[0_8px_32px_rgba(255,140,0,0.35)]',
  },
  {
    emoji: '📴',
    title: 'Mode Hors-Ligne Intelligent',
    description:
      'Activation & scan possibles sans réseau. Synchronisation automatique.',
    bg: 'bg-[#6366F1]',
    hoverShadow: 'hover:shadow-[0_8px_32px_rgba(99,102,241,0.35)]',
  },
];

export default function ServicesSection() {
  return (
    <section id="services" className="bg-white py-16 sm:py-24 lg:py-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Section title */}
        <FadeIn className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#0A2540] mb-5 tracking-tight leading-tight">
            Solutions de traçabilité &amp; sécurité logistique
          </h2>
        </FadeIn>

        {/* 3x2 grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {services.map((service, i) => (
            <FadeIn key={service.title} delay={i * 0.08}>
              <div className={`group h-full ${service.bg} rounded-xl p-7 lg:p-8 shadow-[0_4px_24px_rgba(10,37,64,0.08)] hover:translate-y-[-4px] ${service.hoverShadow} transition-all duration-300 border border-white/20`}>
                <span className="text-3xl mb-5 block w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  {service.emoji}
                </span>
                <h3 className="text-lg font-bold text-white mb-3 leading-snug">
                  {service.title}
                </h3>
                <p className="text-sm text-white/85 leading-relaxed">
                  {service.description}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
