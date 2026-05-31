'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Star } from 'lucide-react'

interface Testimonial {
  quote: string
  name: string
  initials: string
  role: string
  city: string
  gradient: string
}

const testimonials: Testimonial[] = [
  {
    quote:
      'Avant, je passais 2h/jour à confirmer les livraisons par téléphone. Avec SmarticketS, un scan et WhatsApp fait le travail. Mes clients sont rassurés.',
    name: 'Moussa D.',
    initials: 'MD',
    role: 'Chauffeur indépendant',
    city: 'Dakar-Ziguinchor',
    gradient: 'from-orange-400 to-orange-600',
  },
  {
    quote:
      "Le dashboard me permet de suivre toute ma flotte en temps réel. Les exports comptables m'ont fait gagner un jour par semaine.",
    name: 'Aminata S.',
    initials: 'AS',
    role: 'Gérante agence',
    city: 'Saint-Louis',
    gradient: 'from-emerald-400 to-emerald-600',
  },
  {
    quote:
      "Le code PIN a éliminé 100% des litiges sur les remises de colis. C'est la sécurité que nos clients attendaient.",
    name: 'Ibrahima N.',
    initials: 'IN',
    role: 'Responsable logistique',
    city: 'Tambacounda',
    gradient: 'from-blue-400 to-blue-600',
  },
  {
    quote:
      "Même sans réseau, j'arrive à activer les colis. La synchronisation se fait toute seule quand je retrouve la couverture.",
    name: 'Ousmane M.',
    initials: 'OM',
    role: 'Chauffeur',
    city: 'Kaolack-Kédougou',
    gradient: 'from-violet-400 to-violet-600',
  },
]

// Mobile: 1 card, Desktop: 2 cards side by side
function getCardsPerView(): number {
  if (typeof window === 'undefined') return 2
  return window.innerWidth >= 768 ? 2 : 1
}

function getMaxIndex(cardsPerView: number): number {
  return Math.max(0, testimonials.length - cardsPerView)
}

export default function TestimonialsSection() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [cardsPerView, setCardsPerView] = useState(() => getCardsPerView())
  const [isPaused, setIsPaused] = useState(false)

  // Update cardsPerView on resize
  useEffect(() => {
    const handleResize = () => {
      const newCardsPerView = getCardsPerView()
      setCardsPerView(newCardsPerView)
      setCurrentIndex((prev) => Math.min(prev, getMaxIndex(newCardsPerView)))
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const maxIndex = getMaxIndex(cardsPerView)

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1))
  }, [maxIndex])

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev <= 0 ? maxIndex : prev - 1))
  }, [maxIndex])

  // Auto-rotate every 5 seconds
  useEffect(() => {
    if (isPaused) return
    const timer = setInterval(goNext, 5000)
    return () => clearInterval(timer)
  }, [isPaused, goNext])

  return (
    <section className="py-16 sm:py-24 lg:py-32 bg-white">
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
            Ils font confiance à SmarticketS pour leur logistique
          </h2>
        </motion.div>

        {/* Carousel */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="relative"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Navigation Arrows */}
          <button
            onClick={goPrev}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 sm:-translate-x-5 z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#0A2540] text-white flex items-center justify-center shadow-lg hover:bg-[#1A3A52] transition-colors"
            aria-label="Témoignage précédent"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={goNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 sm:translate-x-5 z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#0A2540] text-white flex items-center justify-center shadow-lg hover:bg-[#1A3A52] transition-colors"
            aria-label="Témoignage suivant"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Carousel Container */}
          <div className="overflow-hidden mx-8 sm:mx-14">
            <div
              className="flex gap-6 transition-transform duration-500 ease-in-out"
              style={{
                transform: `translateX(-${currentIndex * (100 / cardsPerView + (cardsPerView === 2 ? 1.5 : 0))}%)`,
              }}
            >
              {testimonials.map((t) => (
                <div
                  key={t.name}
                  className="flex-shrink-0"
                  style={{ width: cardsPerView === 2 ? 'calc(50% - 12px)' : '100%' }}
                >
                  <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 sm:p-8 h-full">
                    {/* Stars */}
                    <div className="flex gap-0.5 mb-4">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className="w-4 h-4 sm:w-5 sm:h-5 fill-amber-400 text-amber-400"
                        />
                      ))}
                    </div>
                    {/* Quote */}
                    <p className="text-gray-600 text-sm sm:text-base leading-relaxed italic mb-6">
                      &ldquo;{t.quote}&rdquo;
                    </p>
                    {/* Attribution */}
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br ${t.gradient} flex items-center justify-center text-white font-semibold text-sm sm:text-base`}
                      >
                        {t.initials}
                      </div>
                      <div>
                        <p className="font-semibold text-[#0A2540] text-sm sm:text-base">
                          {t.name}
                        </p>
                        <p className="text-gray-500 text-xs sm:text-sm">
                          {t.role}, {t.city}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dot Indicators */}
          <div className="flex justify-center gap-2 mt-8">
            {Array.from({ length: maxIndex + 1 }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  i === currentIndex
                    ? 'bg-[#FF6B35] w-8'
                    : 'bg-[#E2E8F0] hover:bg-[#CBD5E1]'
                }`}
                aria-label={`Aller au groupe ${i + 1}`}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
