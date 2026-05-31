'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Bus,
  Delete,
  Check,
  ChevronDown,
  User,
  MapPin,
  Clock,
  Armchair,
  AlertTriangle,
  ScanLine,
  Wifi,
  WifiOff,
  CloudOff,
  CloudCheck,
  Shield,
  Keyboard,
  Camera,
  Maximize2,
  Minimize2,
  Flashlight,
  History,
  LogOut,
  ChevronRight,
  X,
  ArrowLeft,
  Ticket,
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  addToSyncQueue,
  getQueueStats,
  isOfflineStorageAvailable,
} from '@/lib/offline/queue';
import {
  syncEngine,
  startSyncEngine,
  stopSyncEngine,
} from '@/lib/offline/sync';
import { validatePwaToken } from '@/lib/pwa-guard';

// ─── Types ────────────────────────────────────────────────────────────────

interface Agency {
  id: string;
  name: string;
  slug: string;
}

type ValidationStatus =
  | 'idle'
  | 'loading'
  | 'valid'
  | 'used'
  | 'cancelled'
  | 'not_found'
  | 'error'
  | 'queued';

interface ValidationResult {
  status: ValidationStatus;
  passengerName?: string;
  destination?: string;
  seatNumber?: string;
  departureTime?: string;
  controlCode?: string;
  validatedAt?: string;
  ticketType?: string;
  price?: string;
  validity?: string;
  lineNumber?: string;
}

type Screen = 'dashboard' | 'scanner' | 'keypad' | 'result';
type LoginStatus = 'idle' | 'loading' | 'error';

// ─── PWA Token state ─────────────────────────────────────────────────

interface PwaGuardState {
  verified: boolean;
  agencyName?: string;
  error?: string;
  expired?: boolean;
}

// ─── Max code length ─────────────────────────────────────────────────────

const MAX_CODE_LENGTH = 8;

// ─── Format validated date ───────────────────────────────────────────────

function formatValidatedDate(iso: string | undefined) {
  if (!iso) return '';
  const d = new Date(iso);
  return (
    d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }) +
    ' \u00E0 ' +
    d.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  );
}

// ─── Format current time ──────────────────────────────────────────────────

function formatNow() {
  return new Date().toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── CSS Keyframes via style tag ────────────────────────────────────────

function ScanAnimations() {
  return (
    <style dangerouslySetInnerHTML={{
      __html: `
        @keyframes scanLine {
          0%, 100% { top: 0; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          50% { top: calc(100% - 2px); }
        }
        @keyframes pulseCorners {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.85); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes shakeX {
          0%, 100% { transform: translateX(0); }
          15%, 45%, 75% { transform: translateX(-8px); }
          30%, 60%, 90% { transform: translateX(8px); }
        }
        @keyframes drawCheck {
          from { stroke-dashoffset: 48; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(0, 217, 163, 0.2); }
          50% { box-shadow: 0 0 40px rgba(0, 217, 163, 0.5); }
        }
        @keyframes countUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fadeInUp 0.4s ease-out forwards; }
        .animate-fade-in-scale { animation: fadeInScale 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .animate-shake { animation: shakeX 0.6s ease-in-out; }
        .animate-pulse-glow { animation: pulseGlow 2s ease-in-out infinite; }
        .scan-line { animation: scanLine 2.5s ease-in-out infinite; }
        .corner-pulse { animation: pulseCorners 1.5s ease-in-out infinite; }
      `,
    }} />
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCREEN 1: DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════

function DashboardScreen({
  controllerName,
  onGoToScanner,
  onGoToKeypad,
  isOnline,
  validCount,
  invalidCount,
  totalControls,
  selectedAgency,
  onLogout,
}: {
  controllerName: string;
  onGoToScanner: () => void;
  onGoToKeypad: () => void;
  isOnline: boolean;
  validCount: number;
  invalidCount: number;
  totalControls: number;
  selectedAgency?: Agency;
  onLogout: () => void;
}) {
  const [showProfile, setShowProfile] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* ─── Header ───────────────────────────────────────────── */}
      <header className="bg-[#0d1117]/80 backdrop-blur-xl border-b border-white/5 px-5 pt-3 pb-3 safe-top">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          {/* Left: Logo */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-[#00d9a3] to-[#00b894] shadow-lg shadow-[#00d9a3]/20">
              <Bus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">
                Smarticket<span className="text-[#00d9a3]">S</span>
              </h1>
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00d9a3]/15 text-[#00d9a3] border border-[#00d9a3]/20">
                  CONTRÔLE
                </span>
                {selectedAgency && (
                  <span className="text-[10px] text-gray-500 truncate max-w-[120px]">
                    {selectedAgency.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Status indicators */}
          <div className="flex items-center gap-2">
            {/* Security shield */}
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#00d9a3]/10 border border-[#00d9a3]/20" title="Sécurisé">
              <Shield className="w-4 h-4 text-[#00d9a3]" />
            </div>

            {/* Wifi indicator */}
            <div
              className={`flex items-center justify-center w-9 h-9 rounded-xl border ${
                isOnline
                  ? 'bg-emerald-500/10 border-emerald-500/20'
                  : 'bg-red-500/10 border-red-500/20'
              }`}
              title={isOnline ? 'En ligne' : 'Hors ligne'}
            >
              {isOnline ? (
                <Wifi className="w-4 h-4 text-emerald-400" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-400" />
              )}
            </div>

            {/* Fullscreen */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-gray-400 active:scale-95 transition-all"
              title="Plein écran"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Profile */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowProfile(!showProfile)}
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-[#00d9a3]/30 to-[#00d9a3]/10 border border-[#00d9a3]/30 active:scale-95 transition-all"
              >
                <User className="w-4 h-4 text-[#00d9a3]" />
              </button>

              {/* Profile dropdown */}
              {showProfile && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-[#1a1a2e]/95 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50">
                  <div className="p-4 border-b border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00d9a3] to-[#00b894] flex items-center justify-center text-white font-bold text-sm">
                        {controllerName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{controllerName}</p>
                        <p className="text-[11px] text-gray-400">Contrôleur</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-2">
                    <button
                      type="button"
                      onClick={onLogout}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors active:scale-[0.98]"
                    >
                      <LogOut className="w-4 h-4" />
                      Déconnexion
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ─── Main Content ─────────────────────────────────────── */}
      <main className="flex-1 px-5 py-6 max-w-lg mx-auto w-full space-y-5">
        {/* ─── Service Summary Card ──────────────────────────── */}
        <div className="relative bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border border-white/10 rounded-3xl p-5 overflow-hidden">
          {/* Decorative glow */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#00d9a3]/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-[#00d9a3]/3 rounded-full blur-2xl" />

          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Service en cours</p>
                <p className="text-lg font-bold text-white mt-1">Aujourd&apos;hui</p>
                <p className="text-sm text-gray-500">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-[#00d9a3]/10 border border-[#00d9a3]/20">
                <History className="w-6 h-6 text-[#00d9a3]" />
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/5 rounded-2xl p-3 text-center border border-white/5">
                <p className="text-2xl font-bold text-white">{totalControls}</p>
                <p className="text-[10px] text-gray-400 mt-0.5 font-medium uppercase tracking-wide">Total</p>
              </div>
              <div className="bg-emerald-500/10 rounded-2xl p-3 text-center border border-emerald-500/15">
                <p className="text-2xl font-bold text-[#00d9a3]">{validCount}</p>
                <p className="text-[10px] text-emerald-400/70 mt-0.5 font-medium uppercase tracking-wide">Valides</p>
              </div>
              <div className="bg-red-500/10 rounded-2xl p-3 text-center border border-red-500/15">
                <p className="text-2xl font-bold text-red-400">{invalidCount}</p>
                <p className="text-[10px] text-red-400/70 mt-0.5 font-medium uppercase tracking-wide">Invalides</p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Objective Card ──────────────────────────────── */}
        <div className="bg-gradient-to-r from-[#00d9a3]/10 to-transparent border border-[#00d9a3]/15 rounded-2xl p-4 flex items-center gap-4">
          <div className="flex-1">
            <p className="text-xs text-gray-400 font-medium">Objectif du jour</p>
            <p className="text-lg font-bold text-white">50 contrôles</p>
            <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#00d9a3] to-[#00b894] rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, (totalControls / 50) * 100)}%` }}
              />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#00d9a3]">{Math.round((totalControls / 50) * 100)}%</p>
        </div>

        {/* ─── Main Action Buttons ────────────────────────── */}
        <div className="space-y-3 pt-2">
          {/* Scanner Button */}
          <button
            type="button"
            onClick={onGoToScanner}
            className="w-full flex items-center gap-4 bg-gradient-to-r from-[#00d9a3] to-[#00b894] rounded-2xl px-6 py-5 shadow-xl shadow-[#00d9a3]/25 active:scale-[0.97] transition-all animate-pulse-glow"
          >
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm">
              <Camera className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-lg font-bold text-white">Scanner un ticket</p>
              <p className="text-sm text-white/70">Utiliser la caméra pour scanner le QR code</p>
            </div>
            <ChevronRight className="w-5 h-5 text-white/60" />
          </button>

          {/* Manual Entry Button */}
          <button
            type="button"
            onClick={onGoToKeypad}
            className="w-full flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl px-6 py-5 active:scale-[0.97] transition-all hover:bg-white/8"
          >
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm">
              <Keyboard className="w-7 h-7 text-white/70" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-lg font-bold text-white">Saisie manuelle</p>
              <p className="text-sm text-gray-400">Entrer le code de contrôle manuellement</p>
            </div>
            <ChevronRight className="w-5 h-5 text-white/30" />
          </button>
        </div>
      </main>

      {/* ─── Offline Banner ───────────────────────────────────── */}
      {!isOnline && (
        <div className="fixed bottom-0 left-0 right-0 z-50">
          <div className="bg-amber-500/90 backdrop-blur-sm px-4 py-3 safe-bottom">
            <p className="text-center text-sm font-semibold text-white flex items-center justify-center gap-2">
              <WifiOff className="w-4 h-4" />
              MODE HORS LIGNE — Données synchronisées plus tard
            </p>
          </div>
        </div>
      )}

      {/* ─── Connection indicator ─────────────────────────────── */}
      <div className="px-5 py-3 safe-bottom">
        <div className="max-w-lg mx-auto flex items-center justify-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-[#00d9a3]' : 'bg-red-500'}`} />
          <p className={`text-[11px] font-medium ${isOnline ? 'text-gray-500' : 'text-red-400'}`}>
            {isOnline ? 'Connecté' : 'Hors ligne'}
          </p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCREEN 2: QR SCANNER
// ═══════════════════════════════════════════════════════════════════════════

function ScannerScreen({
  scannerRef,
  onBack,
  onGoToKeypad,
  onCodeScanned,
  isLoading,
  isOnline,
  onStartFlashlight,
  onStopFlashlight,
}: {
  scannerRef: React.RefObject<HTMLDivElement | null>;
  onBack: () => void;
  onGoToKeypad: () => void;
  onCodeScanned: (code: string) => void;
  isLoading: boolean;
  isOnline: boolean;
  onStartFlashlight: () => void;
  onStopFlashlight: () => void;
}) {
  const [torchOn, setTorchOn] = useState(false);

  const toggleTorch = () => {
    if (torchOn) {
      onStopFlashlight();
    } else {
      onStartFlashlight();
    }
    setTorchOn(!torchOn);
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col z-50">
      {/* ─── Top bar ─────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-black/80 to-transparent px-5 pt-4 pb-10 safe-top">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 active:scale-95 transition-all"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>

          <p className="text-white font-semibold text-base">Scanner un ticket</p>

          <button
            type="button"
            onClick={toggleTorch}
            className={`flex items-center justify-center w-10 h-10 rounded-xl backdrop-blur-sm border active:scale-95 transition-all ${
              torchOn
                ? 'bg-amber-400/20 border-amber-400/40 text-amber-400'
                : 'bg-white/10 border-white/10 text-white'
            }`}
          >
            <Flashlight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ─── Camera viewport ──────────────────────────────── */}
      <div className="flex-1 relative">
        <div
          id="scanner-container"
          ref={scannerRef}
          className="w-full h-full"
        />

        {/* ─── Scan overlay with animated corners ──────────── */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* Semi-transparent backdrop */}
          <div className="absolute inset-0 bg-black/40" />

          {/* Cutout area (transparent) */}
          <div className="relative w-[260px] h-[260px] bg-transparent">
            {/* Top-left corner */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-[3px] border-l-[3px] border-[#00d9a3] rounded-tl-2xl corner-pulse" />
            {/* Top-right corner */}
            <div className="absolute top-0 right-0 w-8 h-8 border-t-[3px] border-r-[3px] border-[#00d9a3] rounded-tr-2xl corner-pulse" />
            {/* Bottom-left corner */}
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[3px] border-l-[3px] border-[#00d9a3] rounded-bl-2xl corner-pulse" />
            {/* Bottom-right corner */}
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[3px] border-r-[3px] border-[#00d9a3] rounded-br-2xl corner-pulse" />

            {/* Scan line */}
            <div className="absolute left-2 right-2 h-[2px] bg-gradient-to-r from-transparent via-[#00d9a3] to-transparent scan-line" />
          </div>
        </div>
      </div>

      {/* ─── Instruction text ──────────────────────────────── */}
      <div className="absolute top-1/3 left-0 right-0 -translate-y-1/2 z-20 pointer-events-none">
        <div className="flex flex-col items-center gap-3">
          <div className="bg-black/60 backdrop-blur-md rounded-2xl px-6 py-3 flex items-center gap-2.5">
            <ScanLine className="w-5 h-5 text-[#00d9a3] animate-pulse" />
            <span className="text-sm text-white font-medium">
              Cadrez le QR code du ticket
            </span>
          </div>
        </div>
      </div>

      {/* ─── Loading overlay ─────────────────────────────── */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-40">
          <div className="bg-[#1a1a2e]/90 backdrop-blur-xl rounded-3xl px-8 py-6 flex flex-col items-center gap-4 border border-white/10">
            <div className="w-12 h-12 border-3 border-[#00d9a3]/30 border-t-[#00d9a3] rounded-full animate-spin" />
            <p className="text-white font-semibold">Vérification en cours...</p>
          </div>
        </div>
      )}

      {/* ─── Bottom bar ────────────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/80 to-transparent px-5 pb-8 pt-14 safe-bottom">
        <button
          type="button"
          onClick={onGoToKeypad}
          className="w-full flex items-center justify-center gap-2.5 bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl px-5 py-4 active:scale-[0.97] transition-all"
        >
          <Keyboard className="w-5 h-5 text-white/70" />
          <span className="text-white/80 font-medium">Code non détecté ? Saisie manuelle</span>
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCREEN 3: VALIDATION RESULT
// ═══════════════════════════════════════════════════════════════════════════

function ResultScreen({
  result,
  onClear,
  onNewScan,
}: {
  result: ValidationResult;
  onClear: () => void;
  onNewScan: () => void;
}) {
  const isValid = result.status === 'valid';
  const isQueued = result.status === 'queued';
  const isError = result.status === 'error';
  const isNotFound = result.status === 'not_found';
  const isUsed = result.status === 'used';
  const isCancelled = result.status === 'cancelled';
  const isNegative = isUsed || isCancelled;

  // Background gradient per status
  const bgGradient =
    isValid
      ? 'from-[#00d9a3] to-[#00b894]'
      : isNegative
        ? 'from-[#e74c3c] to-[#c0392b]'
        : isNotFound
          ? 'from-[#f39c12] to-[#e67e22]'
          : isQueued
            ? 'from-[#3498db] to-[#2980b9]'
            : 'from-[#1a1a2e] to-[#16213e]';

  return (
    <div className={`fixed inset-0 bg-gradient-to-b ${bgGradient} flex flex-col z-50`}>
      {/* Close button */}
      <div className="flex justify-end px-5 pt-4 safe-top">
        <button
          type="button"
          onClick={onClear}
          className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm active:scale-95 transition-all"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-12 safe-bottom">
        <div className="w-full max-w-sm text-center space-y-6 animate-fade-in-up">
          {/* Icon */}
          <div className="flex justify-center">
            {isValid && (
              <div className="w-28 h-28 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center animate-fade-in-scale">
                <svg className="w-16 h-16 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.3" />
                  <path
                    d="M8 12l2.67 2.67L16 9.33"
                    strokeDasharray="24"
                    strokeDashoffset="24"
                    style={{ animation: 'drawCheck 0.5s ease-out 0.3s forwards' }}
                  />
                </svg>
              </div>
            )}
            {isUsed && (
              <div className="w-28 h-28 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center animate-fade-in-scale animate-shake">
                <svg className="w-16 h-16 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.3" />
                  <path d="M15 9l-6 6M9 9l6 6" />
                </svg>
              </div>
            )}
            {isCancelled && (
              <div className="w-28 h-28 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center animate-fade-in-scale animate-shake">
                <svg className="w-16 h-16 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.3" />
                  <path d="M15 9l-6 6M9 9l6 6" />
                </svg>
              </div>
            )}
            {isNotFound && (
              <div className="w-28 h-28 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center animate-fade-in-scale">
                <AlertTriangle className="w-16 h-16 text-white" />
              </div>
            )}
            {isQueued && (
              <div className="w-28 h-28 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center animate-fade-in-scale">
                <CloudOff className="w-16 h-16 text-white" />
              </div>
            )}
            {isError && (
              <div className="w-28 h-28 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center animate-fade-in-scale">
                <AlertTriangle className="w-16 h-16 text-white" />
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              {isValid && 'TICKET VALIDE'}
              {isUsed && 'DÉJÀ UTILISÉ'}
              {isCancelled && 'BILLET ANNULÉ'}
              {isNotFound && 'CODE INCONNU'}
              {isQueued && 'ENREGISTRÉ HORS LIGNE'}
              {isError && 'ERREUR CONNEXION'}
            </h2>
          </div>

          {/* Details card (VALID only) */}
          {isValid && (
            <div className="bg-white/15 backdrop-blur-md rounded-3xl p-5 text-left space-y-3.5 border border-white/20">
              {/* Passenger name */}
              {result.passengerName && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] text-white/60 uppercase tracking-wider font-medium">Passager</p>
                    <p className="text-base font-bold text-white">{result.passengerName}</p>
                  </div>
                </div>
              )}

              {/* Destination */}
              {result.destination && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] text-white/60 uppercase tracking-wider font-medium">Trajet</p>
                    <p className="text-base font-bold text-white">{result.destination}</p>
                  </div>
                </div>
              )}

              {/* Seat + Departure */}
              <div className="grid grid-cols-2 gap-3">
                {result.seatNumber && (
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                      <Armchair className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-[10px] text-white/60 uppercase tracking-wider font-medium">Siège</p>
                      <p className="text-base font-bold text-white">{result.seatNumber}</p>
                    </div>
                  </div>
                )}
                {result.departureTime && (
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-[10px] text-white/60 uppercase tracking-wider font-medium">Départ</p>
                      <p className="text-base font-bold text-white">{result.departureTime}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Timestamp */}
              <div className="border-t border-white/15 pt-3 flex items-center justify-between">
                <p className="text-sm text-white/70">
                  Contrôlé à <span className="font-bold text-white">{formatNow()}</span>
                </p>
                <p className="text-xs font-mono text-white/40">Code: {result.controlCode}</p>
              </div>
            </div>
          )}

          {/* Used / Cancelled details */}
          {isUsed && result.validatedAt && (
            <div className="bg-white/15 backdrop-blur-md rounded-3xl p-5 text-center border border-white/20">
              <p className="text-white/80 text-sm">
                Ce billet a été validé le
              </p>
              <p className="text-white font-bold text-lg mt-1">
                {formatValidatedDate(result.validatedAt)}
              </p>
              <p className="text-white/60 text-xs font-mono mt-2">Code: {result.controlCode}</p>
            </div>
          )}

          {/* Cancelled reason */}
          {isCancelled && (
            <div className="bg-white/15 backdrop-blur-md rounded-3xl p-5 text-center border border-white/20">
              <p className="text-white/80 text-sm">
                Ce billet a été annulé
              </p>
              <p className="text-white/60 text-xs font-mono mt-2">Code: {result.controlCode}</p>
            </div>
          )}

          {/* Not found message */}
          {isNotFound && (
            <div className="bg-white/15 backdrop-blur-md rounded-3xl p-5 text-center border border-white/20">
              <p className="text-white/80 text-sm">
                Ce code ne correspond à aucun billet actif
              </p>
              <p className="text-white/60 text-xs font-mono mt-2">Code: {result.controlCode}</p>
            </div>
          )}

          {/* Queued message */}
          {isQueued && (
            <div className="bg-white/15 backdrop-blur-md rounded-3xl p-5 text-center border border-white/20 space-y-2">
              <p className="text-white/80 text-sm">
                La validation sera envoyée automatiquement lorsque la connexion sera rétablie.
              </p>
              <p className="text-white/60 text-xs font-mono">Code: {result.controlCode}</p>
            </div>
          )}

          {/* Error message */}
          {isError && (
            <div className="bg-white/15 backdrop-blur-md rounded-3xl p-5 text-center border border-white/20 space-y-2">
              <p className="text-white/80 text-sm">
                Impossible de vérifier le billet. Réessayez.
              </p>
              <p className="text-white/60 text-xs font-mono">Code: {result.controlCode}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-4 space-y-3">
            {isValid && (
              <button
                type="button"
                onClick={onNewScan}
                className="w-full bg-white text-[#00d9a3] font-bold text-base py-4 rounded-2xl active:scale-[0.97] transition-all shadow-lg"
              >
                Nouveau contrôle
              </button>
            )}
            {!isValid && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={onNewScan}
                  className="flex-1 bg-white/20 backdrop-blur-sm text-white font-bold text-sm py-4 rounded-2xl active:scale-[0.97] transition-all border border-white/20"
                >
                  Nouveau scan
                </button>
                <button
                  type="button"
                  onClick={onClear}
                  className="flex-1 bg-white text-[#1a1a2e] font-bold text-sm py-4 rounded-2xl active:scale-[0.97] transition-all shadow-lg"
                >
                  Saisie manuelle
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCREEN 4: NUMERIC KEYPAD
// ═══════════════════════════════════════════════════════════════════════════

function KeypadScreen({
  code,
  onDigit,
  onDelete,
  onValidate,
  onBack,
  isLoading,
  isOnline,
}: {
  code: string;
  onDigit: (d: string) => void;
  onDelete: () => void;
  onValidate: () => void;
  onBack: () => void;
  isLoading: boolean;
  isOnline: boolean;
}) {
  const displaySlots = Array.from({ length: MAX_CODE_LENGTH }, (_, i) => ({
    char: i < code.length ? code[i] : '',
    active: i === code.length,
    filled: i < code.length,
  }));

  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['delete', '0', 'validate'],
  ] as const;

  const canValidate = code.length >= 6 && !isLoading;

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-[#1a1a2e] to-[#16213e] flex flex-col z-50">
      {/* ─── Header ─────────────────────────────────────── */}
      <div className="bg-[#0d1117]/80 backdrop-blur-xl border-b border-white/5 px-5 pt-4 pb-4 safe-top">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 border border-white/10 active:scale-95 transition-all"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <p className="text-white font-semibold text-base">CODE DE CONTRÔLE</p>
          <div className="w-10" />
        </div>
      </div>

      {/* ─── Code display ──────────────────────────────────── */}
      <div className="px-6 pt-8 pb-6 max-w-lg mx-auto w-full">
        <div className="bg-[#0d1117]/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6">
          {/* 8 digit slots */}
          <div className="flex justify-center gap-3">
            {displaySlots.map((slot, i) => (
              <div
                key={i}
                className={`w-10 h-12 rounded-xl flex items-center justify-center text-2xl font-bold transition-all duration-150 ${
                  slot.filled
                    ? 'bg-[#00d9a3]/20 border-2 border-[#00d9a3]/50 text-[#00d9a3]'
                    : slot.active
                      ? 'bg-white/10 border-2 border-white/30 text-white'
                      : 'bg-white/5 border-2 border-white/8 text-transparent'
                }`}
              >
                {slot.filled ? (
                  <span className="animate-fade-in-scale">{slot.char}</span>
                ) : slot.active ? (
                  <span className="w-[2px] h-6 bg-white/60 animate-pulse rounded" />
                ) : (
                  <span className="text-white/10">-</span>
                )}
              </div>
            ))}
          </div>

          {/* Digit count */}
          <p className="text-center text-xs text-gray-500 mt-4">
            {code.length}/{MAX_CODE_LENGTH} chiffres saisis
          </p>
        </div>
      </div>

      {/* ─── Keypad grid ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center px-8 max-w-lg mx-auto w-full">
        <div className="space-y-3">
          {keys.map((row, ri) => (
            <div key={ri} className="grid grid-cols-3 gap-3">
              {row.map((key) => {
                if (key === 'delete') {
                  return (
                    <button
                      key="delete"
                      type="button"
                      onClick={onDelete}
                      className="h-[72px] rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center active:scale-95 active:bg-white/10 transition-all"
                    >
                      <Delete className="w-6 h-6 text-white/60" />
                    </button>
                  );
                }

                if (key === 'validate') {
                  return (
                    <button
                      key="validate"
                      type="button"
                      onClick={onValidate}
                      disabled={!canValidate}
                      className={`h-[72px] rounded-2xl flex items-center justify-center active:scale-95 transition-all ${
                        canValidate
                          ? 'bg-gradient-to-r from-[#00d9a3] to-[#00b894] shadow-lg shadow-[#00d9a3]/20'
                          : 'bg-white/5 border border-white/10'
                      }`}
                    >
                      <Check className={`w-6 h-6 ${canValidate ? 'text-white' : 'text-white/20'}`} />
                    </button>
                  );
                }

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onDigit(key)}
                    className="h-[72px] rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl font-bold text-white active:scale-95 active:bg-[#00d9a3]/15 transition-all"
                  >
                    {key}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Validate full-width button */}
        <button
          type="button"
          onClick={onValidate}
          disabled={!canValidate}
          className={`w-full h-16 rounded-2xl flex items-center justify-center gap-3 font-bold text-lg mt-5 active:scale-[0.97] transition-all ${
            canValidate
              ? 'bg-gradient-to-r from-[#00d9a3] to-[#00b894] text-white shadow-xl shadow-[#00d9a3]/25'
              : 'bg-white/5 border border-white/10 text-white/20 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Vérification...
            </>
          ) : (
            <>
              <Check className="w-5 h-5" />
              VALIDER LE BILLET
            </>
          )}
        </button>

        {/* Hint */}
        <p className="text-center text-xs text-gray-600 mt-4">
          Ou scannez le QR code
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const STORAGE_KEYS = {
  accessToken: 'smartickets_staff_access_token',
  refreshToken: 'smartickets_staff_refresh_token',
  staffData: 'smartickets_staff_data',
};

export default function ControllerValidatePage() {
  // ─── Screen state ─────────────────────────────────────────────
  const [screen, setScreen] = useState<Screen>('dashboard');

  // ─── Auth state ─────────────────────────────────────────────
  const [controllerName, setControllerName] = useState('Amina Diop');

  // ─── Code / validation state ──────────────────────────────────
  const [code, setCode] = useState('');
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>('');
  const [agenciesLoaded, setAgenciesLoaded] = useState(false);
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>('idle');
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [validCount, setValidCount] = useState(0);
  const [invalidCount, setInvalidCount] = useState(0);
  const [agenciesDropdownOpen, setAgenciesDropdownOpen] = useState(false);

  // ─── PWA Guard state ────────────────────────────────────────
  const [pwaGuard, setPwaGuard] = useState<PwaGuardState>({ verified: false });

  // ─── Online / offline state ─────────────────────────────────
  const [isOnline, setIsOnline] = useState(true);

  // ─── Sync queue state ───────────────────────────────────────
  const [pendingCount, setPendingCount] = useState(0);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const autoClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ─── QR scanner refs ────────────────────────────────────────
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerStartingRef = useRef(false);

  // ─── Stable ref for selected agency ──────────────────────────
  const selectedAgencyIdRef = useRef(selectedAgencyId);
  selectedAgencyIdRef.current = selectedAgencyId;

  // ─── Check existing session on mount ────────────────────────
  useEffect(() => {
    const staffData = localStorage.getItem(STORAGE_KEYS.staffData);
    if (staffData) {
      try {
        const data = JSON.parse(staffData);
        if (data.name) setControllerName(data.name);
      } catch {
        // Ignore
      }
    }
  }, []);

  // ─── PWA Token validation on mount ──────────────────────────
  useEffect(() => {
    const validateTokenFromUrl = async () => {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      if (!token) return;

      const result = await validatePwaToken(token, 'controller');
      if (result.valid && result.payload) {
        const payload = result.payload;
        setPwaGuard({ verified: true, agencyName: payload.agencyName });
        setSelectedAgencyId(payload.agencyId);
        window.history.replaceState({}, '', '/controller/validate');
      } else {
        setPwaGuard({ verified: false, error: result.error, expired: result.error?.includes('expiré') });
        window.history.replaceState({}, '', '/controller/validate');
      }
    };
    validateTokenFromUrl();
  }, []);

  // ─── Fetch agencies on mount ────────────────────────────────
  useEffect(() => {
    const fetchAgencies = async () => {
      try {
        const res = await fetch('/api/controller/agencies');
        if (res.ok) {
          const data = await res.json();
          const list: Agency[] = data.agencies || [];
          setAgencies(list);
          setSelectedAgencyId((prev) => {
            if (prev) return prev;
            if (list.length === 1) return list[0].id;
            return prev;
          });
        }
      } catch {
        // Silently fail
      } finally {
        setAgenciesLoaded(true);
      }
    };
    fetchAgencies();
  }, []);

  // ─── Online / offline listeners ──────────────────────────────
  useEffect(() => {
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ─── Start sync engine on mount, stop on unmount ──────────────
  useEffect(() => {
    startSyncEngine();
    let unsub: (() => void) | undefined;
    if (syncEngine) {
      unsub = syncEngine.subscribe((event) => {
        if (event.type === 'sync_progress' || event.type === 'sync_complete') {
          if (event.pending !== undefined) setPendingCount(event.pending);
        }
      });
      getQueueStats().then((stats) => setPendingCount(stats.pending));
    }
    return () => {
      stopSyncEngine();
      if (unsub) unsub();
    };
  }, []);

  // ─── Cleanup auto-clear timer ───────────────────────────────
  useEffect(() => {
    return () => {
      if (autoClearTimerRef.current) clearTimeout(autoClearTimerRef.current);
    };
  }, []);

  // ─── Stop scanner on unmount ────────────────────────────────
  useEffect(() => {
    return () => { stopScannerInternal(); };
  }, []);

  // ─── Web Audio: ding ────────────────────────────────────────
  const playDing = useCallback(() => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const osc1 = ctx.createOscillator();
      const g1 = ctx.createGain();
      osc1.connect(g1);
      g1.connect(ctx.destination);
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, ctx.currentTime);
      g1.gain.setValueAtTime(0.3, ctx.currentTime);
      g1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.4);
      const osc2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      osc2.connect(g2);
      g2.connect(ctx.destination);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.15);
      g2.gain.setValueAtTime(0.25, ctx.currentTime + 0.15);
      g2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      osc2.start(ctx.currentTime + 0.15);
      osc2.stop(ctx.currentTime + 0.6);
    } catch { /* Audio not available */ }
  }, []);

  // ─── Web Audio: buzz ────────────────────────────────────────
  const playBuzz = useCallback(() => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g);
      g.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(150, ctx.currentTime + 0.3);
      g.gain.setValueAtTime(0.2, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch { /* Audio not available */ }
  }, []);

  // ─── Haptic feedback ────────────────────────────────────────
  const triggerHaptic = useCallback((pattern: number | number[] = 10) => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    } catch { /* Silently fail */ }
  }, []);

  // ─── Extract numeric code from scanned text ─────────────────
  const extractControlCode = useCallback((text: string): string | null => {
    if (/^\d{6,8}$/.test(text)) return text;
    const match = text.match(/\d{6,8}/);
    return match ? match[0] : null;
  }, []);

  // ─── Clear result and code ──────────────────────────────────
  const clearResult = useCallback(() => {
    if (autoClearTimerRef.current) {
      clearTimeout(autoClearTimerRef.current);
      autoClearTimerRef.current = null;
    }
    setResult(null);
    setValidationStatus('idle');
    setCode('');
    setScreen('dashboard');
  }, []);

  // ─── Navigate back to dashboard ──────────────────────────────
  const goToDashboard = useCallback(() => {
    stopScannerInternal();
    setScreen('dashboard');
    setCode('');
  }, []);

  // ─── Navigate to scanner ─────────────────────────────────────
  const goToScanner = useCallback(() => {
    setCode('');
    setResult(null);
    setValidationStatus('idle');
    setScreen('scanner');
  }, []);

  // ─── Navigate to keypad ──────────────────────────────────────
  const goToKeypad = useCallback(() => {
    stopScannerInternal();
    setScreen('keypad');
  }, []);

  // ─── Validate ticket with a given code ─────────────────────
  const validateWithCode = useCallback(
    async (controlCode: string) => {
      if (controlCode.length < 6 || validationStatus === 'loading') return;
      setValidationStatus('loading');
      setCode(controlCode);
      triggerHaptic(20);

      try {
        const res = await fetch('/api/validate-ticket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            controlCode,
            agencyId: selectedAgencyIdRef.current || undefined,
          }),
        });
        const data = await res.json();

        if (res.ok && data.valid) {
          setValidationStatus('valid');
          setResult({
            status: 'valid',
            passengerName: data.passengerName,
            destination: data.destination,
            seatNumber: data.seatNumber,
            departureTime: data.departureTime,
            controlCode,
          });
          setValidCount((c) => c + 1);
          playDing();
          triggerHaptic([50, 50, 100]);
          setScreen('result');
        } else if (res.ok && data.ticketStatus === 'VALIDATED') {
          setValidationStatus('used');
          setResult({ status: 'used', validatedAt: data.validatedAt, controlCode });
          setInvalidCount((c) => c + 1);
          playBuzz();
          triggerHaptic([100, 50, 100]);
          setScreen('result');
        } else if (res.ok && data.ticketStatus === 'CANCELLED') {
          setValidationStatus('cancelled');
          setResult({ status: 'cancelled', controlCode });
          setInvalidCount((c) => c + 1);
          playBuzz();
          triggerHaptic([100, 50, 100]);
          setScreen('result');
        } else {
          setValidationStatus('not_found');
          setResult({ status: 'not_found', controlCode });
          setInvalidCount((c) => c + 1);
          playBuzz();
          triggerHaptic([50]);
          setScreen('result');
        }
      } catch {
        try {
          const offlineAvailable = await isOfflineStorageAvailable();
          if (offlineAvailable) {
            await addToSyncQueue({
              url: '/api/validate-ticket',
              method: 'POST',
              body: { controlCode, agencyId: selectedAgencyIdRef.current || undefined },
            });
            const stats = await getQueueStats();
            setPendingCount(stats.pending);
            setValidationStatus('queued');
            setResult({ status: 'queued', controlCode });
            setInvalidCount((c) => c + 1);
            playBuzz();
            triggerHaptic([100, 100]);
            setScreen('result');
          } else {
            setValidationStatus('error');
            setResult({ status: 'error', controlCode });
            setInvalidCount((c) => c + 1);
            playBuzz();
            triggerHaptic([100, 100]);
            setScreen('result');
          }
        } catch {
          setValidationStatus('error');
          setResult({ status: 'error', controlCode });
          setInvalidCount((c) => c + 1);
          playBuzz();
          triggerHaptic([100, 100]);
          setScreen('result');
        }
      }

      // Auto-clear after 8 seconds on result screen
      autoClearTimerRef.current = setTimeout(() => {
        clearResult();
      }, 8000);
    },
    [validationStatus, triggerHaptic, playDing, playBuzz, clearResult],
  );

  // ─── QR Scanner: stop (internal, no deps) ──────────────────
  const stopScannerInternal = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        const state = html5QrCodeRef.current.getState();
        if (state === 2 || state === 1) {
          await html5QrCodeRef.current.stop();
        }
      } catch { /* Ignore */ }
      try { html5QrCodeRef.current.clear(); } catch { /* Ignore */ }
      html5QrCodeRef.current = null;
    }
  }, []);

  // ─── QR Scanner: start ──────────────────────────────────────
  const startScanner = useCallback(async () => {
    if (!scannerRef.current || scannerStartingRef.current) return;
    scannerStartingRef.current = true;
    await stopScannerInternal();

    try {
      const html5QrCode = new Html5Qrcode('scanner-container');
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 260, height: 260 } },
        (decodedText) => {
          const extracted = extractControlCode(decodedText);
          if (extracted) {
            setCode(extracted);
            validateWithCode(extracted);
            stopScannerInternal();
          }
        },
        () => { /* Ignore */ },
      );
    } catch {
      html5QrCodeRef.current = null;
    } finally {
      scannerStartingRef.current = false;
    }
  }, [extractControlCode, validateWithCode, stopScannerInternal]);

  // ─── Flashlight ──────────────────────────────────────────────
  const handleStartFlashlight = useCallback(() => {
    html5QrCodeRef.current?.applyVideoConstraints({
      advanced: [{ torch: true }],
    } as MediaTrackConstraints);
  }, []);

  const handleStopFlashlight = useCallback(() => {
    html5QrCodeRef.current?.applyVideoConstraints({
      advanced: [{ torch: false }],
    } as MediaTrackConstraints);
  }, []);

  // ─── Start scanner when entering scanner screen ──────────────
  useEffect(() => {
    if (screen === 'scanner') {
      const timer = setTimeout(() => { startScanner(); }, 300);
      return () => clearTimeout(timer);
    } else {
      stopScannerInternal();
    }
  }, [screen, startScanner, stopScannerInternal]);

  // ─── Handle digit press ─────────────────────────────────────
  const handleDigit = useCallback(
    (digit: string) => {
      if (code.length >= MAX_CODE_LENGTH) return;
      triggerHaptic(10);
      setCode((prev) => prev + digit);
    },
    [code.length, triggerHaptic],
  );

  // ─── Handle delete ───────────────────────────────────────────
  const handleDelete = useCallback(() => {
    triggerHaptic(10);
    setCode((prev) => prev.slice(0, -1));
  }, [triggerHaptic]);

  // ─── Validate ticket (keypad) ─────────────────────────────────
  const handleValidate = useCallback(async () => {
    if (code.length < 6 || validationStatus === 'loading') return;
    await validateWithCode(code);
  }, [code, validationStatus, validateWithCode]);

  // ─── New scan (from result screen) ──────────────────────────
  const handleNewScan = useCallback(() => {
    if (autoClearTimerRef.current) clearTimeout(autoClearTimerRef.current);
    setResult(null);
    setValidationStatus('idle');
    setCode('');
    setScreen('scanner');
  }, []);

  // ─── Logout ──────────────────────────────────────────────────
  const handleLogout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.accessToken);
    localStorage.removeItem(STORAGE_KEYS.refreshToken);
    localStorage.removeItem(STORAGE_KEYS.staffData);
    if (typeof window !== 'undefined') {
      window.location.href = '/controller/login';
    }
  }, []);

  // ─── Keyboard support ───────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (screen !== 'keypad') return;
      if (e.key >= '0' && e.key <= '9') handleDigit(e.key);
      else if (e.key === 'Backspace') handleDelete();
      else if (e.key === 'Enter') handleValidate();
      else if (e.key === 'Escape') goToDashboard();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [screen, handleDigit, handleDelete, handleValidate, goToDashboard]);

  // ─── Computed values ─────────────────────────────────────────
  const selectedAgency = agencies.find((a) => a.id === selectedAgencyId);
  const totalControls = validCount + invalidCount;

  // ─── Agency selector (shown on dashboard) ────────────────────
  const agencySelector = agenciesLoaded && agencies.length > 1 ? (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setAgenciesDropdownOpen((o) => !o)}
        className="w-full flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm active:scale-[0.98] transition-transform"
      >
        <span className={selectedAgency ? 'text-white' : 'text-gray-500'}>
          {selectedAgency ? selectedAgency.name : 'Sélectionner une agence'}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${agenciesDropdownOpen ? 'rotate-180' : ''}`} />
      </button>
      {agenciesDropdownOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-[#1a1a2e]/95 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl max-h-48 overflow-y-auto">
          {agencies.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => {
                setSelectedAgencyId(a.id);
                setAgenciesDropdownOpen(false);
              }}
              className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                a.id === selectedAgencyId
                  ? 'bg-[#00d9a3]/15 text-[#00d9a3]'
                  : 'text-gray-300 hover:bg-white/5'
              }`}
            >
              {a.name}
            </button>
          ))}
        </div>
      )}
    </div>
  ) : null;

  // ─── Render ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white select-none">
      <ScanAnimations />

      {/* Dashboard Screen */}
      {screen === 'dashboard' && (
        <div>
          {agencySelector && <div className="max-w-lg mx-auto px-5 pt-4">{agencySelector}</div>}
          <DashboardScreen
            controllerName={controllerName}
            onGoToScanner={goToScanner}
            onGoToKeypad={goToKeypad}
            isOnline={isOnline}
            validCount={validCount}
            invalidCount={invalidCount}
            totalControls={totalControls}
            selectedAgency={selectedAgency}
            onLogout={handleLogout}
          />
        </div>
      )}

      {/* Scanner Screen */}
      {screen === 'scanner' && (
        <ScannerScreen
          scannerRef={scannerRef}
          onBack={goToDashboard}
          onGoToKeypad={goToKeypad}
          onCodeScanned={validateWithCode}
          isLoading={validationStatus === 'loading'}
          isOnline={isOnline}
          onStartFlashlight={handleStartFlashlight}
          onStopFlashlight={handleStopFlashlight}
        />
      )}

      {/* Keypad Screen */}
      {screen === 'keypad' && (
        <KeypadScreen
          code={code}
          onDigit={handleDigit}
          onDelete={handleDelete}
          onValidate={handleValidate}
          onBack={goToDashboard}
          isLoading={validationStatus === 'loading'}
          isOnline={isOnline}
        />
      )}

      {/* Result Screen */}
      {screen === 'result' && result && (
        <ResultScreen
          result={result}
          onClear={clearResult}
          onNewScan={handleNewScan}
        />
      )}

      {/* ─── Pending sync footer indicator ────────────────── */}
      {pendingCount > 0 && screen === 'dashboard' && (
        <div className="fixed bottom-16 left-0 right-0 z-40 px-5">
          <div className="max-w-lg mx-auto">
            <div className="bg-sky-500/20 backdrop-blur-xl border border-sky-500/30 rounded-2xl px-4 py-3 flex items-center gap-3">
              <CloudCheck className="w-5 h-5 text-sky-400 animate-pulse" />
              <div className="flex-1">
                <p className="text-sm font-medium text-sky-300">
                  {pendingCount} validation{pendingCount > 1 ? 's' : ''} en attente de synchronisation
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
