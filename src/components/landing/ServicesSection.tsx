'use client';

import Image from 'next/image';
import FadeIn from './FadeIn';

const services = [
  {
    title: 'Activation QR Express',
    description:
      'Scan, formulaire digital, mise en route en 30s. Zéro papier.',
    image: '/images/service-qr-activation.png',
    bg: 'bg-[#00a885]',
    hoverShadow: 'hover:shadow-[0_8px_32px_rgba(0,168,133,0.35)]',
  },
  {
    title: 'Notifications WhatsApp Automatisées',
    description:
      "Expéditeur & destinataire informés à chaque étape via wa.me.",
    image: '/images/service-whatsapp-v2.png',
    bg: 'bg-[#25D366]',
    hoverShadow: 'hover:shadow-[0_8px_32px_rgba(37,211,102,0.35)]',
  },
  {
    title: 'Code PIN de Retrait Sécurisé',
    description:
      'Validation à 6 chiffres exigée à la livraison. Anti-fraude intégrée.',
    image: '/images/service-pin-secure.png',
    bg: 'bg-[#8a2be2]',
    hoverShadow: 'hover:shadow-[0_8px_32px_rgba(138,43,226,0.35)]',
  },
  {
    title: 'Suivi GPS & Géolocalisation',
    description:
      'Position du colis en temps réel. Historique des scans horodatés.',
    image: '/images/service-gps-tracking.png',
    bg: 'bg-[#3B82F6]',
    hoverShadow: 'hover:shadow-[0_8px_32px_rgba(59,130,246,0.35)]',
  },
  {
    title: 'Dashboard Agence Temps Réel',
    description:
      'Flotte, chauffeurs, statuts, export CSV. Pilotage complet.',
    image: '/images/service-dashboard-v2.png',
    bg: 'bg-[#ff8c00]',
    hoverShadow: 'hover:shadow-[0_8px_32px_rgba(255,140,0,0.35)]',
  },
  {
    title: 'Mode Hors-ligne Intelligent',
    description:
      'Activation & scan possibles sans réseau. Synchronisation automatique.',
    image: '/images/service-offline-mode.png',
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
              <div
                className={`group h-full ${service.bg} rounded-2xl overflow-hidden shadow-[0_4px_24px_rgba(10,37,64,0.08)] hover:translate-y-[-4px] ${service.hoverShadow} transition-all duration-300 border border-white/20 flex flex-col`}
              >
                {/* Image container */}
                <div className="relative w-full aspect-[4/3] overflow-hidden">
                  <Image
                    src={service.image}
                    alt={service.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  {/* Gradient overlay at bottom of image */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                </div>

                {/* Text content */}
                <div className="p-6 lg:p-7 flex-1 flex flex-col">
                  <h3 className="text-lg font-bold text-white mb-3 leading-snug">
                    {service.title}
                  </h3>
                  <p className="text-sm text-white/85 leading-relaxed flex-1">
                    {service.description}
                  </p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
