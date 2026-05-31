'use client';

/**
 * PWA & Terrain — Onglet principal du dashboard transporteur
 *
 * Génère des QR codes d'installation sécurisés pour les PWA Contrôleur
 * et Chauffeur. Chaque QR contient un token JWT signé lié à l'agence
 * connectée, valide 24h.
 *
 * Fonctionnalités :
 * - QR codes dynamiques avec URLs agency-scoped
 * - Bouton copier le lien (clipboard API + toast)
 * - Guide d'installation conditionnel (iOS / Android)
 * - Badge de sécurité indiquant l'agence liée
 * - Régénération de tokens à la demande
 */

import { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Smartphone,
  Truck,
  ScanLine,
  Shield,
  Copy,
  Check,
  RefreshCw,
  Clock,
  ExternalLink,
  Lock,
  AlertCircle,
  QrCode,
  ChevronDown,
  Monitor,
  Apple,
} from 'lucide-react';
import { useAgency } from '@/app/agence/layout';
import { toast } from 'sonner';

// ─── Types ─────────────────────────────────────────────────────────────

interface PwaTokenData {
  token: string;
  url: string;
  agencyId: string;
  agencyName: string;
  role: 'controller' | 'driver';
  expiresAt: string;
}

type FetchStatus = 'idle' | 'loading' | 'success' | 'error';

// ─── Utility: detect OS ───────────────────────────────────────────────

function detectOS(): 'ios' | 'android' | 'other' {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'other';
}

// ─── Utility: format expiry ───────────────────────────────────────────

function formatExpiry(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Utility: time remaining ────────────────────────────────────────────

function getTimeRemaining(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 'Expiré';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
}

// ─── Guide d'installation (iOS) ────────────────────────────────────────

function IosGuide() {
  return (
    <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800">
      <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-semibold text-sm">
        <Apple className="w-4 h-4" />
        Installation iOS (iPhone / iPad)
      </div>
      <ol className="space-y-2 text-sm text-blue-600 dark:text-blue-400">
        <li className="flex items-start gap-2">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-bold shrink-0 mt-0.5">1</span>
          <span>Ouvrez le lien dans <strong>Safari</strong></span>
        </li>
        <li className="flex items-start gap-2">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-bold shrink-0 mt-0.5">2</span>
          <span>Appuyez sur l&apos;icône <strong>Partager</strong> (⬆️ carré avec flèche)</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-bold shrink-0 mt-0.5">3</span>
          <span>Scrollez et tapez <strong>&quot;Sur l&apos;écran d&apos;accueil&quot;</strong></span>
        </li>
        <li className="flex items-start gap-2">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-bold shrink-0 mt-0.5">4</span>
          <span>Appuyez sur <strong>&quot;Ajouter&quot;</strong> — l&apos;app apparaît sur votre écran</span>
        </li>
      </ol>
    </div>
  );
}

// ─── Guide d'installation (Android) ──────────────────────────────────

function AndroidGuide() {
  return (
    <div className="space-y-3 p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800">
      <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-semibold text-sm">
        <Smartphone className="w-4 h-4" />
        Installation Android (Chrome)
      </div>
      <ol className="space-y-2 text-sm text-emerald-600 dark:text-emerald-400">
        <li className="flex items-start gap-2">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs font-bold shrink-0 mt-0.5">1</span>
          <span>Ouvrez le lien dans <strong>Chrome</strong></span>
        </li>
        <li className="flex items-start gap-2">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs font-bold shrink-0 mt-0.5">2</span>
          <span>Une bannière <strong>&quot;Ajouter à l&apos;écran d&apos;accueil&quot;</strong> apparaît en bas</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs font-bold shrink-0 mt-0.5">3</span>
          <span>Sinon, tapsez le menu ⋮ → <strong>&quot;Installer l&apos;application&quot;</strong></span>
        </li>
        <li className="flex items-start gap-2">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs font-bold shrink-0 mt-0.5">4</span>
          <span>Appuyez sur <strong>&quot;Installer&quot;</strong> — l&apos;app s&apos;ajoute automatiquement</span>
        </li>
      </ol>
    </div>
  );
}

// ─── QR Code Card Component ──────────────────────────────────────────

function PwaQrCard({
  title,
  description,
  icon,
  iconBg,
  iconColor,
  borderColor,
  tokenData,
  fetchStatus,
  onGenerate,
  onCopy,
  copiedField,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  borderColor: string;
  tokenData: PwaTokenData | null;
  fetchStatus: FetchStatus;
  onGenerate: () => void;
  onCopy: () => void;
  copiedField: string | null;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
      {/* Card Header */}
      <div className="p-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3 mb-2">
          <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center`}>
            <span className={iconColor}>{icon}</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-6">
        {fetchStatus === 'loading' && !tokenData && (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <div className="w-10 h-10 border-2 border-slate-200 dark:border-slate-700 border-t-slate-500 rounded-full animate-spin" />
            <span className="text-sm text-slate-500">Génération du lien sécurisé...</span>
          </div>
        )}

        {fetchStatus === 'error' && !tokenData && (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <AlertCircle className="w-10 h-10 text-red-400" />
            <p className="text-sm text-red-500">Erreur de génération</p>
            <button
              onClick={onGenerate}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Réessayer
            </button>
          </div>
        )}

        {tokenData && (
          <>
            {/* QR Code */}
            <div className="flex justify-center mb-4">
              <div className={`p-4 bg-white rounded-2xl border-2 ${borderColor} shadow-inner`}>
                <QRCodeSVG
                  value={tokenData.url}
                  size={200}
                  level="H"
                  includeMargin={false}
                  bgColor="#ffffff"
                  fgColor="#111827"
                  imageSettings={{
                    src: '',
                    height: 0,
                    width: 0,
                    excavate: false,
                  }}
                />
              </div>
            </div>

            {/* Security Badge */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  Sécurisé — {tokenData.agencyName}
                </span>
              </div>
            </div>

            {/* Expiry */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Expire : {formatExpiry(tokenData.expiresAt)} ({getTimeRemaining(tokenData.expiresAt)})
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={onCopy}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                {copiedField === tokenData.role ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-500" />
                    Copié !
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copier le lien
                  </>
                )}
              </button>

              <button
                onClick={onGenerate}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                title="Régénérer le token"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              <a
                href={tokenData.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                title="Ouvrir dans un nouvel onglet"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </>
        )}

        {fetchStatus === 'idle' && !tokenData && (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <QrCode className="w-10 h-10 text-slate-300 dark:text-slate-600" />
            <button
              onClick={onGenerate}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-medium hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
            >
              <QrCode className="w-4 h-4" />
              Générer le QR code
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export default function PwaTerrainPage() {
  const { agencyId, agencyName } = useAgency();
  const [controllerToken, setControllerToken] = useState<PwaTokenData | null>(null);
  const [driverToken, setDriverToken] = useState<PwaTokenData | null>(null);
  const [controllerStatus, setControllerStatus] = useState<FetchStatus>('idle');
  const [driverStatus, setDriverStatus] = useState<FetchStatus>('idle');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(true);
  const [os, setOs] = useState<'ios' | 'android' | 'other'>('other');

  // Detect OS on mount
  useEffect(() => {
    setOs(detectOS());
  }, []);

  // ─── Generate token ───────────────────────────────────────────────

  const generateToken = useCallback(async (role: 'controller' | 'driver') => {
    const setStatus = role === 'controller' ? setControllerStatus : setDriverStatus;
    const setToken = role === 'controller' ? setControllerToken : setDriverToken;

    setStatus('loading');

    try {
      const res = await fetch('/api/pwa/generate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur de génération');
      }

      const data: PwaTokenData = await res.json();
      setToken(data);
      setStatus('success');
    } catch (err) {
      console.error(`[PWA] Error generating ${role} token:`, err);
      setStatus('error');
      toast.error(`Erreur: ${err instanceof Error ? err.message : 'Impossible de générer le token'}`);
    }
  }, []);

  // ─── Auto-generate both tokens on mount ────────────────────────────

  useEffect(() => {
    if (agencyId) {
      generateToken('controller');
      generateToken('driver');
    }
  }, [agencyId, generateToken]);

  // ─── Copy to clipboard ────────────────────────────────────────────

  const handleCopy = useCallback(async (url: string, field: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedField(field);
      toast.success('Lien copié dans le presse-papiers');
      setTimeout(() => setCopiedField(null), 2500);
    } catch (err) {
      console.error('[PWA] Copy failed:', err);
      toast.error('Impossible de copier le lien');
    }
  }, []);

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* ─── Page Header ──────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-950/30 flex items-center justify-center">
            <Smartphone className="w-6 h-6 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              PWA & Terrain
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              QR codes d&apos;installation pour les équipes terrain — Contrôleur & Chauffeur
            </p>
          </div>
        </div>
      </div>

      {/* ─── Security Notice ─────────────────────────────────────── */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800">
        <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-700 dark:text-amber-300">
          <p className="font-semibold mb-1">Accès réservé à {agencyName}</p>
          <p className="text-amber-600 dark:text-amber-400">
            Chaque QR code contient un jeton de sécurité unique valable 24h, lié exclusivement à votre agence.
            Les applications PWA vérifient ce jeton au chargement.
          </p>
        </div>
      </div>

      {/* ─── QR Code Cards Grid ──────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Controller Card */}
        <PwaQrCard
          title="PWA Contrôleur"
          description="Validation de billets sur le terrain"
          icon={<ScanLine className="w-6 h-6" />}
          iconBg="bg-emerald-100 dark:bg-emerald-950/30"
          iconColor="text-emerald-600 dark:text-emerald-400"
          borderColor="border-emerald-200 dark:border-emerald-800"
          tokenData={controllerToken}
          fetchStatus={controllerStatus}
          onGenerate={() => generateToken('controller')}
          onCopy={() => controllerToken && handleCopy(controllerToken.url, 'controller')}
          copiedField={copiedField}
        />

        {/* Driver Card */}
        <PwaQrCard
          title="PWA Chauffeur"
          description="Gestion des livraisons en transit"
          icon={<Truck className="w-6 h-6" />}
          iconBg="bg-amber-100 dark:bg-amber-950/30"
          iconColor="text-amber-600 dark:text-amber-400"
          borderColor="border-amber-200 dark:border-amber-800"
          tokenData={driverToken}
          fetchStatus={driverStatus}
          onGenerate={() => generateToken('driver')}
          onCopy={() => driverToken && handleCopy(driverToken.url, 'driver')}
          copiedField={copiedField}
        />
      </div>

      {/* ─── Installation Guide ───────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg overflow-hidden">
        {/* Guide Header — Collapsible */}
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="w-full flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950/30 flex items-center justify-center">
              <Monitor className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            </div>
            <div className="text-left">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Guide d&apos;installation
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {os === 'ios' ? 'Instructions pour iPhone / iPad détectées' :
                 os === 'android' ? 'Instructions pour Android détectées' :
                 'Instructions pour iOS et Android'}
              </p>
            </div>
          </div>
          <ChevronDown
            className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
              showGuide ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* Guide Content */}
        {showGuide && (
          <div className="px-6 pb-6 space-y-4">
            {/* Show relevant guide first */}
            {os === 'ios' && <IosGuide />}
            {os === 'android' && <AndroidGuide />}

            {/* Show both if other, or show the other one too */}
            {os === 'other' && (
              <>
                <IosGuide />
                <AndroidGuide />
              </>
            )}
            {os === 'ios' && <AndroidGuide />}
            {os === 'android' && <IosGuide />}

            {/* Desktop tip */}
            {os === 'other' && (
              <div className="flex items-start gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Depuis un ordinateur, copiez le lien et envoyez-le par WhatsApp ou email à l&apos;équipe terrain.
                  Ouvrez-le depuis le téléphone pour installer l&apos;application.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Info Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Token Duration */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-950/30 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Durée du token</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">24 heures après génération</p>
          </div>
        </div>

        {/* Offline Support */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Hors ligne</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Fonctionne sans connexion internet</p>
          </div>
        </div>

        {/* Multi-device */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-950/30 flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Multi-appareils</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Partagez avec toute l&apos;équipe</p>
          </div>
        </div>
      </div>
    </div>
  );
}
