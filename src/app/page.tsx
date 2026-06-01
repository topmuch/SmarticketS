'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { motion, AnimatePresence, useInView, useScroll, useTransform } from 'framer-motion';
import dynamic from 'next/dynamic';
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
  UserX,
  FileDown,
} from 'lucide-react';

const MissingPassengerAlert = dynamic(
  () => import('@/components/dashboard/MissingPassengerAlert'),
  { ssr: false }
);

const PWAManager = dynamic(
  () => import('@/components/pwa/PWAManager').then((m) => ({ default: m.PWAManager })),
  { ssr: false }
);

/* ============================================================
   CONSTANTS
   ============================================================ */

const WA_URL =
  'https://wa.me/221784858226?text=Bonjour%20SmarticketS%2C%20je%20souhaite%20en%20savoir%20plus';

const NAV_LINKS = [
  { label: 'Accueil', href: '#accueil' },
  { label: 'Services', href: '#services' },
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

const SERVICES = [
  {
    title: 'Passagers',
    subtitle: 'Personne avec téléphone, achat 24/7, sans impression, suivi temps réel',
    image: '/images/services/passagers.jpg',
    href: '/passagers',
  },
  {
    title: 'Expéditeurs',
    subtitle: 'Envoi colis, QR code unique, traçabilité totale, alertes WhatsApp',
    image: '/images/services/expediteurs.jpg',
    href: '/expediteurs',
  },
  {
    title: 'Compagnies',
    subtitle: 'Rapports automatisés, gestion flotte, statistiques live',
    image: '/images/services/compagnies.jpg',
    href: '/compagnies',
  },
  {
    title: 'Écrans Affichage',
    subtitle: 'Horaires live, départs & arrivées, alertes voyageurs',
    image: '/images/services/affichage.jpg',
    href: '/ecrans-affichage',
  },
];

const FEATURES = [
  {
    title: 'WhatsApp Intégré',
    description: 'Notifications automatiques à chaque étape : activation, départ, transit, arrivée.',
    icon: MessageCircle,
    gradient: 'from-[#25D366] to-[#128C7E]',
    iconBg: 'bg-white/25',
  },
  {
    title: 'QR Code Scan',
    description: 'Activation en 30 secondes, validation billets, scan multi-agences.',
    icon: ScanLine,
    gradient: 'from-[#3B82F6] to-[#1D4ED8]',
    iconBg: 'bg-white/25',
  },
  {
    title: 'Progressive Web App',
    description: 'Installation instantanée, pas besoin de Play Store ou App Store.',
    icon: Smartphone,
    gradient: 'from-[#8B5CF6] to-[#6D28D9]',
    iconBg: 'bg-white/25',
  },
  {
    title: 'Dashboard Intelligent',
    description: 'KPIs en temps réel, graphiques, gestion complète de votre activité.',
    icon: LayoutDashboard,
    gradient: 'from-[#F59E0B] to-[#D97706]',
    iconBg: 'bg-white/25',
  },
  {
    title: 'Mode Hors-Ligne',
    description: 'Continuez à travailler même dans les zones sans connexion internet.',
    icon: WifiOff,
    gradient: 'from-[#06B6D4] to-[#0891B2]',
    iconBg: 'bg-white/25',
  },
  {
    title: 'Sécurité Maximale',
    description: 'Code PIN à 6 chiffres, RGPD conforme, journal d\'audit complet.',
    icon: ShieldCheck,
    gradient: 'from-[#EF4444] to-[#DC2626]',
    iconBg: 'bg-white/25',
  },
];

const STEPS = [
  {
    step: '01',
    title: 'Scannez ou saisissez',
    description: 'Scannez le QR code du billet ou saisissez manuellement la référence du colis à activer.',
    image: '/images/steps/step1-scan.png',
    gradient: 'from-blue-500 to-cyan-400',
  },
  {
    step: '02',
    title: 'Activez en 30s',
    description: 'Entrez les infos expéditeur et destinataire. Le colis est activé et sécurisé instantanément.',
    image: '/images/steps/step2-activate.png',
    gradient: 'from-[#FF6B35] to-[#FF1D8D]',
  },
  {
    step: '03',
    title: 'Suivez en temps réel',
    description: 'Recevez des notifications WhatsApp à chaque étape du parcours jusqu\'à la livraison.',
    image: '/images/steps/step3-track.png',
    gradient: 'from-emerald-500 to-teal-400',
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
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl shadow-lg border-b border-slate-200/80 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center group">
            <Image
              src="/logo-full.png"
              alt="SmarticketS"
              width={374}
              height={135}
              className="h-12 sm:h-14 lg:h-16 w-auto"
            />
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
              className={`text-sm font-medium text-slate-800 hover:text-slate-900 hover:bg-black/5 active:bg-black/10 rounded-md px-3 py-1.5 transition-colors duration-200 ${
                isOnHero ? '' : ''
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
              className={`flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors`}
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
            className="lg:hidden p-1 text-slate-900 transition-colors duration-300"
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
              <Link href="/demo-affichage">
                <Button className="w-full sm:w-auto bg-[#00A887] hover:bg-[#008f72] text-white px-7 py-3.5 rounded-xl font-semibold text-sm shadow-xl shadow-[#00A887]/30 transition-all gap-2">
                  <Monitor className="w-4 h-4" />
                  Voir la Démo
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
   4. SERVICES SECTION — Identique au design de référence Tranx
   ============================================================ */

function ServicesSection() {
  return (
    <section id="services" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <FadeIn className="text-center mb-14 sm:mb-16">
          <span className="inline-block px-4 py-1.5 bg-[#00A887]/10 text-[#00A887] text-xs font-bold tracking-widest uppercase rounded-full mb-4">
            Services
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#1A1A1A] mb-4 tracking-tight">
            Nos{' '}
            <span className="text-[#00A887]">Services</span>
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Des solutions complètes pour chaque acteur du transport inter-villes.
          </p>
        </FadeIn>

        {/* Cards Grid — 4 cards, no gap, 680px height on desktop */}
        <FadeIn>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-0">
            {SERVICES.map((service) => (
              <Link
                key={service.title}
                href={service.href}
                className="group relative overflow-hidden rounded-[4px] shadow-[0_2px_12px_rgba(0,0,0,0.08)] h-[400px] sm:h-[520px] lg:h-[680px] cursor-pointer block"
              >
                {/* Image — full height */}
                <Image
                  src={service.image}
                  alt={service.title}
                  fill
                  className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.05]"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />

                {/* Hover overlay — 20% dark */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />

                {/* Bottom info bar — 15% height */}
                <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm p-3 sm:p-4 lg:p-5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm sm:text-base lg:text-lg font-bold text-[#1A1A1A] truncate">
                        {service.title}
                      </h3>
                      <p className="text-[11px] sm:text-xs lg:text-sm text-slate-500 leading-snug mt-0.5 line-clamp-2">
                        {service.subtitle}
                      </p>
                    </div>

                    {/* Green "+" button — rotates 45° on hover */}
                    <div className="flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-full bg-[#00A887] flex items-center justify-center transition-transform duration-300 group-hover:rotate-45 hover:bg-[#008f72]">
                      <svg
                        className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

/* ============================================================
   5. FEATURES SECTION
   ============================================================ */

function FeaturesSection() {
  return (
    <section id="fonctionnalites" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <FadeIn className="text-center mb-14 sm:mb-16">
          <span className="inline-block px-4 py-1.5 bg-[#00A887]/10 text-[#00A887] text-xs font-bold tracking-widest uppercase rounded-full mb-4">
            Fonctionnalités
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#1A1A1A] mb-4 tracking-tight">
            Tout ce dont vous avez{' '}
            <span className="text-[#00A887]">besoin</span>
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Des fonctionnalités puissantes conçues pour le transport inter-villes africain.
          </p>
        </FadeIn>

        {/* Feature cards — multicolor gradient style */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
          {FEATURES.map((feature, i) => (
            <FadeIn key={feature.title} delay={i * 0.08}>
              <motion.div
                whileHover={{ y: -4 }}
                className="group rounded-xl overflow-hidden cursor-pointer transition-all duration-300 shadow-[0_4px_16px_rgba(0,0,0,0.12)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
              >
                {/* Card content — gradient background */}
                <div className={`bg-gradient-to-br ${feature.gradient} p-6 rounded-xl`}>
                  {/* Icon circle */}
                  <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-sm text-white/80 leading-relaxed">{feature.description}</p>
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
   6. HOW IT WORKS SECTION
   ============================================================ */

const STEP_RINGS: Record<string, string> = {
  'from-blue-500 to-cyan-400': 'ring-blue-200/50',
  'from-[#FF6B35] to-[#FF1D8D]': 'ring-orange-200/50',
  'from-emerald-500 to-teal-400': 'ring-emerald-200/50',
};

const STEP_GLOWS: Record<string, string> = {
  'from-blue-500 to-cyan-400': 'shadow-blue-500/25',
  'from-[#FF6B35] to-[#FF1D8D]': 'shadow-orange-500/25',
  'from-emerald-500 to-teal-400': 'shadow-emerald-500/25',
};

const STEP_ICONS: string[] = ['📱', '⚡', '📍'];

function HowItWorksSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

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

        {/* Steps — same design as StatsSection KPI cards */}
        <div ref={ref} className="grid md:grid-cols-3 gap-5 lg:gap-6 mb-16">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.step}
              className={`relative group overflow-hidden rounded-2xl bg-gradient-to-br ${step.gradient} shadow-xl ${STEP_GLOWS[step.gradient]} hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 ring-1 ${STEP_RINGS[step.gradient]}`}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={inView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 30, scale: 0.95 }}
              transition={{ duration: 0.6, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Light overlay for depth */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/15 to-transparent pointer-events-none" />

              <div className="relative z-10 p-6 lg:p-8">
                {/* Image */}
                <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-5 shadow-lg ring-1 ring-white/20">
                  <Image
                    src={step.image}
                    alt={step.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>

                {/* Step number + icon */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl drop-shadow-sm">{STEP_ICONS[i]}</span>
                  <span className="text-white/70 text-sm font-bold tracking-wider">ÉTAPE {step.step}</span>
                </div>

                {/* Title */}
                <h3 className="text-xl lg:text-2xl font-extrabold text-white mb-2 tracking-tight">{step.title}</h3>

                {/* Description */}
                <p className="text-sm lg:text-base text-white/80 leading-relaxed">{step.description}</p>
              </div>
            </motion.div>
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
   10. MISSING PASSENGER LIVE DEMO SECTION
   ============================================================ */

function MissingPassengerLiveSection() {
  return (
    <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-red-50/50">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <FadeIn className="text-center mb-10 sm:mb-12">
          <span className="inline-block px-4 py-1.5 bg-red-50 text-red-600 text-xs font-bold tracking-widest uppercase rounded-full mb-4">
            Passager Manquant
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
            Alertes{' '}
            <span className="text-red-600">Temps Réel</span>
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Détecte automatiquement les passagers avec billet validé qui ne se sont pas présentés
            à l&apos;embarquement. Déclenchement 15 minutes avant le départ.
          </p>
        </FadeIn>

        {/* Live Alert Component */}
        <FadeIn delay={0.2}>
          <MissingPassengerAlert agencyId="demo-agency-1" />
        </FadeIn>
      </div>
    </section>
  );
}

/* ============================================================
   FOOTER
   ============================================================ */

function FooterSection() {
  return (
    <footer id="footer" className="bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand column */}
          <div className="col-span-2">
            <Link href="/" className="inline-flex items-center mb-4">
              <Image src="/logo-full.png" alt="SmarticketS" width={374} height={135} className="h-8 w-auto brightness-0 invert" />
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
   10. MODULE 5 SHOWCASE — PWA, WhatsApp Share, PDF, Driver
   ============================================================ */

function Module5Showcase() {
  return (
    <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-emerald-50 to-white relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-100/30 rounded-full blur-3xl" />
      </div>
      <div className="max-w-6xl mx-auto relative z-10">
        <FadeIn className="text-center mb-14 sm:mb-16">
          <span className="inline-block px-4 py-1.5 bg-emerald-100 text-emerald-700 text-xs font-bold tracking-widest uppercase rounded-full mb-4">
            Outils PWA
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
            Tout pour le{' '}
            <span className="text-emerald-600">terrain</span>
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            PWA installable, partage WhatsApp, tickets PDF, dashboard chauffeur — tout fonctionne hors ligne.
          </p>
        </FadeIn>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: PWA Install */}
          <FadeIn delay={0.05}>
            <motion.div whileHover={{ y: -4 }} className="bg-white rounded-2xl p-6 shadow-lg shadow-slate-900/5 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300 border border-emerald-100 h-full">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center mb-4">
                <Smartphone className="w-7 h-7 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">PWA Installable</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Installation instantanée sur Android &amp; iOS. Pas de store, pas de téléchargement. Fonctionne hors ligne.
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs text-emerald-600 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Service Worker actif</span>
              </div>
            </motion.div>
          </FadeIn>

          {/* Card 2: WhatsApp Share */}
          <FadeIn delay={0.1}>
            <motion.div whileHover={{ y: -4 }} className="bg-white rounded-2xl p-6 shadow-lg shadow-slate-900/5 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300 border border-emerald-100 h-full">
              <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center mb-4">
                <MessageCircle className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">WhatsApp Web Share</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Partagez tickets et confirmations via Web Share API ou lien wa.me. Fallback clipboard automatique.
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs text-green-600 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>3 stratégies de partage</span>
              </div>
            </motion.div>
          </FadeIn>

          {/* Card 3: PDF Tickets */}
          <FadeIn delay={0.15}>
            <motion.div whileHover={{ y: -4 }} className="bg-white rounded-2xl p-6 shadow-lg shadow-slate-900/5 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300 border border-emerald-100 h-full">
              <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center mb-4">
                <FileDown className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Tickets PDF jsPDF</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Génération PDF côté client via jsPDF. Ticket A4 avec QR, données passager, code contrôle. Téléchargement instantané.
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs text-blue-600 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Client-side, offline-ready</span>
              </div>
            </motion.div>
          </FadeIn>

          {/* Card 4: Driver Dashboard */}
          <FadeIn delay={0.2}>
            <motion.div whileHover={{ y: -4 }} className="bg-white rounded-2xl p-6 shadow-lg shadow-slate-900/5 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300 border border-emerald-100 h-full">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mb-4">
                <Truck className="w-7 h-7 text-amber-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Dashboard Chauffeur</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Interface chauffeur PWA : livraisons en transit, validation PIN, notifications WhatsApp destinataire, mode hors ligne.
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs text-amber-600 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>IndexedDB + sync auto</span>
              </div>
            </motion.div>
          </FadeIn>
        </div>

        {/* Thermal receipt + HMAC mention */}
        <FadeIn delay={0.25}>
          <div className="mt-8 p-4 sm:p-6 bg-white/80 backdrop-blur-sm rounded-2xl border border-emerald-100 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">QR Sécurisé HMAC-SHA256</h4>
                  <p className="text-xs text-slate-500">Thermal 80mm + QR signé, expiration 24h, contrôle anti-falsification</p>
                </div>
              </div>
              <div className="sm:ml-auto flex items-center gap-2 text-xs text-slate-400">
                <span className="px-3 py-1.5 bg-slate-100 rounded-lg font-mono font-medium">GET /api/ticket-thermal/:ref</span>
                <span className="px-3 py-1.5 bg-slate-100 rounded-lg font-mono font-medium">GET /api/ticket-pdf/:ref</span>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

/* ============================================================
   MAIN PAGE
   ============================================================ */

export default function HomePage() {
  return (
    <>
      <PWAManager />
      <Navigation />
      <main id="main-content">
        <HeroSection />
        <StatsSection />
        <ServicesSection />
        <FeaturesSection />
        <HowItWorksSection />
        <WhyChooseUsSection />
        <TestimonialsSection />
        <MissingPassengerLiveSection />
        <Module5Showcase />
        <CTASection />
      </main>
      <FooterSection />
      <WhatsAppFloat />
    </>
  );
}
