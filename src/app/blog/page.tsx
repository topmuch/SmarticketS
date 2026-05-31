'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Calendar, ArrowRight, Mail, Send, BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import SecondaryPageLayout from '@/components/landing/SecondaryPageLayout';

const articles = [
  {
    title: 'Sécuriser vos colis : 5 bonnes pratiques',
    category: 'Sécurité',
    badgeColor: 'bg-[#10B981] text-white',
    barColor: '#00a885',
    date: '15 Mai 2026',
    excerpt:
      'Découvrez comment les codes QR et la traçabilité numérique réduisent les pertes et les litiges lors du transport inter-villes au Sénégal.',
    href: '/blog/securiser-colis',
  },
  {
    title: "Optimiser vos tournées de livraison avec la technologie",
    category: 'Productivité',
    badgeColor: 'bg-[#FF6B35] text-white',
    barColor: '#FF6B35',
    date: '10 Mai 2026',
    excerpt:
      'La bonne gestion des itinéraires et le suivi en temps réel permettent aux chauffeurs et agences de gagner du temps et d\'améliorer leur rentabilité.',
    href: '/blog/optimiser-tournees',
  },
  {
    title: 'Réglementation du transport de marchandises au Sénégal',
    category: 'Conformité',
    badgeColor: 'bg-[#0A2540] text-white',
    barColor: '#0A2540',
    date: '5 Mai 2026',
    excerpt:
      'Un guide complet sur les obligations légales, les documents requis et les normes à respecter pour le transport inter-villes.',
    href: '/blog/reglementation-transport',
  },
  {
    title: 'Comment SmarticketS réduit les pertes de colis de 90%',
    category: 'Actu',
    badgeColor: 'bg-[#8a2be2] text-white',
    barColor: '#8a2be2',
    date: '28 Avril 2026',
    excerpt:
      'Étude de cas sur l\'impact de la traçabilité QR code sur les pertes de colis dans le réseau de transport Dakar-Saint-Louis.',
    href: '/blog/smartickets-reduit-pertes',
  },
  {
    title: 'Guide complet : Première activation de colis',
    category: 'Tutoriel',
    badgeColor: 'bg-[#3B82F6] text-white',
    barColor: '#3B82F6',
    date: '20 Avril 2026',
    excerpt:
      'Pas à pas pour activer votre premier colis sur SmarticketS, du scan du QR code à la notification WhatsApp.',
    href: '/blog/premiere-activation',
  },
  {
    title: 'Le futur de la logistique au Sénégal',
    category: 'Actu',
    badgeColor: 'bg-[#ff8c00] text-white',
    barColor: '#ff8c00',
    date: '15 Avril 2026',
    excerpt:
      'Comment la digitalisation transforme le secteur du transport inter-villes au Sénégal et en Afrique de l\'Ouest.',
    href: '/blog/futur-logistique',
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

export default function BlogPage() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail('');
    }
  };

  return (
    <SecondaryPageLayout
      title="Blog & Ressources"
      subtitle="Bonnes pratiques, conseils et actualités du transport logistique au Sénégal"
    >
      {/* Articles Grid */}
      <motion.section
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="mb-16"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article) => (
            <motion.div key={article.title} variants={cardVariants}>
              <Link href={article.href} className="block group">
                <article className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 h-full flex flex-col">
                  {/* Colored top bar */}
                  <div
                    className="h-1 w-full"
                    style={{ backgroundColor: article.barColor }}
                  />

                  <div className="p-6 flex flex-col flex-1">
                    {/* Badge + Date */}
                    <div className="flex items-center justify-between mb-3">
                      <Badge
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${article.badgeColor}`}
                      >
                        {article.category}
                      </Badge>
                      <span className="flex items-center gap-1.5 text-xs text-[#94A3B8]">
                        <Calendar className="w-3.5 h-3.5" />
                        {article.date}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-bold text-[#0A2540] mb-2 leading-snug group-hover:text-[#FF6B35] transition-colors">
                      {article.title}
                    </h3>

                    {/* Excerpt */}
                    <p className="text-sm text-[#475569] leading-relaxed mb-4 flex-1 line-clamp-3">
                      {article.excerpt}
                    </p>

                    {/* Read more */}
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#FF6B35] group-hover:gap-2.5 transition-all">
                      Lire la suite
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </article>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Newsletter CTA */}
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
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[#FF6B35]/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-[#10B981]/10 blur-3xl" />

          <div className="relative z-10 max-w-xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#FF6B35]/15 mb-5">
              <Mail className="w-7 h-7 text-[#FF6B35]" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3 tracking-tight">
              Restez informé
            </h2>
            <p className="text-[#94A3B8] text-sm sm:text-base mb-8 leading-relaxed">
              Recevez nos derniers articles et conseils directement dans votre boîte mail.
            </p>

            {subscribed ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center justify-center gap-3 bg-[#10B981]/15 rounded-xl p-4 border border-[#10B981]/30"
              >
                <BookOpen className="w-5 h-5 text-[#10B981]" />
                <span className="text-[#10B981] font-semibold text-sm">
                  Merci ! Vous êtes maintenant abonné à notre newsletter.
                </span>
              </motion.div>
            ) : (
              <form
                onSubmit={handleSubscribe}
                className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
              >
                <div className="relative flex-1">
                  <Input
                    type="email"
                    placeholder="Votre adresse email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full h-12 pl-4 pr-4 rounded-xl bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-[#FF6B35] focus:ring-2 focus:ring-[#FF6B35]/20 text-sm"
                  />
                </div>
                <Button
                  type="submit"
                  className="h-12 px-6 bg-[#FF6B35] hover:bg-[#e65a28] text-white font-semibold text-sm rounded-xl shadow-[0_4px_12px_rgba(255,107,53,0.3)] hover:shadow-[0_6px_16px_rgba(255,107,53,0.4)] transition-all"
                >
                  <Send className="w-4 h-4 mr-2" />
                  S&apos;abonner
                </Button>
              </form>
            )}

            <p className="text-[#64748B] text-xs mt-4">
              Pas de spam. Désabonnement en un clic.
            </p>
          </div>
        </div>
      </motion.section>
    </SecondaryPageLayout>
  );
}
