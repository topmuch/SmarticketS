'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Smartphone,
  Building2,
  Package,
  Wrench,
  ChevronRight,
  Zap,
  Users,
  MapPin,
  Code2,
  ExternalLink,
} from 'lucide-react';
import SecondaryPageLayout from '@/components/landing/SecondaryPageLayout';

const categories = [
  {
    icon: Smartphone,
    title: 'Guide Chauffeur',
    description:
      "Apprenez à scanner, activer et livrer des colis avec l'application SmarticketS.",
    link: '#',
    color: '#FF6B35',
    bgColor: 'bg-orange-50',
  },
  {
    icon: Building2,
    title: 'Guide Agence',
    description:
      'Gérez votre flotte, consultez les statistiques et suivez vos livraisons.',
    link: '#',
    color: '#0A2540',
    bgColor: 'bg-slate-50',
  },
  {
    icon: Package,
    title: 'Guide Activation de Colis',
    description:
      "Processus complet d'activation et de suivi d'un colis SmarticketS.",
    link: '#',
    color: '#10B981',
    bgColor: 'bg-emerald-50',
  },
  {
    icon: Wrench,
    title: 'Guide Résolution de Problèmes',
    description:
      'Solutions aux problèmes courants : scan échoué, PIN non reçu, etc.',
    link: '#',
    color: '#FF6B35',
    bgColor: 'bg-orange-50',
  },
];

const quickSteps = [
  {
    step: 1,
    title: 'Créez votre compte agence',
    description:
      'Inscrivez-vous gratuitement sur SmarticketS et recevez vos identifiants.',
    icon: Users,
  },
  {
    step: 2,
    title: 'Configurez vos chauffeurs',
    description:
      'Ajoutez vos chauffeurs à votre flotte pour leur attribuer des tournées.',
    icon: Zap,
  },
  {
    step: 3,
    title: 'Commencez à tracer',
    description:
      'Scannez, activez et suivez vos colis en temps réel.',
    icon: MapPin,
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
};

export default function DocumentationPage() {
  return (
    <SecondaryPageLayout
      title="Documentation"
      subtitle="Guides complets pour utiliser toutes les fonctionnalités de SmarticketS"
    >
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-16"
      >
        {/* Documentation Categories */}
        <section>
          <motion.div variants={itemVariants} className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#0A2540]">
              Catégories
            </h2>
            <p className="text-[#475569] mt-2">
              Choisissez le guide adapté à votre besoin
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <motion.div key={cat.title} variants={itemVariants}>
                  <Link
                    href={cat.link}
                    className="block group bg-white border border-[#E2E8F0] rounded-xl p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                      style={{ backgroundColor: `${cat.color}15` }}
                    >
                      <Icon
                        className="w-6 h-6"
                        style={{ color: cat.color }}
                      />
                    </div>
                    <h3 className="text-lg font-semibold text-[#0A2540] mb-2 group-hover:text-[#FF6B35] transition-colors">
                      {cat.title}
                    </h3>
                    <p className="text-sm text-[#475569] leading-relaxed mb-4">
                      {cat.description}
                    </p>
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#FF6B35]">
                      Lire la doc
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Quick Start */}
        <section>
          <motion.div variants={itemVariants} className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-[#FF6B35]/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-[#FF6B35]" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#0A2540]">
                Démarrage rapide
              </h2>
            </div>
            <p className="text-[#475569] mt-2">
              Prêt en 3 étapes simples
            </p>
          </motion.div>

          <div className="space-y-4">
            {quickSteps.map((item, index) => {
              const StepIcon = item.icon;
              return (
                <motion.div
                  key={item.step}
                  variants={itemVariants}
                  className="flex items-start gap-4 sm:gap-6 bg-white border border-[#E2E8F0] rounded-xl p-5 sm:p-6 hover:shadow-md transition-shadow duration-300"
                >
                  <div className="flex-shrink-0">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#0A2540] flex items-center justify-center text-white font-bold text-base sm:text-lg shadow-[0_4px_12px_rgba(10,37,64,0.2)]">
                      {item.step}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <StepIcon className="w-4 h-4 text-[#FF6B35] flex-shrink-0" />
                      <h3 className="text-base sm:text-lg font-semibold text-[#0A2540]">
                        {item.title}
                      </h3>
                    </div>
                    <p className="text-sm text-[#475569] leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                  {index < quickSteps.length - 1 && (
                    <div className="hidden sm:flex flex-col items-center justify-center pt-10 pr-2">
                      <div className="w-px h-8 bg-[#E2E8F0]" />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* API Reference */}
        <section>
          <motion.div variants={itemVariants} className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-[#10B981]/10 flex items-center justify-center">
                <Code2 className="w-5 h-5 text-[#10B981]" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#0A2540]">
                API Reference
              </h2>
            </div>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="bg-gradient-to-br from-[#0A2540] to-[#0A2540]/90 rounded-2xl p-6 sm:p-8 text-white"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                <Code2 className="w-6 h-6 text-[#10B981]" />
              </div>
              <div className="flex-1">
                <span className="inline-block px-3 py-1 rounded-full bg-[#10B981]/20 text-[#10B981] text-xs font-semibold mb-3">
                  Bientôt disponible
                </span>
                <h3 className="text-xl sm:text-2xl font-bold mb-2">
                  API disponible bientôt
                </h3>
                <p className="text-white/70 leading-relaxed mb-6">
                  Contactez-nous pour en savoir plus sur notre API RESTful et
                  les possibilités d&apos;intégration avec vos systèmes existants.
                </p>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#FF6B35] text-white font-semibold text-sm hover:bg-[#e55a28] transition-colors shadow-[0_4px_12px_rgba(255,107,53,0.3)]"
                >
                  Contactez-nous
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </motion.div>
        </section>
      </motion.div>
    </SecondaryPageLayout>
  );
}
