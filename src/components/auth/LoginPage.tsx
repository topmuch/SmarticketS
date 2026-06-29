// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  QrCode,
  Eye,
  EyeOff,
  Loader2,
  Shield,
  Truck,
  Bus,
  ArrowRight,
  Lock,
  Mail,
  Zap,
  Globe,
  MapPin,
  Bell,
  Fingerprint,
  ScanLine,
  ChevronDown,
  Home,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';

/* ══════════════════════════════════════════════
   CONFIG PER VARIANT — 3 distinct color themes
   ══════════════════════════════════════════════ */
type LoginVariant = 'agence' | 'superadmin' | 'busgo';

interface LoginConfig {
  type: LoginVariant;
  title: string;
  subtitle: string;
  demoEmail: string;
  demoPassword: string;
  demoLabel: string;
  role: string;
  redirectPath: string;
  // Variant-specific theme (static Tailwind classes for JIT)
  panelGradient: string;
  buttonGradient: string;
  buttonShadow: string;
  accentText: string;
  accentBorder: string;
  accentRing: string;
  accentBgSoft: string;
  accentTextSoft: string;
  accentBgHover: string;
  iconGradient: string;
  checkboxGradient: string;
  // Inline-style hexes for orbs
  orb1: string;
  orb2: string;
  // Content
  leftTitle: string;
  leftSubtitle: string;
  leftTagline: string;
  vibe: string;
  switchText: string;
  switchLink: string;
  switchHref: string;
  mainIcon: typeof Shield;
  features: { icon: typeof QrCode; title: string; desc: string }[];
}

const CONFIGS: Record<LoginVariant, LoginConfig> = {
  /* ── SuperAdmin — Purple/Violet theme ── */
  superadmin: {
    type: 'superadmin',
    title: 'Espace Administrateur',
    subtitle: 'Accès réservé aux administrateurs système',
    demoEmail: 'admin@smartickets.com',
    demoPassword: 'admin123',
    demoLabel: 'SuperAdmin',
    role: 'superadmin',
    redirectPath: '/admin/tableau-de-bord',
    panelGradient: 'from-violet-600 via-purple-600 to-indigo-700',
    buttonGradient: 'from-violet-600 to-indigo-600',
    buttonShadow: 'shadow-violet-500/30',
    accentText: 'text-violet-600',
    accentBorder: 'border-violet-500',
    accentRing: 'ring-violet-200',
    accentBgSoft: 'bg-violet-100',
    accentTextSoft: 'text-violet-700',
    accentBgHover: 'bg-violet-50',
    iconGradient: 'from-violet-500 to-indigo-600',
    checkboxGradient: 'from-violet-500 to-indigo-600',
    orb1: '#A78BFA',
    orb2: '#4F46E5',
    leftTitle: 'Contrôle centralisé de tout le réseau',
    leftSubtitle:
      'Agences, QR codes, utilisateurs et analytics — pilotés depuis un seul panneau.',
    leftTagline: 'Sécurité & Performance',
    vibe: 'Sécurité & Pouvoir',
    switchText: 'Vous êtes un transporteur ?',
    switchLink: 'Connexion Transporteur',
    switchHref: '/agence/connexion',
    mainIcon: Shield,
    features: [
      { icon: Shield, title: 'Sécurité', desc: 'Authentification renforcée' },
      { icon: Globe, title: 'Multi-agences', desc: 'Vue centralisée' },
      { icon: Zap, title: 'API intégrées', desc: 'Webhooks & PDF' },
      { icon: Fingerprint, title: 'Rôles', desc: 'Permissions avancées' },
    ],
  },

  /* ── Agence / Transporteur — Teal/Cyan theme ── */
  agence: {
    type: 'agence',
    title: 'Espace Transporteur',
    subtitle: 'Connectez-vous pour gérer vos billets et colis',
    demoEmail: 'agence@smartickets.com',
    demoPassword: 'agence123',
    demoLabel: 'Agence',
    role: 'agency',
    redirectPath: '/agence/tableau-de-bord',
    panelGradient: 'from-teal-500 via-cyan-600 to-sky-700',
    buttonGradient: 'from-teal-600 to-cyan-600',
    buttonShadow: 'shadow-teal-500/30',
    accentText: 'text-teal-600',
    accentBorder: 'border-teal-500',
    accentRing: 'ring-teal-200',
    accentBgSoft: 'bg-teal-100',
    accentTextSoft: 'text-teal-700',
    accentBgHover: 'bg-teal-50',
    iconGradient: 'from-teal-500 to-cyan-600',
    checkboxGradient: 'from-teal-500 to-cyan-600',
    orb1: '#2DD4BF',
    orb2: '#0891B2',
    leftTitle: 'Gérez votre activité de transport en toute simplicité',
    leftSubtitle:
      'Billets, colis, suivi en temps réel — tout est dans votre tableau de bord.',
    leftTagline: 'Conçu pour la performance',
    vibe: 'Transport & Logistique',
    switchText: 'Vous êtes administrateur ?',
    switchLink: 'Connexion Admin',
    switchHref: '/admin/connexion',
    mainIcon: Truck,
    features: [
      { icon: Bus, title: 'Billets & Colis', desc: 'Gestion unifiée' },
      { icon: QrCode, title: 'QR Codes', desc: 'Génération instantanée' },
      { icon: MapPin, title: 'Suivi GPS', desc: 'Temps réel' },
      { icon: Bell, title: 'Notifications', desc: 'WhatsApp & SMS' },
    ],
  },

  /* ── BusGo — Orange/Amber theme ── */
  busgo: {
    type: 'busgo',
    title: 'Espace BusGo',
    subtitle:
      'Gestion de transport en bus — embarquement, billetterie, annonces vocales',
    demoEmail: 'admin@smartickets.com',
    demoPassword: 'admin123',
    demoLabel: 'BusGo',
    role: 'admin',
    redirectPath: '/busgo',
    panelGradient: 'from-orange-500 via-amber-500 to-red-500',
    buttonGradient: 'from-orange-500 to-amber-500',
    buttonShadow: 'shadow-orange-500/30',
    accentText: 'text-orange-600',
    accentBorder: 'border-orange-500',
    accentRing: 'ring-orange-200',
    accentBgSoft: 'bg-orange-100',
    accentTextSoft: 'text-orange-700',
    accentBgHover: 'bg-orange-50',
    iconGradient: 'from-orange-500 to-amber-500',
    checkboxGradient: 'from-orange-500 to-amber-500',
    orb1: '#FB923C',
    orb2: '#D97706',
    leftTitle: 'Gérez vos bus et embarquements en temps réel',
    leftSubtitle:
      'Billetterie, scan QR, plan de sièges, annonces vocales — tout dans une seule app.',
    leftTagline: 'Transport intelligent',
    vibe: 'Transport de voyageurs',
    switchText: 'Vous êtes administrateur ?',
    switchLink: 'Connexion Admin',
    switchHref: '/admin/connexion',
    mainIcon: Bus,
    features: [
      { icon: Bus, title: 'Billetterie', desc: 'Vente de billets' },
      { icon: ScanLine, title: 'Scan QR', desc: 'Embarquement rapide' },
      { icon: Bell, title: 'Annonces vocales', desc: 'TTS gratuit' },
      { icon: MapPin, title: 'Temps réel', desc: 'WebSocket live' },
    ],
  },
};

/* ══════════════════════════════════════════════
   ANIMATION VARIANTS
   ══════════════════════════════════════════════ */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  }),
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

/* ══════════════════════════════════════════════
   LOGIN PAGE COMPONENT
   ══════════════════════════════════════════════ */
export default function LoginPage({ variant }: { variant: LoginVariant }) {
  const config = CONFIGS[variant];
  const router = useRouter();
  const { user, login, loading: authLoading, isAgency, isSuperAdmin } = useAuth();
  const MainIcon = config.mainIcon;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showDemo, setShowDemo] = useState(false);

  // Auto-init demo users on first visit (idempotent) — dev only
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      fetch('/api/init-demo').catch(() => {});
    }
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (authLoading) return;
    if (user) {
      if (variant === 'agence' && isAgency) {
        router.replace(config.redirectPath);
      } else if (variant === 'superadmin' && isSuperAdmin) {
        router.replace(config.redirectPath);
      } else if (
        variant === 'busgo' &&
        (user.role === 'admin' ||
          user.role === 'agent' ||
          user.role === 'superadmin')
      ) {
        router.replace(config.redirectPath);
      }
    }
  }, [
    user,
    authLoading,
    isAgency,
    isSuperAdmin,
    variant,
    router,
    config.redirectPath,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role: config.role }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        login(data.user);
        router.push(config.redirectPath);
      } else {
        setError(data.error || 'Identifiants incorrects');
      }
    } catch {
      setError('Erreur de connexion. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setEmail(config.demoEmail);
    setPassword(config.demoPassword);
  };

  return (
    <div className="min-h-screen flex bg-white overflow-hidden">
      {/* ─────────────────────────────────────────────
          LEFT: Variant-colored Hero Panel (desktop only)
          ───────────────────────────────────────────── */}
      <div
        className={`relative hidden lg:flex lg:w-[55%] min-h-screen overflow-hidden bg-gradient-to-br ${config.panelGradient}`}
      >
        {/* Animated gradient orbs (8s loop) */}
        <motion.div
          className="absolute top-10 -right-32 w-[520px] h-[520px] rounded-full opacity-40 blur-[120px] pointer-events-none"
          style={{ background: config.orb1 }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-40 -left-32 w-[460px] h-[460px] rounded-full opacity-35 blur-[110px] pointer-events-none"
          style={{ background: config.orb2 }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.25, 0.45, 0.25] }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 2,
          }}
        />

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)`,
            backgroundSize: '64px 64px',
          }}
        />

        {/* Content */}
        <motion.div
          className="relative z-10 h-full flex flex-col p-10 xl:p-14"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          {/* Logo (white) */}
          <motion.div variants={fadeUp} custom={0}>
            <Link href="/" className="flex items-center gap-3 group">
              <Image
                src="/logo-full.png"
                alt="SmarticketS"
                width={374}
                height={135}
                className="h-8 w-auto brightness-0 invert"
              />
              <span className="text-[11px] text-white/70 font-medium tracking-[0.2em] uppercase mt-0.5">
                {config.type === 'superadmin'
                  ? 'Administration'
                  : config.type === 'agence'
                    ? 'Espace Pro'
                    : 'BusGo'}
              </span>
            </Link>
          </motion.div>

          <div className="flex-1" />

          {/* Bottom content */}
          <div>
            {/* Vibe badge */}
            <motion.div variants={fadeUp} custom={1} className="mb-6">
              <span className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full text-xs font-bold tracking-[0.15em] uppercase backdrop-blur-xl border bg-white/10 border-white/20 text-white">
                <MainIcon className="w-3.5 h-3.5" />
                {config.vibe}
              </span>
            </motion.div>

            {/* Title & subtitle */}
            <motion.h2
              variants={fadeUp}
              custom={2}
              className="text-4xl xl:text-5xl font-bold text-white mb-5 leading-[1.15] max-w-xl tracking-tight"
            >
              {config.leftTitle}
            </motion.h2>
            <motion.p
              variants={fadeUp}
              custom={3}
              className="text-lg text-white/70 leading-relaxed max-w-md mb-10"
            >
              {config.leftSubtitle}
            </motion.p>

            {/* Feature cards (2x2) */}
            <motion.div
              variants={fadeUp}
              custom={4}
              className="grid grid-cols-2 gap-4 max-w-lg"
            >
              {config.features.map((feat, idx) => (
                <motion.div
                  key={feat.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.4 + idx * 0.1,
                    duration: 0.5,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="group bg-white/10 backdrop-blur-md rounded-2xl px-5 py-4 border border-white/15 hover:bg-white/15 hover:border-white/25 transition-all duration-300"
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 bg-white/15 group-hover:bg-white/25 transition-colors duration-300">
                    <feat.icon className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-white text-sm font-bold leading-tight">
                    {feat.title}
                  </p>
                  <p className="text-white/60 text-xs mt-1 leading-snug">
                    {feat.desc}
                  </p>
                </motion.div>
              ))}
            </motion.div>

            {/* Divider + tagline */}
            <motion.div
              variants={fadeUp}
              custom={6}
              className="mt-10 flex items-center gap-4"
            >
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <span className="text-[11px] text-white/60 font-semibold tracking-[0.25em] uppercase">
                {config.leftTagline}
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </motion.div>

            {/* Switch link */}
            <motion.div
              variants={fadeUp}
              custom={7}
              className="mt-8 flex items-center gap-3"
            >
              <span className="text-sm text-white/70">{config.switchText}</span>
              <Link
                href={config.switchHref}
                className="inline-flex items-center gap-2 text-sm font-semibold text-white hover:text-white/80 transition-colors group"
              >
                {config.switchLink}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* ─────────────────────────────────────────────
          RIGHT: Login Form Panel (always visible)
          ───────────────────────────────────────────── */}
      <div className="w-full lg:w-[45%] min-h-screen flex items-center justify-center relative overflow-hidden bg-white">
        {/* Content */}
        <motion.div
          className="w-full max-w-[420px] relative z-10 px-6 sm:px-8 py-10"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Mobile: back home + logo */}
          <div className="lg:hidden mb-8 flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors"
            >
              <Home className="w-4 h-4" />
              <span className="text-sm font-medium">Accueil</span>
            </Link>
            <Image
              src="/logo-full.png"
              alt="SmarticketS"
              width={374}
              height={135}
              className="h-7 w-auto"
            />
          </div>

          {/* Form title with variant-colored icon */}
          <div className="mb-8">
            <div
              className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${config.iconGradient} shadow-lg ${config.buttonShadow} mb-4`}
            >
              <MainIcon className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight mb-2 leading-tight">
              {config.title}
            </h1>
            <p className="text-slate-500 text-sm leading-relaxed">
              {config.subtitle}
            </p>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.95 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="mb-5 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-3"
              >
                <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                </div>
                <span className="font-medium">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">
                Adresse email
              </label>
              <div
                className={`relative rounded-xl border bg-slate-50 transition-all duration-200 ${
                  focusedField === 'email'
                    ? `${config.accentBorder} ring-2 ${config.accentRing} bg-white`
                    : 'border-slate-200'
                }`}
              >
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  className="w-full pl-10 pr-4 py-3 bg-transparent text-slate-800 placeholder-slate-400 focus:outline-none text-sm font-medium"
                  placeholder={
                    variant === 'agence'
                      ? 'vous@agence.com'
                      : 'admin@smartickets.com'
                  }
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">
                Mot de passe
              </label>
              <div
                className={`relative rounded-xl border bg-slate-50 transition-all duration-200 ${
                  focusedField === 'password'
                    ? `${config.accentBorder} ring-2 ${config.accentRing} bg-white`
                    : 'border-slate-200'
                }`}
              >
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  className="w-full pl-10 pr-12 py-3 bg-transparent text-slate-800 placeholder-slate-400 focus:outline-none text-sm font-medium"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember / Forgot */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center cursor-pointer gap-2.5 group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className={`peer h-[18px] w-[18px] rounded-md border-2 border-slate-300 appearance-none cursor-pointer checked:border-transparent checked:bg-gradient-to-br ${config.checkboxGradient} transition-all duration-200`}
                  />
                  <svg
                    className="absolute left-[3px] top-[3px] w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <span className="text-sm text-slate-600 group-hover:text-slate-800 transition-colors">
                  Se souvenir de moi
                </span>
              </label>
              <Link
                href="/forgot-password"
                className={`text-sm font-medium ${config.accentText} hover:underline transition-colors`}
              >
                Mot de passe oublié ?
              </Link>
            </div>

            {/* Submit */}
            <div className="pt-2">
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={!loading ? { scale: 1.01, y: -1 } : {}}
                whileTap={!loading ? { scale: 0.95 } : {}}
                className={`w-full bg-gradient-to-r ${config.buttonGradient} text-white font-semibold py-3 px-4 rounded-xl transition-all duration-300 shadow-lg ${config.buttonShadow} hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 text-sm cursor-pointer`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Connexion...
                  </>
                ) : (
                  <>
                    Se connecter
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </motion.button>
            </div>
          </form>

          {/* Demo section — collapsible */}
          <div className="mt-6 rounded-xl border border-slate-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowDemo(!showDemo)}
              className={`w-full px-4 py-3 flex items-center justify-between text-left transition-colors ${
                showDemo ? config.accentBgHover : 'bg-white hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <span
                  className={`w-7 h-7 rounded-lg flex items-center justify-center ${config.accentBgSoft}`}
                >
                  <Sparkles className={`w-3.5 h-3.5 ${config.accentText}`} />
                </span>
                <span className="text-sm font-semibold text-slate-700">
                  Compte de démonstration
                </span>
              </span>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform ${showDemo ? 'rotate-180' : ''}`}
              />
            </button>

            <AnimatePresence>
              {showDemo && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="px-4 py-4 bg-slate-50 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-xs text-slate-500 mb-0.5">Email</p>
                        <p className="text-sm font-mono text-slate-800">
                          {config.demoEmail}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-lg text-[11px] font-bold ${config.accentBgSoft} ${config.accentTextSoft}`}
                      >
                        {config.demoLabel}
                      </span>
                    </div>

                    <div className="mb-4">
                      <p className="text-xs text-slate-500 mb-0.5">
                        Mot de passe
                      </p>
                      <p className="text-sm font-mono text-slate-800 tracking-widest">
                        {'•'.repeat(config.demoPassword.length)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={fillDemo}
                      className={`w-full py-2.5 rounded-lg bg-gradient-to-r ${config.buttonGradient} text-white text-sm font-semibold flex items-center justify-center gap-2 hover:shadow-md transition-all`}
                    >
                      <Zap className="w-4 h-4" />
                      Auto-remplir
                    </button>

                    {/* Quick login links */}
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <p className="text-xs text-slate-500 mb-2">
                        Connexion rapide :
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        {variant !== 'superadmin' && (
                          <Link
                            href="/admin/connexion"
                            className="text-xs font-semibold text-violet-600 px-3 py-1.5 rounded-lg bg-violet-50 hover:bg-violet-100 transition-colors"
                          >
                            SuperAdmin
                          </Link>
                        )}
                        {variant !== 'agence' && (
                          <Link
                            href="/agence/connexion"
                            className="text-xs font-semibold text-teal-600 px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 transition-colors"
                          >
                            Transporteur
                          </Link>
                        )}
                        {variant !== 'busgo' && (
                          <Link
                            href="/busgo/connexion"
                            className="text-xs font-semibold text-orange-600 px-3 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 transition-colors"
                          >
                            BusGo
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Switch role (always visible) */}
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500 mb-2">
              Changer d&apos;espace :
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {variant !== 'superadmin' && (
                <Link
                  href="/admin/connexion"
                  className="text-sm font-semibold text-violet-600 hover:underline transition-colors"
                >
                  SuperAdmin
                </Link>
              )}
              {variant !== 'agence' && (
                <Link
                  href="/agence/connexion"
                  className="text-sm font-semibold text-teal-600 hover:underline transition-colors"
                >
                  Transporteur
                </Link>
              )}
              {variant !== 'busgo' && (
                <Link
                  href="/busgo/connexion"
                  className="text-sm font-semibold text-orange-600 hover:underline transition-colors"
                >
                  BusGo
                </Link>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-10 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400">
              © {new Date().getFullYear()} SmarticketS — Tous droits réservés
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
