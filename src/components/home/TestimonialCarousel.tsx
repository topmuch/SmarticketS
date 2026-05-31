'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface Testimonial {
  name: string;
  role: string;
  content: string;
  initials: string;
  rating: number;
}

const testimonials: Testimonial[] = [
  {
    name: 'Moussa D.',
    role: 'Chauffeur indépendant Dakar-Ziguinchor',
    content: "Depuis que j'utilise SmarticketS, mes clients ne m'appellent plus toutes les 2 heures pour savoir où est leur colis. Le WhatsApp automatique change tout.",
    initials: 'MD',
    rating: 5,
  },
  {
    name: 'Fatou K.',
    role: 'Agence Salam Transport',
    content: "On gérait 200 colis par jour avec des fichiers Excel. Maintenant, tout est sur le dashboard SmarticketS : on sait exactement où est chaque colis.",
    initials: 'FK',
    rating: 5,
  },
  {
    name: 'Ibrahima S.',
    role: 'Gérant, Trans Express Saint-Louis',
    content: "L'export CSV nous fait gagner des heures en comptabilité. Et le fait que les chauffeurs n'aient pas besoin d'installer une application, c'est le top.",
    initials: 'IS',
    rating: 5,
  },
  {
    name: 'Aminata B.',
    role: 'Expéditrice régulière Dakar-Thiès',
    content: "Je reçois mon lien WhatsApp dès que le colis part. Je peux suivre chaque étape en temps réel. Je recommande SmarticketS à tout le monde.",
    initials: 'AB',
    rating: 5,
  },
  {
    name: 'Ousmane N.',
    role: 'Chauffeur, Ndiaga Ndiaye',
    content: "Même sans connexion internet sur la route, j'arrive à activer mes colis. La synchronisation se fait toute seule quand je retrouve le réseau.",
    initials: 'ON',
    rating: 5,
  },
];

export default function TestimonialCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [visibleCount, setVisibleCount] = useState(1);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  // Detect screen size on mount
  useEffect(() => {
  const updateCount = () => setVisibleCount(window.innerWidth >= 1024 ? 3 : 1);
    updateCount();
    window.addEventListener('resize', updateCount);
    return () => window.removeEventListener('resize', updateCount);
  }, []);

  const goTo = useCallback((index: number) => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentIndex(index);
    setTimeout(() => setIsAnimating(false), 400);
  }, [isAnimating]);

  const next = useCallback(() => {
    goTo((currentIndex + 1) % testimonials.length);
  }, [currentIndex, goTo]);

  const prev = useCallback(() => {
    goTo((currentIndex - 1 + testimonials.length) % testimonials.length);
  }, [currentIndex, goTo]);

  // Auto-play
  useEffect(() => {
    if (isPaused) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      next();
    }, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [next, isPaused]);

  const visibleTestimonials = testimonials.slice(currentIndex, currentIndex + visibleCount).map((t, i) =>
    testimonials[(currentIndex + i) % testimonials.length]
  );

  return (
    <section className="py-20 lg:py-28 px-4" style={{ background: '#F8FAFC' }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          <span className="inline-block px-4 py-1.5 bg-[#D4AF37]/10 text-[#D4AF37] text-xs font-bold tracking-[0.15em] uppercase rounded-full mb-4">
            TÉMOIGNAGES
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-5 tracking-tight">
            Ils transportent avec SmarticketS
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto">
            Des chauffeurs et agences qui nous font confiance chaque jour.
          </p>
        </div>

        {/* Cards */}
        <div
          className="grid gap-6"
          style={{ gridTemplateColumns: `repeat(${visibleCount}, 1fr)` }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {visibleTestimonials.map((t, i) => (
            <div
              key={`${t.name}-${currentIndex + i}`}
              className={`bg-white rounded-2xl p-7 lg:p-8 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/60 transition-all duration-400 ${
                isAnimating ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
              }`}
              style={{
                transition: i === 0 ? 'all 0.4s ease' : `all 0.4s ease ${i * 80}ms`,
                borderLeft: `4px solid ${i === 0 ? '#FF6B35' : i === 1 ? '#0077B6' : '#25D366'}`,
              }}
            >
              {/* Stars */}
              <div className="flex gap-0.5 mb-4">
                {[...Array(t.rating)].map((_, j) => (
                  <svg key={j} className="w-4 h-4 text-[#FFD23F] fill-[#FFD23F]" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              {/* Quote */}
              <div className="relative mb-6">
                <span className="absolute -top-1 -left-1 text-5xl font-serif text-slate-200 leading-none select-none">&ldquo;</span>
                <p className="text-slate-700 leading-relaxed text-sm pl-6 italic">
                  {t.content}
                </p>
              </div>

              {/* Author */}
              <div className="flex items-center gap-3 pl-6">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg ${
                  i === 0
                    ? 'bg-gradient-to-br from-[#FF6B35] to-[#e65a28]'
                    : i === 1
                    ? 'bg-gradient-to-br from-[#0077B6] to-[#005f8a]'
                    : 'bg-gradient-to-br from-[#25D366] to-[#1fb855]'
                }`}>
                  {t.initials}
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm">{t.name}</p>
                  <p className="text-xs text-slate-500">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Navigation dots + arrows */}
        <div className="flex items-center justify-center gap-4 mt-10">
          <button
            onClick={prev}
            className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
            aria-label="Précédent"
          >
            <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="flex gap-2">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  i === currentIndex
                    ? 'bg-[#FF6B35] w-6'
                    : 'bg-slate-300 hover:bg-slate-400'
                }`}
                aria-label={`Témoignage ${i + 1}`}
              />
            ))}
          </div>

          <button
            onClick={next}
            className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
            aria-label="Suivant"
          >
            <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
