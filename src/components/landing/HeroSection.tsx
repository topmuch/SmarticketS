'use client';

import { useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Search, ArrowRight, Truck, Building2 } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';
import FadeIn from './FadeIn';

export default function HeroSection() {
  const router = useRouter();
  const [refValue, setRefValue] = useState('');
  const [isValid, setIsValid] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.5], [0, -60]);

  const pattern = useMemo(() => /^[A-Z]{2,4}\d{2}-[A-Z0-9]{4,8}$/, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setRefValue(val);
    setIsValid(pattern.test(val));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid) router.push(`/activate/${refValue}`);
  };

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex items-center overflow-hidden"
    >
      {/* Full-width background image 16:9 */}
      <div className="absolute inset-0">
        <Image
          src="/images/hero-bus-smartickets.jpg"
          alt="Bus de transport inter-villes SmarticketS avec billets et colis QR code"
          fill
          priority
          className="object-cover object-center"
        />
        {/* Dark gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A2540]/80 via-[#0A2540]/60 to-[#0A2540]/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A2540]/70 via-transparent to-[#0A2540]/30" />
      </div>

      {/* Text content overlaid on image */}
      <motion.div
        className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-28 pb-20 text-center"
        style={{ opacity: heroOpacity, y: heroY }}
      >
        {/* Badge */}
        <FadeIn>
          <div className="inline-flex items-center gap-2 mb-8 px-5 py-2.5 bg-white/15 backdrop-blur-md border border-white/25 rounded-full">
            <span className="text-sm font-medium text-white tracking-wide">
              🇸🇳 Billets + Colis — Gestion complète pour le transport inter-villes
            </span>
          </div>
        </FadeIn>

        {/* H1 */}
        <FadeIn delay={0.1}>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white mb-6 leading-[1.08] tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.3)]">
            Billets & Colis,
            <br />
            simplifiés par la technologie{' '}
            <span className="text-[#FF6B35] drop-shadow-[0_2px_8px_rgba(255,107,53,0.4)]">QR</span>
          </h1>
        </FadeIn>

        {/* Subtitle */}
        <FadeIn delay={0.2}>
          <p className="text-lg sm:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed drop-shadow-[0_1px_6px_rgba(0,0,0,0.25)]">
            Vendez des billets, expédiez des colis et suivez tout en temps réel.
            Notifications WhatsApp, validation billets, code PIN de retrait sécurisé.
          </p>
        </FadeIn>

        {/* Tracking bar */}
        <FadeIn delay={0.3}>
          <form onSubmit={handleSubmit} className="mt-10 max-w-xl mx-auto">
            <div className="flex items-center bg-white rounded-2xl border-2 border-white/40 shadow-[0_8px_40px_rgba(0,0,0,0.25)] focus-within:border-[#FF6B35] focus-within:shadow-[0_12px_48px_rgba(0,0,0,0.3)] transition-all duration-300 overflow-hidden">
              <div className="relative flex-1 flex items-center">
                <Search className="absolute left-4 w-5 h-5 text-[#64748B]" />
                <input
                  type="text"
                  value={refValue}
                  onChange={handleChange}
                  placeholder="Entrez votre réf. billet ou colis (ex: DKR-2026-0042)"
                  className="w-full pl-12 pr-4 py-5 text-base font-semibold bg-transparent text-[#0A2540] placeholder:text-[#94A3B8] focus:outline-none"
                  maxLength={16}
                />
              </div>
              <button
                type="submit"
                disabled={!isValid}
                className="flex items-center gap-2 px-7 py-5 font-bold text-sm bg-[#FF6B35] hover:bg-[#e65a28] text-white shadow-[0_4px_16px_rgba(255,107,53,0.4)] hover:shadow-[0_6px_20px_rgba(255,107,53,0.5)] transition-all duration-300 disabled:cursor-not-allowed"
              >
                Suivre
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </FadeIn>

        {/* Dual CTA */}
        <FadeIn delay={0.4}>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link href="/inscrire">
                <Button className="w-full sm:w-auto bg-[#FF6B35] hover:bg-[#e65a28] text-white px-7 py-3.5 rounded-lg font-semibold text-sm shadow-[0_4px_16px_rgba(0,0,0,0.2)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.25)] transition-all gap-2">
                  <Truck className="w-4 h-4" />
                  Espace Chauffeur
                </Button>
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link href="/agence/connexion">
                <Button className="w-full sm:w-auto bg-white/15 hover:bg-white/25 backdrop-blur-md border-2 border-white/40 text-white px-7 py-3.5 rounded-lg font-semibold text-sm transition-all gap-2">
                  <Building2 className="w-4 h-4" />
                  Espace Transporteur
                </Button>
              </Link>
            </motion.div>
          </div>
        </FadeIn>

        {/* Trust row */}
        <FadeIn delay={0.5}>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 mt-12">
            {[
              '✅ Billets & Colis unifiés',
              '✅ 500+ transporteurs certifiés',
              '✅ 98% de trajets sans incident',
            ].map((badge) => (
              <span
                key={badge}
                className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-white/85 drop-shadow-[0_1px_4px_rgba(0,0,0,0.2)]"
              >
                {badge}
              </span>
            ))}
          </div>
        </FadeIn>
      </motion.div>

      {/* Bottom gradient fade to white */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none z-10" />
    </section>
  );
}
