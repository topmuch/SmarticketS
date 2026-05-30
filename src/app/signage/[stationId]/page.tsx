'use client';

import { useState, useEffect, useRef, memo, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';

/* ══════════════════════════════════════════════
   Types
   ══════════════════════════════════════════════ */
interface Departure {
  id: string;
  departureType: string; // 'OUTBOUND' | 'RETURN'
  lineNumber: string;
  destination: string;
  scheduledTime: string;
  effectiveTime: string;
  status: string;
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
  SCHEDULED: { label: '✅ À l\'heure', css: 'sig2-status--ontime' },
  BOARDING:  { label: '🚌 EMBARQUEMENT', css: 'sig2-status--boarding' },
  DELAYED:   { label: '⚠️ Retard', css: 'sig2-status--delayed' },
  DEPARTED:  { label: '⚪ Parti', css: 'sig2-status--departed' },
  CANCELLED: { label: '❌ Annulé', css: 'sig2-status--departed' },
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
  const timeStr = dep.effectiveTime;

  return (
    <div
      className={[
        'sig2-row',
        isBoarding ? 'sig2-row--boarding' : '',
        isDeparted ? 'sig2-row--departed' : '',
      ].join(' ')}
    >
      {/* Orange time box */}
      <div className="sig2-row__timebox">{timeStr}</div>
      {/* Destination */}
      <div className="sig2-row__dest">
        <span className="sig2-row__pin">📍</span>
        <span>{dep.destination}</span>
      </div>
      {/* Status */}
      <div className="sig2-row__status">
        <span className={`sig2-badge ${statusCfg.css}`}>{statusCfg.label}</span>
      </div>
    </div>
  );
});

/* ══════════════════════════════════════════════
   Board Section Component (Départs or Arrivées)
   ══════════════════════════════════════════════ */
const BoardSection = memo(function BoardSection({
  title,
  icon,
  departures,
  gradientClass,
  borderColor,
}: {
  title: string;
  icon: string;
  departures: Departure[];
  gradientClass: string;
  borderColor: string;
}) {
  return (
    <div className="sig2-board" style={{ borderTopColor: borderColor }}>
      <div className={`sig2-board-head ${gradientClass}`}>
        <span>{icon}</span>
        <span>{title}</span>
      </div>
      <div className="sig2-board-body">
        {departures.length === 0 ? (
          <div className="sig2-empty">Aucun trajet prévu</div>
        ) : (
          departures.map((dep) => <DepartureRow key={dep.id} dep={dep} />)
        )}
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
   Main Signage Page — Split Screen Kiosk
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
  const adsLoadedRef = useRef(false); // track if ads have been fetched at least once
  const lastAdShowTimeRef = useRef<number>(0); // track when last ad was shown (to prevent back-to-back)
  const showAdOverlayRef = useRef(false); // ref mirror for showAdOverlay (avoids stale closure)
  const [adShowCount, setAdShowCount] = useState(0); // count ad displays for debug

  // Alert tracking — ding-dong plays once per transition
  const alertedDeparturesRef = useRef<Set<string>>(new Set());

  // Cursor auto-hide
  const cursorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cursorHidden, setCursorHidden] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // ─── Auto-enter fullscreen on first interaction ─────────
  useEffect(() => {
    const goFullscreen = () => {
      if (rootRef.current && !document.fullscreenElement) {
        requestFullscreen(rootRef.current);
      }
    };
    const handleFirstInteraction = () => {
      goFullscreen();
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

  // ─── Hide browser scrollbar (kiosk) ──────────────────
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

  // ─── Live Clock ──────────────────────────────────────
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

  // ─── Auto-hide cursor ───────────────────────────────
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

  // ─── Fetch ads once on mount (re-fetch every 5 min silently) ──
  useEffect(() => {
    const fetchAds = async () => {
      try {
        const res = await fetch('/api/signage-ads');
        if (res.ok) {
          const json = await res.json();
          const parsed = (json as SignageAd[]) || [];
          setAds(parsed);
          adsLoadedRef.current = true;
        }
      } catch {
        // Ads non-critical — fail silently
      }
    };
    fetchAds();
    // Re-fetch ads every 5 minutes to pick up new ones
    const refetchInterval = setInterval(fetchAds, 5 * 60 * 1000);
    return () => clearInterval(refetchInterval);
  }, []);

  // ─── Ad rotation engine (stable — uses refs, no dependency on showAdOverlay state) ──
  useEffect(() => {
    if (ads.length === 0) return;

    const minInterval = Math.min(...ads.map(a => a.interval)) * 60 * 1000; // ms

    const showAd = () => {
      const now = Date.now();
      // Guard: prevent showing if another ad just finished (grace period 5s)
      if (now - lastAdShowTimeRef.current < 5000) return;
      // Guard: prevent showing if already showing
      if (showAdOverlayRef.current) return;
      lastAdShowTimeRef.current = now;
      setAdShowCount(c => c + 1);

      const randomAd = ads[Math.floor(Math.random() * ads.length)];
      setActiveAd(randomAd);
      setShowAdOverlay(true);
      showAdOverlayRef.current = true;

      if (adDisplayTimerRef.current) clearTimeout(adDisplayTimerRef.current);
      adDisplayTimerRef.current = setTimeout(() => {
        setShowAdOverlay(false);
        setActiveAd(null);
        showAdOverlayRef.current = false;
      }, randomAd.duration * 1000);
    };

    // Fire first ad after 3s, then at regular intervals
    const initialDelay = setTimeout(() => {
      showAd();
      adIntervalTimerRef.current = setInterval(showAd, minInterval);
    }, 3000);

    return () => {
      clearTimeout(initialDelay);
      if (adIntervalTimerRef.current) clearInterval(adIntervalTimerRef.current);
      if (adDisplayTimerRef.current) clearTimeout(adDisplayTimerRef.current);
    };
  }, [ads]); // re-init only when ads list changes

  // ─── Poll departures every 15s ─────────────────────────
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

          // Ding-dong for new boarding alerts
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

  // ─── Ticker messages ──────────────────────────────────
  const activeTicker = useMemo(() => {
    if (!data) return '⚠️ INFO VOYAGEURS : BIENVENUE À BORD DES LIGNES SMARTICKETQR';
    const msgs = data.tickerMessages?.filter((m) => m.active) || [];
    if (msgs.length === 0) return '⚠️ INFO VOYAGEURS : BIENVENUE À BORD DES LIGNES SMARTICKETQR';
    return msgs.map((m) => `${m.priority === 'urgent' ? '🚨 ' : ''}${m.text}`).join('  —  ');
  }, [data]);

  // ─── Split departures into OUTBOUND & RETURN ─────────
  const outboundList = useMemo(() => {
    if (!data) return [];
    return data.departures.filter((d) => d.departureType === 'OUTBOUND');
  }, [data]);

  const returnList = useMemo(() => {
    if (!data) return [];
    return data.departures.filter((d) => d.departureType === 'RETURN');
  }, [data]);

  // ─── Loading state ──────────────────────────────────
  if (!data) {
    return (
      <div className="sig2-root">
        <div className="sig2-loading">
          <div className="sig2-spinner" />
          <p className="sig2-loading-text">Chargement des départs...</p>
        </div>
        <style jsx global>{`
          @keyframes sig2-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          .sig2-root {
            font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
            width: 100vw; height: 100vh; height: 100dvh;
            overflow: hidden; position: fixed; inset: 0;
            background: #020617;
          }
          .sig2-loading {
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            height: 100vh;
          }
          .sig2-spinner {
            width: 48px; height: 48px; border-radius: 50%;
            border: 4px solid #334155; border-top-color: #f97316;
            animation: sig2-spin 1s linear infinite;
            margin-bottom: 1rem;
          }
          .sig2-loading-text { color: #94a3b8; font-size: 1.2rem; }
        `}</style>
      </div>
    );
  }

  const stationName = data.stationName || 'Gare Routière';
  const logoUrl = data.logoUrl || '';

  return (
    <div className="sig2-root" ref={rootRef}>
      <style jsx global>{`
        /* ═══ RESET + KIOSK ROOT ═══ */
        *, *::before, *::after { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; overflow: hidden; }
        .sig2-root {
          font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
          background: #020617;
          color: #f8fafc;
          width: 100vw; height: 100vh; height: 100dvh;
          overflow: hidden;
          display: flex; flex-direction: column;
          user-select: none; -webkit-user-select: none;
          cursor: ${cursorHidden ? 'none' : 'default'};
          touch-action: manipulation;
          position: fixed; inset: 0;
        }

        /* ═══ HEADER ═══ */
        .sig2-header {
          background: linear-gradient(to right, #1e293b, #0f172a);
          padding: clamp(0.5rem, 1.5vh, 1rem) clamp(0.8rem, 2vw, 1.5rem);
          border-bottom: 3px solid #f97316;
          display: flex; justify-content: space-between; align-items: center;
          z-index: 10; flex-shrink: 0;
        }
        .sig2-brand { display: flex; align-items: center; gap: clamp(0.4rem, 1vw, 0.75rem); }
        .sig2-brand-icon {
          background: #f97316;
          width: clamp(32px, 5vh, 48px); height: clamp(32px, 5vh, 48px);
          border-radius: clamp(6px, 1vh, 10px);
          display: flex; align-items: center; justify-content: center;
          font-weight: 800; font-size: clamp(0.7rem, 1.5vh, 1.1rem); color: #0f172a;
          overflow: hidden; flex-shrink: 0;
        }
        .sig2-brand-icon img { width: 100%; height: 100%; object-fit: contain; }
        .sig2-brand h1 { font-size: clamp(0.8rem, 2vh, 1.3rem); margin: 0; white-space: nowrap; }
        .sig2-brand-sub { color: #94a3b8; font-size: clamp(0.5rem, 1vh, 0.75rem); }

        .sig2-clock-box { text-align: right; flex-shrink: 0; }
        .sig2-clock {
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-size: clamp(1rem, 3.5vh, 3rem); font-weight: 700; letter-spacing: 2px; line-height: 1;
        }
        .sig2-date { color: #f97316; font-size: clamp(0.55rem, 1vh, 0.85rem); font-weight: 600; margin-top: 0.15rem; }

        /* ═══ TICKER ═══ */
        .sig2-ticker-wrap {
          background: #f97316; color: #0f172a;
          padding: clamp(0.25rem, 0.6vh, 0.5rem) 0;
          overflow: hidden; white-space: nowrap;
          font-weight: 700; font-size: clamp(0.65rem, 1.5vh, 1.1rem);
          flex-shrink: 0;
        }
        .sig2-ticker {
          display: inline-block; animation: sig2-marquee 40s linear infinite; padding-left: 100%;
        }
        @keyframes sig2-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-100%); }
        }

        /* ═══ SPLIT SCREEN ═══ */
        .sig2-split {
          flex: 1; display: flex; gap: clamp(0.5rem, 1.5vh, 1rem);
          padding: clamp(0.5rem, 1.5vh, 1rem);
          min-height: 0; overflow: hidden;
        }

        /* ═══ BOARD (each half) ═══ */
        .sig2-board {
          flex: 1; background: #1e293b;
          border-radius: clamp(8px, 1.5vh, 12px);
          overflow: hidden;
          display: flex; flex-direction: column;
          border: 1px solid #334155; border-top: 3px solid;
          min-height: 0;
        }

        .sig2-board-head {
          padding: clamp(0.4rem, 1vh, 0.8rem) clamp(0.6rem, 1.5vw, 1rem);
          font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
          font-size: clamp(0.65rem, 1.5vh, 1.1rem);
          display: flex; align-items: center; gap: clamp(0.3rem, 0.5vw, 0.5rem);
          flex-shrink: 0; color: white;
        }
        .sig2-board-head--green { background: linear-gradient(to right, #16a34a, #10b981); }
        .sig2-board-head--violet { background: linear-gradient(to right, #7c3aed, #8b5cf6); }

        /* ═══ BOARD BODY — Hidden scrollbar ═══ */
        .sig2-board-body {
          flex: 1; overflow-y: auto; overflow-x: hidden; min-height: 0;
          -ms-overflow-style: none; scrollbar-width: none;
        }
        .sig2-board-body::-webkit-scrollbar { display: none; }

        /* ═══ ROWS ═══ */
        .sig2-row {
          display: flex; align-items: center;
          padding: clamp(0.3rem, 0.8vh, 0.7rem) clamp(0.5rem, 1.2vw, 1rem);
          border-bottom: 1px solid #334155;
          gap: clamp(0.5rem, 1.5vw, 1rem);
          font-size: clamp(0.8rem, 2vh, 1.6rem);
          transition: background 0.3s ease;
          min-height: clamp(36px, 6vh, 65px);
        }
        .sig2-row:last-child { border-bottom: none; }

        /* Orange time box */
        .sig2-row__timebox {
          background: #f97316; color: white;
          width: clamp(56px, 8vw, 90px); height: clamp(36px, 5vh, 52px);
          border-radius: clamp(6px, 1vh, 10px);
          display: flex; align-items: center; justify-content: center;
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-weight: 700; font-size: clamp(0.75rem, 1.8vh, 1.4rem);
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(249, 115, 22, 0.4);
        }

        /* Destination */
        .sig2-row__dest {
          flex: 1; font-weight: 600;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          display: flex; align-items: center; gap: 0.3em;
        }
        .sig2-row__pin { flex-shrink: 0; }

        /* Status badge */
        .sig2-row__status {
          flex-shrink: 0; text-align: right;
        }
        .sig2-badge {
          font-size: clamp(0.55rem, 1.2vh, 0.85rem);
          padding: clamp(0.15em, 0.3em, 0.3em) clamp(0.4em, 0.7em, 0.8em);
          border-radius: 999px;
          font-weight: 700; display: inline-block;
          white-space: nowrap;
        }
        .sig2-status--ontime {
          background: rgba(16, 185, 129, 0.15); color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .sig2-status--boarding {
          background: rgba(249, 115, 22, 0.2); color: #f97316;
          border: 1px solid #f97316;
          animation: sig2-pulse-blink 1.2s infinite;
        }
        .sig2-status--delayed {
          background: rgba(239, 68, 68, 0.15); color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
        .sig2-status--departed {
          background: rgba(148, 163, 184, 0.1); color: #64748b;
          border: 1px solid rgba(148, 163, 184, 0.2);
        }

        /* Boarding row highlight */
        .sig2-row--boarding {
          background: rgba(249, 115, 22, 0.12);
          border-left: 4px solid #f97316;
          animation: sig2-pulse-row 1.5s infinite;
        }
        .sig2-row--boarding .sig2-row__timebox {
          animation: sig2-pulse-timebox 1.2s infinite;
        }

        /* Departed row */
        .sig2-row--departed {
          opacity: 0.35;
          background: #020617;
        }

        /* Animations */
        @keyframes sig2-pulse-blink {
          0%, 100% { opacity: 1; transform: scale(1); box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.4); }
          50% { opacity: 0.85; transform: scale(1.02); box-shadow: 0 0 10px 5px rgba(249, 115, 22, 0.2); }
        }
        @keyframes sig2-pulse-row {
          0%, 100% { background-color: rgba(249, 115, 22, 0.12); }
          50% { background-color: rgba(249, 115, 22, 0.22); }
        }
        @keyframes sig2-pulse-timebox {
          0%, 100% { box-shadow: 0 2px 8px rgba(249, 115, 22, 0.4); }
          50% { box-shadow: 0 2px 16px rgba(249, 115, 22, 0.7); }
        }

        /* ═══ EMPTY STATE ═══ */
        .sig2-empty {
          text-align: center; padding: clamp(2rem, 5vh, 4rem);
          color: #64748b; font-size: clamp(0.85rem, 1.5vh, 1.2rem);
        }

        /* ═══ AD OVERLAY ═══ */
        .sig2-ad-overlay {
          position: fixed; inset: 0; z-index: 100; background: #000;
          display: flex; align-items: center; justify-content: center;
          animation: sig2-ad-fadein 0.6s ease; cursor: none;
        }
        .sig2-ad-overlay img { max-width: 100%; max-height: 100%; object-fit: contain; }
        .sig2-ad-overlay video { max-width: 100%; max-height: 100%; object-fit: contain; }
        .sig2-ad-progress {
          position: absolute; bottom: 0; left: 0; height: 4px;
          background: #f97316;
          animation: sig2-ad-progress linear forwards;
        }
        .sig2-ad-label {
          position: absolute; top: clamp(8px, 2vh, 20px); right: clamp(8px, 2vw, 24px);
          background: rgba(0,0,0,0.7); color: white;
          padding: 4px 12px; border-radius: 6px;
          font-size: clamp(0.6rem, 1vh, 0.85rem); font-weight: 600;
        }
        @keyframes sig2-ad-fadein { from { opacity: 0; } to { opacity: 1; } }
        @keyframes sig2-ad-progress { from { width: 0; } to { width: 100%; } }

        /* ═══ FOOTER ═══ */
        .sig2-footer {
          background: #1e293b; border-top: 1px solid #334155;
          margin: clamp(0.3rem, 0.8vh, 0.8rem);
          padding: clamp(0.5rem, 1vh, 1rem) clamp(0.8rem, 2vw, 1.5rem);
          border-radius: clamp(8px, 1.2vh, 12px);
          display: flex; justify-content: space-between; align-items: center;
          flex-shrink: 0;
        }
        .sig2-qr-box { display: flex; align-items: center; gap: clamp(0.5rem, 1vw, 0.75rem); }
        .sig2-qr-img {
          width: clamp(44px, 7vh, 72px); height: clamp(44px, 7vh, 72px);
          background: #f8fafc; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
        }
        .sig2-qr-text h3 {
          font-size: clamp(0.75rem, 1.5vh, 1.3rem); margin: 0 0 0.1rem 0;
        }
        .sig2-qr-text p {
          color: #64748b; font-size: clamp(0.55rem, 1vh, 0.8rem); margin: 0;
        }

        /* ═══ OFFLINE BADGE ═══ */
        .sig2-offline {
          position: fixed; top: 10px; right: 10px;
          background: #ef4444; color: white;
          padding: 8px 16px; border-radius: 8px;
          font-weight: 700; font-size: 14px; z-index: 200;
          animation: sig2-blink 1s infinite;
        }
        @keyframes sig2-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

        /* ═══ LAST UPDATE ═══ */
        .sig2-last-update {
          position: fixed; bottom: 10px; left: 10px;
          background: rgba(0,0,0,0.5); color: white;
          padding: 4px 10px; border-radius: 4px;
          font-size: 10px; z-index: 50;
        }

        /* ═══ DEBUG CONTROLS ═══ */
        .sig2-debug {
          position: fixed; bottom: 20px; right: 20px;
          background: #1e293b; padding: 0.8rem; border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15); border: 1px solid #334155;
          display: flex; gap: 8px; z-index: 200; flex-direction: column;
        }
        .sig2-debug-btn {
          padding: 8px 14px; border: none; border-radius: 6px;
          cursor: pointer; font-weight: 600; font-size: 0.85rem; color: white;
        }
        .sig2-debug-btn--sim { background: #10b981; }
        .sig2-debug-btn--ad { background: #7c3aed; }
        .sig2-debug-btn--reset { background: #475569; }

        /* ═══ RESPONSIVE: Mobile (< 640px) ═══ */
        @media (max-width: 639px) {
          .sig2-split { flex-direction: column; }
          .sig2-brand h1 { display: none; }
          .sig2-brand-sub { display: none; }
          .sig2-header { padding: 0.3rem 0.5rem; }
          .sig2-row { padding: 0.3rem 0.5rem; font-size: 0.8rem; min-height: 32px; gap: 0.4rem; }
          .sig2-row__timebox { width: 48px; height: 30px; font-size: 0.7rem; border-radius: 5px; }
          .sig2-row__pin { display: none; }
          .sig2-badge { font-size: 0.55rem; padding: 0.15em 0.4em; }
          .sig2-qr-text h3 { font-size: 0.65rem; }
          .sig2-qr-text p { display: none; }
          .sig2-qr-img { width: 36px; height: 36px; }
          .sig2-footer { margin: 0.3rem; padding: 0.3rem 0.5rem; }
          .sig2-ad-label { font-size: 0.5rem; padding: 3px 8px; }
        }

        /* ═══ RESPONSIVE: Tablet (640px – 1023px) ═══ */
        @media (min-width: 640px) and (max-width: 1023px) {
          .sig2-header { padding: 0.4rem 0.8rem; }
          .sig2-row { padding: 0.4rem 0.7rem; font-size: 1rem; min-height: 44px; }
          .sig2-row__timebox { width: 64px; height: 38px; font-size: 0.85rem; }
        }

        /* ═══ RESPONSIVE: Large screen (≥ 1920px) ═══ */
        @media (min-width: 1920px) {
          .sig2-header { padding: 1.2rem 2.5rem; }
          .sig2-brand-icon { width: 56px; height: 56px; border-radius: 10px; font-size: 1.4rem; }
          .sig2-brand h1 { font-size: 2rem; }
          .sig2-clock { font-size: 4rem; }
          .sig2-date { font-size: 1.1rem; }
          .sig2-ticker-wrap { padding: 0.8rem 0; font-size: 1.4rem; }
          .sig2-split { padding: 1.5rem; gap: 1.5rem; }
          .sig2-board { border-radius: 16px; }
          .sig2-board-head { padding: 1rem 1.5rem; font-size: 1.2rem; }
          .sig2-row { padding: 1rem 1.5rem; font-size: 2rem; min-height: 90px; gap: 1.2rem; }
          .sig2-row__timebox { width: 100px; height: 60px; font-size: 1.5rem; border-radius: 12px; }
          .sig2-badge { font-size: 0.8rem; padding: 0.4em 0.9em; }
          .sig2-qr-img { width: 110px; height: 110px; }
          .sig2-qr-text h3 { font-size: 1.8rem; }
          .sig2-qr-text p { font-size: 1.2rem; }
          .sig2-footer { margin: 1rem; padding: 1.2rem 2rem; }
          .sig2-ad-label { font-size: 1rem; padding: 6px 16px; }
          .sig2-ad-progress { height: 6px; }
          .sig2-last-update { font-size: 14px; padding: 6px 14px; }
        }

        /* ═══ RESPONSIVE: 4K (≥ 2560px) ═══ */
        @media (min-width: 2560px) {
          .sig2-header { padding: 1.8rem 3.5rem; }
          .sig2-brand-icon { width: 72px; height: 72px; font-size: 1.8rem; }
          .sig2-brand h1 { font-size: 2.8rem; }
          .sig2-clock { font-size: 5.5rem; }
          .sig2-date { font-size: 1.4rem; }
          .sig2-ticker-wrap { padding: 1.2rem 0; font-size: 1.8rem; }
          .sig2-split { padding: 2rem; gap: 2rem; }
          .sig2-board-head { padding: 1.3rem 2rem; font-size: 1.5rem; }
          .sig2-row { padding: 1.3rem 2rem; font-size: 2.6rem; min-height: 110px; gap: 1.5rem; }
          .sig2-row__timebox { width: 130px; height: 75px; font-size: 2rem; border-radius: 14px; }
          .sig2-badge { font-size: 1rem; padding: 0.5em 1em; }
          .sig2-qr-img { width: 140px; height: 140px; }
          .sig2-qr-text h3 { font-size: 2.4rem; }
          .sig2-qr-text p { font-size: 1.5rem; }
          .sig2-footer { margin: 1.5rem; padding: 1.8rem 3rem; }
          .sig2-ad-label { font-size: 1.2rem; padding: 8px 20px; }
          .sig2-ad-progress { height: 8px; }
          .sig2-last-update { font-size: 18px; }
        }
      `}</style>

      {/* Offline Badge */}
      {offline && <div className="sig2-offline">⚠️ Hors ligne</div>}

      {/* ─── AD OVERLAY (full-screen ad rotation) ─── */}
      {showAdOverlay && activeAd && (
        <div className="sig2-ad-overlay">
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
          <div className="sig2-ad-label">📢 Publicité</div>
          <div
            className="sig2-ad-progress"
            style={{ animationDuration: `${activeAd.duration}s` }}
          />
        </div>
      )}

      {/* ─── HEADER ─── */}
      <header className="sig2-header">
        <div className="sig2-brand">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="sig2-brand-icon" />
          ) : (
            <div className="sig2-brand-icon">ST</div>
          )}
          <div>
            <h1>SmartTicketQR</h1>
            <div className="sig2-brand-sub">Dakar, Sénégal</div>
          </div>
        </div>
        <div style={{ textAlign: 'center', flex: 1, minWidth: 0 }}>
          <h2 style={{
            fontSize: 'clamp(0.9rem, 2.5vh, 2.2rem)',
            fontWeight: 800, textTransform: 'uppercase' as const,
            letterSpacing: '1px', margin: 0,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {stationName}
          </h2>
        </div>
        <div className="sig2-clock-box">
          <div className="sig2-clock">{currentTime}</div>
          <div className="sig2-date">{currentDate}</div>
        </div>
      </header>

      {/* ─── TICKER ─── */}
      <div className="sig2-ticker-wrap">
        <div className="sig2-ticker">{activeTicker}</div>
      </div>

      {/* ─── SPLIT SCREEN: DÉPARTS | ARRIVÉES ─── */}
      <main className="sig2-split">
        {/* DÉPARTS (Vert) */}
        <BoardSection
          title="Départs"
          icon="↗️"
          departures={outboundList}
          gradientClass="sig2-board-head--green"
          borderColor="#16a34a"
        />
        {/* ARRIVÉES (Violet) */}
        <BoardSection
          title="Arrivées"
          icon="↘️"
          departures={returnList}
          gradientClass="sig2-board-head--violet"
          borderColor="#7c3aed"
        />
      </main>

      {/* ─── FOOTER QR ─── */}
      <footer className="sig2-footer">
        <div className="sig2-qr-box">
          <div className="sig2-qr-img">
            <QRCodeSVG
              value={`${typeof window !== 'undefined' ? window.location.origin : ''}/track/${stationId}`}
              size={60}
              fgColor="#0f172a"
              bgColor="#ffffff"
              level="M"
              includeMargin={false}
            />
          </div>
          <div className="sig2-qr-text">
            <h3>📱 Scannez pour suivre</h3>
            <p>Traçabilité sécurisée 24/7 • SmartTicketQR</p>
          </div>
        </div>
      </footer>

      {/* ─── Last update indicator ─── */}
      {lastUpdate && (
        <div className="sig2-last-update">
          Dernière MAJ: {lastUpdate}
        </div>
      )}

      {/* ─── DEBUG CONTROLS (only when ?debug=1) ─── */}
      {isDebug && (
        <div className="sig2-debug">
          <button
            className="sig2-debug-btn sig2-debug-btn--sim"
            onClick={playDingDong}
          >
            ▶️ Test Son Ding-Dong
          </button>
          <button
            className="sig2-debug-btn sig2-debug-btn--ad"
            onClick={() => {
              if (ads.length > 0) {
                const randomAd = ads[Math.floor(Math.random() * ads.length)];
                lastAdShowTimeRef.current = Date.now();
                setAdShowCount(c => c + 1);
                showAdOverlayRef.current = true;
                setActiveAd(randomAd);
                setShowAdOverlay(true);
                if (adDisplayTimerRef.current) clearTimeout(adDisplayTimerRef.current);
                adDisplayTimerRef.current = setTimeout(() => {
                  setShowAdOverlay(false);
                  setActiveAd(null);
                  showAdOverlayRef.current = false;
                }, randomAd.duration * 1000);
              }
            }}
          >
            📢 Test Publicité ({ads.length} ads)
          </button>
          <button
            className="sig2-debug-btn"
            style={{ background: '#0ea5e9' }}
            onClick={async () => {
              try {
                const res = await fetch('/api/signage-ads');
                if (res.ok) {
                  const json = await res.json();
                  setAds((json as SignageAd[]) || []);
                }
              } catch { /* ignore */ }
            }}
          >
            🔄 Refetch Ads
          </button>
          <button
            className="sig2-debug-btn sig2-debug-btn--reset"
            onClick={() => { alertedDeparturesRef.current = new Set(); }}
          >
            🔄 Reset Alerts
          </button>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8', textAlign: 'center' }}>
            Départs: {outboundList.length} | Arrivées: {returnList.length} | Ads: {ads.length} | Shown: {adShowCount}
          </div>
        </div>
      )}
    </div>
  );
}
