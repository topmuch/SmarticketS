'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  MessageCircle,
  Mail,
  Phone,
  MapPinned,
  ArrowRight,
  ChevronRight,
  HelpCircle,
  Headphones,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import SecondaryPageLayout from '@/components/landing/SecondaryPageLayout';

const supportChannels = [
  {
    icon: MessageCircle,
    title: 'WhatsApp',
    description: 'Chat en direct 7j/7',
    detail: 'Réponse instantanée',
    buttonText: 'Ouvrir WhatsApp',
    href: 'https://wa.me/221784858226',
    color: '#25D366',
    external: true,
  },
  {
    icon: Mail,
    title: 'Email',
    description: 'contact@smartickets.com',
    detail: 'Réponse sous 24h',
    buttonText: "Envoyer un email",
    href: 'mailto:contact@smartickets.com',
    color: '#FF6B35',
    external: false,
  },
  {
    icon: Phone,
    title: 'Téléphone',
    description: '+221 78 485 82 26',
    detail: 'Lun-Ven 8h-18h',
    buttonText: 'Appeler',
    href: 'tel:+221784858226',
    color: '#3B82F6',
    external: false,
  },
  {
    icon: MapPinned,
    title: 'Bureau',
    description: 'Cité Alia Diène, Ouest Foire, Yoff',
    detail: 'Sur rendez-vous',
    buttonText: 'Nous trouver',
    href: '#',
    color: '#0A2540',
    external: false,
  },
];

const faqItems = [
  {
    question: 'Comment activer un colis ?',
    answer:
      'Scannez le QR code ou saisissez la référence sur SmarticketS, puis suivez les étapes pour enregistrer votre colis et activer la protection.',
  },
  {
    question: "Je n'ai pas reçu mon code PIN",
    answer:
      'Vérifiez votre numéro WhatsApp et assurez-vous que le numéro est correct. Si le problème persiste, contactez-nous via le chat WhatsApp.',
  },
  {
    question: 'Comment suivre mon colis ?',
    answer:
      'Entrez votre référence dans la barre de recherche de la page suivi, ou scannez le QR code pour voir le statut en temps réel.',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: 'easeOut' },
  },
};

export default function SupportPage() {
  return (
    <SecondaryPageLayout
      title="Support & Aide"
      subtitle="Notre équipe est disponible pour vous aider à chaque étape"
    >
      {/* Support Channels Grid */}
      <motion.section
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="mb-16"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {supportChannels.map((channel) => (
            <motion.div key={channel.title} variants={cardVariants}>
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 h-full flex flex-col hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                {/* Icon */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                  style={{ backgroundColor: `${channel.color}12` }}
                >
                  <channel.icon className="w-6 h-6" style={{ color: channel.color }} />
                </div>

                {/* Content */}
                <h3 className="text-lg font-bold text-[#0A2540] mb-1">
                  {channel.title}
                </h3>
                <p className="text-sm text-[#0A2540] font-medium mb-1">
                  {channel.description}
                </p>
                <p className="text-xs text-[#94A3B8] mb-5">{channel.detail}</p>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Button */}
                <a
                  href={channel.href}
                  target={channel.external ? '_blank' : undefined}
                  rel={channel.external ? 'noopener noreferrer' : undefined}
                >
                  <Button
                    className="w-full font-semibold text-sm rounded-lg transition-all"
                    style={{
                      backgroundColor: channel.color,
                      color: '#ffffff',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.opacity = '0.9';
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.opacity = '1';
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                    }}
                  >
                    {channel.buttonText}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* FAQ Preview */}
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="mb-16"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-[#FF6B35]/10 flex items-center justify-center">
            <HelpCircle className="w-5 h-5 text-[#FF6B35]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#0A2540]">
              Questions fréquentes
            </h2>
            <p className="text-sm text-[#94A3B8]">
              Les réponses aux questions les plus courantes
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {faqItems.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.06 }}
              className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-5 hover:border-[#FF6B35]/30 transition-colors"
            >
              <h3 className="text-sm font-bold text-[#0A2540] mb-2">
                {faq.question}
              </h3>
              <p className="text-sm text-[#475569] leading-relaxed">
                {faq.answer}
              </p>
            </motion.div>
          ))}
        </div>

        <div className="mt-5 text-center">
          <Link
            href="/faq"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#FF6B35] hover:gap-2.5 transition-all"
          >
            Voir plus de questions
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </motion.section>

      {/* CTA Section */}
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div
          className="rounded-2xl p-8 sm:p-10 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #0A2540 0%, #122d4f 50%, #1a3a5c 100%)',
          }}
        >
          {/* Decorative elements */}
          <div className="absolute top-0 left-0 w-64 h-64 rounded-full bg-[#FF6B35]/10 blur-3xl" />
          <div className="absolute bottom-0 right-0 w-48 h-48 rounded-full bg-[#10B981]/10 blur-3xl" />

          <div className="relative z-10 max-w-lg mx-auto text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#FF6B35]/15 mb-5">
              <Headphones className="w-7 h-7 text-[#FF6B35]" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3 tracking-tight">
              Vous ne trouvez pas la réponse ?
            </h2>
            <p className="text-[#94A3B8] text-sm sm:text-base mb-8 leading-relaxed">
              Notre équipe de support est disponible pour vous accompagner. N&apos;hésitez pas à nous contacter.
            </p>

            <Link href="/contact">
              <Button
                size="lg"
                className="bg-[#FF6B35] hover:bg-[#e65a28] text-white font-semibold text-sm rounded-xl px-8 shadow-[0_4px_12px_rgba(255,107,53,0.3)] hover:shadow-[0_6px_16px_rgba(255,107,53,0.4)] transition-all"
              >
                Contacter notre équipe
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </motion.section>
    </SecondaryPageLayout>
  );
}
