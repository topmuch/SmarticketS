'use client';

import { motion } from 'framer-motion';
import SecondaryPageLayout from '@/components/landing/SecondaryPageLayout';

const features = [
  {
    emoji: '📱',
    title: 'Activation QR Express',
    description:
      'Scan instantané, formulaire digital, mise en route en 30 secondes. Zéro papier.',
    bg: 'bg-[#00a885]',
    hoverShadow: 'hover:shadow-[0_8px_32px_rgba(0,168,133,0.35)]',
  },
  {
    emoji: '💬',
    title: 'Notifications WhatsApp',
    description:
      'Expéditeur et destinataire informés à chaque étape via WhatsApp.',
    bg: 'bg-[#25D366]',
    hoverShadow: 'hover:shadow-[0_8px_32px_rgba(37,211,102,0.35)]',
  },
  {
    emoji: '🔐',
    title: 'Code PIN de Retrait',
    description:
      'Validation à 6 chiffres exigée à la livraison. Anti-fraude intégrée.',
    bg: 'bg-[#8a2be2]',
    hoverShadow: 'hover:shadow-[0_8px_32px_rgba(138,43,226,0.35)]',
  },
  {
    emoji: '📍',
    title: 'Suivi GPS',
    description:
      'Position du colis en temps réel. Historique des scans horodatés.',
    bg: 'bg-[#3B82F6]',
    hoverShadow: 'hover:shadow-[0_8px_32px_rgba(59,130,246,0.35)]',
  },
  {
    emoji: '📊',
    title: 'Dashboard Agence',
    description:
      'Flotte, chauffeurs, statuts, export CSV. Pilotage complet.',
    bg: 'bg-[#ff8c00]',
    hoverShadow: 'hover:shadow-[0_8px_32px_rgba(255,140,0,0.35)]',
  },
  {
    emoji: '📴',
    title: 'Mode Hors-ligne',
    description:
      'Activation et scan possibles sans réseau. Synchronisation automatique.',
    bg: 'bg-[#6366F1]',
    hoverShadow: 'hover:shadow-[0_8px_32px_rgba(99,102,241,0.35)]',
  },
];

const steps = [
  {
    number: 1,
    title: 'Scan du QR Code',
    description: 'Le chauffeur scanne le QR code du colis',
    color: '#FF6B35',
  },
  {
    number: 2,
    title: 'Activation du colis',
    description: 'Formulaire pré-rempli, validation en un clic',
    color: '#10B981',
  },
  {
    number: 3,
    title: 'Notification automatique',
    description: 'WhatsApp envoyé au client et propriétaire',
    color: '#3B82F6',
  },
  {
    number: 4,
    title: 'Livraison sécurisée',
    description: 'Code PIN validé, colis remis au destinataire',
    color: '#8a2be2',
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
};

export default function FonctionnalitesPage() {
  return (
    <SecondaryPageLayout
      title="Fonctionnalités"
      subtitle="Découvrez toutes les fonctionnalités de la plateforme SmarticketS pour la traçabilité logistique"
    >
      {/* Feature Cards Section */}
      <motion.section
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
        className="mb-20 sm:mb-28"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10 sm:mb-14"
        >
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#0A2540] mb-3">
            Tout ce dont vous avez besoin
          </h2>
          <p className="text-[#475569] text-base sm:text-lg max-w-2xl mx-auto">
            Une suite complète d&apos;outils pour sécuriser et tracer chaque colis, de
            l&apos;expédition à la livraison.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={cardVariants}
              className={`${feature.bg} rounded-2xl overflow-hidden shadow-[0_4px_24px_rgba(10,37,64,0.08)] hover:translate-y-[-4px] ${feature.hoverShadow} transition-all duration-300 border border-white/20`}
            >
              <div className="p-6 sm:p-7">
                <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm text-2xl mb-4">
                  {feature.emoji}
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2 leading-snug">
                  {feature.title}
                </h3>
                <p className="text-white/80 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Comment ça marche Section */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.6 }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10 sm:mb-14"
        >
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#0A2540] mb-3">
            Comment ça marche
          </h2>
          <p className="text-[#475569] text-base sm:text-lg max-w-2xl mx-auto">
            Un processus simple en 4 étapes pour tracer et sécuriser vos colis.
          </p>
        </motion.div>

        {/* Timeline */}
        <div className="relative">
          {/* Horizontal line (desktop) */}
          <div className="hidden sm:block absolute top-8 left-[12.5%] right-[12.5%] h-0.5 bg-[#E2E8F0]" />

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-8 sm:gap-4">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                className="flex flex-col items-center text-center"
              >
                {/* Numbered circle */}
                <div
                  className="relative z-10 w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg mb-4 shrink-0"
                  style={{ backgroundColor: step.color }}
                >
                  {step.number}
                </div>

                {/* Content card */}
                <div className="bg-[#F8FAFC] rounded-xl p-5 border border-[#E2E8F0] w-full">
                  <h3 className="font-bold text-[#0A2540] text-sm sm:text-base mb-1.5">
                    {step.title}
                  </h3>
                  <p className="text-[#475569] text-xs sm:text-sm leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>
    </SecondaryPageLayout>
  );
}
