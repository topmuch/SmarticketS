'use client';

import FadeIn from './FadeIn';

const services = [
  {
    emoji: '📱',
    title: 'Activation QR Express',
    description:
      'Scan, formulaire digital, mise en route en 30s. Zéro papier.',
    bg: 'bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100/60',
    border: 'border-orange-200/70',
    iconBg: 'bg-orange-100',
    hoverShadow: 'hover:shadow-[0_8px_32px_rgba(255,107,53,0.15)]',
  },
  {
    emoji: '💬',
    title: 'Notifications WhatsApp Automatisées',
    description:
      "Expéditeur & destinataire informés à chaque étape via wa.me.",
    bg: 'bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100/60',
    border: 'border-emerald-200/70',
    iconBg: 'bg-emerald-100',
    hoverShadow: 'hover:shadow-[0_8px_32px_rgba(16,185,129,0.15)]',
  },
  {
    emoji: '🔐',
    title: 'Code PIN de Retrait Sécurisé',
    description:
      'Validation à 6 chiffres exigée à la livraison. Anti-fraude intégrée.',
    bg: 'bg-gradient-to-br from-violet-50 via-purple-50 to-violet-100/60',
    border: 'border-violet-200/70',
    iconBg: 'bg-violet-100',
    hoverShadow: 'hover:shadow-[0_8px_32px_rgba(139,92,246,0.15)]',
  },
  {
    emoji: '📍',
    title: 'Suivi GPS & Géolocalisation',
    description:
      'Position du colis en temps réel. Historique des scans horodatés.',
    bg: 'bg-gradient-to-br from-sky-50 via-cyan-50 to-sky-100/60',
    border: 'border-sky-200/70',
    iconBg: 'bg-sky-100',
    hoverShadow: 'hover:shadow-[0_8px_32px_rgba(14,165,233,0.15)]',
  },
  {
    emoji: '📊',
    title: 'Dashboard Agence Temps Réel',
    description:
      'Flotte, chauffeurs, statuts, export CSV. Pilotage complet.',
    bg: 'bg-gradient-to-br from-rose-50 via-pink-50 to-rose-100/60',
    border: 'border-rose-200/70',
    iconBg: 'bg-rose-100',
    hoverShadow: 'hover:shadow-[0_8px_32px_rgba(244,63,94,0.15)]',
  },
  {
    emoji: '📴',
    title: 'Mode Hors-Ligne Intelligent',
    description:
      'Activation & scan possibles sans réseau. Synchronisation automatique.',
    bg: 'bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100/60',
    border: 'border-slate-300/60',
    iconBg: 'bg-slate-100',
    hoverShadow: 'hover:shadow-[0_8px_32px_rgba(100,116,139,0.15)]',
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
              <div className={`group h-full ${service.bg} border ${service.border} rounded-xl p-7 lg:p-8 shadow-[0_4px_24px_rgba(10,37,64,0.04)] hover:translate-y-[-4px] ${service.hoverShadow} transition-all duration-300`}>
                <span className={`text-3xl mb-5 block w-14 h-14 ${service.iconBg} rounded-xl flex items-center justify-center`}>
                  {service.emoji}
                </span>
                <h3 className="text-lg font-bold text-[#0A2540] mb-3 leading-snug">
                  {service.title}
                </h3>
                <p className="text-sm text-[#475569] leading-relaxed">
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
