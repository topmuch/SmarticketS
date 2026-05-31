'use client'

import { motion } from 'framer-motion'

interface Article {
  title: string
  badge: string
  excerpt: string
  href: string
  bg: string
  hoverShadow: string
  iconBg: string
}

const articles: Article[] = [
  {
    title: 'Sécuriser vos colis : 5 bonnes pratiques pour le transport inter-villes',
    badge: 'Sécurité',
    excerpt:
      'Découvrez comment les codes QR et la traçabilité numérique réduisent les pertes et les litiges lors du transport de marchandises entre villes au Sénégal.',
    href: '#',
    bg: 'bg-[#00a885]',
    hoverShadow: 'hover:shadow-[0_8px_32px_rgba(0,168,133,0.35)]',
    iconBg: 'bg-white/20',
  },
  {
    title: 'Optimiser vos tournées de livraison avec la technologie',
    badge: 'Productivité',
    excerpt:
      "La bonne gestion des itinéraires et le suivi en temps réel permettent aux chauffeurs et agences de gagner du temps et d'améliorer leur rentabilité.",
    href: '#',
    bg: 'bg-[#FF6B35]',
    hoverShadow: 'hover:shadow-[0_8px_32px_rgba(255,107,53,0.35)]',
    iconBg: 'bg-white/20',
  },
  {
    title: 'Réglementation du transport de marchandises au Sénégal',
    badge: 'Conformité',
    excerpt:
      'Un guide complet sur les obligations légales, les documents requis et les normes à respecter pour le transport inter-villes de marchandises.',
    href: '#',
    bg: 'bg-[#0A2540]',
    hoverShadow: 'hover:shadow-[0_8px_32px_rgba(10,37,64,0.35)]',
    iconBg: 'bg-white/20',
  },
]

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
    },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
}

export default function BlogSection() {
  return (
    <section className="py-16 sm:py-24 lg:py-32 bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Title */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12 sm:mb-16"
        >
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#0A2540]">
            Ressources &amp; Bonnes Pratiques Logistiques
          </h2>
        </motion.div>

        {/* Articles Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8"
        >
          {articles.map((article) => (
            <motion.a
              key={article.title}
              variants={cardVariants}
              href={article.href}
              className={`group block ${article.bg} rounded-2xl overflow-hidden shadow-[0_4px_24px_rgba(10,37,64,0.08)] hover:translate-y-[-4px] ${article.hoverShadow} transition-all duration-300 border border-white/20`}
            >
              <div className="p-7 sm:p-8">
                {/* Badge */}
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${article.iconBg} backdrop-blur-sm text-white mb-5`}
                >
                  {article.badge === 'Sécurité' && '🔒'}
                  {article.badge === 'Productivité' && '⚡'}
                  {article.badge === 'Conformité' && '📋'}
                  {article.badge}
                </span>

                {/* Title */}
                <h3 className="text-lg sm:text-xl font-bold text-white mb-3 group-hover:text-white/95 transition-colors line-clamp-2 leading-snug">
                  {article.title}
                </h3>

                {/* Excerpt */}
                <p className="text-white/80 text-sm leading-relaxed mb-5 line-clamp-3">
                  {article.excerpt}
                </p>

                {/* Read Link */}
                <span className="inline-flex items-center text-sm font-semibold text-white group-hover:gap-3 transition-all duration-200">
                  Lire
                  <span className="ml-1 group-hover:ml-2 transition-all duration-200">&rarr;</span>
                </span>
              </div>
            </motion.a>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
