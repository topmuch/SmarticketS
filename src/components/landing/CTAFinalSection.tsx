'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

export default function CTAFinalSection() {
  return (
    <section className="py-16 sm:py-24 lg:py-32 bg-gradient-to-br from-[#0A2540] to-[#1A3A52] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto"
        >
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-6">
            Prêt à sécuriser et tracer vos expéditions ?
          </h2>
          <p className="text-white/80 text-base sm:text-lg mb-10 leading-relaxed">
            Rejoignez les agences et chauffeurs qui ont modernisé leur logistique avec SmarticketS.
          </p>

          {/* Dual CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/devenir-partenaire"
              className="inline-flex items-center justify-center px-6 py-3 sm:px-8 sm:py-4 bg-[#FF6B35] hover:bg-[#e85d2a] text-white font-semibold rounded-lg shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all duration-200 text-sm sm:text-base w-full sm:w-auto"
            >
              🚀 Commencer gratuitement
            </Link>
            <a
              href="https://wa.me/221784858226?text=Bonjour%20SmarticketS%2C%20je%20souhaite%20en%20savoir%20plus"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-6 py-3 sm:px-8 sm:py-4 border-2 border-white/30 hover:border-white/60 text-white font-semibold rounded-lg transition-all duration-200 text-sm sm:text-base w-full sm:w-auto"
            >
              📞 Contacter un expert
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
