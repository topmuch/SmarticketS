'use client';

import { motion } from 'framer-motion';
import SecondaryPageLayout from '@/components/landing/SecondaryPageLayout';
import FadeIn from '@/components/landing/FadeIn';
import {
  Package,
  QrCode,
  MapPin,
  Shield,
  Bell,
  Truck,
  CheckCircle,
  Lock,
  Smartphone,
  MessageCircle,
  ArrowRight,
  Send,
  ScanLine,
  Radio,
  Network,
  Route,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const features = [
  {
    icon: Send,
    title: 'Envoi Simplifié',
    description:
      "Déposez votre colis dans n'importe quelle station partenaire. Scannez le QR code et c'est parti !",
    gradient: 'from-[#25D366] to-[#128C7E]',
  },
  {
    icon: QrCode,
    title: 'QR Code Unique',
    description:
      "Chaque colis reçoit un QR code unique garantissant un suivi inviolable de bout en bout.",
    gradient: 'from-[#3B82F6] to-[#2563EB]',
  },
  {
    icon: Radio,
    title: 'Traçabilité Totale',
    description:
      "Suivez votre colis en temps réel, du départ jusqu'à la livraison, sur notre plateforme.",
    gradient: 'from-[#8B5CF6] to-[#7C3AED]',
  },
  {
    icon: Bell,
    title: 'Alertes WhatsApp',
    description:
      "Expéditeur et destinataire sont notifiés à chaque étape : expédié, en transit, arrivé, livré.",
    gradient: 'from-[#FF6B35] to-[#e55a28]',
  },
];

const steps = [
  {
    icon: MapPin,
    title: 'Déposez votre colis',
    description: "Rendez-vous dans n'importe quelle station partenaire ou bus de notre réseau.",
    color: '#25D366',
  },
  {
    icon: ScanLine,
    title: 'Scan & Activation',
    description: "Le chauffeur scanne le QR code de votre colis et l'active dans le système.",
    color: '#3B82F6',
  },
  {
    icon: Lock,
    title: 'Code PIN Sécurisé',
    description: 'Un code PIN à 6 chiffres est généré automatiquement pour le destinataire.',
    color: '#8B5CF6',
  },
  {
    icon: Smartphone,
    title: 'Suivi en Temps Réel',
    description: 'Suivez votre colis via WhatsApp et notre plateforme en temps réel.',
    color: '#FF6B35',
  },
  {
    icon: Shield,
    title: 'Livraison Sécurisée',
    description: 'Le destinataire présente son code PIN pour réceptionner le colis en toute sécurité.',
    color: '#00A887',
  },
];

const benefits = [
  {
    icon: Lock,
    text: 'Protection anti-fraude (PIN code)',
  },
  {
    icon: MapPin,
    text: 'Suivi GPS en temps réel',
  },
  {
    icon: MessageCircle,
    text: 'Notifications automatiques WhatsApp',
  },
  {
    icon: CheckCircle,
    text: 'Preuve de livraison numérique',
  },
  {
    icon: Network,
    text: 'Compatible tous réseaux (Orange, Wave, Free)',
  },
  {
    icon: Route,
    text: 'Service colis disponible sur toutes les lignes',
  },
];

/* ------------------------------------------------------------------ */
/*  Animation Variants                                                 */
/* ------------------------------------------------------------------ */

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.5, ease: 'easeOut' },
  }),
};

const stepVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: i * 0.18, duration: 0.45, ease: 'easeOut' },
  }),
};

const benefitVariants = {
  hidden: { opacity: 0, x: -30 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.1, duration: 0.4, ease: 'easeOut' },
  }),
};

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function ExpediteursPage() {
  return (
    <SecondaryPageLayout
      title="Pour les Expéditeurs"
      subtitle="Envoyez vos colis en toute sécurité grâce au QR code unique et au suivi par WhatsApp. Simple, rapide et fiable."
    >
      {/* ---------------------------------------------------------- */}
      {/*  Key Features Section                                        */}
      {/* ---------------------------------------------------------- */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <FadeIn>
          <h2
            className="text-2xl sm:text-3xl font-bold text-center mb-4"
            style={{ color: '#0A2540' }}
          >
            Fonctionnalités Clés
          </h2>
          <p className="text-center mb-12" style={{ color: '#475569' }}>
            Tout ce dont vous avez besoin pour expédier vos colis en toute confiance.
          </p>
        </FadeIn>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feat, i) => (
            <motion.div
              key={feat.title}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={cardVariants}
              whileHover={{ y: -6, scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className={`bg-gradient-to-br ${feat.gradient} rounded-2xl p-6 text-white flex flex-col gap-4 shadow-lg cursor-default`}
            >
              <div className="w-12 h-12 bg-white/20 rounded-xl backdrop-blur-sm flex items-center justify-center">
                <feat.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold">{feat.title}</h3>
              <p className="text-sm leading-relaxed text-white/90">{feat.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------- */}
      {/*  How It Works — Timeline                                     */}
      {/* ---------------------------------------------------------- */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <FadeIn>
          <h2
            className="text-2xl sm:text-3xl font-bold text-center mb-4"
            style={{ color: '#0A2540' }}
          >
            Comment ça Marche
          </h2>
          <p className="text-center mb-14" style={{ color: '#475569' }}>
            En 5 étapes simples, votre colis est en route.
          </p>
        </FadeIn>

        <div className="relative">
          {/* Vertical gradient connector line (desktop only) */}
          <div
            className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-0.5 -translate-x-1/2 rounded-full"
            style={{
              background:
                'linear-gradient(to bottom, #25D366, #3B82F6, #8B5CF6, #FF6B35, #00A887)',
            }}
          />

          <div className="flex flex-col gap-12 lg:gap-16">
            {steps.map((step, i) => {
              const isEven = i % 2 === 0;

              return (
                <motion.div
                  key={step.title}
                  custom={i}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.3 }}
                  variants={stepVariants}
                  className={`flex flex-col lg:flex-row items-center gap-6 ${
                    isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'
                  }`}
                >
                  {/* Text content */}
                  <div
                    className={`flex-1 ${
                      isEven ? 'lg:text-right' : 'lg:text-left'
                    } text-center`}
                  >
                    <h3
                      className="text-lg font-semibold mb-1"
                      style={{ color: '#0A2540' }}
                    >
                      Étape {i + 1} : {step.title}
                    </h3>
                    <p className="text-sm leading-relaxed" style={{ color: '#475569' }}>
                      {step.description}
                    </p>
                  </div>

                  {/* Colored circle node */}
                  <div className="relative z-10 flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center shadow-lg border-4 border-white">
                    <div
                      className="w-full h-full rounded-full flex items-center justify-center"
                      style={{ backgroundColor: step.color }}
                    >
                      <step.icon className="w-6 h-6 text-white" />
                    </div>
                  </div>

                  {/* Spacer for the opposite side */}
                  <div className="flex-1 hidden lg:block" />
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- */}
      {/*  Benefits Grid                                               */}
      {/* ---------------------------------------------------------- */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <FadeIn>
          <h2
            className="text-2xl sm:text-3xl font-bold text-center mb-4"
            style={{ color: '#0A2540' }}
          >
            Pourquoi Choisir SmarticketS ?
          </h2>
          <p className="text-center mb-12" style={{ color: '#475569' }}>
            Des avantages concrets pour chaque expédition.
          </p>
        </FadeIn>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {benefits.map((b, i) => (
            <motion.div
              key={b.text}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={benefitVariants}
              whileHover={{
                scale: 1.03,
                boxShadow: '0 8px 30px rgba(0,168,135,.12)',
              }}
              className="flex items-start gap-3 rounded-xl border bg-white p-5 transition-shadow"
              style={{ borderColor: '#e2e8f0' }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'rgba(0,168,135,.1)' }}
              >
                <b.icon className="w-5 h-5" style={{ color: '#00A887' }} />
              </div>
              <span className="text-sm font-medium" style={{ color: '#1A1A1A' }}>
                {b.text}
              </span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------- */}
      {/*  CTA Section                                                 */}
      {/* ---------------------------------------------------------- */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="relative overflow-hidden rounded-2xl p-8 sm:p-12 text-center text-white shadow-xl"
          style={{
            background: 'linear-gradient(135deg, #00A887 0%, #128C7E 100%)',
          }}
        >
          {/* Decorative blurred circles */}
          <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />

          <div className="relative z-10">
            <FadeIn>
              <div className="w-16 h-16 mx-auto mb-6 bg-white/20 rounded-2xl backdrop-blur-sm flex items-center justify-center">
                <Package className="w-8 h-8 text-white" />
              </div>
            </FadeIn>

            <h2 className="text-2xl sm:text-3xl font-bold mb-3">
              Envoyez vos colis en toute sécurité
            </h2>
            <p className="max-w-xl mx-auto mb-8 text-white/90 text-sm sm:text-base leading-relaxed">
              Rejoignez des milliers d&apos;expéditeurs qui font confiance à SmarticketS
              pour l&apos;envoi de leurs colis à travers le Sénégal. Commencez dès
              maintenant !
            </p>

            <a
              href="https://wa.me/221784858226"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white font-semibold rounded-xl px-8 py-3.5 text-sm sm:text-base shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105"
              style={{ color: '#00A887' }}
            >
              <MessageCircle className="w-5 h-5" />
              Envoyer via WhatsApp
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </motion.div>
      </section>
    </SecondaryPageLayout>
  );
}
