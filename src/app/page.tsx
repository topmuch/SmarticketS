'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { motion, useInView } from 'framer-motion';
import {
  Plane,
  Luggage,
  QrCode,
  Smartphone,
  BatteryMedium,
  MapPin,
  MessageCircle,
  CheckCircle,
  Star,
  Menu,
  X,
  Mail,
  ArrowRight,
  Facebook,
  Twitter,
  Instagram,
  Play,
  Lock,
  Bell,
  Zap,
  Users,
  Headphones,
  ChevronRight,
} from "lucide-react";

/* ──────────────────────────────────────────────
   Fade-in wrapper (Framer Motion)
   ────────────────────────────────────────────── */
function FadeIn({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 32 }}
      transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ══════════════════════════════════════════════
   NAVIGATION
   ══════════════════════════════════════════════ */
function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { label: 'Solutions', href: '/#solutions' },
    { label: 'Comment ça marche', href: '/#comment' },
    { label: 'Tarifs', href: '/#tarifs' },
    { label: 'Contact', href: '/contact' },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-xl shadow-sm' : 'bg-white'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-18">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md shadow-orange-500/20">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">QRBag</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map(link => (
              <a key={link.href} href={link.href} className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors duration-200">
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/demo">
              <Button variant="ghost" className="text-slate-600 hover:text-slate-900 text-sm font-medium gap-1.5">
                <Play className="w-3.5 h-3.5" />
                Démo
              </Button>
            </Link>
            <Link href="/agence/connexion">
              <Button variant="ghost" className="text-slate-500 hover:text-slate-900 text-sm font-medium border border-slate-200 hover:border-slate-300">
                Espace Agence
              </Button>
            </Link>
            <Link href="/devenir-partenaire">
              <Button className="bg-orange-500 hover:bg-orange-600 text-white font-medium text-sm shadow-md shadow-orange-500/25 rounded-full px-5">
                Devenir Partenaire
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-slate-700 p-1"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Menu"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-slate-100">
            <div className="flex flex-col gap-3">
              {navLinks.map(link => (
                <a key={link.href} href={link.href} className="text-slate-600 hover:text-slate-900 font-medium py-2" onClick={() => setIsOpen(false)}>
                  {link.label}
                </a>
              ))}
              <hr className="border-slate-100" />
              <Link href="/demo" onClick={() => setIsOpen(false)}>
                <Button variant="ghost" className="w-full text-slate-600 justify-start gap-2">
                  <Play className="w-4 h-4" /> Voir la Démo
                </Button>
              </Link>
              <Link href="/agence/connexion" onClick={() => setIsOpen(false)}>
                <Button variant="ghost" className="w-full text-slate-500 border border-slate-200 justify-start">Espace Agence</Button>
              </Link>
              <Link href="/devenir-partenaire" onClick={() => setIsOpen(false)}>
                <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-full">
                  Devenir Partenaire
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

/* ══════════════════════════════════════════════
   HERO SECTION
   ══════════════════════════════════════════════ */
function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center pt-20 pb-16 px-4 bg-white overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 right-0 w-[600px] h-[600px] bg-orange-50 rounded-full blur-3xl opacity-60" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-50 rounded-full blur-3xl opacity-40" />
      </div>

      <div className="max-w-7xl mx-auto w-full relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left max-w-xl mx-auto lg:mx-0">
            {/* Badge */}
            <FadeIn>
              <div className="inline-flex items-center gap-2 mb-8 px-4 py-2 bg-orange-50 border border-orange-100 rounded-full">
                <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-orange-700">La protection intelligente pour vos bagages</span>
              </div>
            </FadeIn>

            {/* Title */}
            <FadeIn delay={0.1}>
              <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold text-slate-900 mb-6 leading-[1.1] tracking-tight">
                Un bagage perdu{' '}
                <span className="text-slate-400">=</span>{' '}
                <span className="text-orange-500">un voyage gâché.</span>
              </h1>
            </FadeIn>

            <FadeIn delay={0.2}>
              <p className="text-lg sm:text-xl text-slate-500 mb-10 leading-relaxed max-w-lg mx-auto lg:mx-0">
                Avec QRBag, retrouvez-le en quelques heures&nbsp;&mdash; sans application, sans batterie, sans stress.
              </p>
            </FadeIn>

            {/* CTAs */}
            <FadeIn delay={0.3}>
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Link href="/contact">
                  <Button className="bg-orange-500 hover:bg-orange-600 text-white px-7 py-3.5 rounded-full font-semibold text-sm shadow-lg shadow-orange-500/25 transition-all hover:shadow-orange-500/40 hover:scale-[1.02] gap-2">
                    Commander mes QR
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/demo">
                  <Button variant="ghost" className="text-slate-700 border border-slate-200 hover:border-orange-300 hover:text-orange-600 px-7 py-3.5 rounded-full font-semibold text-sm gap-2 bg-white">
                    <Play className="w-4 h-4" />
                    Voir la démo interactive
                  </Button>
                </Link>
              </div>
            </FadeIn>

            {/* Trust Pills */}
            <FadeIn delay={0.4}>
              <div className="flex flex-wrap justify-center lg:justify-start gap-3 mt-10">
                {[
                  { icon: Smartphone, text: 'Sans application' },
                  { icon: BatteryMedium, text: 'Sans batterie' },
                  { icon: MapPin, text: 'Géolocalisé' },
                ].map(item => (
                  <div key={item.text} className="flex items-center gap-2 px-3.5 py-2 bg-slate-50 rounded-full border border-slate-100">
                    <item.icon className="w-4 h-4 text-orange-500" />
                    <span className="text-xs font-medium text-slate-600">{item.text}</span>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>

          {/* Right Content — QR Code Card */}
          <FadeIn delay={0.2} className="hidden lg:flex justify-center">
            <div className="relative">
              {/* Decorative glow */}
              <div className="absolute -inset-8 bg-gradient-to-tr from-orange-100/60 via-purple-100/40 to-transparent rounded-full blur-2xl" />

              {/* Card */}
              <div className="relative bg-white rounded-3xl p-8 shadow-2xl shadow-slate-200/60 border border-slate-100">
                {/* Luggage tag shape */}
                <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-1">
                  <div className="bg-white rounded-xl p-8 flex flex-col items-center">
                    {/* QR Code visual */}
                    <div className="relative">
                      <div className="absolute inset-0 opacity-[0.03]">
                        <div className="grid grid-cols-12 grid-rows-12 h-48 w-48 gap-px">
                          {[...Array(144)].map((_, i) => (
                            <div key={i} className="bg-slate-900 rounded-[1px]" />
                          ))}
                        </div>
                      </div>
                      <QrCode className="w-40 h-40 text-slate-900 relative z-10" strokeWidth={1} />
                    </div>

                    {/* Tag hole */}
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-6 h-3 bg-slate-100 rounded-b-full border border-slate-200 border-t-0" />

                    <div className="mt-6 text-center">
                      <p className="font-mono text-sm font-semibold text-slate-900 tracking-wider">QR-DEMO-001</p>
                      <p className="text-xs text-slate-400 mt-1">www.qrbag.com/scan/demo-001</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 text-center">
                  <p className="text-sm font-semibold text-slate-800">Scannez pour voir la démo</p>
                  <p className="text-xs text-slate-400 mt-0.5">Activation en 30 secondes</p>
                </div>

                <Link href="/demo" className="block mt-5">
                  <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-full font-semibold text-sm shadow-md shadow-orange-500/25">
                    Essayer maintenant
                  </Button>
                </Link>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════
   STATISTICS
   ══════════════════════════════════════════════ */
function StatsSection() {
  const stats = [
    { value: '10K+', label: 'Bagages protégés', icon: Luggage },
    { value: '500+', label: 'Agences partenaires', icon: Users },
    { value: '98%', label: 'Taux de récupération', icon: CheckCircle },
    { value: '24/7', label: 'Support disponible', icon: Headphones },
  ];

  return (
    <section className="py-20 px-4 bg-slate-50 border-y border-slate-100">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {stats.map((stat, i) => (
            <FadeIn key={stat.label} delay={i * 0.08}>
              <div className="bg-white rounded-2xl p-6 lg:p-8 border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 text-center">
                <div className="w-11 h-11 bg-orange-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <stat.icon className="w-5 h-5 text-orange-500" />
                </div>
                <p className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">{stat.value}</p>
                <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════
   SOLUTIONS
   ══════════════════════════════════════════════ */
function SolutionsSection() {
  const solutions = [
    {
      title: 'Hajj & Omra',
      description: 'Protection complète pour les pèlerins avec 3 bagages inclus (cabine + 2 soutes). Gérée par votre agence de voyage partenaire.',
      icon: (
        <svg viewBox="0 0 48 48" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M24 4L6 12v12c0 10 8 18 18 22 10-4 18-12 18-22V12L24 4z" />
          <rect x="20" y="18" width="8" height="12" rx="1" />
          <path d="M22 18v-3a2 2 0 014 0v3" />
          <path d="M20 26h8" />
        </svg>
      ),
      color: 'emerald',
      href: '/hajj-omra',
    },
    {
      title: 'Voyageurs Standard',
      description: 'Protection flexible pour tous vos voyages. Choisissez 1 ou 3 bagages avec une durée adaptée à vos besoins.',
      icon: <Plane className="w-8 h-8" />,
      color: 'orange',
      href: '/voyageurs-standard',
    },
    {
      title: '100% Sécurisé',
      description: 'Vos données personnelles sont protégées et cryptées. Aucune information sensible n\'est exposée publiquement.',
      icon: <Lock className="w-8 h-8" />,
      color: 'purple',
      href: '/confidentialite',
    },
  ];

  const colorMap: Record<string, { iconBg: string; iconColor: string; hoverBtn: string }> = {
    emerald: {
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-700',
      hoverBtn: 'hover:bg-emerald-600 hover:text-white hover:border-emerald-600',
    },
    orange: {
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      hoverBtn: 'hover:bg-orange-500 hover:text-white hover:border-orange-500',
    },
    purple: {
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-700',
      hoverBtn: 'hover:bg-purple-700 hover:text-white hover:border-purple-700',
    },
  };

  return (
    <section id="solutions" className="py-24 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        {/* Title */}
        <FadeIn className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4 tracking-tight">
            Deux solutions, une protection
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Que vous soyez pèlerin ou voyageur, QRBag s&apos;adapte à vos besoins avec des solutions sur mesure.
          </p>
        </FadeIn>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-5">
          {solutions.map((sol, i) => {
            const c = colorMap[sol.color];
            return (
              <FadeIn key={sol.title} delay={i * 0.1}>
                <div className={`group h-full rounded-2xl p-7 border border-slate-100 bg-white shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col`}>
                  {/* Icon */}
                  <div className={`w-14 h-14 ${c.iconBg} rounded-2xl flex items-center justify-center mb-6`}>
                    <span className={c.iconColor}>{sol.icon}</span>
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{sol.title}</h3>

                  {/* Description */}
                  <p className="text-sm text-slate-500 leading-relaxed mb-6 flex-1">{sol.description}</p>

                  {/* Button */}
                  <Link href={sol.href}>
                    <Button variant="ghost" className={`w-full ${c.iconColor} ${c.hoverBtn} font-medium text-sm rounded-full border border-slate-200 transition-all gap-2 group/btn`}>
                      En savoir plus
                      <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform" />
                    </Button>
                  </Link>
                </div>
              </FadeIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════
   HOW IT WORKS
   ══════════════════════════════════════════════ */
function HowItWorksSection() {
  const steps = [
    {
      number: '01',
      title: 'Recevez votre QR',
      description: 'Commandez vos QR codes via notre formulaire B2B ou auprès de votre agence partenaire.',
      icon: <QrCode className="w-6 h-6" />,
    },
    {
      number: '02',
      title: 'Activez en 30s',
      description: 'Scannez le QR code et remplissez le formulaire avec vos informations de voyage.',
      icon: <Zap className="w-6 h-6" />,
    },
    {
      number: '03',
      title: 'Voyagez serein',
      description: 'Vos bagages sont protégés. Collez simplement l\'autocollant bien visible.',
      icon: <Plane className="w-6 h-6" />,
    },
    {
      number: '04',
      title: 'Soyez notifié',
      description: 'Si quelqu\'un trouve votre bagage, vous recevez une alerte instantanée via WhatsApp.',
      icon: <Bell className="w-6 h-6" />,
    },
  ];

  return (
    <section id="comment" className="py-24 px-4 bg-slate-50">
      <div className="max-w-6xl mx-auto">
        {/* Title */}
        <FadeIn className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4 tracking-tight">
            Comment ça marche ?
          </h2>
          <p className="text-lg text-slate-500">
            Une protection en 4 étapes simples
          </p>
        </FadeIn>

        {/* Steps */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 relative">
          {/* Connecting line (desktop) */}
          <div className="hidden lg:block absolute top-[3.5rem] left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-orange-200 via-purple-200 to-orange-200" />

          {steps.map((step, i) => (
            <FadeIn key={step.number} delay={i * 0.1}>
              <div className="relative bg-white rounded-2xl p-7 border border-slate-100 shadow-sm hover:shadow-md transition-all text-center">
                {/* Step number circle */}
                <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg shadow-orange-500/20 relative z-10">
                  <span className="text-white font-bold text-lg">{step.number}</span>
                </div>

                {/* Icon */}
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center mx-auto mb-4 text-slate-600">
                  {step.icon}
                </div>

                <h3 className="font-semibold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{step.description}</p>
              </div>
            </FadeIn>
          ))}
        </div>

        {/* Demo CTA */}
        <FadeIn delay={0.3} className="mt-14 text-center">
          <Link href="/demo">
            <Button className="bg-orange-500 hover:bg-orange-600 text-white px-7 py-3.5 rounded-full font-semibold text-sm shadow-lg shadow-orange-500/25 transition-all hover:shadow-orange-500/40 hover:scale-[1.02] gap-2">
              <Play className="w-4 h-4" />
              Voir la démo interactive
            </Button>
          </Link>
        </FadeIn>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════
   TESTIMONIALS
   ══════════════════════════════════════════════ */
function TestimonialsSection() {
  const testimonials = [
    {
      name: 'Mamadou Diallo',
      role: 'Pèlerin Hajj 2025',
      content: 'Grâce à QRBag, j\'ai retrouvé ma valise perdue à l\'aéroport de Djeddah en moins de 2 heures. Une invention géniale !',
      initials: 'MD',
    },
    {
      name: 'Sophie Martin',
      role: 'Voyageuse fréquente',
      content: 'Simple, efficace et pas cher. J\'ai utilisé QRBag pour tous mes voyages cette année. Plus de stress !',
      initials: 'SM',
    },
  ];

  return (
    <section className="py-24 px-4 bg-white">
      <div className="max-w-4xl mx-auto">
        {/* Title */}
        <FadeIn className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4 tracking-tight">
            Ils nous font confiance
          </h2>
          <p className="text-slate-500 text-lg">Des milliers de voyageurs et pèlerins déjà protégés</p>
        </FadeIn>

        {/* Cards */}
        <div className="grid md:grid-cols-2 gap-5">
          {testimonials.map((t, i) => (
            <FadeIn key={t.name} delay={i * 0.1}>
              <div className="bg-slate-50 rounded-2xl p-7 border border-slate-100 hover:shadow-md transition-all h-full flex flex-col">
                {/* Stars */}
                <div className="flex gap-0.5 mb-5">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 text-orange-400 fill-orange-400" />
                  ))}
                </div>

                {/* Quote */}
                <p className="text-slate-700 leading-relaxed mb-6 flex-1">
                  &ldquo;{t.content}&rdquo;
                </p>

                {/* Author */}
                <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm">
                    {t.initials}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{t.name}</p>
                    <p className="text-xs text-slate-400">{t.role}</p>
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════
   PRICING
   ══════════════════════════════════════════════ */
function PricingSection() {
  const plans = [
    {
      title: 'Pour 1 voyage',
      price: '4 €',
      duration: '7 jours de protection',
      features: [
        '3 étiquettes QR incluses',
        'Support WhatsApp',
        'Notification email',
        'Activation instantanée',
      ],
      btnClass: 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40',
      popular: false,
    },
    {
      title: 'Pour plusieurs voyages',
      price: '7 €',
      duration: '1 an de protection',
      features: [
        '3 étiquettes QR incluses',
        'Support prioritaire 24/7',
        'Renouvellement facile',
        'Statistiques de scans',
      ],
      btnClass: 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-lg shadow-rose-500/25 hover:shadow-rose-500/40',
      popular: true,
    },
  ];

  return (
    <section id="tarifs" className="py-24 px-4 bg-slate-50">
      <div className="max-w-4xl mx-auto">
        {/* Title */}
        <FadeIn className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4 tracking-tight">
            Tarifs simples
          </h2>
          <p className="text-lg text-slate-500">
            Choisissez la formule adaptée à vos besoins
          </p>
        </FadeIn>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-5 items-start">
          {plans.map((plan, i) => (
            <FadeIn key={plan.title} delay={i * 0.1}>
              <div className={`relative bg-white rounded-2xl p-8 border ${plan.popular ? 'border-rose-200 shadow-xl shadow-rose-100/50' : 'border-slate-100 shadow-sm'} hover:shadow-lg transition-all`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-rose-500 to-pink-600 text-white text-xs font-bold px-4 py-1 rounded-full shadow-md">
                    Populaire
                  </div>
                )}

                <h3 className="font-bold text-slate-900 text-lg mb-1">{plan.title}</h3>
                <p className="text-sm text-slate-400 mb-5">{plan.duration}</p>

                <div className="flex items-baseline gap-1 mb-7">
                  <span className="text-5xl font-bold text-slate-900 tracking-tight">{plan.price}</span>
                </div>

                <div className="space-y-3 mb-8">
                  {plan.features.map((f, j) => (
                    <div key={j} className="flex items-center gap-3 text-sm text-slate-600">
                      <div className="w-5 h-5 bg-emerald-50 rounded-full flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                      </div>
                      <span>{f}</span>
                    </div>
                  ))}
                </div>

                <Link href="/contact">
                  <Button className={`w-full rounded-full font-semibold text-sm py-3.5 transition-all hover:scale-[1.02] ${plan.btnClass}`}>
                    Commander
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════
   FINAL CTA
   ══════════════════════════════════════════════ */
function FinalCTASection() {
  return (
    <section className="py-24 px-4 bg-white">
      <div className="max-w-4xl mx-auto">
        <FadeIn>
          <div className="relative rounded-3xl overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500 via-orange-600 to-rose-600" />
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

            {/* Content */}
            <div className="relative px-8 py-16 sm:px-16 sm:py-20 text-center">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">
                Commencez dès maintenant
              </h2>
              <p className="text-white/85 max-w-xl mx-auto mb-10 text-lg leading-relaxed">
                Rejoignez les milliers de voyageurs qui protègent leurs bagages avec QRBag.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/contact">
                  <Button className="bg-white text-orange-600 hover:bg-orange-50 px-7 py-3.5 rounded-full font-semibold text-sm shadow-lg transition-all hover:scale-[1.02] gap-2">
                    Commander mes QR
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/demo">
                  <Button className="bg-white/15 hover:bg-white/25 text-white border border-white/30 backdrop-blur-sm px-7 py-3.5 rounded-full font-semibold text-sm gap-2 transition-all">
                    <Play className="w-4 h-4" />
                    Voir la démo
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════
   CONTACT CTA
   ══════════════════════════════════════════════ */
function ContactCTASection() {
  return (
    <section className="py-20 px-4 bg-slate-50 border-t border-slate-100">
      <div className="max-w-4xl mx-auto text-center">
        <FadeIn>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
            Une question ? Contactez-nous
          </h2>
          <p className="text-slate-500 mb-8 max-w-xl mx-auto">
            Notre équipe est disponible pour répondre à toutes vos questions et vous accompagner.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/contact">
              <Button variant="ghost" className="text-slate-700 border border-slate-200 hover:border-orange-300 hover:text-orange-600 px-7 py-3.5 rounded-full font-semibold text-sm gap-2 bg-white">
                <Mail className="w-4 h-4" />
                Nous contacter
              </Button>
            </Link>
            <a href="https://wa.me/33745349339" target="_blank" rel="noopener noreferrer">
              <Button className="bg-emerald-500 hover:bg-emerald-600 text-white px-7 py-3.5 rounded-full font-semibold text-sm shadow-lg shadow-emerald-500/25 transition-all hover:scale-[1.02] gap-2">
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </Button>
            </a>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════
   FOOTER
   ══════════════════════════════════════════════ */
function Footer() {
  const columns = [
    {
      title: 'Produit',
      links: [
        { label: 'Solutions', href: '/#solutions' },
        { label: 'Comment ça marche', href: '/#comment' },
        { label: 'Tarifs', href: '/#tarifs' },
        { label: 'Démo', href: '/demo' },
      ],
    },
    {
      title: 'Entreprise',
      links: [
        { label: 'Contact', href: '/contact' },
        { label: 'Devenir Partenaire', href: '/devenir-partenaire' },
      ],
    },
    {
      title: 'Légal',
      links: [
        { label: 'Mentions légales', href: '/mentions-legales' },
        { label: 'Confidentialité', href: '/confidentialite' },
        { label: 'CGU', href: '/cgu' },
      ],
    },
  ];

  return (
    <footer className="bg-slate-900 text-slate-400">
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md shadow-orange-500/20">
                <QrCode className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">QRBag</span>
            </div>
            <p className="text-sm leading-relaxed max-w-xs">
              Protection intelligente des bagages pour voyageurs et pèlerins.
            </p>
            {/* Social */}
            <div className="flex items-center gap-3 mt-6">
              <a href="https://facebook.com/qrbag" target="_blank" rel="noopener noreferrer" className="w-9 h-9 bg-slate-800 rounded-full flex items-center justify-center hover:bg-slate-700 transition-colors" aria-label="Facebook">
                <Facebook className="w-4 h-4" />
              </a>
              <a href="https://instagram.com/qrbag" target="_blank" rel="noopener noreferrer" className="w-9 h-9 bg-slate-800 rounded-full flex items-center justify-center hover:bg-slate-700 transition-colors" aria-label="Instagram">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="https://twitter.com/qrbag" target="_blank" rel="noopener noreferrer" className="w-9 h-9 bg-slate-800 rounded-full flex items-center justify-center hover:bg-slate-700 transition-colors" aria-label="Twitter">
                <Twitter className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Link Columns */}
          {columns.map(col => (
            <div key={col.title}>
              <h4 className="font-semibold text-white text-sm mb-4">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map(link => (
                  <li key={link.label}>
                    {'href' in link && link.href.startsWith('/') ? (
                      <Link href={link.href} className="text-sm hover:text-white transition-colors duration-200">{link.label}</Link>
                    ) : (
                      <a href={link.href} className="text-sm hover:text-white transition-colors duration-200">{link.label}</a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="border-t border-slate-800 mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} QRBag. Tous droits réservés.
          </p>
          <a
            href="https://maps.google.com/?q=Poissy+France"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1.5 transition-colors"
          >
            <MapPin className="w-3.5 h-3.5" />
            Poissy, France
          </a>
        </div>
      </div>
    </footer>
  );
}

/* ══════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════ */
export default function Home() {
  return (
    <main className="min-h-screen bg-white flex flex-col">
      <Navigation />
      <HeroSection />
      <StatsSection />
      <SolutionsSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <PricingSection />
      <FinalCTASection />
      <ContactCTASection />
      <Footer />
    </main>
  );
}
