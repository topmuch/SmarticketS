'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircleQuestion,
  HelpCircle,
  Smartphone,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';
import SecondaryPageLayout from '@/components/landing/SecondaryPageLayout';

interface FAQ {
  question: string;
  answer: string;
}

interface FAQCategory {
  title: string;
  icon: React.ElementType;
  color: string;
  questions: FAQ[];
}

const faqCategories: FAQCategory[] = [
  {
    title: 'Général',
    icon: HelpCircle,
    color: '#0A2540',
    questions: [
      {
        question: "Qu'est-ce que SmarticketS ?",
        answer:
          "SmarticketS est une plateforme de traçabilité et de sécurité logistique pour le transport inter-villes au Sénégal. Elle permet d'activer, tracer et sécuriser les colis grâce à des QR codes, des notifications WhatsApp automatiques et des codes PIN de retrait.",
      },
      {
        question: 'Comment fonctionne SmarticketS ?',
        answer:
          "Le chauffeur scanne le QR code du colis, active l'expédition via un formulaire digital, un code PIN est généré et envoyé au destinataire par WhatsApp. À l'arrivée, le destinataire saisit le PIN pour récupérer son colis.",
      },
      {
        question: 'SmarticketS est-il gratuit ?',
        answer:
          "L'inscription est gratuite pour les agences. Les tarifs dépendent du volume de colis et du forfait choisi. Contactez-nous pour un devis personnalisé.",
      },
    ],
  },
  {
    title: 'Utilisation',
    icon: Smartphone,
    color: '#FF6B35',
    questions: [
      {
        question: 'Comment activer un colis ?',
        answer:
          "Scannez le QR code avec votre smartphone ou saisissez la référence sur le site SmarticketS. Remplissez le formulaire d'activation (expéditeur, destinataire, itinéraire) et validez.",
      },
      {
        question: "Que faire si je n'ai pas de réseau ?",
        answer:
          "SmarticketS dispose d'un mode hors-ligne. Activez et scannez vos colis sans connexion internet. La synchronisation se fait automatiquement dès que le réseau revient.",
      },
      {
        question: 'Comment suivre mon colis ?',
        answer:
          "Entrez votre référence colis (ex: TRSP-2026-0042) dans la barre de recherche de la page d'accueil. Vous verrez le statut en temps réel et l'historique des scans.",
      },
    ],
  },
  {
    title: 'Sécurité',
    icon: ShieldCheck,
    color: '#10B981',
    questions: [
      {
        question: 'Comment fonctionne le code PIN ?',
        answer:
          "Un code PIN à 6 chiffres est automatiquement généré lors de l'activation. Il est envoyé au destinataire par WhatsApp. Ce code est obligatoire pour la remise du colis.",
      },
      {
        question: 'Mes données sont-elles protégées ?',
        answer:
          'Oui, toutes les données sont chiffrées et hébergées de manière sécurisée. SmarticketS est conforme au RGPD.',
      },
    ],
  },
];

function FAQItem({ question, answer }: FAQ) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-[#E2E8F0] rounded-xl overflow-hidden hover:shadow-md transition-shadow duration-300">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-4 p-5 sm:p-6 text-left bg-white hover:bg-slate-50/50 transition-colors duration-200"
        aria-expanded={isOpen}
      >
        <span className="text-base sm:text-lg font-medium text-[#0A2540] leading-snug">
          {question}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="flex-shrink-0"
        >
          <ChevronDown className="w-5 h-5 text-[#475569]" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-0">
              <div className="border-t border-[#E2E8F0] pt-4">
                <p className="text-[#475569] leading-relaxed text-sm sm:text-base">
                  {answer}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

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

export default function FAQPage() {
  return (
    <SecondaryPageLayout
      title="Questions Fréquentes"
      subtitle="Trouvez rapidement les réponses à vos questions sur SmarticketS"
    >
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-12"
      >
        {/* Header stats */}
        <motion.div
          variants={itemVariants}
          className="flex flex-wrap items-center justify-center gap-6 sm:gap-8"
        >
          <div className="flex items-center gap-2 text-sm text-[#475569]">
            <MessageCircleQuestion className="w-4 h-4 text-[#FF6B35]" />
            <span>
              <strong className="text-[#0A2540]">
                {faqCategories.reduce((acc, c) => acc + c.questions.length, 0)}
              </strong>{' '}
              questions
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-[#475569]">
            <HelpCircle className="w-4 h-4 text-[#FF6B35]" />
            <span>
              <strong className="text-[#0A2540]">
                {faqCategories.length}
              </strong>{' '}
              catégories
            </span>
          </div>
        </motion.div>

        {/* FAQ Categories */}
        {faqCategories.map((category) => {
          const CategoryIcon = category.icon;
          return (
            <motion.section key={category.title} variants={itemVariants}>
              <div className="flex items-center gap-3 mb-6">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${category.color}15` }}
                >
                  <CategoryIcon
                    className="w-5 h-5"
                    style={{ color: category.color }}
                  />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#0A2540]">
                  {category.title}
                </h2>
                <span className="hidden sm:inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold text-[#475569] bg-slate-100">
                  {category.questions.length} questions
                </span>
              </div>

              <div className="space-y-3">
                {category.questions.map((faq) => (
                  <FAQItem
                    key={faq.question}
                    question={faq.question}
                    answer={faq.answer}
                  />
                ))}
              </div>
            </motion.section>
          );
        })}

        {/* CTA */}
        <motion.div
          variants={itemVariants}
          className="bg-gradient-to-br from-[#0A2540] to-[#0A2540]/90 rounded-2xl p-6 sm:p-8 text-center"
        >
          <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
            Vous n&apos;avez pas trouvé votre réponse ?
          </h3>
          <p className="text-white/70 mb-6 max-w-lg mx-auto">
            Notre équipe est disponible pour répondre à toutes vos questions et
            vous accompagner dans l&apos;utilisation de SmarticketS.
          </p>
          <a
            href="/contact"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#FF6B35] text-white font-semibold text-sm hover:bg-[#e55a28] transition-colors shadow-[0_4px_12px_rgba(255,107,53,0.3)]"
          >
            Contactez-nous
          </a>
        </motion.div>
      </motion.div>
    </SecondaryPageLayout>
  );
}
