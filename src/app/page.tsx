'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import Image from 'next/image';
import { motion, useInView } from 'framer-motion';

const LandingChatbotWidget = dynamic(
  () => import('@/components/finder/LandingChatbotWidget'),
  { ssr: false, loading: () => null }
);
import TrackingWidget from '@/components/home/TrackingWidget';
import {
  Plane,
  Luggage,
  QrCode,
  Smartphone,
  MapPin,
  MessageCircle,
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
  Shield,
  Globe,
  Heart,
  CheckCircle,
  ChevronRight,
  Search,
  Ship,
  Bus,
  CheckCircle2,
} from "lucide-react";

/* ──────────────────────────────────────────────
   Fade-in wrapper (Framer Motion)
   ────────────────────────────────────────────── */
function FadeIn({ children, className, delay = 0, direction = 'up' }: { children: React.ReactNode; className?: string; delay?: number; direction?: 'up' | 'down' | 'left' | 'right' }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const directions = {
    up: { y: 40, x: 0 },
    down: { y: -40, x: 0 },
    left: { x: 40, y: 0 },
    right: { x: -40, y: 0 },
  };
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, ...directions[direction] }}
      animate={inView ? { opacity: 1, x: 0, y: 0 } : { opacity: 0, ...directions[direction] }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ══════════════════════════════════════════════
   STICKY SEARCH BAR
   ══════════════════════════════════════════════ */
function StickySearchBar() {
  const router = useRouter();
  const [refValue, setRefValue] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [error, setError] = useState('');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const pattern = useMemo(() => /^[A-Z]{2,4}\d{2}-[A-Z0-9]{4,8}$/, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setRefValue(val);
    if (val.length === 0) {
      setIsValid(false);
      setError('');
    } else if (pattern.test(val)) {
      setIsValid(true);
      setError('');
    } else {
      setIsValid(false);
      if (val.length >= 7) {
        setError('Format : AB12-XXXX');
      } else {
        setError('');
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid) {
      router.push(`/suivi/${refValue}`);
    }
  };

  return (
    <div
      className={`fixed top-16 lg:top-20 left-0 right-0 z-40 transition-all duration-500 ${
        visible
          ? 'translate-y-0 opacity-100'
          : '-translate-y-4 opacity-0 pointer-events-none'
      }`}
    >
      <div className="bg-white/95 backdrop-blur-xl shadow-lg border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <form onSubmit={handleSubmit} className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
              <input
                type="text"
                value={refValue}
                onChange={handleChange}
                placeholder="Suivre un bagage — ex: AB12-CDEF"
                className={`w-full pl-11 pr-4 py-3 rounded-xl border text-sm font-medium transition-all duration-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 ${
                  isValid
                    ? 'border-emerald-400 focus:ring-emerald-500/20 text-slate-900'
                    : error
                    ? 'border-red-300 focus:ring-red-500/20 text-slate-900'
                    : 'border-slate-200 focus:ring-orange-500/20 text-slate-900 placeholder:text-slate-400'
                }`}
                maxLength={13}
              />
              {error && (
                <p className="absolute -bottom-5 left-3.5 text-xs text-red-500 font-medium">{error}</p>
              )}
            </div>
            <Button
              type="submit"
              disabled={!isValid}
              className={`rounded-xl px-5 py-3 font-semibold text-sm transition-all gap-2 ${
                isValid
                  ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/20 hover:shadow-lg hover:shadow-orange-500/30'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline">Suivre</span>
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   NAVIGATION (LIGHT THEME)
   ══════════════════════════════════════════════ */
function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
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
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-white/95 backdrop-blur-xl shadow-lg shadow-slate-200/50 border-b border-slate-200' : 'bg-white/80 backdrop-blur-md'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-gradient-to-br from-[#FF6B35] to-[#D4AF37] rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:shadow-orange-500/40 transition-shadow">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">QRBag</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map(link => (
              <a key={link.href} href={link.href} className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors duration-300 relative after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px] after:bg-[#D4AF37] after:transition-all after:duration-300 hover:after:w-full">
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/demo">
              <Button variant="ghost" className="text-slate-600 hover:text-slate-900 text-sm font-medium gap-1.5 hover:bg-slate-100">
                <Play className="w-3.5 h-3.5" />
                Démo
              </Button>
            </Link>
            <Link href="/agence/connexion">
              <Button variant="ghost" className="text-slate-500 hover:text-slate-900 text-sm font-medium border border-slate-200 hover:border-slate-300 hover:bg-slate-50">
                Espace Agence
              </Button>
            </Link>
            <Link href="/devenir-partenaire">
              <Button className="bg-gradient-to-r from-[#D4AF37] to-[#FF6B35] hover:from-[#c4a030] hover:to-[#e65a28] text-white font-medium text-sm rounded-full px-5 shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 transition-all hover:scale-[1.02]">
                Devenir Partenaire
              </Button>
            </Link>
          </div>

          <button
            className="md:hidden text-slate-900 p-1"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Menu"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden py-4 border-t border-slate-200 bg-white/98 backdrop-blur-xl"
          >
            <div className="flex flex-col gap-3">
              {navLinks.map(link => (
                <a key={link.href} href={link.href} className="text-slate-700 hover:text-slate-900 font-medium py-2 text-lg" onClick={() => setIsOpen(false)}>
                  {link.label}
                </a>
              ))}
              <hr className="border-slate-200" />
              <Link href="/demo" onClick={() => setIsOpen(false)}>
                <Button variant="ghost" className="w-full text-slate-600 justify-start gap-2 hover:bg-slate-50">
                  <Play className="w-4 h-4" /> Voir la démo
                </Button>
              </Link>
              <Link href="/agence/connexion" onClick={() => setIsOpen(false)}>
                <Button variant="ghost" className="w-full text-slate-500 border border-slate-200 justify-start">Espace Agence</Button>
              </Link>
              <Link href="/devenir-partenaire" onClick={() => setIsOpen(false)}>
                <Button className="w-full bg-gradient-to-r from-[#D4AF37] to-[#FF6B35] text-white font-medium rounded-full">
                  Devenir Partenaire
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </nav>
  );
}

/* ══════════════════════════════════════════════
   HERO SECTION (LIGHT THEME)
   ══════════════════════════════════════════════ */
function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-white">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/images/landing-v2/hero.jpg"
          alt="Voyageurs avec bagages à l'aéroport"
          fill
          className="object-cover scale-105"
          priority
          quality={90}
        />
        {/* Light gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-white/50 to-white" />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 bg-[#D4AF37]/30 rounded-full"
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.6, 0.2],
            }}
            transition={{
              duration: 4 + i * 0.5,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.8,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center pt-24 pb-20">
        <FadeIn>
          <div className="inline-flex items-center gap-2 mb-8 px-5 py-2.5 bg-white/80 border border-[#D4AF37]/30 rounded-full backdrop-blur-sm shadow-sm">
            <span className="w-2 h-2 bg-[#D4AF37] rounded-full animate-pulse" />
            <span className="text-sm font-medium text-[#D4AF37] tracking-wide">La protection intelligente pour vos bagages</span>
          </div>
        </FadeIn>

        <FadeIn delay={0.15}>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-slate-900 mb-6 leading-[1.08] tracking-tight">
            Un bagage perdu n&apos;est pas{' '}
            <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-[#D4AF37] to-[#FF6B35] bg-clip-text text-transparent">
              une fatalité.
            </span>
          </h1>
        </FadeIn>

        <FadeIn delay={0.3}>
          <p className="text-lg sm:text-xl md:text-2xl text-slate-600 max-w-3xl mx-auto mt-6 leading-relaxed font-light">
            QRBag transforme la perte en opportunité — grâce à la technologie, la confiance, et le respect.
          </p>
        </FadeIn>

        <FadeIn delay={0.45}>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
            <Link href="/demo">
              <Button className="bg-[#D4AF37] hover:bg-[#c4a030] text-slate-900 px-8 py-4 rounded-full font-semibold text-base shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/40 hover:scale-[1.02] transition-all duration-300 gap-2.5">
                <Play className="w-4 h-4" />
                Découvrir la démo immersive
              </Button>
            </Link>
            <Link href="/contact">
              <Button className="bg-[#FF6B35] hover:bg-[#e65a28] text-white px-8 py-4 rounded-full font-semibold text-base shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/40 hover:scale-[1.02] transition-all duration-300 gap-2.5 relative overflow-hidden">
                <motion.span
                  className="absolute inset-0 bg-white/20"
                  animate={{ opacity: [0, 0.3, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
                <span className="relative">Commander dès maintenant</span>
                <ArrowRight className="w-4 h-4 relative" />
              </Button>
            </Link>
          </div>
        </FadeIn>

        <FadeIn delay={0.6}>
          <div className="flex flex-wrap justify-center gap-4 mt-12">
            {[
              { icon: Smartphone, text: 'Sans application' },
              { icon: Zap, text: 'Sans batterie' },
              { icon: MapPin, text: 'Géolocalisé en temps réel' },
              { icon: Lock, text: 'Sécurisé RGPD' },
            ].map((item, idx) => (
              <motion.div
                key={item.text}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/80 border border-slate-200 rounded-full backdrop-blur-sm shadow-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + idx * 0.1, duration: 0.5 }}
              >
                <item.icon className="w-4 h-4 text-[#D4AF37]" />
                <span className="text-xs font-medium text-slate-700">{item.text}</span>
              </motion.div>
            ))}
          </div>
        </FadeIn>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent" />
    </section>
  );
}

/* ══════════════════════════════════════════════
   QRBag EN ACTION SECTION (NEW)
   ══════════════════════════════════════════════ */
function QRBagEnActionSection() {
  const features = [
    'Scan instantané du QR code',
    'Notification WhatsApp en temps réel',
    'Géolocalisation précise du bagage',
    'Interface intuitive sans application',
  ];

  return (
    <section className="py-24 lg:py-32 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left - QR Code Image */}
          <FadeIn direction="right">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-[#D4AF37]/20 to-[#FF6B35]/20 rounded-3xl blur-2xl" />
              <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-slate-200/80 border border-slate-200">
                <Image
                  src="/images/landing-v2/qrcode-reel.jpg"
                  alt="QR Code QRBag apposé sur un bagage"
                  width={1024}
                  height={1024}
                  className="w-full h-auto object-cover"
                />
              </div>
              {/* Floating badge */}
              <motion.div
                className="absolute -bottom-4 -right-4 bg-orange-500 text-white px-5 py-3 rounded-2xl shadow-lg shadow-orange-500/30 font-bold text-sm"
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >
                98% de récupération
              </motion.div>
            </div>
          </FadeIn>

          {/* Right - Content */}
          <FadeIn direction="left" delay={0.2}>
            <div>
              <span className="text-sm font-semibold tracking-[0.2em] uppercase text-orange-500 mb-4 block">QRBag en action</span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-6 tracking-tight leading-tight">
                QRBag en action <span className="inline-block">🎯</span>
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed mb-8">
                Scannez, activez, voyagez. Notre technologie QR code brevetée permet à n&apos;importe qui de signaler un bagage trouvé en un seul geste. Vous recevez instantanément une notification avec la localisation exacte de votre valise.
              </p>

              <div className="space-y-4">
                {features.map((feature, i) => (
                  <motion.div
                    key={feature}
                    className="flex items-center gap-3"
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
                  >
                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                    <span className="text-slate-700 font-medium">{feature}</span>
                  </motion.div>
                ))}
              </div>

              <div className="mt-8">
                <Link href="/demo">
                  <Button className="bg-[#D4AF37] hover:bg-[#c4a030] text-slate-900 px-7 py-3.5 rounded-full font-semibold text-sm shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/40 transition-all hover:scale-[1.02] gap-2">
                    <Play className="w-4 h-4" />
                    Voir la démo interactive
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
   TRANSPORT MODES SECTION (NEW)
   ══════════════════════════════════════════════ */
function TransportModesSection() {
  const modes = [
    {
      title: 'Avion',
      description: 'Protégez vos bagages en soute et cabine lors de vos vols internationaux et domestiques.',
      image: '/images/landing-v2/transport-avion.jpg',
      stat: '15M+ passagers/an',
      icon: Plane,
    },
    {
      title: 'Train',
      description: 'Voyagez serein en TGV, Eurostar ou trains régionaux avec une protection continue.',
      image: '/images/landing-v2/transport-train.jpg',
      stat: '4.5M voyageurs/jour',
      icon: Zap,
    },
    {
      title: 'Bateau',
      description: 'Croisières et ferrys — QRBag protège vos bagages sur tous les mers du monde.',
      image: '/images/landing-v2/transport-bateau.jpg',
      stat: '30M croisiéristes',
      icon: Ship,
    },
    {
      title: 'Bus',
      description: 'Bus intercity et autocars — ne perdez plus jamais vos bagages en voyage.',
      image: '/images/landing-v2/transport-bus.jpg',
      stat: '200K trajets/jour',
      icon: Bus,
    },
  ];

  return (
    <section className="py-24 lg:py-32 px-4 bg-slate-50">
      <div className="max-w-6xl mx-auto">
        <FadeIn className="text-center mb-16">
          <span className="text-sm font-semibold tracking-[0.2em] uppercase text-orange-500 mb-4 block">Tous les modes de transport</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-5 tracking-tight">
            Une protection pour tous vos voyages
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Avion, train, bateau, bus — QRBag vous suit partout.
          </p>
        </FadeIn>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {modes.map((mode, i) => (
            <FadeIn key={mode.title} delay={i * 0.12}>
              <div className="group h-full bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-slate-200/60 transition-all duration-500 hover:-translate-y-1">
                {/* Image */}
                <div className="relative h-48 overflow-hidden">
                  <Image
                    src={mode.image}
                    alt={mode.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  {/* Icon overlay */}
                  <div className="absolute top-3 left-3 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-sm">
                    <mode.icon className="w-5 h-5 text-orange-500" />
                  </div>
                  {/* Stat badge */}
                  <div className="absolute bottom-3 right-3 bg-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md">
                    {mode.stat}
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{mode.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{mode.description}</p>
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
   POURQUOI QRBAG (LIGHT THEME)
   ══════════════════════════════════════════════ */
function WhyQRBagSection() {
  const cards = [
    {
      icon: Globe,
      title: 'Ancré en Afrique, pensé pour le monde',
      description: 'Né à Dakar, déployé dans 15 pays. QRBag comprend les réalités du voyage africain et international avec une solution adaptée à chaque contexte.',
    },
    {
      icon: Shield,
      title: 'Sécurité certifiée RGPD',
      description: 'Zéro donnée sensible stockée publiquement. Vos informations personnelles sont chiffrées et protégées selon les normes européennes les plus strictes.',
    },
    {
      icon: Heart,
      title: 'Pour les pèlerins, les voyageurs, les agences',
      description: 'Hajj, Omra, tourisme, affaires — une seule solution qui s\'adapte à chaque voyageur. Plus de 10 000 bagages déjà protégés à travers le monde.',
    },
  ];

  return (
    <section className="relative py-24 lg:py-32 px-4 bg-white">
      <div className="max-w-6xl mx-auto relative z-10">
        <FadeIn className="text-center mb-16">
          <span className="text-sm font-semibold tracking-[0.2em] uppercase text-[#D4AF37] mb-4 block">Pourquoi QRBag</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-5 tracking-tight leading-tight">
            La confiance, au-delà<br className="hidden sm:block" /> des frontières
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Une technologie conçue avec soin pour servir les voyageurs les plus exigeants.
          </p>
        </FadeIn>

        <div className="grid md:grid-cols-3 gap-5 lg:gap-6">
          {cards.map((card, i) => (
            <FadeIn key={card.title} delay={i * 0.12}>
              <div className="group relative h-full bg-white border border-slate-200 rounded-2xl p-7 lg:p-8 shadow-sm hover:shadow-xl hover:shadow-slate-200/60 transition-all duration-500 hover:-translate-y-1">
                {/* Gold corner accent */}
                <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden rounded-tr-2xl">
                  <div className="absolute top-0 right-0 w-[1px] h-8 bg-gradient-to-b from-[#D4AF37]/50 to-transparent" />
                  <div className="absolute top-0 right-0 h-[1px] w-8 bg-gradient-to-l from-[#D4AF37]/50 to-transparent" />
                </div>

                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#D4AF37]/10 to-[#FF6B35]/10 border border-[#D4AF37]/20 flex items-center justify-center mb-6 group-hover:from-[#D4AF37]/20 group-hover:to-[#FF6B35]/20 transition-all duration-500">
                  <card.icon className="w-7 h-7 text-[#D4AF37]" />
                </div>

                <h3 className="text-lg lg:text-xl font-bold text-slate-900 mb-3 leading-snug">
                  {card.title}
                </h3>

                <p className="text-sm text-slate-600 leading-relaxed">
                  {card.description}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════
   SOLUTIONS (LIGHT THEME)
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
      href: '/hajj-omra',
    },
    {
      title: 'Voyageurs Standard',
      description: 'Protection flexible pour tous vos voyages. Choisissez 1 ou 3 bagages avec une durée adaptée à vos besoins.',
      icon: <Plane className="w-8 h-8" />,
      href: '/voyageurs-standard',
    },
    {
      title: '100% Sécurisé',
      description: 'Vos données personnelles sont protégées et cryptées. Aucune information sensible n\'est exposée publiquement.',
      icon: <Lock className="w-8 h-8" />,
      href: '/confidentialite',
    },
  ];

  return (
    <section id="solutions" className="relative py-24 lg:py-32 px-4 bg-slate-50">
      <div className="max-w-6xl mx-auto relative z-10">
        <FadeIn className="text-center mb-16">
          <span className="text-sm font-semibold tracking-[0.2em] uppercase text-[#FF6B35] mb-4 block">Solutions</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-5 tracking-tight">
            Deux solutions, une protection
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Que vous soyez pèlerin ou voyageur, QRBag s&apos;adapte à vos besoins avec des solutions sur mesure.
          </p>
        </FadeIn>

        <div className="grid md:grid-cols-3 gap-5 lg:gap-6">
          {solutions.map((sol, i) => (
            <FadeIn key={sol.title} delay={i * 0.12}>
              <div className="group relative h-full bg-white border border-slate-200 rounded-2xl p-7 lg:p-8 shadow-sm hover:shadow-xl hover:shadow-slate-200/60 transition-all duration-500 hover:-translate-y-1 flex flex-col">
                {/* Orange corner accent */}
                <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden rounded-tr-2xl">
                  <div className="absolute top-0 right-0 w-[1px] h-8 bg-gradient-to-b from-[#FF6B35]/40 to-transparent" />
                  <div className="absolute top-0 right-0 h-[1px] w-8 bg-gradient-to-l from-[#FF6B35]/40 to-transparent" />
                </div>

                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FF6B35]/10 to-[#D4AF37]/10 border border-[#FF6B35]/20 flex items-center justify-center mb-6 text-[#FF6B35] group-hover:from-[#FF6B35]/20 group-hover:to-[#D4AF37]/20 transition-all duration-500">
                  {sol.icon}
                </div>

                <h3 className="text-lg lg:text-xl font-bold text-slate-900 mb-3 leading-snug">
                  {sol.title}
                </h3>

                <p className="text-sm text-slate-600 leading-relaxed flex-1">
                  {sol.description}
                </p>

                <Link href={sol.href} className="mt-6">
                  <Button variant="ghost" className="text-[#D4AF37] hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 font-medium text-sm rounded-full border border-[#D4AF37]/20 hover:border-[#D4AF37]/40 transition-all gap-2 w-full group/btn">
                    En savoir plus
                    <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform" />
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
   COMMENT ÇA MARCHE (LIGHT THEME)
   ══════════════════════════════════════════════ */
function HowItWorksSection() {
  const steps = [
    {
      number: '01',
      title: 'Recevez votre QR',
      description: 'Commandez vos QR codes via notre formulaire B2B ou auprès de votre agence partenaire.',
      icon: QrCode,
    },
    {
      number: '02',
      title: 'Activez en 30 secondes',
      description: 'Scannez le QR code et remplissez le formulaire avec vos informations de voyage.',
      icon: Zap,
    },
    {
      number: '03',
      title: 'Voyagez serein',
      description: 'Vos bagages sont protégés. Collez simplement l\'autocollant bien visible sur chaque valise.',
      icon: Plane,
    },
    {
      number: '04',
      title: 'Soyez notifié instantanément',
      description: 'Si quelqu\'un trouve votre bagage, vous recevez une alerte immédiatement via WhatsApp.',
      icon: Bell,
    },
  ];

  return (
    <section id="comment" className="relative py-24 lg:py-32 px-4 bg-white">
      <div className="max-w-6xl mx-auto relative z-10">
        <FadeIn className="text-center mb-16">
          <span className="text-sm font-semibold tracking-[0.2em] uppercase text-[#D4AF37] mb-4 block">Comment ça marche</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-5 tracking-tight">
            La protection en 4 étapes
          </h2>
          <p className="text-lg text-slate-600 max-w-xl mx-auto">
            Simple, rapide, sans application à installer.
          </p>
        </FadeIn>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 relative">
          {/* Connecting line (desktop) */}
          <div className="hidden lg:block absolute top-[3.5rem] left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-[#D4AF37]/20 via-[#D4AF37]/40 to-[#D4AF37]/20" />

          {steps.map((step, i) => (
            <FadeIn key={step.number} delay={i * 0.12}>
              <div className="relative group bg-white border border-slate-200 rounded-2xl p-7 text-center shadow-sm hover:border-[#D4AF37]/30 hover:shadow-lg hover:shadow-slate-200/60 transition-all duration-500 hover:-translate-y-1">
                <div className="w-14 h-14 bg-gradient-to-br from-[#FF6B35] to-[#D4AF37] rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg shadow-orange-500/20 relative z-10 group-hover:shadow-orange-500/40 transition-shadow">
                  <span className="text-white font-bold text-lg">{step.number}</span>
                </div>

                <div className="w-10 h-10 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <step.icon className="w-5 h-5 text-[#D4AF37]" />
                </div>

                <h3 className="font-bold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{step.description}</p>
              </div>
            </FadeIn>
          ))}
        </div>

        <FadeIn delay={0.4} className="mt-14 text-center">
          <Link href="/demo">
            <Button className="bg-[#D4AF37] hover:bg-[#c4a030] text-slate-900 px-7 py-3.5 rounded-full font-semibold text-sm shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/40 transition-all hover:scale-[1.02] gap-2">
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
   STATISTICS (LIGHT THEME)
   ══════════════════════════════════════════════ */
function StatsSection() {
  const stats = [
    { value: '10K+', label: 'Bagages protégés', icon: Luggage },
    { value: '500+', label: 'Agences partenaires', icon: Users },
    { value: '98%', label: 'Taux de récupération', icon: CheckCircle },
    { value: '24/7', label: 'Support disponible', icon: Headphones },
  ];

  return (
    <section className="py-20 px-4 bg-slate-50 border-y border-slate-200">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {stats.map((stat, i) => (
            <FadeIn key={stat.label} delay={i * 0.08}>
              <div className="relative group bg-white border border-slate-200 rounded-2xl p-6 lg:p-8 text-center shadow-sm hover:border-[#D4AF37]/30 hover:shadow-lg hover:shadow-slate-200/60 transition-all duration-500">
                <div className="w-11 h-11 bg-gradient-to-br from-[#D4AF37]/10 to-transparent border border-[#D4AF37]/10 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:border-[#D4AF37]/30 transition-colors">
                  <stat.icon className="w-5 h-5 text-[#D4AF37]" />
                </div>
                <p className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">{stat.value}</p>
                <p className="text-sm text-slate-600 mt-1">{stat.label}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════
   TÉMOIGNAGES (LIGHT THEME)
   ══════════════════════════════════════════════ */
function TestimonialsSection() {
  const testimonials = [
    {
      name: 'Mamadou Diallo',
      role: 'Pèlerin Hajj 2025',
      content: 'Grâce à QRBag, j\'ai retrouvé ma valise à Djeddah en moins de 2 heures. Une invention géniale qui devrait être obligatoire pour tous les pèlerins.',
      image: '/images/testimonial-1.png',
      initials: 'MD',
    },
    {
      name: 'Sophie Martin',
      role: 'Voyageuse fréquente',
      content: 'Simple, efficace et pas cher. J\'ai utilisé QRBag pour tous mes voyages cette année. Plus de stress à l\'aéroport, enfin !',
      image: '/images/testimonial-2.png',
      initials: 'SM',
    },
  ];

  return (
    <section className="relative py-24 lg:py-32 px-4 bg-white">
      <div className="max-w-6xl mx-auto relative z-10">
        <FadeIn className="text-center mb-16">
          <span className="text-sm font-semibold tracking-[0.2em] uppercase text-[#D4AF37] mb-4 block">Témoignages</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-5 tracking-tight">
            Ils nous font confiance
          </h2>
          <p className="text-lg text-slate-600 max-w-xl mx-auto">
            Des milliers de voyageurs et pèlerins déjà protégés.
          </p>
        </FadeIn>

        <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
          {testimonials.map((t, i) => (
            <FadeIn key={t.name} delay={i * 0.15} direction={i === 0 ? 'right' : 'left'}>
              <div className="group relative bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-slate-200/60 transition-all duration-500">
                {/* Photo */}
                <div className="relative h-64 md:h-72 overflow-hidden">
                  <Image
                    src={t.image}
                    alt={t.name}
                    fill
                    className="object-cover object-top group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                  {/* Stars overlay */}
                  <div className="absolute top-4 right-4 flex gap-0.5">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} className="w-4 h-4 text-[#D4AF37] fill-[#D4AF37]" />
                    ))}
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 lg:p-8">
                  <p className="text-lg text-slate-700 leading-relaxed italic mb-6">
                    &ldquo;{t.content}&rdquo;
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#D4AF37] to-[#FF6B35] rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-amber-900/30">
                      {t.initials}
                    </div>
                    <div>
                      <p className="font-bold text-[#D4AF37] text-sm">{t.name}</p>
                      <p className="text-xs text-slate-500">{t.role}</p>
                    </div>
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
   TARIFS — FORMULES D'ÉLITE (LIGHT THEME)
   ══════════════════════════════════════════════ */
function PricingSection() {
  const plans = [
    {
      title: 'Essentiel',
      badge: 'Basique',
      price: '4 €',
      duration: '7 jours de protection',
      features: [
        '3 étiquettes QR incluses',
        'Support WhatsApp',
        'Notification email',
        'Activation instantanée',
        'Géolocalisation en temps réel',
      ],
      bgClass: 'bg-white border-slate-200',
      btnClass: 'bg-[#D4AF37] hover:bg-[#c4a030] text-slate-900 shadow-lg shadow-amber-500/15',
      popular: false,
    },
    {
      title: 'Premium',
      badge: 'Recommandé',
      price: '7 €',
      duration: '1 an de protection',
      features: [
        '3 étiquettes QR incluses',
        'Support prioritaire 24/7',
        'Renouvellement facile',
        'Statistiques de scans',
        'Protection multi-voyages',
        'Notifications avancées',
      ],
      bgClass: 'bg-white border-[#D4AF37]/40',
      btnClass: 'bg-gradient-to-r from-[#D4AF37] to-[#FF6B35] hover:from-[#c4a030] hover:to-[#e65a28] text-white shadow-lg shadow-orange-500/20',
      popular: true,
    },
  ];

  return (
    <section id="tarifs" className="relative py-24 lg:py-32 px-4 bg-slate-50">
      <div className="max-w-4xl mx-auto relative z-10">
        <FadeIn className="text-center mb-16">
          <span className="text-sm font-semibold tracking-[0.2em] uppercase text-[#D4AF37] mb-4 block">Formules d&apos;élite</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-5 tracking-tight">
            Investissez dans la sérénité
          </h2>
          <p className="text-lg text-slate-600 max-w-xl mx-auto">
            Choisissez la formule adaptée à vos besoins. Pas de frais cachés.
          </p>
        </FadeIn>

        <div className="grid md:grid-cols-2 gap-5 lg:gap-6 items-start">
          {plans.map((plan, i) => (
            <FadeIn key={plan.title} delay={i * 0.12}>
              <div className={`relative rounded-2xl p-8 border ${plan.bgClass} ${plan.popular ? 'shadow-2xl shadow-amber-200/40' : 'shadow-md shadow-slate-200/60'} transition-all duration-500 hover:-translate-y-1`}>
                {/* Badge */}
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-slate-900 text-lg">{plan.title}</h3>
                  <span className={`text-xs font-bold tracking-wider uppercase px-3 py-1 rounded-full border ${plan.popular ? 'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/30' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                    {plan.badge}
                  </span>
                </div>

                <p className="text-sm text-slate-500 mb-5">{plan.duration}</p>

                {/* Price with gold styling */}
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-[#FF6B35] to-[#D4AF37] bg-clip-text text-transparent tracking-tight">
                    {plan.price}
                  </span>
                </div>

                <div className="space-y-3.5 mb-8">
                  {plan.features.map((f, j) => (
                    <div key={j} className="flex items-center gap-3 text-sm text-slate-700">
                      <div className="w-5 h-5 rounded-full border border-[#D4AF37]/30 flex items-center justify-center flex-shrink-0 bg-[#D4AF37]/5">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
                      </div>
                      <span>{f}</span>
                    </div>
                  ))}
                </div>

                <Link href="/contact">
                  <Button className={`w-full rounded-full font-semibold text-sm py-3.5 transition-all hover:scale-[1.02] ${plan.btnClass} gap-2`}>
                    Commander
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>

                {/* Recommended glow effect */}
                {plan.popular && (
                  <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-[#D4AF37]/20 via-transparent to-[#FF6B35]/20 -z-10 blur-sm" />
                )}
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════
   CTA FINAL (LIGHT THEME)
   ══════════════════════════════════════════════ */
function FinalCTASection() {
  return (
    <section className="relative py-24 lg:py-32 px-4 overflow-hidden bg-gradient-to-br from-[#FFF7ED] via-[#FEF3C7] to-[#FFEDD5]">
      {/* Decorative elements */}
      <div className="absolute top-10 left-10 w-64 h-64 bg-[#D4AF37]/10 rounded-full blur-3xl" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-[#FF6B35]/10 rounded-full blur-3xl" />

      <div className="max-w-4xl mx-auto relative z-10 text-center">
        <FadeIn>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-6 tracking-tight leading-tight">
            Ne laissez pas un bagage<br className="hidden sm:block" /> gâcher un voyage.
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            Rejoignez 10 000+ voyageurs qui protègent leurs bagages avec QRBag. Activation en 30 secondes, tranquillité pour tous vos voyages.
          </p>

          <Link href="/contact">
            <Button className="bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-900 font-bold py-5 px-8 rounded-full text-lg shadow-xl shadow-orange-500/25 hover:shadow-2xl hover:shadow-orange-500/40 hover:scale-[1.03] transition-all duration-300 gap-2.5">
              <Zap className="w-5 h-5" />
              Activer votre protection en 30 secondes
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </FadeIn>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════
   CONTACT CTA (LIGHT THEME)
   ══════════════════════════════════════════════ */
function ContactCTASection() {
  return (
    <section className="py-20 px-4 bg-white border-t border-slate-200">
      <div className="max-w-4xl mx-auto text-center">
        <FadeIn>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
            Une question ? Contactez-nous
          </h2>
          <p className="text-slate-600 mb-8 max-w-xl mx-auto">
            Notre équipe est disponible pour répondre à toutes vos questions et vous accompagner.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/contact">
              <Button variant="ghost" className="text-slate-700 border border-slate-200 hover:border-[#D4AF37]/30 hover:text-[#D4AF37] px-7 py-3.5 rounded-full font-semibold text-sm gap-2 hover:bg-slate-50 transition-all">
                <Mail className="w-4 h-4" />
                Nous contacter
              </Button>
            </Link>
            <a href="https://wa.me/33745349339" target="_blank" rel="noopener noreferrer">
              <Button className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white px-7 py-3.5 rounded-full font-semibold text-sm shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all hover:scale-[1.02] gap-2">
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
   FOOTER (SLATE-900)
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
    {
      title: 'Contact',
      links: [
        { label: 'WhatsApp', href: 'https://wa.me/33745349339' },
        { label: 'Email', href: '/contact' },
      ],
    },
  ];

  return (
    <footer className="bg-slate-900 border-t border-slate-700">
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-10">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 bg-gradient-to-br from-[#FF6B35] to-[#D4AF37] rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/15">
                <QrCode className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">QRBag</span>
            </div>
            <p className="text-sm leading-relaxed max-w-xs text-slate-400 mb-6">
              Protection intelligente des bagages pour voyageurs et pèlerins.
            </p>
            {/* Social */}
            <div className="flex items-center gap-3">
              <a href="https://facebook.com/qrbag" target="_blank" rel="noopener noreferrer" className="w-9 h-9 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center hover:bg-[#D4AF37]/10 hover:border-[#D4AF37]/30 transition-all duration-300" aria-label="Facebook">
                <Facebook className="w-4 h-4 text-slate-400 hover:text-[#D4AF37]" />
              </a>
              <a href="https://instagram.com/qrbag" target="_blank" rel="noopener noreferrer" className="w-9 h-9 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center hover:bg-[#D4AF37]/10 hover:border-[#D4AF37]/30 transition-all duration-300" aria-label="Instagram">
                <Instagram className="w-4 h-4 text-slate-400 hover:text-[#D4AF37]" />
              </a>
              <a href="https://twitter.com/qrbag" target="_blank" rel="noopener noreferrer" className="w-9 h-9 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center hover:bg-[#D4AF37]/10 hover:border-[#D4AF37]/30 transition-all duration-300" aria-label="Twitter">
                <Twitter className="w-4 h-4 text-slate-400 hover:text-[#D4AF37]" />
              </a>
            </div>
          </div>

          {/* Link Columns */}
          {columns.map(col => (
            <div key={col.title}>
              <h4 className="font-semibold text-[#D4AF37] text-sm mb-4 tracking-wide">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map(link => (
                  <li key={link.label}>
                    {'href' in link && link.href.startsWith('/') ? (
                      <Link href={link.href} className="text-sm text-slate-400 hover:text-white transition-colors duration-300">{link.label}</Link>
                    ) : (
                      <a href={link.href} target="_blank" rel="noopener noreferrer" className="text-sm text-slate-400 hover:text-white transition-colors duration-300">{link.label}</a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="border-t border-slate-700 mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
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
      <StickySearchBar />
      <HeroSection />

      <QRBagEnActionSection />
      <TransportModesSection />

      {/* ══════════════════════════════════════════════
         TRACKING WIDGET
         ══════════════════════════════════════════════ */}
      <section className="relative py-12 lg:py-16 bg-slate-50">
        <FadeIn>
          <TrackingWidget />
        </FadeIn>
      </section>

      <WhyQRBagSection />
      <SolutionsSection />
      <StatsSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <PricingSection />
      <FinalCTASection />
      <ContactCTASection />
      <Footer />
      <LandingChatbotWidget />
    </main>
  );
}
