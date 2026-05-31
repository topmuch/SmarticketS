'use client';

import { motion } from 'framer-motion';
import { Shield, Lock, MapPin, Award, CheckCircle2 } from 'lucide-react';
import SecondaryPageLayout from '@/components/landing/SecondaryPageLayout';

const pillars = [
  {
    icon: Lock,
    title: 'Chiffrement des données',
    description:
      "Toutes les données sont chiffrées de bout en bout. Les codes PIN sont générés aléatoirement et ne sont jamais stockés en clair.",
    color: '#FF6B35',
    bgLight: 'bg-orange-50',
    border: 'border-orange-100',
  },
  {
    icon: Shield,
    title: 'Validation PIN anti-fraude',
    description:
      'Le code PIN à 6 chiffres est requis pour la remise du colis. Aucune livraison sans validation.',
    color: '#10B981',
    bgLight: 'bg-emerald-50',
    border: 'border-emerald-100',
  },
  {
    icon: MapPin,
    title: 'Traçabilité GPS continue',
    description:
      'Chaque scan est horodaté et géolocalisé. Historique complet consultable en temps réel.',
    color: '#3B82F6',
    bgLight: 'bg-blue-50',
    border: 'border-blue-100',
  },
];

const certifications = [
  {
    label: 'RGPD Conforme',
    icon: Shield,
  },
  {
    label: 'Données hébergées en France',
    icon: Award,
  },
  {
    label: 'SSL 256 bits',
    icon: Lock,
  },
  {
    label: 'Audit de sécurité annuel',
    icon: CheckCircle2,
  },
];

const stats = [
  { value: '0', unit: '', label: 'colis perdus avec PIN validé' },
  { value: '98%', unit: '', label: 'taux de livraison réussie' },
  { value: '10 000+', unit: '', label: 'colis protégés' },
  { value: '500+', unit: '', label: 'agences partenaires' },
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

export default function SecuritePage() {
  return (
    <SecondaryPageLayout
      title="Sécurité & Protection"
      subtitle="Comment SmarticketS protège vos colis à chaque étape du transport inter-villes"
    >
      {/* Security Pillars */}
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
            3 piliers de sécurité
          </h2>
          <p className="text-[#475569] text-base sm:text-lg max-w-2xl mx-auto">
            Votre colis est protégé par un système de sécurité multi-couches à
            chaque étape du transport.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-6">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <motion.div
                key={pillar.title}
                variants={cardVariants}
                className={`${pillar.bgLight} ${pillar.border} border rounded-2xl p-6 sm:p-7 hover:translate-y-[-4px] transition-all duration-300 shadow-sm hover:shadow-md`}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${pillar.color}15` }}
                >
                  <Icon
                    className="w-6 h-6"
                    style={{ color: pillar.color }}
                  />
                </div>
                <h3 className="text-lg font-bold text-[#0A2540] mb-2 leading-snug">
                  {pillar.title}
                </h3>
                <p className="text-[#475569] text-sm leading-relaxed">
                  {pillar.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </motion.section>

      {/* Certifications */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.6 }}
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
            Nos certifications
          </h2>
          <p className="text-[#475569] text-base sm:text-lg max-w-2xl mx-auto">
            SmarticketS respecte les normes les plus strictes en matière de
            protection des données.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-5"
        >
          {certifications.map((cert) => {
            const Icon = cert.icon;
            return (
              <motion.div
                key={cert.label}
                variants={cardVariants}
                className="flex flex-col items-center text-center p-5 sm:p-6 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] hover:shadow-md hover:translate-y-[-2px] transition-all duration-300"
              >
                <div className="w-11 h-11 rounded-full bg-[#0A2540] flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-[#FF6B35]" />
                </div>
                <p className="text-sm font-semibold text-[#0A2540] leading-snug">
                  {cert.label}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </motion.section>

      {/* Stats */}
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
            La confiance en chiffres
          </h2>
        </motion.div>

        <div className="bg-[#0A2540] rounded-2xl p-8 sm:p-10 shadow-[0_8px_32px_rgba(10,37,64,0.15)]">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8"
          >
            {stats.map((stat) => (
              <motion.div
                key={stat.label}
                variants={cardVariants}
                className="text-center"
              >
                <p className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#FF6B35] mb-2">
                  {stat.value}
                </p>
                <p className="text-white/70 text-xs sm:text-sm leading-relaxed">
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.section>
    </SecondaryPageLayout>
  );
}
