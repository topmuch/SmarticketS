// @ts-nocheck
'use client';

import { motion } from 'framer-motion';
import {
  BarChart3,
  Bus,
  Users,
  TrendingUp,
  Building2,
  PieChart,
  FileText,
  Bell,
  Smartphone,
  CheckCircle,
  ArrowRight,
  Clock,
  DollarSign,
  Percent,
  Ticket,
} from 'lucide-react';
import SecondaryPageLayout from '@/components/landing/SecondaryPageLayout';
import FadeIn from '@/components/landing/FadeIn';

/* ─── Data ──────────────────────────────────────────────────────────────── */

const features = [
  {
    title: 'Rapports Automatisés',
    description:
      'Rapports quotidiens, hebdomadaires et mensuels générés automatiquement. Revenus, nombre de passagers, performance par ligne.',
    icon: BarChart3,
    gradient: 'from-[#FF6B35] to-[#e55a28]',
  },
  {
    title: 'Gestion de Flotte',
    description:
      'Gérez tous vos bus, chauffeurs et itinéraires depuis un seul tableau de bord centralisé.',
    icon: Bus,
    gradient: 'from-[#3B82F6] to-[#2563EB]',
  },
  {
    title: 'Statistiques Live',
    description:
      "Taux de remplissage en temps réel, suivi des revenus et analytiques détaillées par route.",
    icon: TrendingUp,
    gradient: 'from-[#8B5CF6] to-[#7C3AED]',
  },
  {
    title: 'Multi-Agences',
    description:
      'Gérez plusieurs stations et agences à partir d\'un seul compte. Vue consolidée de toutes vos activités.',
    icon: Building2,
    gradient: 'from-[#00A887] to-[#008f72]',
  },
];

const dashboardStats = [
  {
    value: '12',
    label: 'Bus en service',
    icon: Bus,
    accent: '#3B82F6',
  },
  {
    value: '285 000',
    label: 'FCFA revenus/jour',
    icon: DollarSign,
    accent: '#00A887',
  },
  {
    value: '87%',
    label: 'Taux de remplissage',
    icon: Percent,
    accent: '#8B5CF6',
  },
  {
    value: '1 247',
    label: 'Billets vendus',
    icon: Ticket,
    accent: '#FF6B35',
  },
];

const benefits = [
  'Dashboard complet en temps réel',
  'Export CSV et PDF des rapports',
  'Gestion des chauffeurs et affectations',
  'Suivi financier par ligne et par période',
  'Alertes automatiques (bus en retard, remplissage faible)',
  'Application chauffeur intégrée (PWA)',
];

const benefitIcons = [
  PieChart,
  FileText,
  Users,
  BarChart3,
  Bell,
  Smartphone,
];

/* ─── Animations ────────────────────────────────────────────────────────── */

const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12 },
  },
};

const cardVariant = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

const scaleOnHover = {
  rest: { scale: 1 },
  hover: {
    scale: 1.03,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
};

/* ─── Page ──────────────────────────────────────────────────────────────── */

export default function CompagniesPage() {
  return (
    <SecondaryPageLayout
      title="Pour les Compagnies"
      subtitle="Gérez votre flotte, automatisez vos rapports et suivez vos performances en temps réel. SmarticketS est le partenaire technologique de votre compagnie de transport."
    >
      {/* ── Key Features ─────────────────────────────────────────── */}
      <section className="mb-20 sm:mb-28">
        <FadeIn>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#0A2540] text-center mb-3 tracking-tight">
            Tout ce dont vous avez besoin
          </h2>
          <p className="text-[#475569] text-center max-w-xl mx-auto mb-12 sm:mb-16">
            Des outils puissants pour optimiser chaque aspect de votre activité de transport.
          </p>
        </FadeIn>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                variants={cardVariant}
                whileHover="hover"
                initial="rest"
                className={`relative rounded-2xl p-6 sm:p-8 bg-gradient-to-br ${feature.gradient} text-white overflow-hidden shadow-lg`}
              >
                {/* Decorative circles */}
                <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/10" />
                <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-white/5" />

                <div className="relative z-10">
                  <div className="w-12 h-12 bg-white/20 rounded-xl backdrop-blur-sm flex items-center justify-center mb-5">
                    <Icon className="w-6 h-6 text-white" />
                  </div>

                  <h3 className="text-lg sm:text-xl font-bold mb-2 tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="text-white/85 text-sm sm:text-base leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                <motion.div variants={scaleOnHover} />
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* ── Dashboard Preview Mockup ──────────────────────────────── */}
      <section className="mb-20 sm:mb-28">
        <FadeIn>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#0A2540] text-center mb-3 tracking-tight">
            Votre tableau de bord
          </h2>
          <p className="text-[#475569] text-center max-w-xl mx-auto mb-12 sm:mb-16">
            Une vue d&rsquo;ensemble claire et en temps réel de toutes vos opérations.
          </p>
        </FadeIn>

        <FadeIn delay={0.15}>
          <motion.div
            className="rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden"
            style={{ backgroundColor: '#0A2540' }}
            whileHover={{ y: -4 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            {/* Top bar */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#00A887] flex items-center justify-center">
                  <Bus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm sm:text-base">Compagnie Smart Bus</p>
                  <p className="text-white/40 text-xs">Dernière mise à jour : il y a 2 min</p>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5">
                <Clock className="w-3.5 h-3.5 text-white/60" />
                <span className="text-white/60 text-xs font-medium">Aujourd&rsquo;hui</span>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {dashboardStats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className="bg-white/[0.07] backdrop-blur-sm rounded-xl p-4 sm:p-5 border border-white/[0.08] hover:bg-white/[0.12] transition-colors duration-300"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${stat.accent}20` }}
                      >
                        <Icon className="w-4 h-4" style={{ color: stat.accent }} />
                      </div>
                    </div>
                    <p className="text-white text-xl sm:text-2xl font-bold tracking-tight leading-none mb-1.5">
                      {stat.value}
                    </p>
                    <p className="text-white/50 text-xs sm:text-sm">{stat.label}</p>
                  </div>
                );
              })}
            </div>

            {/* Mini bar chart decoration */}
            <div className="mt-6 bg-white/[0.05] rounded-xl p-4 border border-white/[0.06]">
              <div className="flex items-center justify-between mb-3">
                <p className="text-white/70 text-xs font-medium">Revenus hebdomadaires</p>
                <p className="text-[#00A887] text-xs font-semibold">+12.5%</p>
              </div>
              <div className="flex items-end gap-1.5 h-12">
                {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm bg-gradient-to-t from-[#00A887] to-[#00A887]/40"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
              <div className="flex justify-between mt-1.5">
                {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day) => (
                  <span key={day} className="text-white/30 text-[10px] flex-1 text-center">
                    {day}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        </FadeIn>
      </section>

      {/* ── Benefits Grid ─────────────────────────────────────────── */}
      <section className="mb-20 sm:mb-28">
        <FadeIn>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#0A2540] text-center mb-3 tracking-tight">
            Pourquoi choisir SmarticketS
          </h2>
          <p className="text-[#475569] text-center max-w-xl mx-auto mb-12 sm:mb-16">
            Une suite complète d&rsquo;avantages conçus pour les compagnies de transport modernes.
          </p>
        </FadeIn>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          {benefits.map((benefit, index) => {
            const Icon = benefitIcons[index];
            return (
              <motion.div
                key={benefit}
                variants={cardVariant}
                whileHover={{ y: -4, transition: { duration: 0.25 } }}
                className="flex items-start gap-4 p-5 sm:p-6 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-300"
              >
                <div className="shrink-0 w-11 h-11 rounded-xl bg-[#00A887]/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-[#00A887]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-[#00A887] shrink-0 mt-0.5" />
                    <p className="text-[#1A1A1A] text-sm sm:text-base font-medium leading-snug">
                      {benefit}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* ── CTA Section ────────────────────────────────────────────── */}
      <section>
        <FadeIn>
          <motion.div
            className="relative rounded-2xl sm:rounded-3xl overflow-hidden p-8 sm:p-12 md:p-16 text-center shadow-xl"
            style={{
              background: 'linear-gradient(135deg, #00A887 0%, #008f72 50%, #006B56 100%)',
            }}
            whileHover={{ scale: 1.01 }}
            transition={{ duration: 0.35 }}
          >
            {/* Decorative elements */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
              <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full bg-white/5" />
              <div className="absolute -bottom-16 -right-16 w-48 h-48 rounded-full bg-white/5" />
              <div className="absolute top-1/2 left-1/4 w-24 h-24 rounded-full bg-white/[0.03]" />
            </div>

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-1.5 mb-6">
                <Bus className="w-4 h-4 text-white" />
                <span className="text-white/90 text-xs font-medium">SmarticketS Compagnies</span>
              </div>

              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight leading-tight">
                Pilotez votre compagnie en toute sérénité
              </h2>
              <p className="text-white/80 max-w-lg mx-auto mb-8 sm:mb-10 text-sm sm:text-base leading-relaxed">
                Rejoignez les compagnies qui font confiance à SmarticketS pour moderniser leur gestion. Démarrez dès aujourd&rsquo;hui et transformez votre activité.
              </p>

              <a
                href="https://wa.me/221784858226"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 bg-white text-[#0A2540] font-semibold text-sm sm:text-base px-7 sm:px-8 py-3.5 sm:py-4 rounded-xl shadow-lg hover:shadow-xl hover:bg-white/95 transition-all duration-300 group"
              >
                Contactez-nous sur WhatsApp
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
              </a>
            </div>
          </motion.div>
        </FadeIn>
      </section>
    </SecondaryPageLayout>
  );
}
