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
import { validatePwaToken, type PwaTokenPayload } from '@/lib/pwa-guard';

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
}

type InputMode = 'keypad' | 'camera';

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

// ─── Result Card sub-component ────────────────────────────────────────────

function ResultCard({ result, onClear }: { result: ValidationResult; onClear: () => void }) {
  // Color styles per status
  const bg =
    result.status === 'valid'
      ? '#064e3b'
      : result.status === 'queued'
        ? '#1e3a5f'
        : result.status === 'used' || result.status === 'cancelled'
          ? '#7f1d1d'
          : result.status === 'not_found'
            ? '#78350f'
            : '#1f2937';

  const border =
    result.status === 'valid'
      ? '#10b981'
      : result.status === 'queued'
        ? '#3b82f6'
        : result.status === 'used' || result.status === 'cancelled'
          ? '#ef4444'
          : result.status === 'not_found'
            ? '#f59e0b'
            : '#4b5563';

  return (
    <div
      onClick={onClear}
      className="rounded-2xl p-5 border transition-all animate-in slide-in-from-bottom-4 duration-300 cursor-pointer"
      role="alert"
      aria-live="assertive"
      style={{ backgroundColor: bg, borderColor: border }}
    >
      {/* VALID */}
      {result.status === 'valid' && (
        <div className="space-y-3">
          <p className="text-emerald-300 font-bold text-center text-lg flex items-center justify-center gap-2">
            <Check className="w-5 h-5" />
            BILLET VALIDE
          </p>
          <hr className="border-emerald-700/50" />
          <div className="space-y-2.5 text-sm">
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-white font-medium">{result.passengerName}</span>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-gray-200">{result.destination}</span>
            </div>
            <div className="flex items-center gap-3">
              <Armchair className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-gray-200">
                Si&egrave;ge: <span className="font-semibold text-white">{result.seatNumber}</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-gray-200">
                D&eacute;part:{' '}
                <span className="font-semibold text-white">{result.departureTime}</span>
              </span>
            </div>
          </div>
          <hr className="border-emerald-700/50" />
          <p className="text-center text-xs text-emerald-400 font-mono">
            Code: {result.controlCode}
          </p>
          <p className="text-center text-[10px] text-emerald-500/60 mt-1">
            Appuyez pour effacer
          </p>
        </div>
      )}

      {/* QUEUED (offline) */}
      {result.status === 'queued' && (
        <div className="space-y-3">
          <p className="text-sky-300 font-bold text-center text-lg flex items-center justify-center gap-2">
            <CloudOff className="w-5 h-5" />
            ENREGISTR&Eacute; HORS LIGNE
          </p>
          <hr className="border-sky-700/50" />
          <p className="text-center text-sm text-gray-300">
            La validation sera envoy&eacute;e automatiquement
            <br />
            lorsque la connexion sera r&eacute;tablie.
          </p>
          <p className="text-center text-xs text-sky-400 font-mono mt-1">
            Code: {result.controlCode}
          </p>
          <p className="text-center text-[10px] text-sky-400/60 mt-1">
            Appuyez pour effacer
          </p>
        </div>
      )}

      {/* ALREADY USED */}
      {result.status === 'used' && (
        <div className="space-y-3">
          <p className="text-red-300 font-bold text-center text-lg flex items-center justify-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            BILLET D&Eacute;J&Agrave; UTILIS&Eacute;
          </p>
          <hr className="border-red-700/50" />
          {result.validatedAt && (
            <p className="text-center text-sm text-gray-300">
              Valid&eacute; le : {formatValidatedDate(result.validatedAt)}
            </p>
          )}
          <p className="text-center text-[10px] text-red-400/60 mt-1">
            Appuyez pour effacer
          </p>
        </div>
      )}

      {/* CANCELLED */}
      {result.status === 'cancelled' && (
        <div className="space-y-3">
          <p className="text-red-300 font-bold text-center text-lg flex items-center justify-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            BILLET ANNUL&Eacute;
          </p>
          <hr className="border-red-700/50" />
          <p className="text-center text-[10px] text-red-400/60 mt-1">
            Appuyez pour effacer
          </p>
        </div>
      )}

      {/* NOT FOUND */}
      {result.status === 'not_found' && (
        <div className="space-y-3">
          <p className="text-amber-300 font-bold text-center text-lg flex items-center justify-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            CODE INCONNU
          </p>
          <hr className="border-amber-700/50" />
          <p className="text-center text-sm text-gray-300">
            Ce code ne correspond &agrave; aucun billet actif
          </p>
          <p className="text-center text-[10px] text-amber-400/60 mt-1">
            Appuyez pour effacer
          </p>
        </div>
      )}

      {/* ERROR */}
      {result.status === 'error' && (
        <div className="space-y-3">
          <p className="text-gray-300 font-bold text-center text-lg flex items-center justify-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            ERREUR CONNEXION
          </p>
          <hr className="border-gray-600/50" />
          <p className="text-center text-sm text-gray-400">
            Impossible de v&eacute;rifier le billet. R&eacute;essayez.
          </p>
          <p className="text-center text-[10px] text-gray-500/60 mt-1">
            Appuyez pour effacer
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Spinner component ─────────────────────────────────────────────────────

function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const cls =
    size === 'sm'
      ? 'animate-spin h-5 w-5'
      : size === 'lg'
        ? 'animate-spin h-7 w-7'
        : 'animate-spin h-6 w-6';
  return (
    <svg className={cls} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────

export default function ControllerValidatePage() {
  const [code, setCode] = useState('');
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>('');
  const [agenciesLoaded, setAgenciesLoaded] = useState(false);
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>('idle');
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [validCount, setValidCount] = useState(0);
  const [invalidCount, setInvalidCount] = useState(0);
  const [agenciesDropdownOpen, setAgenciesDropdownOpen] = useState(false);

  // ─── PWA Guard state ─────────────────────────────────────────────
  const [pwaGuard, setPwaGuard] = useState<PwaGuardState>({ verified: false });

  // ─── Input mode (keypad / camera) ────────────────────────────────────
  const [inputMode, setInputMode] = useState<InputMode>('keypad');

  // ─── Online / offline state ─────────────────────────────────────────
  const [isOnline, setIsOnline] = useState(true);

  // ─── Sync queue state ───────────────────────────────────────────────
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const autoClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ─── QR scanner refs ─────────────────────────────────────────────────
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerStartingRef = useRef(false);

  // ─── Stable ref for selected agency (avoids stale closure in validateWithCode) ─
  const selectedAgencyIdRef = useRef(selectedAgencyId);
  selectedAgencyIdRef.current = selectedAgencyId;

  // ─── PWA Token validation on mount ─────────────────────────────────
  // Validates JWT token from URL query param. If valid, auto-selects
  // the agency and shows a verified badge. If invalid/expired, the
  // page still works but with a warning.

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
        // Pre-select the agency from token
        setSelectedAgencyId(payload.agencyId);
        // Clean URL (remove token from address bar)
        window.history.replaceState({}, '', '/controller/validate');
      } else {
        setPwaGuard({ verified: false, error: result.error, expired: result.error?.includes('expiré') });
        // Clean URL
        window.history.replaceState({}, '', '/controller/validate');
      }
    };
    validateTokenFromUrl();
  }, []);

  // ─── Fetch agencies on mount ──────────────────────────────────────────

  useEffect(() => {
    const fetchAgencies = async () => {
      try {
        const res = await fetch('/api/controller/agencies');
        if (res.ok) {
          const data = await res.json();
          const list: Agency[] = data.agencies || [];
          setAgencies(list);
          // Auto-select only if not already set by PWA token
          setSelectedAgencyId((prev) => {
            if (prev) return prev;
            if (list.length === 1) return list[0].id;
            return prev;
          });
        }
      } catch {
        // Silently fail — will work without agency filter
      } finally {
        setAgenciesLoaded(true);
      }
    };
    fetchAgencies();
  }, []);

  // ─── Online / offline listeners ──────────────────────────────────────

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

  // ─── Start sync engine on mount, stop on unmount ──────────────────────

  useEffect(() => {
    startSyncEngine();

    let unsub: (() => void) | undefined;

    if (syncEngine) {
      unsub = syncEngine.subscribe((event) => {
        if (event.type === 'sync_start') {
          setIsSyncing(true);
        }
        if (event.type === 'sync_progress' || event.type === 'sync_complete') {
          if (event.pending !== undefined) {
            setPendingCount(event.pending);
          }
        }
        if (event.type === 'sync_complete' || event.type === 'sync_error') {
          setIsSyncing(false);
          getQueueStats().then((stats) => setPendingCount(stats.pending));
        }
      });

      // Initial queue stats
      getQueueStats().then((stats) => setPendingCount(stats.pending));
    }

    return () => {
      stopSyncEngine();
      if (unsub) unsub();
    };
  }, []);

  // ─── Close dropdown on outside click ──────────────────────────────────

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAgenciesDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ─── Cleanup auto-clear timer ─────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (autoClearTimerRef.current) clearTimeout(autoClearTimerRef.current);
    };
  }, []);

  // ─── Web Audio: ding ──────────────────────────────────────────────────

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
    } catch {
      // Audio not available
    }
  }, []);

  // ─── Web Audio: buzz ──────────────────────────────────────────────────

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
    } catch {
      // Audio not available
    }
  }, []);

  // ─── Haptic feedback ──────────────────────────────────────────────────

  const triggerHaptic = useCallback((pattern: number | number[] = 10) => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    } catch {
      // Silently fail
    }
  }, []);

  // ─── Extract numeric code from scanned text ───────────────────────────

  const extractControlCode = useCallback((text: string): string | null => {
    if (/^\d{6,8}$/.test(text)) return text;
    const match = text.match(/\d{6,8}/);
    return match ? match[0] : null;
  }, []);

  // ─── Clear result and code ────────────────────────────────────────────

  const clearResult = useCallback(() => {
    if (autoClearTimerRef.current) {
      clearTimeout(autoClearTimerRef.current);
      autoClearTimerRef.current = null;
    }
    setResult(null);
    setValidationStatus('idle');
    setCode('');
  }, []);

  // ─── Validate ticket with a given code (shared by keypad & camera) ──

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
        } else if (res.ok && data.ticketStatus === 'VALIDATED') {
          setValidationStatus('used');
          setResult({ status: 'used', validatedAt: data.validatedAt, controlCode });
          setInvalidCount((c) => c + 1);
          playBuzz();
          triggerHaptic([100, 50, 100]);
        } else if (res.ok && data.ticketStatus === 'CANCELLED') {
          setValidationStatus('cancelled');
          setResult({ status: 'cancelled', controlCode });
          setInvalidCount((c) => c + 1);
          playBuzz();
          triggerHaptic([100, 50, 100]);
        } else {
          setValidationStatus('not_found');
          setResult({ status: 'not_found', controlCode });
          setInvalidCount((c) => c + 1);
          playBuzz();
          triggerHaptic([50]);
        }
      } catch {
        // Network error — try to queue for offline sync
        try {
          const offlineAvailable = await isOfflineStorageAvailable();
          if (offlineAvailable) {
            await addToSyncQueue({
              url: '/api/validate-ticket',
              method: 'POST',
              body: {
                controlCode,
                agencyId: selectedAgencyIdRef.current || undefined,
              },
            });

            const stats = await getQueueStats();
            setPendingCount(stats.pending);

            setValidationStatus('queued');
            setResult({ status: 'queued', controlCode });
            setInvalidCount((c) => c + 1);
            playBuzz();
            triggerHaptic([100, 100]);
          } else {
            setValidationStatus('error');
            setResult({ status: 'error', controlCode });
            setInvalidCount((c) => c + 1);
            playBuzz();
            triggerHaptic([100, 100]);
          }
        } catch {
          setValidationStatus('error');
          setResult({ status: 'error', controlCode });
          setInvalidCount((c) => c + 1);
          playBuzz();
          triggerHaptic([100, 100]);
        }
      }

      // Auto-clear after 5 seconds
      autoClearTimerRef.current = setTimeout(() => {
        clearResult();
      }, 5000);
    },
    [validationStatus, triggerHaptic, playDing, playBuzz, clearResult],
  );

  // ─── QR Scanner: stop ────────────────────────────────────────────────

  const stopScanner = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        const state = html5QrCodeRef.current.getState();
        if (state === 2 || state === 1) {
          await html5QrCodeRef.current.stop();
        }
      } catch {
        // Ignore stop errors
      }
      try {
        html5QrCodeRef.current.clear();
      } catch {
        // Ignore clear errors
      }
      html5QrCodeRef.current = null;
    }
  }, []);

  // ─── QR Scanner: start ────────────────────────────────────────────────

  const startScanner = useCallback(async () => {
    if (!scannerRef.current || scannerStartingRef.current) return;
    scannerStartingRef.current = true;

    await stopScanner();

    try {
      const html5QrCode = new Html5Qrcode('scanner-container');
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          const extracted = extractControlCode(decodedText);
          if (extracted) {
            setCode(extracted);
            validateWithCode(extracted);
            stopScanner();
          }
        },
        () => {
          // Ignore continuous scan errors
        },
      );
    } catch {
      html5QrCodeRef.current = null;
    } finally {
      scannerStartingRef.current = false;
    }
  }, [extractControlCode, validateWithCode]);

  // ─── Stop scanner on unmount ────────────────────────────────────────

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  // ─── Stop scanner when switching away from camera mode ───────────────

  useEffect(() => {
    if (inputMode !== 'camera') {
      stopScanner();
    }
  }, [inputMode]);

  // ─── Start scanner when entering camera mode ─────────────────────────

  useEffect(() => {
    if (inputMode === 'camera') {
      const timer = setTimeout(() => {
        startScanner();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [inputMode, startScanner]);

  // ─── Toggle camera mode ─────────────────────────────────────────────

  const toggleCamera = useCallback(() => {
    setInputMode((prev) => (prev === 'camera' ? 'keypad' : 'camera'));
  }, []);

  // ─── Handle digit press ───────────────────────────────────────────────

  const handleDigit = useCallback(
    (digit: string) => {
      if (code.length >= MAX_CODE_LENGTH) return;
      triggerHaptic(10);
      setCode((prev) => prev + digit);
      if (result) {
        setResult(null);
        setValidationStatus('idle');
        if (autoClearTimerRef.current) {
          clearTimeout(autoClearTimerRef.current);
          autoClearTimerRef.current = null;
        }
      }
    },
    [code.length, triggerHaptic, result],
  );

  // ─── Handle delete ───────────────────────────────────────────────────

  const handleDelete = useCallback(() => {
    triggerHaptic(10);
    setCode((prev) => prev.slice(0, -1));
  }, [triggerHaptic]);

  // ─── Validate ticket (keypad button) ─────────────────────────────────

  const handleValidate = useCallback(async () => {
    if (code.length < 6 || validationStatus === 'loading') return;
    await validateWithCode(code);
  }, [code, validationStatus, validateWithCode]);

  // ─── Keyboard support ─────────────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      } else if (e.key === 'Enter') {
        handleValidate();
      } else if (e.key === 'Escape') {
        clearResult();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDigit, handleDelete, handleValidate, clearResult]);

  // ─── Computed values ─────────────────────────────────────────────────

  const displayCode = code + '_'.repeat(MAX_CODE_LENGTH - code.length);
  const selectedAgency = agencies.find((a) => a.id === selectedAgencyId);

  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['delete', '0', 'validate'],
  ] as const;

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#111827] text-white flex flex-col select-none">
      {/* ═══ Header ═════════════════════════════════════════════════════ */}
      <header className="bg-[#0d1117] border-b border-gray-800 px-4 py-3 safe-top">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          {/* Left: logo + title */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/20">
              <Bus className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight">
                Smarticket<span className="text-emerald-400">S</span>
              </h1>
              <p className="text-[11px] text-gray-400 -mt-0.5">Contr&ocirc;le</p>
            </div>
          </div>

          {/* Right: status + camera toggle */}
          <div className="flex items-center gap-2">
            {/* PWA Verified Badge */}
            {pwaGuard.verified && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20" title={"Agence vérifiée: " + pwaGuard.agencyName}>
                <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="text-[10px] font-semibold text-emerald-400 hidden sm:inline truncate max-w-[80px]">
                  {pwaGuard.agencyName}
                </span>
              </div>
            )}

            {/* PWA Token Expired Warning */}
            {pwaGuard.expired && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20" title={pwaGuard.error}>
                <svg className="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="text-[10px] font-semibold text-amber-400 hidden sm:inline">
                  Token expiré
                </span>
              </div>
            )}

            {/* Online / Offline indicator */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1f2937] border border-gray-700"
              title={isOnline ? 'En ligne' : 'Hors ligne'}
            >
              {isOnline ? (
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-red-400" />
              )}
              <span
                className={`text-[10px] font-medium hidden sm:inline ${
                  isOnline ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {isOnline ? 'En ligne' : 'Hors ligne'}
              </span>
            </div>

            {/* Camera toggle */}
            <button
              type="button"
              onClick={toggleCamera}
              className={`flex items-center justify-center w-10 h-10 rounded-xl border transition-all active:scale-95 ${
                inputMode === 'camera'
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                  : 'bg-[#1f2937] border-gray-700 text-gray-400 hover:bg-[#374151] hover:text-gray-300'
              }`}
              aria-label={inputMode === 'camera' ? 'Passer au clavier' : 'Passer au scanner'}
            >
              <ScanLine className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Agency name (single agency) */}
        {selectedAgency && agencies.length > 1 && (
          <div className="max-w-lg mx-auto mt-2">
            <span className="text-xs text-gray-500 truncate">{selectedAgency.name}</span>
          </div>
        )}
      </header>

      {/* ═══ Main Content ════════════════════════════════════════════════ */}
      <main className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 py-4 gap-4">
        {/* ─── Agency Selector ──────────────────────────────────── */}
        {agenciesLoaded && agencies.length > 1 && (
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setAgenciesDropdownOpen((o) => !o)}
              className="w-full flex items-center justify-between bg-[#1f2937] border border-gray-700 rounded-xl px-4 py-3 text-sm active:scale-[0.98] transition-transform"
              aria-label="S\u00E9lectionner une agence"
              aria-expanded={agenciesDropdownOpen}
            >
              <span className={selectedAgency ? 'text-white' : 'text-gray-400'}>
                {selectedAgency ? selectedAgency.name : 'S\u00E9lectionner une agence'}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-gray-400 transition-transform ${
                  agenciesDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
            {agenciesDropdownOpen && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#1f2937] border border-gray-700 rounded-xl overflow-hidden shadow-2xl max-h-48 overflow-y-auto">
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
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'text-gray-300 hover:bg-gray-700 active:bg-gray-600'
                    }`}
                  >
                    {a.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Input Mode Toggle ──────────────────────────────────── */}
        {agenciesLoaded && (
          <div className="flex bg-[#1f2937] border border-gray-700 rounded-xl p-1 gap-1">
            <button
              type="button"
              onClick={() => setInputMode('keypad')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                inputMode === 'keypad'
                  ? 'bg-emerald-500/20 text-emerald-300 shadow-sm'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="16" height="16" rx="2" />
                <line x1="6" y1="8" x2="6" y2="8.01" />
                <line x1="10" y1="8" x2="10" y2="8.01" />
                <line x1="14" y1="8" x2="14" y2="8.01" />
                <line x1="8" y1="12" x2="8" y2="12.01" />
                <line x1="12" y1="12" x2="12" y2="12.01" />
                <line x1="16" y1="12" x2="16" y2="12.01" />
                <line x1="6" y1="16" x2="6" y2="16.01" />
                <line x1="10" y1="16" x2="10" y2="16.01" />
              </svg>
              Clavier
            </button>
            <button
              type="button"
              onClick={() => setInputMode('camera')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                inputMode === 'camera'
                  ? 'bg-emerald-500/20 text-emerald-300 shadow-sm'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <ScanLine className="w-4 h-4" />
              Scanner
            </button>
          </div>
        )}

        {/* ─── Result Card (shared by both modes) ────────────────── */}
        {result && <ResultCard result={result} onClear={clearResult} />}

        {/* ═══ Camera Mode ════════════════════════════════════════════ */}
        {inputMode === 'camera' && (
          <div className="flex-1 flex flex-col gap-4">
            {/* Camera viewport */}
            <div className="bg-[#0a0f1a] border border-gray-700 rounded-2xl overflow-hidden flex-1 min-h-[260px] relative">
              <div
                id="scanner-container"
                ref={scannerRef}
                className="w-full h-full"
                style={{ minHeight: '260px' }}
              />
              {/* Overlay hint */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-black/50 backdrop-blur-sm rounded-2xl px-5 py-3 flex items-center gap-2">
                  <ScanLine className="w-5 h-5 text-emerald-400 animate-pulse" />
                  <span className="text-sm text-emerald-300 font-medium">
                    Pointez le QR code...
                  </span>
                </div>
              </div>
            </div>

            {/* Loading indicator for camera */}
            {validationStatus === 'loading' && (
              <button type="button" disabled className="w-full h-14 rounded-xl flex items-center justify-center gap-2 font-bold text-base bg-emerald-500/60 text-white cursor-not-allowed">
                <Spinner size="md" />
                V&eacute;rification en cours...
              </button>
            )}
          </div>
        )}

        {/* ═══ Keypad Mode ══════════════════════════════════════════ */}
        {inputMode === 'keypad' && (
          <>
            {/* Code display */}
            <div className="bg-[#1f2937] border border-gray-700 rounded-2xl px-6 py-6 text-center">
              <p className="text-xs text-gray-400 uppercase tracking-widest mb-3">
                Code de contr&ocirc;le
              </p>
              <div className="font-mono text-4xl sm:text-5xl tracking-[0.3em] text-white leading-relaxed relative">
                {displayCode.split('').map((ch, i) => (
                  <span
                    key={i}
                    className={`inline-block transition-colors duration-150 ${
                      i < code.length ? 'text-white' : 'text-gray-600'
                    }`}
                  >
                    {ch}
                  </span>
                ))}
                {code.length < MAX_CODE_LENGTH && (
                  <span
                    className="inline-block w-[2px] h-8 bg-emerald-400 ml-0.5 animate-pulse absolute top-1/2 -translate-y-1/2"
                    style={{
                      left: `calc(${code.length} * 1em + ${code.length * 0.3}em + 50% - ${MAX_CODE_LENGTH * 0.65}em)`,
                    }}
                  />
                )}
              </div>
              <p className="text-xs text-gray-500 mt-3">
                {code.length}/{MAX_CODE_LENGTH} chiffres
              </p>
            </div>

            {/* Numeric keypad */}
            <div className="grid grid-cols-3 gap-2.5 mt-auto">
              {keys.map((row) =>
                row.map((key) => {
                  if (key === 'delete') {
                    return (
                      <button
                        key="delete"
                        type="button"
                        onClick={handleDelete}
                        disabled={code.length === 0 || validationStatus === 'loading'}
                        className="h-[64px] rounded-xl flex items-center justify-center bg-[#374151] text-gray-300 hover:bg-[#4b5563] active:bg-[#6b7280] active:scale-95 transition-all duration-100 disabled:opacity-30 disabled:cursor-not-allowed"
                        aria-label="Supprimer"
                      >
                        <Delete className="w-7 h-7" />
                      </button>
                    );
                  }

                  if (key === 'validate') {
                    return (
                      <button
                        key="validate"
                        type="button"
                        onClick={handleValidate}
                        disabled={code.length < 6 || validationStatus === 'loading'}
                        className={`h-[64px] rounded-xl flex items-center justify-center font-bold text-lg transition-all duration-100 disabled:opacity-30 disabled:cursor-not-allowed ${
                          code.length >= 6 && validationStatus !== 'loading'
                            ? 'bg-emerald-500 text-white hover:bg-emerald-600 active:bg-emerald-700 active:scale-95 shadow-lg shadow-emerald-500/25'
                            : 'bg-[#374151] text-gray-500'
                        }`}
                        aria-label="Valider le billet"
                      >
                        {validationStatus === 'loading' ? (
                          <Spinner size="lg" />
                        ) : (
                          <Check className="w-7 h-7" />
                        )}
                      </button>
                    );
                  }

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleDigit(key)}
                      disabled={validationStatus === 'loading' || code.length >= MAX_CODE_LENGTH}
                      className="h-[64px] rounded-xl flex items-center justify-center text-2xl font-semibold text-white bg-[#374151] hover:bg-[#4b5563] active:bg-[#6b7280] active:scale-95 transition-all duration-100 disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label={`Chiffre ${key}`}
                    >
                      {key}
                    </button>
                  );
                }),
              )}
            </div>

            {/* Full-width validate button */}
            <button
              type="button"
              onClick={handleValidate}
              disabled={code.length < 6 || validationStatus === 'loading'}
              className={`w-full h-14 rounded-xl flex items-center justify-center gap-2 font-bold text-base transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed ${
                code.length >= 6 && validationStatus !== 'loading'
                  ? 'bg-emerald-500 text-white hover:bg-emerald-600 active:bg-emerald-700 active:scale-[0.98] shadow-lg shadow-emerald-500/25'
                  : 'bg-[#1f2937] text-gray-500 border border-gray-700'
              }`}
              aria-label="Valider le billet"
            >
              {validationStatus === 'loading' ? (
                <>
                  <Spinner size="sm" />
                  V&eacute;rification en cours...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  VALIDER LE BILLET
                </>
              )}
            </button>
          </>
        )}
      </main>

      {/* ═══ Stats Bar / Footer ════════════════════════════════════════ */}
      <footer className="bg-[#0d1117] border-t border-gray-800 px-4 py-2.5 safe-bottom">
        <div className="max-w-lg mx-auto flex items-center justify-center gap-3 sm:gap-4 text-xs flex-wrap">
          <span className="text-gray-400">
            Valid&eacute;s : <span className="font-bold text-emerald-400">{validCount}</span>
          </span>
          <span className="text-gray-700">|</span>
          <span className="text-gray-400">
            Invalides : <span className="font-bold text-red-400">{invalidCount}</span>
          </span>
          <span className="text-gray-700">|</span>
          <span className="text-gray-500">
            Total :{' '}
            <span className="font-semibold text-gray-300">{validCount + invalidCount}</span>
          </span>

          {/* Sync indicator */}
          {(pendingCount > 0 || isSyncing) && (
            <>
              <span className="text-gray-700">|</span>
              <span
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md font-medium ${
                  isSyncing
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-amber-500/20 text-amber-300'
                }`}
              >
                {isSyncing ? (
                  <>
                    <CloudCheck className="w-3.5 h-3.5 animate-pulse" />
                    <span>Synchronisation...</span>
                  </>
                ) : (
                  <>
                    <CloudOff className="w-3.5 h-3.5" />
                    <span>En attente : {pendingCount}</span>
                  </>
                )}
              </span>
            </>
          )}

          {/* Pending badge */}
          {pendingCount > 0 && !isSyncing && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
              {pendingCount}
            </span>
          )}
        </div>
      </footer>
    </div>
  );
}
