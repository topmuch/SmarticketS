'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  QrCode,
  Eye,
  EyeOff,
  Loader2,
  Shield,
  Building2,
  ArrowRight,
  CheckCircle,
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
  bgImage: string;
  accentClass: string;
  accentHoverClass: string;
  accentFocusRing: string;
  badgeText: string;
  leftTitle: string;
  leftSubtitle: string;
  switchText: string;
  switchLink: string;
  switchHref: string;
  features: { icon: typeof QrCode; title: string; desc: string }[];
}

const CONFIGS: Record<LoginVariant, LoginConfig> = {
  agence: {
    type: 'agence',
    title: 'Espace Agence',
    subtitle: 'Connectez-vous à votre dashboard sécurisé',
    demoEmail: 'agence@qrtrans.com',
    demoPassword: 'agence123',
    demoLabel: 'Agence',
    role: 'agency',
    redirectPath: '/agence/tableau-de-bord',
    bgImage: '/images/login-bg.png',
    accentClass: 'text-orange-500',
    accentHoverClass: 'hover:text-orange-600',
    accentFocusRing: 'focus:ring-orange-500',
    badgeText: 'Agence',
    leftTitle: 'QRTrans pour les professionnels du voyage',
    leftSubtitle: 'Gérez vos bagages, vos clients, vos QR — depuis un seul tableau de bord.',
    switchText: 'Vous êtes administrateur ?',
    switchLink: 'Connexion SuperAdmin',
    switchHref: '/admin/connexion',
    features: [
      { icon: CheckCircle, title: 'Scan en temps réel', desc: 'Suivez chaque bagage dès qu\'il est scanné' },
      { icon: QrCode, title: 'Commande en 1 clic', desc: 'Générez des lots de QR en 30 secondes' },
      { icon: Building2, title: 'Dashboard intuitif', desc: 'Suivi des pèlerins, statuts, trouvailles' },
      { icon: Shield, title: 'Support 24/7', desc: 'Nous sommes là pour vous aider' },
    ],
  },
  superadmin: {
    type: 'superadmin',
    title: 'Espace Administrateur',
    subtitle: 'Connexion sécurisée réservée aux administrateurs',
    demoEmail: 'admin@qrtrans.com',
    demoPassword: 'admin123',
    demoLabel: 'SuperAdmin',
    role: 'superadmin',
    redirectPath: '/admin/tableau-de-bord',
    bgImage: '/images/login-bg.png',
    accentClass: 'text-purple-600',
    accentHoverClass: 'hover:text-purple-700',
    accentFocusRing: 'focus:ring-purple-500',
    badgeText: 'Admin',
    leftTitle: 'QRTrans — Contrôle centralisé',
    leftSubtitle: 'Gérez agences, QR codes, utilisateurs et API — tout depuis un seul tableau de bord.',
    switchText: 'Vous êtes une agence ?',
    switchLink: 'Connexion Agence',
    switchHref: '/agence/connexion',
    features: [
      { icon: Shield, title: 'Sécurité renforcée', desc: 'Authentification stricte, logs complets' },
      { icon: Building2, title: 'Tableau de bord centralisé', desc: 'Suivi en temps réel de toutes les activités' },
      { icon: QrCode, title: 'Intégrations API', desc: 'Green API, géoloc, PDF à la demande' },
      { icon: CheckCircle, title: 'Gestion des rôles', desc: 'Agences, admins, agents — tout contrôlé' },
    ],
  },
};

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
    } catch (err) {
      console.error('Login error:', err);
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
    <div className="min-h-screen bg-white flex flex-col lg:flex-row">
      {/* ─── LEFT: Image Panel ─── */}
      <div className="relative hidden lg:block lg:w-1/2 xl:w-[55%] min-h-screen">
        {/* Background Image */}
        <Image
          src={config.bgImage}
          alt="QRTrans"
          fill
          className="object-cover"
          priority
          sizes="55vw"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/20" />

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col justify-end p-10 xl:p-14">
          {/* Logo */}
          <div className="absolute top-8 left-8 xl:top-10 xl:left-10">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-10 h-10 bg-white/15 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20">
                <QrCode className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">QRTrans</span>
            </Link>
          </div>

          {/* Badge */}
          <div className="mb-8">
            <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase backdrop-blur-md border ${
              isAgence
                ? 'bg-orange-500/20 border-orange-400/30 text-orange-300'
                : 'bg-purple-500/20 border-purple-400/30 text-purple-300'
            }`}>
              {isAgence ? <Building2 className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
              {config.badgeText}
            </span>
          </div>

          {/* Title */}
          <h2 className="text-3xl xl:text-4xl font-bold text-white mb-4 leading-tight max-w-lg">
            {config.leftTitle}
          </h2>
          <p className="text-white/75 text-base xl:text-lg leading-relaxed max-w-md mb-10">
            {config.leftSubtitle}
          </p>

          {/* Features */}
          <div className="grid grid-cols-2 gap-3">
            {config.features.map((feat) => (
              <div key={feat.title} className="bg-white/8 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10">
                <feat.icon className="w-4 h-4 text-white/60 mb-1.5" />
                <p className="text-white text-sm font-semibold leading-tight">{feat.title}</p>
                <p className="text-white/50 text-xs mt-0.5 leading-snug">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── RIGHT: Form Panel ─── */}
      <div className="w-full lg:w-1/2 xl:w-[45%] min-h-screen flex items-center justify-center bg-white px-6 py-12 sm:px-10">
        <div className="w-full max-w-md">

          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-2.5 mb-10">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isAgence ? 'bg-orange-500' : 'bg-purple-700'
            }`}>
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-800 tracking-tight">QRTrans</span>
          </div>

          {/* Mobile badge */}
          <div className="lg:hidden flex justify-center mb-8">
            <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase ${
              isAgence
                ? 'bg-orange-50 text-orange-600 border border-orange-200'
                : 'bg-purple-50 text-purple-600 border border-purple-200'
            }`}>
              {isAgence ? <Building2 className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
              {config.badgeText}
            </span>
          </div>

          {/* Title */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight mb-2">
              {config.title}
            </h1>
            <p className="text-slate-500">{config.subtitle}</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
              <span className="flex-shrink-0">⚠️</span>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition text-sm"
                style={{ '--tw-ring-color': isAgence ? '#f97316' : '#7e22ce' } as React.CSSProperties}
                placeholder={variant === 'agence' ? 'vous@agence.com' : 'admin@qrtrans.com'}
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition pr-11 text-sm"
                  style={{ '--tw-ring-color': isAgence ? '#f97316' : '#7e22ce' } as React.CSSProperties}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember / Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center cursor-pointer gap-2">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                  style={{ accentColor: isAgence ? '#f97316' : '#7e22ce' }}
                />
                <span className="text-sm text-slate-500">Se souvenir de moi</span>
              </label>
              <Link
                href="/forgot-password"
                className={`text-sm font-medium ${config.accentClass} ${config.accentHoverClass} transition-colors`}
              >
                Mot de passe oublié ?
              </Link>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 shadow-md disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm hover:shadow-lg ${
                isAgence
                  ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/25'
                  : 'bg-purple-700 hover:bg-purple-800 shadow-purple-700/25'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connexion...
                </>
              ) : (
                <>
                  Se connecter
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Demo Account */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Compte de démonstration
              </h3>
              <button
                type="button"
                onClick={fillDemo}
                className={`text-xs font-semibold ${config.accentClass} ${config.accentHoverClass} transition-colors`}
              >
                Remplir
              </button>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <span className={`inline-flex self-start items-center px-2.5 py-1 rounded-md text-xs font-semibold ${
                isAgence
                  ? 'bg-orange-50 text-orange-600'
                  : 'bg-purple-50 text-purple-600'
              }`}>
                {config.demoLabel}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {config.demoEmail} / {config.demoPassword}
              </span>
            </div>
          </div>

          {/* Switch */}
          <div className="mt-6 text-center text-sm text-slate-500">
            {config.switchText}{' '}
            <Link
              href={config.switchHref}
              className={`font-semibold ${config.accentClass} ${config.accentHoverClass} transition-colors`}
            >
              {config.switchLink}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
