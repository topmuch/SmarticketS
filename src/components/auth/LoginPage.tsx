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
  Building2,
  ArrowRight,
  CheckCircle,
  Lock,
  Mail,
  Zap,
  Globe,
  Bus,
  Package,
  MapPin,
  Bell,
  Fingerprint,
} from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';

/* ══════════════════════════════════════════════
   CONFIG PER VARIANT
   ══════════════════════════════════════════════ */
type LoginVariant = 'agence' | 'superadmin';

interface LoginConfig {
  type: LoginVariant;
  title: string;
  subtitle: string;
  demoEmail: string;
  demoPassword: string;
  demoLabel: string;
  role: string;
  redirectPath: string;
  accentBg: string;
  accentHover: string;
  accentText: string;
  accentGradient: string;
  accentShadow: string;
  leftTitle: string;
  leftSubtitle: string;
  leftTagline: string;
  switchText: string;
  switchLink: string;
  switchHref: string;
  features: { icon: typeof QrCode; title: string; desc: string }[];
}

const CONFIGS: Record<LoginVariant, LoginConfig> = {
  agence: {
    type: 'agence',
    title: 'Espace Transporteur',
    subtitle: 'Connectez-vous pour gérer vos billets et colis',
    demoEmail: 'agence@smartickets.com',
    demoPassword: 'agence123',
    demoLabel: 'Agence',
    role: 'agency',
    redirectPath: '/agence/tableau-de-bord',
    accentBg: 'bg-[#FF6B35]',
    accentHover: 'hover:bg-[#e55a25]',
    accentText: 'text-[#FF6B35]',
    accentGradient: 'from-[#FF6B35] to-[#FF1D8D]',
    accentShadow: 'shadow-[#FF6B35]/30',
    leftTitle: 'Gérez votre activité de transport en toute simplicité',
    leftSubtitle: 'Billets, colis, suivi en temps réel — tout est dans votre tableau de bord.',
    leftTagline: 'Conçu pour la performance',
    switchText: 'Vous êtes administrateur ?',
    switchLink: 'Connexion Admin',
    switchHref: '/admin/connexion',
    features: [
      { icon: Bus, title: 'Billets & Colis', desc: 'Gestion unifiée' },
      { icon: QrCode, title: 'QR Codes', desc: 'Génération instantanée' },
      { icon: MapPin, title: 'Suivi GPS', desc: 'Temps réel' },
      { icon: Bell, title: 'Notifications', desc: 'WhatsApp & SMS' },
    ],
  },
  superadmin: {
    type: 'superadmin',
    title: 'Espace Administrateur',
    subtitle: 'Accès réservé aux administrateurs système',
    demoEmail: 'admin@smartickets.com',
    demoPassword: 'admin123',
    demoLabel: 'SuperAdmin',
    role: 'superadmin',
    redirectPath: '/admin/tableau-de-bord',
    accentBg: 'bg-[#FF1D8D]',
    accentHover: 'hover:bg-[#e0167a]',
    accentText: 'text-[#FF1D8D]',
    accentGradient: 'from-[#FF1D8D] to-[#7c3aed]',
    accentShadow: 'shadow-[#FF1D8D]/30',
    leftTitle: 'Contrôle centralisé de tout le réseau',
    leftSubtitle: 'Agences, QR codes, utilisateurs et analytics — pilotés depuis un seul panneau.',
    leftTagline: 'Sécurité & Performance',
    switchText: 'Vous êtes un transporteur ?',
    switchLink: 'Connexion Transporteur',
    switchHref: '/agence/connexion',
    features: [
      { icon: Shield, title: 'Sécurité', desc: 'Authentification renforcée' },
      { icon: Globe, title: 'Multi-agences', desc: 'Vue centralisée' },
      { icon: Zap, title: 'API intégrées', desc: 'Webhooks & PDF' },
      { icon: Fingerprint, title: 'Rôles', desc: 'Permissions avancées' },
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
   FLOATING PARTICLES (decorative)
   ══════════════════════════════════════════════ */
function FloatingParticles({ color }: { color: string }) {
  const particles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    x: `${(i * 8.3) % 100}%`,
    y: `${(i * 13.7) % 100}%`,
    size: i % 3 === 0 ? 6 : i % 2 === 0 ? 4 : 3,
    delay: i * 0.4,
    duration: 6 + (i % 4),
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            background: color,
            opacity: 0.15,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.1, 0.25, 0.1],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════
   LOGIN PAGE COMPONENT
   ══════════════════════════════════════════════ */
export default function LoginPage({ variant }: { variant: LoginVariant }) {
  const config = CONFIGS[variant];
  const router = useRouter();
  const { user, login, loading: authLoading, isAgency, isSuperAdmin } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Auto-init demo users on first visit (idempotent)
  useEffect(() => {
    fetch('/api/init-demo').catch(() => {});
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (authLoading) return;
    if (user && ((variant === 'agence' && isAgency) || (variant === 'superadmin' && isSuperAdmin))) {
      router.replace(config.redirectPath);
    }
  }, [user, authLoading, isAgency, isSuperAdmin, variant, router, config.redirectPath]);

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

  const isAgence = variant === 'agence';

  return (
    <div className="min-h-screen flex bg-[#0B1120] overflow-hidden">
      {/* ─── LEFT: Visual Hero Panel ─── */}
      <div className="relative hidden lg:flex lg:w-[54%] xl:w-[58%] min-h-screen overflow-hidden">
        {/* Background image */}
        <Image
          src="/images/login-bg.png"
          alt="SmarticketS"
          fill
          className="object-cover scale-105"
          priority
          sizes="58vw"
        />

        {/* Multi-layer gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0B1120]/95 via-[#0B1120]/75 to-[#0B1120]/50" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B1120] via-transparent to-[#0B1120]/40" />

        {/* Animated gradient orbs */}
        <motion.div
          className="absolute -top-20 -right-20 w-[500px] h-[500px] rounded-full opacity-[0.15] blur-[120px]"
          style={{ background: isAgence ? '#FF6B35' : '#FF1D8D' }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-32 -left-20 w-[400px] h-[400px] rounded-full opacity-[0.12] blur-[100px]"
          style={{ background: isAgence ? '#FF1D8D' : '#7c3aed' }}
          animate={{ scale: [1, 1.1, 1], opacity: [0.08, 0.15, 0.08] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />

        {/* Floating particles */}
        <FloatingParticles color={isAgence ? '#FF6B35' : '#FF1D8D'} />

        {/* Geometric grid lines (decorative) */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }} />

        {/* Content */}
        <motion.div
          className="relative z-10 h-full flex flex-col p-10 xl:p-14"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          {/* Logo */}
          <motion.div variants={fadeUp} custom={0} className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 group">
              <motion.div
                className="relative w-12 h-12 rounded-2xl overflow-hidden shadow-lg shadow-[#00A887]/20"
                whileHover={{ scale: 1.05, rotate: -3 }}
                transition={{ type: 'spring', stiffness: 400 }}
              >
                <Image src="/logo-icon.png" alt="SmarticketS" fill className="object-cover" sizes="48px" />
              </motion.div>
              <div>
                <span className="text-2xl font-bold text-white tracking-tight">SmarticketS</span>
                <span className="block text-[11px] text-white/40 font-medium tracking-[0.2em] uppercase mt-0.5">
                  {isAgence ? 'Espace Pro' : 'Administration'}
                </span>
              </div>
            </Link>
          </motion.div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Bottom content */}
          <div>
            {/* Accent badge */}
            <motion.div variants={fadeUp} custom={1} className="mb-6">
              <span className={`inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full text-xs font-bold tracking-[0.15em] uppercase backdrop-blur-xl border bg-gradient-to-r ${
                isAgence
                  ? 'from-[#FF6B35]/20 to-[#FF1D8D]/20 border-[#FF6B35]/20 text-[#FF6B35]'
                  : 'from-[#FF1D8D]/20 to-[#7c3aed]/20 border-[#FF1D8D]/20 text-[#FF1D8D]'
              }`}>
                {isAgence ? <Building2 className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                {isAgence ? 'Espace Transporteur' : 'Espace Admin'}
              </span>
            </motion.div>

            {/* Title & subtitle */}
            <motion.h2
              variants={fadeUp}
              custom={2}
              className="text-3xl xl:text-[42px] font-extrabold text-white mb-5 leading-[1.15] max-w-xl tracking-tight"
            >
              {config.leftTitle}
            </motion.h2>
            <motion.p variants={fadeUp} custom={3} className="text-white/50 text-base xl:text-lg leading-relaxed max-w-md mb-10">
              {config.leftSubtitle}
            </motion.p>

            {/* Feature cards */}
            <motion.div variants={fadeUp} custom={4} className="grid grid-cols-2 gap-3.5 max-w-lg">
              {config.features.map((feat, idx) => (
                <motion.div
                  key={feat.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + idx * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="group relative bg-white/[0.05] backdrop-blur-md rounded-2xl px-5 py-4.5 border border-white/[0.06] hover:bg-white/[0.1] hover:border-white/[0.12] transition-all duration-300"
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${
                    isAgence
                      ? 'bg-[#FF6B35]/15 group-hover:bg-[#FF6B35]/25'
                      : 'bg-[#FF1D8D]/15 group-hover:bg-[#FF1D8D]/25'
                  } transition-colors duration-300`}>
                    <feat.icon className={`w-4.5 h-4.5 ${
                      isAgence ? 'text-[#FF6B35]/70' : 'text-[#FF1D8D]/70'
                    } group-hover:brightness-125 transition-all`} />
                  </div>
                  <p className="text-white text-sm font-bold leading-tight">{feat.title}</p>
                  <p className="text-white/35 text-xs mt-1 leading-snug">{feat.desc}</p>
                </motion.div>
              ))}
            </motion.div>

            {/* Divider tagline */}
            <motion.div variants={fadeUp} custom={6} className="mt-10 flex items-center gap-4">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <span className="text-[10px] text-white/25 font-semibold tracking-[0.25em] uppercase">{config.leftTagline}</span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* ─── RIGHT: Form Panel ─── */}
      <div className="w-full lg:w-[46%] xl:w-[42%] min-h-screen flex items-center justify-center relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-white via-[#FAFBFF] to-white" />

        {/* Subtle pattern */}
        <div className="absolute inset-0 opacity-[0.015]" style={{
          backgroundImage: `radial-gradient(circle, #000 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }} />

        {/* Decorative orbs */}
        <div className="absolute top-20 right-0 w-80 h-80 rounded-full opacity-20 blur-[100px] pointer-events-none"
          style={{ background: isAgence ? '#FF6B35' : '#FF1D8D' }}
        />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full opacity-15 blur-[80px] pointer-events-none"
          style={{ background: isAgence ? '#FF1D8D' : '#7c3aed' }}
        />

        {/* Content */}
        <motion.div
          className="w-full max-w-[420px] relative z-10 px-6 sm:px-8"
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          {/* Mobile Logo */}
          <motion.div variants={fadeUp} custom={0} className="lg:hidden flex flex-col items-center mb-10">
            <motion.div
              className="relative w-14 h-14 rounded-2xl overflow-hidden shadow-xl shadow-[#00A887]/25 mb-4"
              whileHover={{ scale: 1.05 }}
            >
              <Image src="/logo-icon.png" alt="SmarticketS" fill className="object-cover" sizes="56px" />
            </motion.div>
            <span className="text-2xl font-bold text-slate-800 tracking-tight">SmarticketS</span>
          </motion.div>

          {/* Desktop: Role badge */}
          <motion.div variants={fadeUp} custom={0} className="hidden lg:flex items-center gap-2.5 mb-8">
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${config.accentGradient} flex items-center justify-center shadow-sm ${config.accentShadow}`}>
              {isAgence ? <Building2 className="w-4 h-4 text-white" /> : <Shield className="w-4 h-4 text-white" />}
            </div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">
              {isAgence ? 'Espace Transporteur' : 'Espace Admin'}
            </span>
          </motion.div>

          {/* Title */}
          <motion.div variants={fadeUp} custom={1} className="mb-8">
            <h1 className="text-[28px] sm:text-[32px] font-extrabold text-slate-900 tracking-tight mb-2.5 leading-tight">
              {config.title}
            </h1>
            <p className="text-slate-400 text-[15px] leading-relaxed">{config.subtitle}</p>
          </motion.div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.95 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="mb-6 p-4 bg-red-50/80 backdrop-blur-sm border border-red-200/60 text-red-700 rounded-2xl text-sm flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm">⚠️</span>
                </div>
                <span className="font-medium">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <motion.form
            variants={stagger}
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            {/* Email field */}
            <motion.div variants={fadeUp} custom={2}>
              <label className="block text-[13px] font-semibold text-slate-600 mb-2 tracking-wide">
                Adresse email
              </label>
              <div className={`relative rounded-xl border-2 transition-all duration-300 overflow-hidden ${
                focusedField === 'email'
                  ? `border-[${isAgence ? '#FF6B35' : '#FF1D8D'}] shadow-lg ${config.accentShadow} ring-4 ${config.accentShadow.replace('shadow', 'ring')}/10`
                  : 'border-slate-200/80 hover:border-slate-300'
              }`}
                style={focusedField === 'email' ? { borderColor: isAgence ? '#FF6B35' : '#FF1D8D' } : {}}
              >
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors duration-200">
                  <Mail className="w-[18px] h-[18px]" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  className="w-full pl-11 pr-4 py-4 bg-white/50 text-slate-900 placeholder-slate-400 focus:outline-none text-sm font-medium"
                  placeholder={variant === 'agence' ? 'vous@agence.com' : 'admin@smartickets.com'}
                  required
                />
              </div>
            </motion.div>

            {/* Password field */}
            <motion.div variants={fadeUp} custom={3}>
              <label className="block text-[13px] font-semibold text-slate-600 mb-2 tracking-wide">
                Mot de passe
              </label>
              <div className={`relative rounded-xl border-2 transition-all duration-300 overflow-hidden ${
                focusedField === 'password'
                  ? 'border-slate-300'
                  : 'border-slate-200/80 hover:border-slate-300'
              }`}
                style={focusedField === 'password' ? { borderColor: isAgence ? '#FF6B35' : '#FF1D8D' } : {}}
              >
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock className="w-[18px] h-[18px]" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  className="w-full pl-11 pr-12 py-4 bg-white/50 text-slate-900 placeholder-slate-400 focus:outline-none text-sm font-medium"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </motion.div>

            {/* Remember / Forgot */}
            <motion.div variants={fadeUp} custom={4} className="flex items-center justify-between pt-1">
              <label className="flex items-center cursor-pointer gap-2.5 group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className={`peer h-[18px] w-[18px] rounded-md border-2 border-slate-300 appearance-none cursor-pointer checked:border-transparent checked:bg-gradient-to-br ${config.accentGradient} transition-all duration-200`}
                  />
                  <svg className="absolute left-[3px] top-[3px] w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-[13px] text-slate-500 group-hover:text-slate-700 transition-colors">Se souvenir de moi</span>
              </label>
              <Link
                href="/forgot-password"
                className={`text-[13px] font-semibold ${config.accentText} hover:underline transition-colors`}
              >
                Mot de passe oublié ?
              </Link>
            </motion.div>

            {/* Submit button */}
            <motion.div variants={fadeUp} custom={5} className="pt-2">
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={!loading ? { scale: 1.01, y: -1 } : {}}
                whileTap={!loading ? { scale: 0.99 } : {}}
                className={`w-full bg-gradient-to-r ${config.accentGradient} text-white font-bold py-4 px-4 rounded-xl transition-all duration-300 shadow-lg ${config.accentShadow} disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 text-[15px] hover:shadow-xl cursor-pointer`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Connexion en cours...
                  </>
                ) : (
                  <>
                    Se connecter
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </motion.button>
            </motion.div>
          </motion.form>

          {/* Demo Account Card */}
          <motion.div
            variants={fadeUp}
            custom={6}
            className="mt-7 p-4 bg-slate-50/80 backdrop-blur-sm rounded-xl border border-slate-100 hover:border-slate-200 transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em] flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-amber-100 flex items-center justify-center">
                  <Zap className="w-3 h-3 text-amber-500" />
                </div>
                Compte démo
              </h3>
              <button
                type="button"
                onClick={fillDemo}
                className={`text-xs font-bold ${config.accentText} hover:underline transition-colors flex items-center gap-1 cursor-pointer`}
              >
                Auto-remplir
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-[11px] font-bold ${
                isAgence
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-[#FF1D8D]/10 text-[#FF1D8D]'
              }`}>
                {config.demoLabel}
              </span>
              <span className="text-[11px] text-slate-400 font-mono leading-relaxed">
                {config.demoEmail} / {config.demoPassword}
              </span>
            </div>
          </motion.div>

          {/* Switch role */}
          <motion.div variants={fadeUp} custom={7} className="mt-6 text-center">
            <p className="text-[13px] text-slate-400">
              {config.switchText}{' '}
              <Link
                href={config.switchHref}
                className={`font-bold ${config.accentText} hover:underline transition-colors`}
              >
                {config.switchLink} →
              </Link>
            </p>
          </motion.div>

          {/* Footer */}
          <motion.div variants={fadeUp} custom={8} className="mt-10 pt-6 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400">
              © {new Date().getFullYear()} SmarticketS — Tous droits réservés
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
