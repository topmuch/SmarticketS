// @ts-nocheck
'use client';

import { motion } from 'framer-motion';
import {
  Smartphone,
  Ticket,
  MapPin,
  Clock,
  CreditCard,
  MessageCircle,
  Shield,
  CheckCircle,
  QrCode,
  Bus,
  ArrowRight,
  Printer,
  Bell,
  Download,
  Users,
  Zap,
} from 'lucide-react';
import SecondaryPageLayout from '@/components/landing/SecondaryPageLayout';
import FadeIn from '@/components/landing/FadeIn';

/* ───────────────────────────── data ───────────────────────────── */

const keyFeatures = [
  {
    title: 'Achat 24/7',
    description:
      "Achetez vos billets à tout moment depuis votre téléphone, sans vous déplacer à la gare. Simple, rapide et disponible 7j/7.",
    icon: Smartphone,
    gradient: 'from-[#00A887] to-[#008f72]',
  },
  {
    title: 'Sans Impression',
    description:
      "Votre téléphone est votre billet. Présentez simplement le code QR pour embarquer. Fini le papier perdu.",
    icon: Ticket,
    gradient: 'from-[#3B82F6] to-[#2563EB]',
  },
  {
    title: 'Suivi Temps Réel',
    description:
      "Suivez votre bus en temps réel et savez exactement quand il arrive. Plus d'attente incertaine à l'arrêt.",
    icon: MapPin,
    gradient: 'from-[#8B5CF6] to-[#7C3AED]',
  },
  {
    title: 'Billet Aller-Retour',
    description:
      "Achetez vos billets aller-retour en un clic. L'activation du retour se fait automatiquement à la date prévue.",
    icon: Clock,
    gradient: 'from-[#FF6B35] to-[#e55a28]',
  },
];

const steps = [
  {
    step: 1,
    title: 'Choisissez votre trajet',
    description:
      "Sélectionnez votre lieu de départ, votre destination, la date et l'heure de votre voyage.",
    icon: MapPin,
    color: '#00A887',
  },
  {
    step: 2,
    title: 'Payez par mobile',
    description:
      'Réglez facilement via Orange Money, Wave ou carte bancaire. Paiement 100 % sécurisé.',
    icon: CreditCard,
    color: '#3B82F6',
  },
  {
    step: 3,
    title: 'Recevez votre billet',
    description:
      'Votre billet avec code QR est envoyé instantanément par SMS et WhatsApp.',
    icon: QrCode,
    color: '#8B5CF6',
  },
  {
    step: 4,
    title: 'Scannez & embarquez',
    description:
      "Présentez le QR code au chauffeur lors de l'embarquement. Validation instantanée.",
    icon: Bus,
    color: '#FF6B35',
  },
];

const benefits = [
  {
    icon: Users,
    title: "Pas de file d'attente",
    description:
      "Achetez en ligne et arrivez directement à l'embarquement. Gagnez du temps à chaque voyage.",
  },
  {
    icon: Shield,
    title: 'Paiement mobile sécurisé',
    description:
      "Vos transactions sont chiffrées et protégées. Orange Money, Wave et CB acceptés.",
  },
  {
    icon: CheckCircle,
    title: 'Siège garanti',
    description:
      "Votre réservation vous garantit une place assise. Plus besoin de vous précipiter.",
  },
  {
    icon: Bell,
    title: 'Notification WhatsApp à chaque étape',
    description:
      "Recevez des rappels avant le départ, des alertes d'embarquement et la confirmation de votre voyage.",
  },
  {
    icon: Zap,
    title: 'Code PIN anti-fraude',
    description:
      "Chaque billet est protégé par un code PIN unique. Sécurité maximale contre la contrefaçon.",
  },
  {
    icon: Download,
    title: 'Reçu numérique téléchargeable',
    description:
      "Téléchargez votre reçu en PDF pour vos notes de frais ou votre comptabilité personnelle.",
  },
];

/* ─────────────────────── animation helpers ─────────────────────── */

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
};

/* ──────────────────────────── page ─────────────────────────────── */

export default function PassagersPage() {
  return (
    <SecondaryPageLayout
      title="Pour les Passagers"
      subtitle="Voyagez plus simplement avec SmarticketS. Achetez, payez et embarquez — tout depuis votre téléphone, sans file d'attente ni impression."
    >
      {/* ════════════ KEY FEATURES ════════════ */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1A1A] mb-4">
                Tout ce dont vous avez besoin
              </h2>
              <p className="text-[#475569] text-lg max-w-2xl mx-auto">
                Des fonctionnalités pensées pour simplifier chaque étape de votre voyage en bus.
              </p>
            </div>
          </FadeIn>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            {keyFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  variants={itemVariants}
                  whileHover={{ y: -6, transition: { duration: 0.25 } }}
                  className={`bg-gradient-to-br ${feature.gradient} rounded-2xl p-6 text-white flex flex-col gap-4 shadow-lg cursor-default`}
                >
                  <div className="w-12 h-12 bg-white/20 rounded-xl backdrop-blur-sm flex items-center justify-center">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                    <p className="text-white/85 text-sm leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ════════════ HOW IT WORKS ════════════ */}
      <section className="py-20 px-4 sm:px-6 bg-gray-50/80">
        <div className="max-w-5xl mx-auto">
          <FadeIn>
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1A1A] mb-4">
                Comment ça marche ?
              </h2>
              <p className="text-[#475569] text-lg max-w-2xl mx-auto">
                En 4 étapes simples, votre billet est dans votre poche.
              </p>
            </div>
          </FadeIn>

          <motion.div
            className="relative"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
          >
            {/* Vertical line (desktop only) */}
            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-200 -translate-x-1/2" />

            {steps.map((s, idx) => {
              const Icon = s.icon;
              const isLeft = idx % 2 === 0;

              return (
                <motion.div
                  key={s.step}
                  variants={itemVariants}
                  className={`relative flex flex-col md:flex-row items-center gap-6 mb-12 last:mb-0 ${
                    isLeft ? 'md:flex-row' : 'md:flex-row-reverse'
                  }`}
                >
                  {/* Content card */}
                  <div
                    className={`flex-1 ${
                      isLeft ? 'md:text-right md:pr-12' : 'md:text-left md:pl-12'
                    }`}
                  >
                    <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 inline-block max-w-md text-left">
                      <div className="flex items-start gap-4">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${s.color}15` }}
                        >
                          <Icon className="w-5 h-5" style={{ color: s.color }} />
                        </div>
                        <div>
                          <span
                            className="text-xs font-bold uppercase tracking-wider"
                            style={{ color: s.color }}
                          >
                            Étape {s.step}
                          </span>
                          <h3 className="text-lg font-semibold text-[#1A1A1A] mt-1 mb-2">
                            {s.title}
                          </h3>
                          <p className="text-[#475569] text-sm leading-relaxed">
                            {s.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Center dot */}
                  <div
                    className="hidden md:flex w-12 h-12 rounded-full items-center justify-center text-white font-bold text-sm shadow-lg z-10 shrink-0"
                    style={{ backgroundColor: s.color }}
                  >
                    {s.step}
                  </div>

                  {/* Spacer for opposite side */}
                  <div className="hidden md:block flex-1" />
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ════════════ BENEFITS GRID ════════════ */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-bold text-[#1A1A1A] mb-4">
                Pourquoi choisir SmarticketS ?
              </h2>
              <p className="text-[#475569] text-lg max-w-2xl mx-auto">
                Des avantages concrets qui transforment votre expérience de voyage.
              </p>
            </div>
          </FadeIn>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
          >
            {benefits.map((b) => {
              const Icon = b.icon;
              return (
                <motion.div
                  key={b.title}
                  variants={itemVariants}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300"
                >
                  <div className="w-11 h-11 rounded-xl bg-[#00A887]/10 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-[#00A887]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2">{b.title}</h3>
                  <p className="text-[#475569] text-sm leading-relaxed">{b.description}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ════════════ CTA SECTION ════════════ */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="bg-gradient-to-br from-[#00A887] to-[#008f72] rounded-3xl p-8 sm:p-12 text-center text-white relative overflow-hidden"
          >
            {/* Decorative circles */}
            <div className="absolute -top-20 -right-20 w-60 h-60 bg-white/5 rounded-full" />
            <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-white/5 rounded-full" />

            <div className="relative z-10">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">
                Prêt à voyager plus simplement ?
              </h2>
              <p className="text-white/85 text-lg max-w-xl mx-auto mb-8">
                Rejoignez des milliers de passagers qui utilisent SmarticketS chaque jour. Commencez
                dès maintenant !
              </p>

              <a
                href="https://wa.me/221784858226"
                target="_blank"
                rel="noopener noreferrer"
              >
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center gap-3 bg-white text-[#00A887] font-semibold text-lg px-8 py-4 rounded-full shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer"
                >
                  <MessageCircle className="w-5 h-5" />
                  Nous contacter sur WhatsApp
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </a>
            </div>
          </motion.div>
        </div>
      </section>
    </SecondaryPageLayout>
  );
}
