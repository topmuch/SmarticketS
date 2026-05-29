'use client';

import { useState, useEffect, useCallback, useRef, memo, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

/* ══════════════════════════════════════════════
   Types
   ══════════════════════════════════════════════ */
interface Departure {
  id: string;
  lineNumber: string;
  destination: string;
  scheduledTime: string;
  effectiveTime: string;
  platform: string;
  status: string;
  delayMinutes: number;
  availableSeats: number;
  totalSeats: number;
  occupancy: number;
  countdownMin: number;
  companyName: string;
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

/* ══════════════════════════════════════════════
   Status display config (matching HTML reference)
   ══════════════════════════════════════════════ */
const STATUS_MAP: Record<string, { label: string; css: string }> = {
  SCHEDULED: { label: '✅ À l\'heure', css: 'on-time' },
  BOARDING: { label: '🚌 EMBARQUEMENT', css: 'boarding' },
  DELAYED: { label: '🔴 Retard', css: 'delayed' },
  DEPARTED: { label: '⚪ Parti', css: 'departed' },
  CANCELLED: { label: '⚪ Annulé', css: 'departed' },
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
        'row',
        isBoarding ? 'boarding-active' : '',
        isDeparted ? 'departed' : '',
      ].join(' ')}
    >
      <div className="time">{dep.effectiveTime}</div>
      <div>
        <span className="line-badge">{dep.lineNumber}</span>
      </div>
      <div className="dest">{dep.destination}</div>
      <div className="quai">{dep.platform}</div>
      <div>
        <span className={`status ${statusCfg.css}`}>{statusCfg.label}</span>
      </div>
    </div>
  );
});

/* ══════════════════════════════════════════════
   Main Signage Page
   ══════════════════════════════════════════════ */
export default function SignageKioskPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const stationId = params.stationId as string;
  const isKiosk = searchParams.get('kiosk') === '1';
  const isDebug = searchParams.get('debug') === '1';

  const [data, setData] = useState<StationData | null>(null);
  const [currentTime, setCurrentTime] = useState('00:00:00');
  const [currentDate, setCurrentDate] = useState('Chargement...');
  const [lastUpdate, setLastUpdate] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [offline, setOffline] = useState(false);
  const prevBoardingRef = useRef<Set<string>>(new Set());
  const prevDataRef = useRef<StationData | null>(null);
  const cursorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cursorHidden, setCursorHidden] = useState(false);

  // ─── Live Clock ────────────────────────────────────────────
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('fr-FR', { hour12: false })
      );
      setCurrentDate(
        now.toLocaleDateString('fr-FR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // ─── Auto-hide cursor in kiosk mode ──────────────────────────
  useEffect(() => {
    if (!isKiosk) return;
    const hideCursor = () => {
      setCursorHidden(true);
    };
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
  }, [isKiosk]);

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

          // Update sound setting from server
          if (json.alertSoundEnabled === false) setSoundEnabled(false);

          // Detect new boarding departures → play sound
          if (prevDataRef.current) {
            const currentBoarding: Set<string> = new Set(
              json.departures
                .filter((d: Departure) => d.status === 'BOARDING')
                .map((d: Departure) => d.id)
            );
            currentBoarding.forEach((id) => {
              if (!prevBoardingRef.current.has(id) && soundEnabled) {
                playDingDong();
              }
            });
            prevBoardingRef.current = currentBoarding;
          }
          prevDataRef.current = json;
        }
      } catch {
        setOffline(true);
      }
    };

    fetchDepartures();
    const interval = setInterval(fetchDepartures, 15000);
    return () => clearInterval(interval);
  }, [stationId, soundEnabled]);

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
      <div className="kiosk-root" style={{ background: '#f8fafc' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: 48, height: 48, borderRadius: '50%',
                border: '4px solid #e2e8f0', borderTopColor: '#f59e0b',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 1rem',
              }}
            />
            <p style={{ color: '#94a3b8', fontSize: '1.2rem', fontFamily: 'var(--font-main)' }}>Chargement des départs...</p>
          </div>
        </div>
      </div>
    );
  }

  const stationName = data.stationName || 'Gare Routière';
  const primaryColor = data.primaryColor || '#0f172a';
  const secondaryColor = data.secondaryColor || '#1e293b';
  const logoUrl = data.logoUrl || '';

  return (
    <>
      <style jsx>{`
        :root {
          --primary: ${primaryColor};
          --secondary: ${secondaryColor};
          --accent: #f59e0b;
          --success: #10b981;
          --muted: #94a3b8;
          --bg: #f8fafc;
          --card: #ffffff;
          --font-main: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
          --font-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        }

        .kiosk-root {
          font-family: var(--font-main);
          background: var(--bg);
          color: var(--primary);
          height: 100vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          user-select: none;
          -webkit-user-select: none;
          cursor: ${isKiosk && cursorHidden ? 'none' : 'default'};
          touch-action: manipulation;
        }

        /* HEADER */
        .s-header {
          background: var(--primary);
          color: white;
          padding: clamp(0.8rem, 2vh, 1.5rem) clamp(1rem, 2vw, 2.5rem);
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          z-index: 10;
          gap: 1rem;
        }
        .brand { display: flex; align-items: center; gap: clamp(0.5rem, 1vw, 1rem); }
        .brand-icon {
          background: var(--accent);
          width: clamp(32px, 4vh, 48px);
          height: clamp(32px, 4vh, 48px);
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-weight: 800; font-size: clamp(1rem, 2vh, 1.2rem); color: #0f172a;
          overflow: hidden;
        }
        .brand-icon img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .brand-logo {
          width: clamp(32px, 4vh, 48px);
          height: clamp(32px, 4vh, 48px);
          border-radius: 8px;
          object-fit: contain;
        }
        .brand h1 { font-size: clamp(1.2rem, 2.5vh, 2rem); letter-spacing: 0.5px; }

        .station { text-align: center; flex: 1; }
        .station h2 { font-size: clamp(1.4rem, 3vh, 2.5rem); font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
        .station span { color: var(--muted); font-size: clamp(0.8rem, 1.5vh, 1.1rem); margin-top: 0.2rem; display: block; }

        .clock-box { text-align: right; }
        .clock { font-family: var(--font-mono); font-size: clamp(2rem, 4vh, 3.5rem); font-weight: 700; letter-spacing: 2px; }
        .date { color: var(--muted); font-size: clamp(0.8rem, 1.5vh, 1rem); margin-top: 0.3rem; }

        /* TICKER */
        .ticker-wrap {
          background: var(--accent);
          color: #0f172a;
          padding: clamp(0.5rem, 1vh, 0.8rem) 0;
          overflow: hidden;
          white-space: nowrap;
          font-weight: 600;
          font-size: clamp(1rem, 2vh, 1.4rem);
          position: relative;
        }
        .ticker {
          display: inline-block;
          animation: marquee 40s linear infinite;
          padding-left: 100%;
        }
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-100%); } }

        /* MAIN BOARD */
        .s-main { flex: 1; padding: clamp(1rem, 2vh, 2rem); overflow: hidden; display: flex; flex-direction: column; }
        .board {
          background: var(--card);
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .board-header {
          display: grid;
          grid-template-columns: minmax(80px, 1.2fr) minmax(60px, 1fr) 2fr minmax(60px, 1fr) 1.3fr;
          background: var(--secondary);
          color: white;
          padding: clamp(0.8rem, 1.5vh, 1.2rem) clamp(1rem, 1.5vw, 2rem);
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-size: clamp(0.8rem, 1.5vh, 1rem);
        }
        .board-body { flex: 1; overflow: hidden; }

        /* ROW */
        .row {
          display: grid;
          grid-template-columns: minmax(80px, 1.2fr) minmax(60px, 1fr) 2fr minmax(60px, 1fr) 1.3fr;
          padding: clamp(0.8rem, 1.5vh, 1.5rem) clamp(1rem, 1.5vw, 2rem);
          border-bottom: 1px solid #e2e8f0;
          align-items: center;
          font-size: clamp(1.2rem, 2.5vh, 2rem);
          transition: all 0.3s ease;
        }
        .row:last-child { border-bottom: none; }

        .row.boarding-active {
          background: #dcfce7;
          border-left: 6px solid var(--success);
          transform: scale(1.01);
          box-shadow: 0 4px 20px rgba(16, 185, 129, 0.3);
          font-weight: 800;
          animation: pulse-row 1.5s infinite;
        }
        .row.boarding-active .time,
        .row.boarding-active .line-badge { color: #064e3b; }
        .row.departed { opacity: 0.4; background: #f8fafc; }

        @keyframes pulse-row {
          0%, 100% { background-color: #dcfce7; }
          50% { background-color: #bbf7d0; }
        }

        .time { font-family: var(--font-mono); font-weight: 700; }
        .line-badge {
          background: #e2e8f0;
          padding: 0.3em 0.6em;
          border-radius: 6px;
          font-weight: 700;
          font-size: 0.8em;
          display: inline-block;
        }
        .dest { font-weight: 600; display: flex; align-items: center; gap: 0.5rem; }
        .dest::before { content: "📍"; opacity: 0.7; font-size: 0.8em; }
        .quai { text-align: center; font-weight: 600; color: var(--muted); font-size: 0.9em; }

        .status {
          text-align: right;
          font-weight: 700;
          font-size: 0.8em;
          padding: 0.4em 0.8em;
          border-radius: 20px;
          display: inline-block;
        }
        .status.on-time { background: #dcfce7; color: #166534; }
        .status.boarding { background: var(--success); color: white; }
        .status.delayed { background: #fee2e2; color: #991b1b; }
        .status.departed { background: #f1f5f9; color: #64748b; }

        /* FOOTER */
        .s-footer {
          background: var(--card);
          padding: clamp(0.8rem, 1.5vh, 1.2rem) clamp(1rem, 2vw, 2rem);
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 2px solid #e2e8f0;
          gap: 1rem;
        }
        .qr-text h3 { font-size: clamp(1.2rem, 2.5vh, 2rem); margin-bottom: 0.2rem; }
        .qr-text p { color: var(--muted); font-size: clamp(0.9rem, 1.5vh, 1.2rem); }
        .qr-box { display: flex; align-items: center; gap: 1rem; }
        .qr-img {
          width: clamp(60px, 10vh, 100px);
          height: clamp(60px, 10vh, 100px);
          border: 2px dashed #cbd5e1;
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          background: #f8fafc;
        }
        .qr-label { font-weight: 700; font-size: clamp(0.8rem, 1.5vh, 1rem); text-align: center; }

        /* OFFLINE BADGE */
        .offline-badge {
          position: fixed; top: 10px; right: 10px;
          background: #ef4444; color: white;
          padding: 8px 16px; border-radius: 8px;
          font-weight: 700; font-size: 14px; z-index: 100;
          animation: blink 1s infinite;
        }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

        /* DEBUG CONTROLS */
        .test-controls {
          position: fixed; bottom: 20px; right: 20px;
          background: white; padding: 1rem; border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          display: flex; gap: 10px; z-index: 100; flex-direction: column;
        }
        .btn-test {
          padding: 10px 16px; border: none; border-radius: 6px;
          cursor: pointer; font-weight: 600; font-size: 0.9rem;
        }
        .btn-sim { background: var(--success); color: white; }
        .btn-ding { background: var(--accent); color: #0f172a; }
        .btn-reset { background: #e2e8f0; color: var(--primary); }

        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>

      <div className="kiosk-root">
        {/* Offline Badge */}
        {offline && <div className="offline-badge">⚠️ Hors ligne</div>}

        {/* ─── HEADER ─── */}
        <header className="s-header">
          <div className="brand">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="brand-logo" />
            ) : (
              <div className="brand-icon">ST</div>
            )}
            <h1>SmartTicketQR</h1>
          </div>
          <div className="station">
            <h2>{stationName}</h2>
            <span>Dakar, Sénégal</span>
          </div>
          <div className="clock-box">
            <div className="clock">{currentTime}</div>
            <div className="date">{currentDate}</div>
          </div>
        </header>

        {/* ─── TICKER ─── */}
        <div className="ticker-wrap">
          <div className="ticker">{activeTicker}</div>
        </div>

        {/* ─── MAIN BOARD ─── */}
        <main className="s-main">
          <div className="board">
            <div className="board-header">
              <div>Heure</div>
              <div>Ligne</div>
              <div>Destination</div>
              <div>Quai</div>
              <div style={{ textAlign: 'right' }}>Statut</div>
            </div>
            <div className="board-body">
              {data.departures.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8', fontSize: '1.5rem' }}>
                  Aucun départ prévu
                </div>
              ) : (
                data.departures.map((dep) => (
                  <DepartureRow key={dep.id} dep={dep} />
                ))
              )}
            </div>
          </div>
        </main>

        {/* ─── FOOTER ─── */}
        <footer className="s-footer">
          <div className="qr-text">
            <h3>📱 Scannez pour suivre votre trajet</h3>
            <p>Traçabilité sécurisée 24/7 • SmartTicketQR</p>
          </div>
          <div className="qr-box">
            <div className="qr-img">
              {/* Dynamic QR pointing to tracking */}
              <svg width="80%" height="80%" viewBox="0 0 100 100">
                <rect x="5" y="5" width="25" height="25" rx="3" fill="#0f172a" />
                <rect x="8" y="8" width="19" height="19" rx="2" fill="white" />
                <rect x="11" y="11" width="13" height="13" rx="1" fill="#0f172a" />
                <rect x="70" y="5" width="25" height="25" rx="3" fill="#0f172a" />
                <rect x="73" y="8" width="19" height="19" rx="2" fill="white" />
                <rect x="76" y="11" width="13" height="13" rx="1" fill="#0f172a" />
                <rect x="5" y="70" width="25" height="25" rx="3" fill="#0f172a" />
                <rect x="8" y="73" width="19" height="19" rx="2" fill="white" />
                <rect x="11" y="76" width="13" height="13" rx="1" fill="#0f172a" />
                <rect x="35" y="5" width="5" height="5" fill="#0f172a" />
                <rect x="35" y="15" width="5" height="5" fill="#0f172a" />
                <rect x="35" y="35" width="5" height="5" fill="#0f172a" />
                <rect x="45" y="35" width="5" height="5" fill="#0f172a" />
                <rect x="55" y="35" width="5" height="5" fill="#0f172a" />
                <rect x="35" y="45" width="5" height="5" fill="#0f172a" />
                <rect x="55" y="45" width="5" height="5" fill="#0f172a" />
                <rect x="35" y="55" width="5" height="5" fill="#0f172a" />
                <rect x="45" y="55" width="5" height="5" fill="#0f172a" />
                <rect x="55" y="55" width="5" height="5" fill="#0f172a" />
                <rect x="35" y="70" width="5" height="5" fill="#0f172a" />
                <rect x="45" y="70" width="5" height="5" fill="#0f172a" />
                <rect x="55" y="70" width="5" height="5" fill="#0f172a" />
                <rect x="45" y="80" width="5" height="5" fill="#0f172a" />
                <rect x="70" y="35" width="5" height="5" fill="#0f172a" />
                <rect x="80" y="35" width="5" height="5" fill="#0f172a" />
                <rect x="70" y="45" width="5" height="5" fill="#0f172a" />
                <rect x="80" y="55" width="5" height="5" fill="#0f172a" />
                <rect x="90" y="55" width="5" height="5" fill="#0f172a" />
                <rect x="70" y="70" width="5" height="5" fill="#0f172a" />
                <rect x="80" y="80" width="5" height="5" fill="#0f172a" />
                <rect x="90" y="90" width="5" height="5" fill="#0f172a" />
              </svg>
            </div>
            <div className="qr-label">TRACKING</div>
          </div>
        </footer>

        {/* ─── DEBUG CONTROLS (only when ?debug=1) ─── */}
        {isDebug && (
          <div className="test-controls">
            <button
              className="btn-test btn-sim"
              onClick={() => {
                // Simulate boarding on first scheduled departure
                if (!data) return;
                const firstScheduled = data.departures.find(d => d.status === 'SCHEDULED');
                if (firstScheduled) {
                  playDingDong();
                }
              }}
            >
              ▶️ Simuler Embarquement (5 min)
            </button>
            <button className="btn-test btn-ding" onClick={playDingDong}>
              🔊 Test Sonore Ding-Dong
            </button>
            <button
              className="btn-test btn-reset"
              onClick={() => {
                prevBoardingRef.current = new Set();
                prevDataRef.current = null;
              }}
            >
              🔄 Reset
            </button>
            <button
              className="btn-test btn-ding"
              onClick={() => setSoundEnabled(!soundEnabled)}
              style={{ background: soundEnabled ? '#10b981' : '#e2e8f0', color: soundEnabled ? 'white' : '#0f172a' }}
            >
              🔔 Son {soundEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
