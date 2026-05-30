'use client';

import { useState, useEffect, useCallback, useRef, memo, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';

/* ══════════════════════════════════════════════
   Types
   ══════════════════════════════════════════════ */
interface Departure {
  id: string;
  lineNumber: string;
  destination: string;
  scheduledTime: string;
  effectiveTime: string;
  status: string; // computed status from API: SCHEDULED | BOARDING | DEPARTED | CANCELLED
  delayMinutes: number;
  countdownMin: number;
  shouldPlayAlert: boolean;
}

interface TickerMessage {
  id: string;
  text: string;
  priority: 'info' | 'urgent';
  active: boolean;
}

interface StationData {
  stationId: string;
  stationName: string;
  departures: Departure[];
  tickerMessages: TickerMessage[];
  alertSoundEnabled: boolean;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
}

interface SignageAd {
  id: string;
  title: string;
  mediaType: 'IMAGE' | 'VIDEO';
  mediaUrl: string;
  duration: number;
  interval: number;
  isActive: boolean;
  priority: number;
  startDate: string;
  endDate: string | null;
  views: number;
  createdBy: string;
}

/* ══════════════════════════════════════════════
   Status display config
   ══════════════════════════════════════════════ */
const STATUS_MAP: Record<string, { label: string; css: string }> = {
  SCHEDULED: { label: 'À l\'heure', css: 'sig-status--ontime' },
  BOARDING: { label: 'EMBARQUEMENT', css: 'sig-status--boarding' },
  DELAYED: { label: 'Retard', css: 'sig-status--delayed' },
  DEPARTED: { label: 'Parti', css: 'sig-status--departed' },
  CANCELLED: { label: 'Annulé', css: 'sig-status--departed' },
};

/* ══════════════════════════════════════════════
   Audio: Ding-Dong via Web Audio API
   ══════════════════════════════════════════════ */
let audioCtx: AudioContext | null = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playDingDong() {
  try {
    initAudio();
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    playTone(880, 0.6, 'sine', now);
    playTone(698, 1.2, 'sine', now + 0.5);
  } catch {
    // Audio not available
  }
}

function playTone(freq: number, duration: number, type: OscillatorType, startTime: number) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(0.6, startTime + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

/* ══════════════════════════════════════════════
   Memoized Departure Row
   ══════════════════════════════════════════════ */
const DepartureRow = memo(function DepartureRow({ dep }: { dep: Departure }) {
  const statusCfg = STATUS_MAP[dep.status] || STATUS_MAP.SCHEDULED;
  const isBoarding = dep.status === 'BOARDING';
  const isDeparted = dep.status === 'DEPARTED' || dep.status === 'CANCELLED';

  return (
    <div
      className={[
        'sig-row',
        isBoarding ? 'sig-row--boarding' : '',
        isDeparted ? 'sig-row--departed' : '',
      ].join(' ')}
    >
      {/* Time */}
      <div className="sig-row__time">{dep.effectiveTime}</div>
      {/* Destination */}
      <div className="sig-row__dest">{dep.destination}</div>
      {/* Status */}
      <div className="sig-row__status">
        <span className={`sig-status ${statusCfg.css}`}>{statusCfg.label}</span>
      </div>
    </div>
  );
});

/* ══════════════════════════════════════════════
   Fullscreen API helper
   ══════════════════════════════════════════════ */
function requestFullscreen(el: HTMLElement) {
  if (el.requestFullscreen) el.requestFullscreen();
  else if ((el as HTMLDivElement & { webkitRequestFullscreen?: () => void }).webkitRequestFullscreen) (el as HTMLDivElement & { webkitRequestFullscreen: () => void }).webkitRequestFullscreen();
}

/* ══════════════════════════════════════════════
   Main Signage Page — Always Kiosk Mode
   ══════════════════════════════════════════════ */
export default function SignageKioskPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const stationId = params.stationId as string;
  const isDebug = searchParams.get('debug') === '1';

  const [data, setData] = useState<StationData | null>(null);
  const [currentTime, setCurrentTime] = useState('00:00:00');
  const [currentDate, setCurrentDate] = useState('Chargement...');
  const [lastUpdate, setLastUpdate] = useState('');
  const [offline, setOffline] = useState(false);

  // Ad rotation state
  const [ads, setAds] = useState<SignageAd[]>([]);
  const [activeAd, setActiveAd] = useState<SignageAd | null>(null);
  const [showAdOverlay, setShowAdOverlay] = useState(false);
  const adIntervalTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const adDisplayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAdShownRef = useRef<number>(Date.now());

  // Alert tracking — ding-dong plays once per transition
  const alertedDeparturesRef = useRef<Set<string>>(new Set());

  // Cursor auto-hide
  const cursorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cursorHidden, setCursorHidden] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // ─── Auto-enter fullscreen on first click/touch ─────────────
  useEffect(() => {
    const goFullscreen = () => {
      if (rootRef.current && !document.fullscreenElement) {
        requestFullscreen(rootRef.current);
      }
    };
    const handleFirstInteraction = () => {
      goFullscreen();
      // Also init audio on first interaction (browser policy)
      initAudio();
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };
    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('touchstart', handleFirstInteraction);
    document.addEventListener('keydown', handleFirstInteraction);
    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };
  }, []);

  // ─── Hide browser scrollbar (kiosk) ─────────────────────────
  useEffect(() => {
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.style.margin = '';
      document.body.style.padding = '';
    };
  }, []);

  // ─── Live Clock ────────────────────────────────────────────
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('fr-FR', { hour12: false }));
      setCurrentDate(now.toLocaleDateString('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // ─── Auto-hide cursor in kiosk mode ──────────────────────────
  useEffect(() => {
    const hideCursor = () => setCursorHidden(true);
    const showCursor = () => {
      setCursorHidden(false);
      if (cursorTimerRef.current) clearTimeout(cursorTimerRef.current);
      cursorTimerRef.current = setTimeout(hideCursor, 3000);
    };
    document.addEventListener('mousemove', showCursor);
    document.addEventListener('touchstart', showCursor);
    cursorTimerRef.current = setTimeout(hideCursor, 3000);
    return () => {
      document.removeEventListener('mousemove', showCursor);
      document.removeEventListener('touchstart', showCursor);
      if (cursorTimerRef.current) clearTimeout(cursorTimerRef.current);
    };
  }, []);

  // ─── Fetch ads once on mount ────────────────────────────────
  useEffect(() => {
    const fetchAds = async () => {
      try {
        const res = await fetch('/api/signage-ads');
        if (res.ok) {
          const json = await res.json();
          setAds(json as SignageAd[]);
        }
      } catch {
        // Ads are non-critical — swallow error
      }
    };
    fetchAds();
  }, []);

  // ─── Ad rotation system ───────────────────────────────────
  // Show a random ad every N minutes, for ad.duration seconds full-screen
  useEffect(() => {
    if (ads.length === 0) return;

    // Find the shortest interval among all ads
    const minInterval = Math.min(...ads.map(a => a.interval));

    const triggerAdRotation = () => {
      if (showAdOverlay) return; // Already showing an ad
      // Pick a random active ad
      const randomAd = ads[Math.floor(Math.random() * ads.length)];
      setActiveAd(randomAd);
      setShowAdOverlay(true);

      // Hide after ad.duration seconds
      if (adDisplayTimerRef.current) clearTimeout(adDisplayTimerRef.current);
      adDisplayTimerRef.current = setTimeout(() => {
        setShowAdOverlay(false);
        setActiveAd(null);
      }, randomAd.duration * 1000);
    };

    // Start interval timer
    adIntervalTimerRef.current = setInterval(triggerAdRotation, minInterval * 60 * 1000);

    return () => {
      if (adIntervalTimerRef.current) clearInterval(adIntervalTimerRef.current);
      if (adDisplayTimerRef.current) clearTimeout(adDisplayTimerRef.current);
    };
  }, [ads, showAdOverlay]);

  // ─── Poll departures every 15s ─────────────────────────────
  useEffect(() => {
    if (!stationId) return;

    const fetchDepartures = async () => {
      try {
        const res = await fetch(`/api/signage/${stationId}/departures`);
        const json = await res.json();
        if (res.ok) {
          setOffline(false);
          setData(json);
          setLastUpdate(new Date().toLocaleTimeString('fr-FR'));

          // ─── Ding-dong: play once when shouldPlayAlert transitions ───
          if (json.alertSoundEnabled !== false) {
            for (const dep of json.departures) {
              if (dep.shouldPlayAlert && !alertedDeparturesRef.current.has(dep.id)) {
                alertedDeparturesRef.current.add(dep.id);
                playDingDong();
              }
            }
          }
        }
      } catch {
        setOffline(true);
      }
    };

    fetchDepartures();
    const interval = setInterval(fetchDepartures, 15000);
    return () => clearInterval(interval);
  }, [stationId]);

  // ─── Ticker messages ───────────────────────────────────────
  const activeTicker = useMemo(() => {
    if (!data) return '⚠️ INFO VOYAGEURS : BIENVENUE À BORD DES LIGNES SMARTICKETQR';
    const msgs = data.tickerMessages?.filter((m) => m.active) || [];
    if (msgs.length === 0) return '⚠️ INFO VOYAGEURS : BIENVENUE À BORD DES LIGNES SMARTICKETQR';
    return msgs.map((m) => `${m.priority === 'urgent' ? '🚨 ' : ''}${m.text}`).join('  —  ');
  }, [data]);

  // ─── Loading state ──────────────────────────────────────────
  if (!data) {
    return (
      <div className="sig-kiosk">
        <div className="sig-kiosk-loading">
          <div className="sig-spinner" />
          <p className="sig-kiosk-loading-text">Chargement des départs...</p>
        </div>
        <style jsx global>{`
          @keyframes sig-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          .sig-kiosk {
            font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
            width: 100vw; height: 100vh; height: 100dvh;
            overflow: hidden; position: fixed; inset: 0;
            background: #f8fafc;
          }
          .sig-spinner {
            width: 48px; height: 48px; border-radius: 50%;
            border: 4px solid #e2e8f0; border-top-color: #f59e0b;
            animation: sig-spin 1s linear infinite;
            margin: 0 auto 1rem;
          }
          .sig-kiosk-loading {
            display: flex; align-items: center; justify-content: center;
            height: 100vh;
          }
          .sig-kiosk-loading-text {
            color: #94a3b8; font-size: 1.2rem; text-align: center;
          }
        `}</style>
      </div>
    );
  }

  const stationName = data.stationName || 'Gare Routière';
  const primaryColor = data.primaryColor || '#0f172a';
  const secondaryColor = data.secondaryColor || '#1e293b';
  const logoUrl = data.logoUrl || '';

  return (
    <div className="sig-kiosk" ref={rootRef}>
      <style jsx global>{`
        /* ═══ CSS VARIABLES ═══ */
        :root {
          --sig-primary: ${primaryColor};
          --sig-secondary: ${secondaryColor};
          --sig-accent: #f59e0b;
          --sig-success: #10b981;
          --sig-muted: #94a3b8;
          --sig-bg: #f8fafc;
          --sig-card: #ffffff;
          --sig-font: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
          --sig-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        }

        /* ═══ RESET + KIOSK ROOT ═══ */
        *, *::before, *::after { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; overflow: hidden; }
        .sig-kiosk {
          font-family: var(--sig-font);
          background: var(--sig-bg);
          color: var(--sig-primary);
          width: 100vw;
          height: 100vh;
          height: 100dvh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          user-select: none;
          -webkit-user-select: none;
          cursor: ${cursorHidden ? 'none' : 'default'};
          touch-action: manipulation;
          position: fixed;
          inset: 0;
        }

        /* ═══ HEADER ═══ */
        .sig-header {
          background: var(--sig-primary);
          color: white;
          padding: 0.6rem 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          z-index: 10;
          gap: 0.5rem;
          flex-shrink: 0;
        }
        .sig-brand { display: flex; align-items: center; gap: 0.5rem; }
        .sig-brand-icon {
          background: var(--sig-accent);
          width: 28px; height: 28px;
          border-radius: 6px;
          display: flex; align-items: center; justify-content: center;
          font-weight: 800; font-size: 0.8rem; color: #0f172a;
          overflow: hidden; flex-shrink: 0;
        }
        .sig-brand-icon img { width: 100%; height: 100%; object-fit: contain; }
        .sig-brand-logo {
          width: 28px; height: 28px;
          border-radius: 6px; object-fit: contain;
        }
        .sig-brand h1 { font-size: 0.9rem; letter-spacing: 0.5px; margin: 0; white-space: nowrap; }

        .sig-station { text-align: center; flex: 1; min-width: 0; }
        .sig-station h2 {
          font-size: clamp(0.9rem, 2.5vh, 2.2rem);
          font-weight: 700; text-transform: uppercase;
          letter-spacing: 1px; margin: 0;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .sig-station span {
          color: var(--sig-muted); font-size: clamp(0.65rem, 1.2vh, 0.9rem);
          margin-top: 0.1rem; display: block;
        }

        .sig-clock-box { text-align: right; flex-shrink: 0; }
        .sig-clock {
          font-family: var(--sig-mono);
          font-size: clamp(1rem, 3.5vh, 3rem);
          font-weight: 700; letter-spacing: 2px; line-height: 1;
        }
        .sig-date { color: var(--sig-muted); font-size: clamp(0.55rem, 1vh, 0.8rem); margin-top: 0.15rem; }

        /* ═══ TICKER ═══ */
        .sig-ticker-wrap {
          background: var(--sig-accent);
          color: #0f172a;
          padding: clamp(0.3rem, 0.8vh, 0.7rem) 0;
          overflow: hidden; white-space: nowrap;
          font-weight: 600;
          font-size: clamp(0.7rem, 1.8vh, 1.3rem);
          flex-shrink: 0;
        }
        .sig-ticker {
          display: inline-block;
          animation: sig-marquee 40s linear infinite;
          padding-left: 100%;
        }
        @keyframes sig-marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-100%); } }

        /* ═══ MAIN BOARD ═══ */
        .sig-main {
          flex: 1;
          padding: clamp(0.5rem, 1.5vh, 1.5rem);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }
        .sig-board {
          background: var(--sig-card);
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          min-height: 0;
        }

        /* ═══ BOARD HEADER — 3 columns: Heure | Destination | Statut ═══ */
        .sig-board-head {
          display: grid;
          grid-template-columns: 1fr 3fr 1.5fr;
          background: var(--sig-secondary);
          color: white;
          padding: clamp(0.5rem, 1.2vh, 1rem) clamp(0.6rem, 1.5vw, 1.5rem);
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-size: clamp(0.6rem, 1.2vh, 0.95rem);
          flex-shrink: 0;
        }

        /* ═══ ROWS — 3 columns ═══ */
        .sig-board-body { flex: 1; overflow-y: auto; overflow-x: hidden; min-height: 0; }
        .sig-board-body::-webkit-scrollbar { width: 4px; }
        .sig-board-body::-webkit-scrollbar-track { background: transparent; }
        .sig-board-body::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }

        .sig-row {
          display: grid;
          grid-template-columns: 1fr 3fr 1.5fr;
          padding: clamp(0.4rem, 1vh, 1rem) clamp(0.6rem, 1.5vw, 1.5rem);
          border-bottom: 1px solid #e2e8f0;
          align-items: center;
          font-size: clamp(0.85rem, 2vh, 1.8rem);
          transition: all 0.3s ease;
          min-height: clamp(36px, 6vh, 70px);
        }
        .sig-row:last-child { border-bottom: none; }

        .sig-row--boarding {
          background: #dcfce7;
          border-left: 5px solid var(--sig-success);
          font-weight: 800;
          animation: sig-pulse 1.5s infinite;
        }
        .sig-row--boarding .sig-row__time { color: #064e3b; }
        .sig-row--departed { opacity: 0.4; background: #f8fafc; }

        @keyframes sig-pulse {
          0%, 100% { background-color: #dcfce7; }
          50% { background-color: #bbf7d0; }
        }

        .sig-row__time { font-family: var(--sig-mono); font-weight: 700; }
        .sig-row__dest { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding: 0 0.5rem; }

        .sig-status {
          text-align: right; font-weight: 700;
          font-size: 0.75em; padding: 0.3em 0.7em;
          border-radius: 16px; display: inline-block;
          white-space: nowrap;
        }
        .sig-status--ontime { background: #dcfce7; color: #166534; }
        .sig-status--boarding { background: var(--sig-success); color: white; animation: sig-status-glow 1s infinite; }
        .sig-status--delayed { background: #fee2e2; color: #991b1b; }
        .sig-status--departed { background: #f1f5f9; color: #64748b; }

        @keyframes sig-status-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
          50% { box-shadow: 0 0 12px 4px rgba(16, 185, 129, 0.3); }
        }

        /* ═══ AD OVERLAY ═══ */
        .sig-ad-overlay {
          position: fixed; inset: 0; z-index: 100;
          background: #000;
          display: flex; align-items: center; justify-content: center;
          animation: sig-ad-fadein 0.6s ease;
          cursor: none;
        }
        .sig-ad-overlay img {
          max-width: 100%; max-height: 100%;
          object-fit: contain;
        }
        .sig-ad-overlay video {
          max-width: 100%; max-height: 100%;
          object-fit: contain;
        }
        .sig-ad-progress {
          position: absolute; bottom: 0; left: 0; height: 4px;
          background: var(--sig-accent);
          animation: sig-ad-progress linear forwards;
        }
        .sig-ad-label {
          position: absolute; top: clamp(8px, 2vh, 20px); right: clamp(8px, 2vw, 24px);
          background: rgba(0,0,0,0.6); color: white;
          padding: 4px 12px; border-radius: 4px;
          font-size: clamp(0.6rem, 1vh, 0.85rem); font-weight: 600;
        }
        @keyframes sig-ad-fadein { from { opacity: 0; } to { opacity: 1; } }
        @keyframes sig-ad-progress { from { width: 0; } to { width: 100%; } }

        /* ═══ FOOTER ═══ */
        .sig-footer {
          background: var(--sig-card);
          padding: clamp(0.5rem, 1vh, 1rem) clamp(0.8rem, 2vw, 1.5rem);
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 2px solid #e2e8f0;
          gap: 0.5rem;
          flex-shrink: 0;
        }
        .sig-qr-text h3 { font-size: clamp(0.8rem, 2vh, 1.6rem); margin: 0 0 0.1rem 0; }
        .sig-qr-text p { color: var(--sig-muted); font-size: clamp(0.6rem, 1.2vh, 0.9rem); margin: 0; }
        .sig-qr-box { display: flex; align-items: center; gap: 0.5rem; }
        .sig-qr-img {
          width: clamp(40px, 8vh, 90px);
          height: clamp(40px, 8vh, 90px);
          border: 2px dashed #cbd5e1;
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          background: #f8fafc;
        }
        .sig-qr-label { font-weight: 700; font-size: clamp(0.6rem, 1.2vh, 0.9rem); text-align: center; }

        /* ═══ OFFLINE BADGE ═══ */
        .sig-offline {
          position: fixed; top: 10px; right: 10px;
          background: #ef4444; color: white;
          padding: 8px 16px; border-radius: 8px;
          font-weight: 700; font-size: 14px; z-index: 200;
          animation: sig-blink 1s infinite;
        }
        @keyframes sig-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

        /* ═══ EMPTY STATE ═══ */
        .sig-empty {
          text-align: center; padding: clamp(2rem, 5vh, 4rem);
          color: #94a3b8; font-size: clamp(1rem, 2vh, 1.5rem);
        }

        /* ═══ LAST UPDATE ═══ */
        .sig-last-update {
          position: fixed; bottom: 10px; left: 10px;
          background: rgba(0,0,0,0.5); color: white;
          padding: 4px 10px; border-radius: 4px;
          font-size: 10px; z-index: 50;
        }

        /* ═══ DEBUG CONTROLS ═══ */
        .sig-debug {
          position: fixed; bottom: 20px; right: 20px;
          background: white; padding: 0.8rem; border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          display: flex; gap: 8px; z-index: 200; flex-direction: column;
        }
        .sig-debug-btn {
          padding: 8px 14px; border: none; border-radius: 6px;
          cursor: pointer; font-weight: 600; font-size: 0.85rem;
        }
        .sig-debug-btn--sim { background: var(--sig-success); color: white; }
        .sig-debug-btn--ding { background: var(--sig-accent); color: #0f172a; }
        .sig-debug-btn--reset { background: #e2e8f0; color: var(--sig-primary); }
        .sig-debug-btn--ad { background: #6366f1; color: white; }

        /* ═══ RESPONSIVE: Mobile (< 640px) ═══ */
        @media (max-width: 639px) {
          .sig-brand h1 { display: none; }
          .sig-station span { display: none; }
          .sig-header { padding: 0.4rem 0.6rem; }
          .sig-board-head {
            grid-template-columns: 1fr 3fr 1.5fr;
            padding: 0.4rem 0.5rem;
            font-size: 0.55rem;
            letter-spacing: 0;
          }
          .sig-row {
            grid-template-columns: 1fr 3fr 1.5fr;
            padding: 0.35rem 0.5rem;
            font-size: 0.8rem;
            min-height: 32px;
          }
          .sig-row__dest { padding: 0 0.2rem; }
          .sig-status { padding: 0.2em 0.4em; font-size: 0.6em; }
          .sig-qr-text h3 { font-size: 0.7rem; }
          .sig-qr-text p { display: none; }
          .sig-qr-label { display: none; }
          .sig-qr-img { width: 36px; height: 36px; }
          .sig-footer { padding: 0.4rem 0.5rem; }
          .sig-main { padding: 0.3rem; }
          .sig-board { border-radius: 6px; }
          .sig-ad-label { font-size: 0.55rem; padding: 3px 8px; }
        }

        /* ═══ RESPONSIVE: Tablet (640px – 1023px) ═══ */
        @media (min-width: 640px) and (max-width: 1023px) {
          .sig-header { padding: 0.5rem 1rem; }
          .sig-station span { display: none; }
          .sig-board-head {
            padding: 0.5rem 0.8rem;
            font-size: 0.7rem;
          }
          .sig-row {
            padding: 0.5rem 0.8rem;
            font-size: 1.1rem;
            min-height: 44px;
          }
        }

        /* ═══ RESPONSIVE: Large screen (≥ 1920px — giant TV) ═══ */
        @media (min-width: 1920px) {
          .sig-header { padding: 1.5rem 3rem; }
          .sig-brand-icon, .sig-brand-logo { width: 56px; height: 56px; border-radius: 10px; }
          .sig-brand-icon { font-size: 1.4rem; }
          .sig-brand h1 { font-size: 2.2rem; }
          .sig-station h2 { font-size: 3rem; letter-spacing: 2px; }
          .sig-clock { font-size: 4.5rem; }
          .sig-date { font-size: 1.1rem; }
          .sig-ticker-wrap { padding: 1rem 0; font-size: 1.6rem; }
          .sig-main { padding: 2rem; }
          .sig-board { border-radius: 16px; }
          .sig-board-head {
            padding: 1.2rem 2.5rem;
            font-size: 1.3rem;
            letter-spacing: 1px;
            grid-template-columns: 1fr 3fr 1.5fr;
          }
          .sig-row {
            padding: 1.2rem 2.5rem;
            font-size: 2.2rem;
            min-height: 100px;
            grid-template-columns: 1fr 3fr 1.5fr;
          }
          .sig-row__dest { padding: 0 1rem; }
          .sig-status { padding: 0.5em 1em; font-size: 0.85em; border-radius: 24px; }
          .sig-qr-img { width: 120px; height: 120px; }
          .sig-qr-label { font-size: 1.2rem; }
          .sig-qr-text h3 { font-size: 2.2rem; }
          .sig-qr-text p { font-size: 1.3rem; }
          .sig-footer { padding: 1.5rem 3rem; }
          .sig-ad-label { font-size: 1rem; padding: 6px 16px; }
          .sig-ad-progress { height: 6px; }
          .sig-last-update { font-size: 14px; padding: 6px 14px; bottom: 16px; left: 16px; }
        }

        /* ═══ RESPONSIVE: 4K (≥ 2560px) ═══ */
        @media (min-width: 2560px) {
          .sig-header { padding: 2rem 4rem; }
          .sig-brand-icon, .sig-brand-logo { width: 72px; height: 72px; }
          .sig-brand-icon { font-size: 1.8rem; }
          .sig-brand h1 { font-size: 3rem; }
          .sig-station h2 { font-size: 4rem; }
          .sig-clock { font-size: 6rem; }
          .sig-ticker-wrap { padding: 1.5rem 0; font-size: 2rem; }
          .sig-board-head {
            padding: 1.5rem 3rem; font-size: 1.6rem;
            grid-template-columns: 1fr 3fr 1.5fr;
          }
          .sig-row {
            padding: 1.5rem 3rem;
            font-size: 2.8rem;
            min-height: 120px;
            grid-template-columns: 1fr 3fr 1.5fr;
          }
          .sig-row__dest { padding: 0 1.5rem; }
          .sig-footer { padding: 2rem 4rem; }
          .sig-qr-img { width: 150px; height: 150px; }
          .sig-qr-text h3 { font-size: 2.8rem; }
          .sig-qr-text p { font-size: 1.6rem; }
          .sig-qr-label { font-size: 1.5rem; }
          .sig-ad-label { font-size: 1.3rem; padding: 8px 20px; }
          .sig-ad-progress { height: 8px; }
          .sig-last-update { font-size: 18px; padding: 8px 18px; bottom: 24px; left: 24px; }
        }
      `}</style>

      {/* Offline Badge */}
      {offline && <div className="sig-offline">⚠️ Hors ligne</div>}

      {/* ─── AD OVERLAY (full-screen ad rotation) ─── */}
      {showAdOverlay && activeAd && (
        <div className="sig-ad-overlay">
          {activeAd.mediaType === 'VIDEO' ? (
            <video
              src={activeAd.mediaUrl}
              autoPlay
              muted
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          ) : (
            <img src={activeAd.mediaUrl} alt={activeAd.title} />
          )}
          <div className="sig-ad-label">📢 Publicité</div>
          <div
            className="sig-ad-progress"
            style={{ animationDuration: `${activeAd.duration}s` }}
          />
        </div>
      )}

      {/* ─── HEADER ─── */}
      <header className="sig-header">
        <div className="sig-brand">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="sig-brand-logo" />
          ) : (
            <div className="sig-brand-icon">ST</div>
          )}
          <h1>SmartTicketQR</h1>
        </div>
        <div className="sig-station">
          <h2>{stationName}</h2>
          <span>Dakar, Sénégal</span>
        </div>
        <div className="sig-clock-box">
          <div className="sig-clock">{currentTime}</div>
          <div className="sig-date">{currentDate}</div>
        </div>
      </header>

      {/* ─── TICKER ─── */}
      <div className="sig-ticker-wrap">
        <div className="sig-ticker">{activeTicker}</div>
      </div>

      {/* ─── MAIN BOARD ─── */}
      <main className="sig-main">
        <div className="sig-board">
          {/* 3 columns only: Heure | Destination | Statut */}
          <div className="sig-board-head">
            <div>Heure</div>
            <div>Destination</div>
            <div style={{ textAlign: 'right' }}>Statut</div>
          </div>
          <div className="sig-board-body">
            {data.departures.length === 0 ? (
              <div className="sig-empty">Aucun départ prévu</div>
            ) : (
              data.departures.map((dep) => (
                <DepartureRow key={dep.id} dep={dep} />
              ))
            )}
          </div>
        </div>
      </main>

      {/* ─── FOOTER ─── */}
      <footer className="sig-footer">
        <div className="sig-qr-text">
          <h3>📱 Scannez pour suivre votre trajet</h3>
          <p>Traçabilité sécurisée 24/7 • SmartTicketQR</p>
        </div>
        <div className="sig-qr-box">
          <div className="sig-qr-img">
            <QRCodeSVG
              value={`${typeof window !== 'undefined' ? window.location.origin : ''}/signage/${stationId}`}
              size={80}
              fgColor="#0f172a"
              bgColor="#ffffff"
              level="M"
              includeMargin={false}
            />
          </div>
          <div className="sig-qr-label">TRACKING</div>
        </div>
      </footer>

      {/* ─── Last update indicator ─── */}
      {lastUpdate && (
        <div className="sig-last-update">
          Dernière MAJ: {lastUpdate}
        </div>
      )}

      {/* ─── DEBUG CONTROLS (only when ?debug=1) ─── */}
      {isDebug && (
        <div className="sig-debug">
          <button
            className="sig-debug-btn sig-debug-btn--sim"
            onClick={playDingDong}
          >
            ▶️ Test Son Ding-Dong
          </button>
          <button
            className="sig-debug-btn sig-debug-btn--ad"
            onClick={() => {
              if (ads.length > 0) {
                const randomAd = ads[Math.floor(Math.random() * ads.length)];
                setActiveAd(randomAd);
                setShowAdOverlay(true);
                if (adDisplayTimerRef.current) clearTimeout(adDisplayTimerRef.current);
                adDisplayTimerRef.current = setTimeout(() => {
                  setShowAdOverlay(false);
                  setActiveAd(null);
                }, randomAd.duration * 1000);
              }
            }}
          >
            📢 Test Publicité ({ads.length} ads)
          </button>
          <button
            className="sig-debug-btn sig-debug-btn--reset"
            onClick={() => {
              alertedDeparturesRef.current = new Set();
            }}
          >
            🔄 Reset Alerts
          </button>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8', textAlign: 'center' }}>
            Ads: {ads.length} | Alerted: {alertedDeparturesRef.current.size}
          </div>
        </div>
      )}
    </div>
  );
}
