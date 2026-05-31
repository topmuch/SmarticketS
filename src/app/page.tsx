'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { motion, AnimatePresence, useInView, useScroll, useTransform } from 'framer-motion';
import {
  QrCode,
  Menu,
  X,
  Search,
  ArrowRight,
  Truck,
  Building2,
  Loader2,
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  Shield,
  ShieldCheck,
  WifiOff,
  LayoutDashboard,
  Smartphone,
  ScanLine,
  CheckCircle2,
  Star,
  Users,
  Package,
  TicketCheck,
  Globe,
  Zap,
  ChevronRight,
  Linkedin,
  Facebook,
  Instagram,
  Send,
  Clock,
  Monitor,
} from 'lucide-react';

/* ============================================================
   CONSTANTS
   ============================================================ */

const WA_URL =
  'https://wa.me/221784858226?text=Bonjour%20SmarticketS%2C%20je%20souhaite%20en%20savoir%20plus';

const NAV_LINKS = [
  { label: 'Accueil', href: '#accueil' },
  { label: 'Solutions', href: '#solutions' },
  { label: 'Fonctionnalités', href: '#fonctionnalites' },
  { label: 'Comment ça marche', href: '#comment-ca-marche' },
  { label: 'Contact', href: '#footer' },
];

const STATS = [
  { value: '50+', label: 'Partenaires de transport', icon: Building2 },
  { value: '10K+', label: 'Tickets émis', icon: TicketCheck },
  { value: '5K+', label: 'Colis tracés', icon: Package },
  { value: '100%', label: 'Couverture Sénégal', icon: Globe },
];

const SOLUTIONS = [
  {
    title: 'Passagers',
    description: 'Achetez, recevez sur WhatsApp, montrez le QR code',
    image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=600&h=500&fit=crop',
    icon: TicketCheck,
    features: ['Achat 24/7', 'Sans impression', 'Suivi en temps réel'],
  },
  {
    title: 'Expéditeurs',
    description: 'Suivez vos colis en temps réel, notifications auto',
    image: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=600&h=500&fit=crop',
    icon: Package,
    features: ['QR code unique', 'Traçabilité totale', 'Alertes WhatsApp'],
  },
  {
    title: 'Compagnies',
    description: 'Gérez votre flotte, vos départs et vos équipes',
    image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=600&h=500&fit=crop',
    icon: LayoutDashboard,
    features: ['Rapports automatisés', 'Gestion flotte', 'Statistiques live'],
  },
  {
    title: 'Écrans Affichage',
    description: 'Horaires bus en temps réel sur écran gare',
    image: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=600&h=500&fit=crop',
    icon: Monitor,
    features: ['Horaires live', 'Départs & Arrivées', 'Alertes embarquement'],
  },
];

const FEATURES = [
  {
    title: 'WhatsApp Intégré',
    description: 'Notifications automatiques à chaque étape : activation, départ, transit, arrivée.',
    icon: MessageCircle,
    color: 'bg-green-500/10 text-green-600',
  },
  {
    title: 'QR Code Scan',
    description: 'Activation en 30 secondes, validation billets, scan multi-agences.',
    icon: ScanLine,
    color: 'bg-blue-500/10 text-blue-600',
  },
  {
    title: 'Progressive Web App',
    description: 'Installation instantanée, pas besoin de Play Store ou App Store.',
    icon: Smartphone,
    color: 'bg-purple-500/10 text-purple-600',
  },
  {
    title: 'Dashboard Intelligent',
    description: 'KPIs en temps réel, graphiques, gestion complète de votre activité.',
    icon: LayoutDashboard,
    color: 'bg-orange-500/10 text-orange-600',
  },
  {
    title: 'Mode Hors-Ligne',
    description: 'Continuez à travailler même dans les zones sans connexion internet.',
    icon: WifiOff,
    color: 'bg-cyan-500/10 text-cyan-600',
  },
  {
    title: 'Sécurité Maximale',
    description: 'Code PIN à 6 chiffres, RGPD conforme, journal d\'audit complet.',
    icon: ShieldCheck,
    color: 'bg-red-500/10 text-red-600',
  },
];

const STEPS = [
  {
    step: '01',
    title: 'Scannez ou saisissez',
    description: 'Scannez le QR code du billet ou saisissez manuellement la référence du colis à activer.',
    icon: ScanLine,
  },
  {
    step: '02',
    title: 'Activez en 30s',
    description: 'Entrez les infos expéditeur et destinataire. Le colis est activé et sécurisé instantanément.',
    icon: Zap,
  },
  {
    step: '03',
    title: 'Suivez en temps réel',
    description: 'Recevez des notifications WhatsApp à chaque étape du parcours jusqu\'à la livraison.',
    icon: MapPin,
  },
];

const WHY_ITEMS = [
  { icon: Clock, title: 'Rapide', description: 'Activation en 30 secondes, pas de formation nécessaire.' },
  { icon: Shield, title: 'Fiable', description: 'Code PIN sécurisé, 0 litige sur la remise de colis.' },
  { icon: MessageCircle, title: 'Connecté', description: 'WhatsApp, notifications automatiques à chaque étape.' },
  { icon: Smartphone, title: 'Mobile-First', description: 'Fonctionne sur tous les téléphones, même hors-ligne.' },
  { icon: Globe, title: '100% Sénégal', description: 'Dakar, Saint-Louis, Ziguinchor, Thiès, Touba et plus.' },
  { icon: Users, title: 'Support 24/7', description: 'Équipe locale disponible sur WhatsApp et téléphone.' },
];

const TESTIMONIALS = [
  {
    name: 'Mamadou Diallo',
    role: 'Gérant, Diallo Transport',
    text: 'SmarticketS a réduit nos réclamations de 70%. Nos clients reçoivent des notifications WhatsApp automatiques et peuvent suivre leurs colis en temps réel.',
    rating: 5,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
  },
  {
    name: 'Aïssatou Ba',
    role: 'Directrice, Sénégal Express',
    text: 'Le code PIN de retrait a éliminé les litiges de livraison. Notre dashboard agence nous permet de gérer toute notre flotte en un seul endroit.',
    rating: 5,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
  },
];

const FOOTER_COLUMNS = [
  {
    title: 'Produit',
    links: [
      { label: 'Fonctionnalités', href: '/fonctionnalites' },
      { label: 'Sécurité', href: '/securite' },
      { label: 'Tarifs', href: '/tarifs' },
      { label: 'FAQ', href: '/faq' },
    ],
  },
  {
    title: 'Ressources',
    links: [
      { label: 'Documentation', href: '/documentation' },
      { label: 'Blog', href: '/blog' },
      { label: 'Support', href: '/support' },
      { label: 'API', href: '/api-docs' },
    ],
  },
  {
    title: 'Entreprise',
    links: [
      { label: 'Contact', href: '/contact' },
      { label: 'Partenariats', href: '/devenir-partenaire' },
      { label: 'CGU', href: '/cgu' },
      { label: 'Confidentialité', href: '/confidentialite' },
    ],
  },
];

/* ============================================================
   REUSABLE: FadeIn wrapper
   ============================================================ */

function FadeIn({
  children,
  className = '',
  delay = 0,
  direction = 'up',
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  const offsets: Record<string, { x: number; y: number }> = {
    up: { x: 0, y: 40 },
    down: { x: 0, y: -40 },
    left: { x: 40, y: 0 },
    right: { x: -40, y: 0 },
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, ...offsets[direction] }}
      animate={inView ? { opacity: 1, x: 0, y: 0 } : { opacity: 0, ...offsets[direction] }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ============================================================
   1. NAVIGATION
   ============================================================ */

function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleNavClick = useCallback((href: string) => {
    setIsOpen(false);
    if (href.startsWith('#') && href !== '#accueil') {
      const el = document.querySelector(href);
      el?.scrollIntoView({ behavior: 'smooth' });
    } else if (href === '#accueil') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const isOnHero = !scrolled;

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-xl shadow-lg border-b border-slate-200/80'
          : 'bg-gradient-to-b from-slate-900/60 to-transparent backdrop-blur-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30 group-hover:shadow-blue-600/50 transition-shadow">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <span
              className={`text-xl font-bold tracking-tight transition-colors duration-300 ${
                isOnHero ? 'text-white drop-shadow-lg' : 'text-slate-900'
              }`}
            >
              SmarticketS
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden lg:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick(link.href);
                }}
                className={`text-sm font-medium transition-colors duration-200 relative after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-0.5 after:bg-blue-500 after:transition-all after:duration-300 hover:after:w-full ${
                  isOnHero
                    ? 'text-white/90 hover:text-white after:bg-white/60'
                    : 'text-slate-600 hover:text-slate-900 after:bg-blue-500'
                }`}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop right side */}
          <div className="hidden lg:flex items-center gap-4">
            <a
              href="tel:+221784858226"
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                isOnHero ? 'text-white/80 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Phone className="w-4 h-4" />
              +221 78 485 82 26
            </a>
            <Link href="/agence/connexion">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg px-5 shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 transition-all hover:scale-[1.02]">
                Espace Compagnie
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className={`lg:hidden p-1 transition-colors duration-300 ${
              isOnHero ? 'text-white' : 'text-slate-900'
            }`}
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Menu"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="lg:hidden py-4 border-t border-slate-200 bg-white/98 backdrop-blur-xl"
            >
              <div className="flex flex-col gap-3">
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={(e) => {
                      e.preventDefault();
                      handleNavClick(link.href);
                    }}
                    className="text-slate-700 hover:text-blue-600 font-medium py-2 text-lg"
                  >
                    {link.label}
                  </a>
                ))}
                <hr className="border-slate-200 my-2" />
                <a
                  href="tel:+221784858226"
                  className="flex items-center gap-2 text-slate-600 font-medium py-2"
                >
                  <Phone className="w-4 h-4" />
                  +221 78 485 82 26
                </a>
                <Link href="/agence/connexion" onClick={() => setIsOpen(false)}>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg">
                    Espace Compagnie
                  </Button>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}

/* ============================================================
   2. HERO SECTION
   ============================================================ */

function HeroSection() {
  const router = useRouter();
  const [refValue, setRefValue] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.5], [0, -60]);

  const pattern = useMemo(() => /^[A-Z]{2,4}\d{2}-[A-Z0-9]{4,8}$/, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRefValue(e.target.value.toUpperCase());
  };

  const isValid = pattern.test(refValue);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isSearching) return;
    setIsSearching(true);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const res = await fetch(`/api/arrivee/${encodeURIComponent(refValue)}`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        if (data?.success && data?.colis) {
          const status = data.colis.status;
          if (status === 'in_transit' || status === 'delivered') {
            router.replace(`/retrieve/${refValue}`);
            return;
          }
        }
      }
      router.push(`/activate/${refValue}`);
    } catch {
      router.push(`/activate/${refValue}`);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <section ref={sectionRef} id="accueil" className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <Image
          src="/images/hero-bus-smartickets.jpg"
          alt="Bus de transport inter-villes SmarticketS"
          fill
          priority
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-blue-900/50" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-slate-900/40" />
      </div>

      {/* Animated particles overlay */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-blue-400/30 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: 3 + Math.random() * 4,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <motion.div
        className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-28 pb-20 text-center"
        style={{ opacity: heroOpacity, y: heroY }}
      >
        {/* Badge */}
        <FadeIn>
          <div className="inline-flex items-center gap-2 mb-8 px-5 py-2.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-full">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span className="text-sm font-medium text-white/90 tracking-wide">
              Plateforme #1 de traçabilité au Sénégal
            </span>
          </div>
        </FadeIn>

        {/* H1 */}
        <FadeIn delay={0.1}>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white mb-6 leading-[1.08] tracking-tight">
            Billets & Colis,
            <br />
            sécurisés par{' '}
            <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
              la technologie
            </span>
          </h1>
        </FadeIn>

        {/* Subtitle */}
        <FadeIn delay={0.2}>
          <p className="text-lg sm:text-xl text-white/85 max-w-2xl mx-auto leading-relaxed mb-10">
            Vendez des billets, expédiez des colis et suivez tout en temps réel.
            Notifications WhatsApp, validation billets, code PIN sécurisé.
          </p>
        </FadeIn>

        {/* Search Box */}
        <FadeIn delay={0.3}>
          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
            <div className="flex items-center bg-white rounded-2xl border-2 border-white/30 shadow-2xl focus-within:border-blue-400 focus-within:shadow-blue-500/20 transition-all duration-300 overflow-hidden">
              <div className="relative flex-1 flex items-center">
                <Search className="absolute left-4 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={refValue}
                  onChange={handleChange}
                  placeholder="Entrez votre réf. billet ou colis (ex: DKR-2026-0042)"
                  className="w-full pl-12 pr-4 py-4 sm:py-5 text-base font-medium bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  maxLength={16}
                />
              </div>
              <button
                type="submit"
                disabled={!isValid || isSearching}
                className="flex items-center gap-2 px-5 sm:px-7 py-4 sm:py-5 font-bold text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30 transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="hidden sm:inline">Recherche...</span>
                  </>
                ) : (
                  <>
                    Suivre
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </FadeIn>

        {/* Dual CTA */}
        <FadeIn delay={0.4}>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link href="/inscrire">
                <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-7 py-3.5 rounded-xl font-semibold text-sm shadow-xl shadow-blue-600/30 transition-all gap-2">
                  <Truck className="w-4 h-4" />
                  Espace Chauffeur
                </Button>
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link href="/agence/connexion">
                <Button className="w-full sm:w-auto bg-white/10 hover:bg-white/20 backdrop-blur-md border-2 border-white/30 text-white px-7 py-3.5 rounded-xl font-semibold text-sm transition-all gap-2">
                  <Building2 className="w-4 h-4" />
                  Espace Transporteur
                </Button>
              </Link>
            </motion.div>
          </div>
        </FadeIn>

        {/* Trust badges */}
        <FadeIn delay={0.5}>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 mt-12">
            {[
              '✅ Billets & Colis unifiés',
              '✅ 500+ transporteurs certifiés',
              '✅ 98% de trajets sans incident',
            ].map((badge) => (
              <span
                key={badge}
                className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-white/80"
              >
                {badge}
              </span>
            ))}
          </div>
        </FadeIn>
      </motion.div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none z-10" />
    </section>
  );
}

/* ============================================================
   3. STATS SECTION
   ============================================================ */

function StatsSection() {
  return (
    <section className="relative -mt-16 z-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <FadeIn>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {STATS.map((stat, i) => (
              <motion.div
                key={stat.label}
                whileHover={{ y: -4 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="bg-white border-slate-200/80 shadow-lg shadow-slate-900/5 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 rounded-2xl">
                  <CardContent className="p-5 sm:p-6 text-center">
                    <div className="w-12 h-12 mx-auto rounded-xl bg-blue-50 flex items-center justify-center mb-3">
                      <stat.icon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-1">{stat.value}</div>
                    <div className="text-xs sm:text-sm text-slate-500 font-medium">{stat.label}</div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

/* ============================================================
   4. SOLUTIONS SECTION
   ============================================================ */

function SolutionsSection() {
  return (
    <section id="solutions" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <FadeIn className="text-center mb-14 sm:mb-16">
          <span className="inline-block px-4 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold tracking-widest uppercase rounded-full mb-4">
            Solutions
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
            Une solution pour chaque{' '}
            <span className="bg-gradient-to-r from-blue-600 to-emerald-500 bg-clip-text text-transparent">
              acteur
            </span>
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Que vous soyez passager, expéditeur ou compagnie de transport, SmarticketS s&apos;adapte à vos besoins.
          </p>
        </FadeIn>

        {/* Cards — minimal image-centric style */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
          {SOLUTIONS.map((solution, i) => (
            <FadeIn key={solution.title} delay={i * 0.08}>
              <motion.div
                whileHover={{ y: -4 }}
                className="group cursor-pointer"
              >
                {/* Image container — tall, no border, no shadow */}
                <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-slate-100">
                  <Image
                    src={solution.image}
                    alt={solution.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  {/* Subtle bottom gradient for text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                  {/* Bottom content overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 lg:p-5">
                    {/* Icon badge */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/90 flex items-center justify-center">
                        <solution.icon className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    {/* Title */}
                    <h3 className="text-base lg:text-lg font-bold text-white leading-tight mb-1">
                      {solution.title}
                    </h3>
                    {/* Description */}
                    <p className="text-xs lg:text-sm text-white/80 leading-relaxed line-clamp-2">
                      {solution.description}
                    </p>
                    {/* Feature tags */}
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {solution.features.map((feat) => (
                        <span
                          key={feat}
                          className="inline-flex items-center px-2 py-0.5 bg-white/15 backdrop-blur-sm rounded-md text-[10px] lg:text-xs text-white/90 font-medium"
                        >
                          {feat}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   5. FEATURES SECTION
   ============================================================ */

function FeaturesSection() {
  return (
    <section id="fonctionnalites" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <FadeIn className="text-center mb-14 sm:mb-16">
          <span className="inline-block px-4 py-1.5 bg-emerald-50 text-emerald-600 text-xs font-bold tracking-widest uppercase rounded-full mb-4">
            Fonctionnalités
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
            Tout ce dont vous avez{' '}
            <span className="bg-gradient-to-r from-emerald-500 to-blue-600 bg-clip-text text-transparent">
              besoin
            </span>
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Des fonctionnalités puissantes conçues pour le transport inter-villes africain.
          </p>
        </FadeIn>

        {/* Feature grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature, i) => (
            <FadeIn key={feature.title} delay={i * 0.08}>
              <motion.div
                whileHover={{ y: -4, scale: 1.01 }}
                className="group bg-white rounded-2xl p-6 shadow-md shadow-slate-900/5 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 border border-slate-100"
              >
                <div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{feature.description}</p>
              </motion.div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   6. HOW IT WORKS SECTION
   ============================================================ */

function HowItWorksSection() {
  return (
    <section id="comment-ca-marche" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <FadeIn className="text-center mb-14 sm:mb-16">
          <span className="inline-block px-4 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold tracking-widest uppercase rounded-full mb-4">
            Comment ça marche
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
            Simple comme{' '}
            <span className="bg-gradient-to-r from-blue-600 to-emerald-500 bg-clip-text text-transparent">
              1, 2, 3
            </span>
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Activez un colis en moins d&apos;une minute et commencez à suivre immédiatement.
          </p>
        </FadeIn>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-8 lg:gap-12 mb-16">
          {STEPS.map((step, i) => (
            <FadeIn key={step.step} delay={i * 0.15}>
              <div className="relative text-center">
                {/* Connector line */}
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-blue-200 to-emerald-200" />
                )}

                {/* Step number */}
                <div className="relative z-10 w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-blue-50 to-emerald-50 border border-blue-100 flex items-center justify-center mb-6 group hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300">
                  <step.icon className="w-10 h-10 text-blue-600" />
                  <span className="absolute -top-2 -right-2 w-8 h-8 rounded-lg bg-blue-600 text-white text-xs font-bold flex items-center justify-center shadow-lg shadow-blue-600/30">
                    {step.step}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed max-w-xs mx-auto">{step.description}</p>
              </div>
            </FadeIn>
          ))}
        </div>

        {/* Demo request form */}
        <FadeIn>
          <div className="max-w-2xl mx-auto">
            <Card className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-2xl overflow-hidden border-0">
              <CardContent className="p-8 sm:p-10 text-center">
                <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                  Prêt à simplifier votre logistique ?
                </h3>
                <p className="text-slate-300 mb-8 max-w-md mx-auto">
                  Demandez une démonstration gratuite et découvrez comment SmarticketS peut transformer votre activité.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <a href={WA_URL} target="_blank" rel="noopener noreferrer">
                    <Button className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl px-6 py-3 shadow-lg shadow-emerald-500/30 transition-all gap-2">
                      <MessageCircle className="w-5 h-5" />
                      Demander une démo
                    </Button>
                  </a>
                  <Link href="/devenir-partenaire">
                    <Button className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl px-6 py-3 border border-white/20 transition-all gap-2">
                      Devenir partenaire
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

/* ============================================================
   7. WHY CHOOSE US SECTION
   ============================================================ */

function WhyChooseUsSection() {
  return (
    <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-slate-900 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <FadeIn className="text-center mb-14 sm:mb-16">
          <span className="inline-block px-4 py-1.5 bg-white/10 text-blue-400 text-xs font-bold tracking-widest uppercase rounded-full mb-4 border border-white/10">
            Pourquoi SmarticketS
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-4 tracking-tight">
            La confiance des{' '}
            <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
              professionnels
            </span>
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Conçu spécifiquement pour le transport inter-villes africain avec des solutions éprouvées.
          </p>
        </FadeIn>

        {/* Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {WHY_ITEMS.map((item, i) => (
            <FadeIn key={item.title} delay={i * 0.08}>
              <motion.div
                whileHover={{ y: -4 }}
                className="group bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-emerald-500/20 border border-white/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <item.icon className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{item.description}</p>
              </motion.div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   8. TESTIMONIALS SECTION
   ============================================================ */

function TestimonialsSection() {
  return (
    <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <FadeIn className="text-center mb-14 sm:mb-16">
          <span className="inline-block px-4 py-1.5 bg-amber-50 text-amber-600 text-xs font-bold tracking-widest uppercase rounded-full mb-4">
            Témoignages
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
            Ils nous font{' '}
            <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
              confiance
            </span>
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Découvrez comment nos partenaires utilisent SmarticketS au quotidien.
          </p>
        </FadeIn>

        {/* Testimonial cards */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
          {TESTIMONIALS.map((testimonial, i) => (
            <FadeIn key={testimonial.name} delay={i * 0.15}>
              <motion.div
                whileHover={{ y: -4 }}
                className="bg-white rounded-2xl p-6 sm:p-8 shadow-lg shadow-slate-900/5 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 border border-slate-100"
              >
                {/* Stars */}
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, idx) => (
                    <Star key={idx} className="w-5 h-5 text-amber-400 fill-amber-400" />
                  ))}
                </div>

                {/* Quote */}
                <p className="text-slate-600 leading-relaxed mb-6 text-base italic">
                  &ldquo;{testimonial.text}&rdquo;
                </p>

                {/* Author */}
                <div className="flex items-center gap-4">
                  <div className="relative w-12 h-12 rounded-full overflow-hidden">
                    <Image
                      src={testimonial.avatar}
                      alt={testimonial.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{testimonial.name}</div>
                    <div className="text-sm text-slate-500">{testimonial.role}</div>
                  </div>
                </div>
              </motion.div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   9. CTA SECTION
   ============================================================ */

function CTASection() {
  return (
    <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 relative overflow-hidden">
      {/* Decorative */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/5 rounded-full" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-white/5 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/20 rounded-full blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10 text-center">
        <FadeIn>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-6 tracking-tight">
            Rejoignez les 50+ compagnies
            <br />
            qui font confiance à SmarticketS
          </h2>
          <p className="text-lg text-blue-100 max-w-2xl mx-auto mb-10">
            Commencez dès aujourd&apos;hui gratuitement. Aucune carte de crédit requise.
            Notre équipe vous accompagne à chaque étape.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <a href={WA_URL} target="_blank" rel="noopener noreferrer">
                <Button className="w-full sm:w-auto bg-white text-blue-700 hover:bg-blue-50 font-bold rounded-xl px-8 py-4 text-base shadow-xl transition-all gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Démarrer maintenant
                </Button>
              </a>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link href="/devenir-partenaire">
                <Button className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl px-8 py-4 text-base border-2 border-white/30 transition-all gap-2">
                  En savoir plus
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </motion.div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

/* ============================================================
   10. FOOTER
   ============================================================ */

function FooterSection() {
  return (
    <footer id="footer" className="bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand column */}
          <div className="col-span-2">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
                <QrCode className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">SmarticketS</span>
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed mb-6 max-w-xs">
              Plateforme de traçabilité et sécurité logistique pour le transport inter-villes au Sénégal.
              Billets, colis, notifications WhatsApp, code PIN sécurisé.
            </p>

            {/* Contact info */}
            <div className="space-y-3 mb-6">
              <a
                href="tel:+221784858226"
                className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                <Phone className="w-4 h-4 text-blue-400" />
                +221 78 485 82 26
              </a>
              <a
                href="mailto:contact@smartickets.com"
                className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                <Mail className="w-4 h-4 text-blue-400" />
                contact@smartickets.com
              </a>
              <div className="flex items-start gap-2 text-sm text-slate-400">
                <MapPin className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                Dakar, Sénégal
              </div>
            </div>

            {/* Social icons */}
            <div className="flex items-center gap-3">
              {[
                { icon: Linkedin, href: '#', label: 'LinkedIn' },
                { icon: Facebook, href: '#', label: 'Facebook' },
                { icon: Instagram, href: '#', label: 'Instagram' },
              ].map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/20 transition-all duration-200"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title}>
              <h4 className="font-semibold text-sm uppercase tracking-wider text-white/90 mb-4">
                {column.title}
              </h4>
              <ul className="space-y-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-slate-400 hover:text-white transition-colors text-sm"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-slate-500 text-sm">
            &copy; {new Date().getFullYear()} SmarticketS. Tous droits réservés.
          </p>
          <p className="text-slate-500 text-sm">
            Fait avec <span className="text-red-400">&hearts;</span> au Sénégal par MMASOLUTION
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ============================================================
   WHATSAPP FLOAT
   ============================================================ */

function WhatsAppFloat() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <a
      href={WA_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contacter SmarticketS sur WhatsApp"
      className="fixed bottom-6 right-6 z-50 group"
    >
      <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-25" />
      <span className="relative flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/30 hover:scale-110 transition-transform duration-200">
        <MessageCircle className="w-6 h-6 text-white" />
      </span>
    </a>
  );
}

/* ============================================================
   MAIN PAGE
   ============================================================ */

export default function HomePage() {
  return (
    <>
      <Navigation />
      <main id="main-content">
        <HeroSection />
        <StatsSection />
        <SolutionsSection />
        <FeaturesSection />
        <HowItWorksSection />
        <WhyChooseUsSection />
        <TestimonialsSection />
        <CTASection />
      </main>
      <FooterSection />
      <WhatsAppFloat />
    </>
  );
}
