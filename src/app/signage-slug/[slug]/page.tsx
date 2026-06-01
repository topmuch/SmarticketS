'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { io, Socket } from 'socket.io-client';
import {
  addToQueue,
  preloadVoices,
  cancelAll,
  installKeyboardShortcut,
  startGeneralMessageInterval,
  toggleMute,
  setVolume,
  AnnouncementPriority,
} from '@/lib/audioSystem';

/* ══════════════════════════════════════════════════════════════════════════
   Types
   ══════════════════════════════════════════════════════════════════════════ */
interface Departure {
  id: string;
  lineNumber: string;
  destination: string;
  effectiveTime: string;
  status: string;
  delayMinutes: number;
  platform: string | null;
  shouldPlayAlert: boolean;
  countdownMin: number;
  countdownSec: number;
}

interface Arrival {
  id: string;
  lineNumber: string;
  originStationName: string;
  scheduledTime: string;
  effectiveTime: string;
  status: string;
  delayMinutes: number;
  platform: string | null;
}

interface TickerMessage {
  id?: string;
  text: string;
  priority: 'info' | 'urgent';
  active: boolean;
}

interface StationData {
  stationName: string;
  city: string;
  departures: Departure[];
  arrivals: Arrival[];
  tickerMessages: TickerMessage[];
  alertSoundEnabled: boolean;
  currentTimestamp: number;
}

/* ══════════════════════════════════════════════════════════════════════════
   Constants
   ══════════════════════════════════════════════════════════════════════════ */
const SLIDE_DURATION = 120; // seconds
const MAX_ROWS = 10;
const POLL_INTERVAL = 15000; // 15s

/* ══════════════════════════════════════════════════════════════════════════
   Status Helpers
   ══════════════════════════════════════════════════════════════════════════ */
function getStatusInfo(status: string, delayMinutes: number, isArrival?: boolean) {
  switch (status) {
    case 'SCHEDULED':
      return { label: isArrival ? 'À L\'HEURE' : 'À L\'HEURE', cls: 'status-ontime' };
    case 'BOARDING':
      return { label: isArrival ? 'IMMINENTE' : 'EMBARQUEMENT', cls: 'status-boarding' };
    case 'DELAYED':
      return { label: `RETARD ${delayMinutes} MIN`, cls: 'status-delayed' };
    case 'CANCELLED':
      return { label: 'COMPLET', cls: 'status-canceled' };
    case 'DEPARTED':
      return { label: 'PARTI', cls: 'status-departed' };
    default:
      return { label: status, cls: 'status-ontime' };
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   Fullscreen API
   ══════════════════════════════════════════════════════════════════════════ */
function toggleFullscreen(el: HTMLElement | null) {
  if (!el) return;
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else if (el.requestFullscreen) {
    el.requestFullscreen();
  } else if ((el as HTMLDivElement & { webkitRequestFullscreen?: () => void }).webkitRequestFullscreen) {
    (el as HTMLDivElement & { webkitRequestFullscreen: () => void }).webkitRequestFullscreen();
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   Blinking Colon Component
   ══════════════════════════════════════════════════════════════════════════ */
function BlinkColon() {
  return <span className="blink">:</span>;
}

/* ══════════════════════════════════════════════════════════════════════════
   Analog Clock Component
   ══════════════════════════════════════════════════════════════════════════ */
function AnalogClock({ date }: { date: Date }) {
  const s = date.getSeconds();
  const m = date.getMinutes();
  const h = date.getHours() % 12;

  const hourDeg = h * 30 + m * 0.5;
  const minuteDeg = m * 6 + s * 0.1;
  const secondDeg = s * 6;

  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const dateStr = `${String(date.getDate()).padStart(2, '0')} ${months[date.getMonth()]} ${date.getFullYear()}`;

  const ticks = [];
  for (let i = 0; i < 60; i++) {
    const isMajor = i % 5 === 0;
    ticks.push(
      <div
        key={i}
        className={isMajor ? 'tick major' : 'tick'}
        style={{ transform: `rotate(${i * 6}deg)` }}
      />
    );
  }

  return (
    <div className="clock-section">
      <div className="analog-clock">
        <div className="clock-face">
          {ticks}
          <div className="hand hour-hand" style={{ transform: `rotate(${hourDeg}deg)` }} />
          <div className="hand minute-hand" style={{ transform: `rotate(${minuteDeg}deg)` }} />
          <div className="hand second-hand" style={{ transform: `rotate(${secondDeg}deg)` }} />
          <div className="clock-center" />
        </div>
      </div>
      <div className="digital-date">{dateStr}</div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Bus SVG Icon
   ══════════════════════════════════════════════════════════════════════════ */
function BusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="60%" height="60%">
      <path
        fill="#000"
        d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"
      />
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Main Page Component — LED Airport Display Design
   ══════════════════════════════════════════════════════════════════════════ */
export default function SignageSlugPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const isKiosk = searchParams.get('kiosk') === '1';

  /* ─── Data state ────────────────────────────────────── */
  const [data, setData] = useState<StationData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [now, setNow] = useState(new Date());
  const [cursorHidden, setCursorHidden] = useState(false);

  /* ─── Slide state ──────────────────────────────────── */
  const [currentMode, setCurrentMode] = useState<'departures' | 'arrivals'>('departures');
  const [timeRemaining, setTimeRemaining] = useState(SLIDE_DURATION);

  /* ─── Refs ────────────────────────────────────────── */
  const rootRef = useRef<HTMLDivElement>(null);
  const cursorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const announcedRef = useRef<Set<string>>(new Set());
  const socketRef = useRef<Socket | null>(null);
  const generalMessageCleanupRef = useRef<(() => void) | null>(null);

  /* ─── Computed: active departures (not DEPARTED) and arrivals ────────── */
  const visibleDepartures = useMemo(() => {
    if (!data) return [];
    return data.departures.filter((d) => d.status !== 'DEPARTED');
  }, [data]);

  const visibleArrivals = useMemo(() => {
    if (!data) return [];
    return data.arrivals.filter((a) => a.status !== 'DEPARTED');
  }, [data]);

  /* ─── Hide scrollbar ───────────────────────────────── */
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

  /* ─── Live clock (every second) ────────────────────── */
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  /* ─── Auto-hide cursor ────────────────────────────── */
  useEffect(() => {
    if (!isKiosk) return;
    const hide = () => setCursorHidden(true);
    const show = () => {
      setCursorHidden(false);
      if (cursorTimerRef.current) clearTimeout(cursorTimerRef.current);
      cursorTimerRef.current = setTimeout(hide, 5000);
    };
    document.addEventListener('mousemove', show);
    document.addEventListener('touchstart', show);
    cursorTimerRef.current = setTimeout(hide, 5000);
    return () => {
      document.removeEventListener('mousemove', show);
      document.removeEventListener('touchstart', show);
      if (cursorTimerRef.current) clearTimeout(cursorTimerRef.current);
    };
  }, [isKiosk]);

  /* ─── First interaction: fullscreen + preload voices + keyboard shortcuts */
  useEffect(() => {
    const handle = () => {
      if (isKiosk && rootRef.current && !document.fullscreenElement) {
        toggleFullscreen(rootRef.current);
      }
      preloadVoices();
      installKeyboardShortcut();
      document.removeEventListener('click', handle);
      document.removeEventListener('touchstart', handle);
      document.removeEventListener('keydown', handle);
    };
    document.addEventListener('click', handle);
    document.addEventListener('touchstart', handle);
    document.addEventListener('keydown', handle);
    return () => {
      document.removeEventListener('click', handle);
      document.removeEventListener('touchstart', handle);
      document.removeEventListener('keydown', handle);
    };
  }, [isKiosk]);

  /* ─── Switch mode function ─────────────────────────── */
  const switchMode = useCallback(() => {
    setCurrentMode((prev) => (prev === 'departures' ? 'arrivals' : 'departures'));
    setTimeRemaining(SLIDE_DURATION);
  }, []);

  /* ─── Keyboard shortcuts: S = switch slides, F = fullscreen ─── */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyS') {
        switchMode();
      }
      if (e.code === 'KeyF') {
        toggleFullscreen(rootRef.current);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [switchMode]);

  /* ─── Cleanup audio on unmount ────────────────────── */
  useEffect(() => {
    return () => {
      cancelAll();
      if (generalMessageCleanupRef.current) {
        generalMessageCleanupRef.current();
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  /* ─── Slide timer ──────────────────────────────────── */
  useEffect(() => {
    const id = setInterval(() => {
      setTimeRemaining((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          setTimeout(() => switchMode(), 0);
          return SLIDE_DURATION;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [switchMode]);

  /* ─── Poll station data every 15 seconds ─────────── */
  useEffect(() => {
    if (!slug) return;
    let retryCount = 0;
    const MAX_RETRIES = 3;
    let cancelled = false;

    const fetchData = async () => {
      try {
        if (retryCount === 0) {
          fetch('/api/init-demo').catch(() => {});
        }
        const res = await fetch(`/api/signage-slug/${encodeURIComponent(slug)}`);
        if (cancelled) return;

        if (res.status === 404) {
          if (retryCount < MAX_RETRIES) {
            retryCount++;
            await new Promise((r) => setTimeout(r, 2000));
            if (!cancelled) return fetchData();
          }
          setNotFound(true);
          return;
        }
        const json = await res.json();
        if (cancelled) return;

        if (res.ok) {
          retryCount = MAX_RETRIES;
          setData(json);

          // Audio alerts for boarding departures
          if (json.alertSoundEnabled !== false) {
            for (const dep of json.departures) {
              if (dep.shouldPlayAlert && !announcedRef.current.has(dep.id)) {
                announcedRef.current.add(dep.id);
                addToQueue(
                  `Madame, Monsieur, les passagers en direction de ${dep.destination} sont priés de monter à bord. Le bus va partir à ${dep.effectiveTime}. Quai ${dep.platform}.`,
                  AnnouncementPriority.MEDIUM
                );
              }
            }
          }
        }
      } catch {
        // offline — silently retry next interval
      }
    };
    fetchData();
    const id = setInterval(fetchData, POLL_INTERVAL);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [slug]);

  /* ─── WebSocket connection ────────────────────────── */
  useEffect(() => {
    if (!slug) return;

    const socket = io('/?XTransformPort=3004');
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Kiosk] Socket connected');
      socket.emit('join:station', slug);
    });

    socket.on('kiosk:delay', (payload: { departureId: string; minutes: number; destination: string; timestamp: number }) => {
      console.log('[Kiosk] Delay received:', payload);
      // Mark departure as delayed in state
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          departures: prev.departures.map((d) =>
            d.id === payload.departureId
              ? { ...d, status: 'DELAYED', delayMinutes: payload.minutes }
              : d
          ),
        };
      });
      // Queue audio announcement
      addToQueue(
        `Madame, Monsieur, le bus en direction de ${payload.destination} est en retard de ${payload.minutes} minutes.`,
        AnnouncementPriority.HIGH
      );
    });

    socket.on('kiosk:departed', (payload: { departureId: string; destination: string; timestamp: number }) => {
      console.log('[Kiosk] Departed received:', payload);
      // Mark departure as departed in state
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          departures: prev.departures.map((d) =>
            d.id === payload.departureId ? { ...d, status: 'DEPARTED' } : d
          ),
        };
      });
      // Queue audio
      addToQueue(
        `Merci de votre patience, le bus en direction de ${payload.destination} va partir.`,
        AnnouncementPriority.CRITICAL
      );
    });

    socket.on('kiosk:config', (config: { volume?: number; muted?: boolean; generalMessage?: string; generalMessageInterval?: number }) => {
      console.log('[Kiosk] Config received:', config);
      if (typeof config.volume === 'number') {
        setVolume(config.volume);
      }
      if (typeof config.muted === 'boolean' && config.muted !== toggleMute()) {
        toggleMute();
      }
      if (config.generalMessage && config.generalMessageInterval) {
        if (generalMessageCleanupRef.current) {
          generalMessageCleanupRef.current();
        }
        generalMessageCleanupRef.current = startGeneralMessageInterval(
          config.generalMessage,
          config.generalMessageInterval
        );
      }
    });

    socket.on('disconnect', () => {
      console.log('[Kiosk] Socket disconnected');
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [slug]);

  /* ─── Progress bar % ───────────────────────────────── */
  const progressPercent = ((SLIDE_DURATION - timeRemaining) / SLIDE_DURATION) * 100;

  /* ─── Render helpers ──────────────────────────────── */
  const renderDepartureRow = (dep: Departure) => {
    const [hours, minutes] = dep.effectiveTime.split(':');
    const statusInfo = getStatusInfo(dep.status, dep.delayMinutes);

    return (
      <tr key={dep.id}>
        <td className="col-time led-time">
          {hours}<BlinkColon />{minutes}
        </td>
        <td className="col-dest led-dest">{dep.destination.toUpperCase()}</td>
        <td className={`col-status ${statusInfo.cls}`}>{statusInfo.label}</td>
      </tr>
    );
  };

  const renderArrivalRow = (arr: Arrival) => {
    const [hours, minutes] = arr.effectiveTime.split(':');
    const statusInfo = getStatusInfo(arr.status, arr.delayMinutes, true);

    return (
      <tr key={arr.id}>
        <td className="col-time led-time">
          {hours}<BlinkColon />{minutes}
        </td>
        <td className="col-dest led-dest">{(arr.originStationName || '—').toUpperCase()}</td>
        <td className={`col-status ${statusInfo.cls}`}>{statusInfo.label}</td>
      </tr>
    );
  };

  const renderEmptyRows = (count: number) => {
    const rows = [];
    for (let i = 0; i < count; i++) {
      rows.push(
        <tr key={`empty-${i}`} className="empty-row">
          <td className="col-time led-time">
            {'\u00A0\u00A0'}<BlinkColon />{'\u00A0\u00A0'}
          </td>
          <td className="col-dest" />
          <td className="col-status" />
        </tr>
      );
    }
    return rows;
  };

  /* ─── Ticker text ────────────────────────────────── */
  const tickerText = useMemo(() => {
    if (!data) return '';
    const msgs = data.tickerMessages?.filter((m) => m.active) || [];
    if (msgs.length === 0) return '';
    return msgs.map((m) => `${m.priority === 'urgent' ? '\u{1F6A8} ' : ''}${m.text}`).join('    \u2014    ');
  }, [data]);

  /* ─── Loading state ────────────────────────────────── */
  if (!data && !notFound) {
    return (
      <div className="board">
        <style>{LED_STYLES}</style>
        <div className="board-content loading-screen">
          <div className="loading-text">CHARGEMENT...</div>
          <div className="loading-spinner" />
        </div>
      </div>
    );
  }

  /* ─── Not found state ─────────────────────────────── */
  if (notFound) {
    return (
      <div className="board">
        <style>{LED_STYLES}</style>
        <div className="board-content loading-screen">
          <div className="notfound-icon">{'\u26A0\uFE0F'}</div>
          <div className="loading-text">STATION NON TROUVÉE</div>
          <div className="loading-sub">Cette gare n&apos;existe pas ou est désactivée.</div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const isDeparturesMode = currentMode === 'departures';
  const boardModeClass = isDeparturesMode ? 'departures-mode-active' : 'arrivals-mode-active';
  const headerModeClass = isDeparturesMode ? 'departures-mode' : 'arrivals-mode';
  const departuresPanelClass = isDeparturesMode ? 'slide-panel departures-panel active' : 'slide-panel departures-panel left';
  const arrivalsPanelClass = isDeparturesMode ? 'slide-panel arrivals-panel right' : 'slide-panel arrivals-panel active';
  const titleText = isDeparturesMode ? 'DÉPARTS' : 'ARRIVÉES';
  const destHeader = isDeparturesMode ? 'DESTINATION' : 'PROVENANCE';
  const destClass = isDeparturesMode ? 'departures-panel' : 'arrivals-panel';

  const departureRows = visibleDepartures.slice(0, MAX_ROWS);
  const arrivalRows = visibleArrivals.slice(0, MAX_ROWS);

  return (
    <div className={`board ${boardModeClass}`} ref={rootRef}>
      <style>{LED_STYLES}</style>
      <div className="board-content" style={{ cursor: isKiosk && cursorHidden ? 'none' : 'default' }}>

        {/* ─── TICKER BANDEAU ──────────────────────────── */}
        {tickerText && (
          <div className="ticker-wrap">
            <div className="ticker-text">{tickerText}</div>
          </div>
        )}

        {/* ─── HEADER ──────────────────────────────────── */}
        <div className={`header ${headerModeClass}`}>
          <div className="header-icon">
            <BusIcon />
          </div>
          <h1>{titleText}</h1>
          <div className="header-brand">
            <div className="brand-logo-wrap">
              <Image src="/logo-full.png" alt="SmarticketS" width={120} height={40} className="brand-logo" />
            </div>
            <div className="brand-sub">GARE ROUTIÈRE</div>
          </div>
        </div>

        {/* ─── SLIDE WRAPPER ───────────────────────────── */}
        <div className="slide-wrapper">
          {/* Departures Panel */}
          <div className={departuresPanelClass}>
            <table className="schedule-table departures-panel">
              <thead>
                <tr>
                  <th className="col-time">HEURE</th>
                  <th className="col-dest">DESTINATION</th>
                  <th className="col-status">STATUT</th>
                </tr>
              </thead>
              <tbody>
                {departureRows.map(renderDepartureRow)}
                {renderEmptyRows(MAX_ROWS - departureRows.length)}
              </tbody>
            </table>
            <AnalogClock date={now} />
          </div>

          {/* Arrivals Panel */}
          <div className={arrivalsPanelClass}>
            <table className="schedule-table arrivals-panel">
              <thead>
                <tr>
                  <th className="col-time">HEURE</th>
                  <th className="col-dest">PROVENANCE</th>
                  <th className="col-status">STATUT</th>
                </tr>
              </thead>
              <tbody>
                {arrivalRows.map(renderArrivalRow)}
                {renderEmptyRows(MAX_ROWS - arrivalRows.length)}
              </tbody>
            </table>
            <AnalogClock date={now} />
          </div>
        </div>
      </div>

      {/* ─── PROGRESS BAR ────────────────────────────── */}
      <div
        className={`timer-bar ${boardModeClass}`}
        style={{ width: `${progressPercent}%` }}
      />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   CSS — LED Airport Display Styling (from user's index.html reference)
   ══════════════════════════════════════════════════════════════════════════ */
const LED_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Orbitron:wght@700;900&display=swap');

* { margin: 0; padding: 0; box-sizing: border-box; }

html, body {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #000;
  font-family: 'Share Tech Mono', monospace;
}

/* ─── BOARD ─────────────────────────────────────── */
.board {
  width: 100vw;
  height: 100vh;
  background: #000;
  position: relative;
  overflow: hidden;
  padding: 2vh 3vw;
  display: flex;
  flex-direction: column;
}

.board::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.6) 100%),
    repeating-linear-gradient(0deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 1px, transparent 1px, transparent 3px),
    repeating-linear-gradient(90deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 1px, transparent 1px, transparent 3px);
  pointer-events: none;
  z-index: 1;
}

.board-content {
  position: relative;
  z-index: 2;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* ─── TICKER ────────────────────────────────────── */
.ticker-wrap {
  background: #0a0a0a;
  border: 2px solid #333;
  border-top: none;
  padding: 0.8vh 2vw;
  overflow: hidden;
  flex-shrink: 0;
  margin-bottom: 1vh;
}

.ticker-text {
  display: inline-block;
  white-space: nowrap;
  animation: ticker-scroll 30s linear infinite;
  font-size: 2vh;
  color: #facc15;
  text-shadow: 0 0 10px rgba(250, 204, 21, 0.6);
  letter-spacing: 0.2vw;
}

@keyframes ticker-scroll {
  0% { transform: translateX(100vw); }
  100% { transform: translateX(-100%); }
}

/* ─── HEADER ────────────────────────────────────── */
.header {
  background: #0a0a0a;
  border-top: 6px solid #333;
  border-bottom: 6px solid #333;
  padding: 2vh 3vw;
  display: flex;
  align-items: center;
  gap: 2vw;
  transition: all 0.6s ease;
  flex-shrink: 0;
  position: relative;
}

.header-icon {
  width: 7vw;
  height: 7vw;
  max-width: 100px;
  max-height: 100px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.6s ease;
  flex-shrink: 0;
}

.header.departures-mode .header-icon {
  background: #00d4ff;
  box-shadow: 0 0 30px rgba(0, 212, 255, 0.8);
}

.header.arrivals-mode .header-icon {
  background: #f4a900;
  box-shadow: 0 0 30px rgba(244, 169, 0, 0.8);
}

.header h1 {
  font-family: 'Orbitron', sans-serif;
  font-size: 5vw;
  font-weight: 900;
  letter-spacing: 0.5vw;
  transition: all 0.6s ease;
  text-transform: uppercase;
  margin-right: auto;
}

.header.departures-mode h1 {
  color: #00d4ff;
  text-shadow: 0 0 20px rgba(0, 212, 255, 0.6);
}

.header.arrivals-mode h1 {
  color: #f4a900;
  text-shadow: 0 0 20px rgba(244, 169, 0, 0.6);
}

/* ─── BRAND / LOGO ──────────────────────────────── */
.header-brand {
  text-align: right;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.brand-logo-wrap {
  position: relative;
  width: 12vw;
  max-width: 160px;
  height: 5vh;
  max-height: 40px;
}

.brand-logo {
  object-fit: contain;
  width: 100%;
  height: 100%;
}

.brand-sub {
  font-family: 'Share Tech Mono', monospace;
  font-size: 1.2vw;
  color: #888;
  letter-spacing: 0.4vw;
  text-transform: uppercase;
  margin-top: 0.5vh;
}

/* ─── SLIDE CONTAINER ───────────────────────────── */
.slide-wrapper {
  flex: 1;
  position: relative;
  overflow: hidden;
  margin-top: 2vh;
  min-height: 0;
}

.slide-panel {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transition: transform 1s cubic-bezier(0.65, 0, 0.35, 1);
  display: flex;
  gap: 2vw;
  align-items: flex-start;
}

.slide-panel.active { transform: translateX(0); }
.slide-panel.left { transform: translateX(-110%); }
.slide-panel.right { transform: translateX(110%); }

/* ─── TABLE ────────────────────────────────────── */
.schedule-table {
  flex: 1;
  border-collapse: separate;
  border-spacing: 0 1vh;
  min-width: 0;
}

.schedule-table thead th {
  font-family: 'Orbitron', sans-serif;
  font-size: 2.2vw;
  text-transform: uppercase;
  font-weight: 700;
  text-align: left;
  padding: 1.5vh 2vw;
  letter-spacing: 0.3vw;
  border-bottom: 4px solid #333;
}

.departures-panel thead th {
  color: #00d4ff;
  text-shadow: 0 0 10px rgba(0, 212, 255, 0.4);
}

.arrivals-panel thead th {
  color: #f4a900;
  text-shadow: 0 0 10px rgba(244, 169, 0, 0.4);
}

.schedule-table tbody tr {
  height: 8vh;
}

.schedule-table td {
  padding: 1vh 2vw;
  font-size: 3.2vw;
  font-weight: bold;
  letter-spacing: 0.2vw;
  text-shadow: 0 0 10px currentColor;
  white-space: nowrap;
}

/* ─── DEPARTURES LED COLORS ────────────────────── */
.departures-panel .led-time {
  color: #ffffff;
  text-shadow: 0 0 10px rgba(255,255,255,0.7);
}
.departures-panel .led-dest {
  color: #00d4ff;
  text-shadow: 0 0 12px rgba(0, 212, 255, 0.7);
}
.departures-panel .status-ontime {
  color: #4ade80;
  text-shadow: 0 0 15px rgba(74, 222, 128, 0.8);
}
.departures-panel .status-boarding {
  color: #facc15;
  text-shadow: 0 0 15px rgba(250, 204, 21, 0.8);
}
.departures-panel .status-delayed {
  color: #ef4444;
  text-shadow: 0 0 15px rgba(239, 68, 68, 0.8);
  animation: blink-slow 1.5s infinite;
}
.departures-panel .status-canceled {
  color: #ef4444;
  text-shadow: 0 0 15px rgba(239, 68, 68, 0.9);
  text-decoration: line-through;
}
.departures-panel .status-departed {
  color: #666;
  text-shadow: none;
}

/* ─── ARRIVALS LED COLORS ──────────────────────── */
.arrivals-panel .led-time {
  color: #ffffff;
  text-shadow: 0 0 10px rgba(255,255,255,0.7);
}
.arrivals-panel .led-dest {
  color: #f4a900;
  text-shadow: 0 0 12px rgba(244, 169, 0, 0.7);
}
.arrivals-panel .status-ontime,
.arrivals-panel .status-arrived {
  color: #4ade80;
  text-shadow: 0 0 15px rgba(74, 222, 128, 0.8);
}
.arrivals-panel .status-boarding {
  color: #00d4ff;
  text-shadow: 0 0 15px rgba(0, 212, 255, 0.7);
}
.arrivals-panel .status-delayed {
  color: #ef4444;
  text-shadow: 0 0 15px rgba(239, 68, 68, 0.8);
  animation: blink-slow 1.5s infinite;
}
.arrivals-panel .status-departed {
  color: #666;
  text-shadow: none;
}

@keyframes blink-slow {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* ─── COLUMN WIDTHS ─────────────────────────────── */
.col-time { width: 12vw; }
.col-dest { width: auto; }
.col-status { width: 25vw; }

/* ─── EMPTY ROWS ────────────────────────────────── */
.empty-row td {
  color: #1a1a1a !important;
  text-shadow: none !important;
  letter-spacing: 0;
}

.empty-row .led-time {
  color: #444 !important;
  text-shadow: 0 0 3px rgba(255,255,255,0.2) !important;
}

/* ─── BLINKING COLON ────────────────────────────── */
.blink {
  animation: blink 1s infinite;
  display: inline-block;
}

@keyframes blink {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
}

/* ─── ANALOG CLOCK ──────────────────────────────── */
.clock-section {
  width: 22vw;
  max-width: 350px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2vh;
  flex-shrink: 0;
}

.analog-clock {
  width: 20vw;
  height: 20vw;
  max-width: 300px;
  max-height: 300px;
}

.clock-face {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 5px solid #666;
  background: radial-gradient(circle, #1a1a1a 0%, #000 100%);
  position: relative;
  box-shadow: 0 0 30px rgba(0,0,0,0.9), inset 0 0 30px rgba(0,0,0,0.6);
}

.clock-center {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 15px;
  height: 15px;
  background: #fff;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
  box-shadow: 0 0 8px #fff;
}

.hand {
  position: absolute;
  bottom: 50%;
  left: 50%;
  transform-origin: bottom center;
  background: #fff;
  border-radius: 3px;
}

.hour-hand { width: 6px; height: 25%; margin-left: -3px; }
.minute-hand { width: 4px; height: 38%; margin-left: -2px; }
.second-hand { width: 2px; height: 42%; margin-left: -1px; background: #f4a900; }

.tick {
  position: absolute;
  top: 5%;
  left: 50%;
  width: 2px;
  height: 6%;
  background: #888;
  transform-origin: 50% 850%;
  margin-left: -1px;
}
.tick.major { width: 3px; height: 9%; background: #fff; margin-left: -1.5px; }

.digital-date {
  font-family: 'Orbitron', sans-serif;
  font-size: 2vw;
  color: #fff;
  letter-spacing: 0.3vw;
  text-shadow: 0 0 10px rgba(255,255,255,0.5);
  text-align: center;
  width: 100%;
}

/* ─── TIMER BAR ────────────────────────────────── */
.timer-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 6px;
  transition: width 1s linear, background 0.6s ease;
  z-index: 3;
}

.departures-mode-active .timer-bar {
  background: linear-gradient(90deg, #00d4ff, #0099cc);
  box-shadow: 0 0 10px #00d4ff;
}

.arrivals-mode-active .timer-bar {
  background: linear-gradient(90deg, #f4a900, #cc8800);
  box-shadow: 0 0 10px #f4a900;
}

/* ─── LOADING SCREEN ────────────────────────────── */
.loading-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3vh;
}

.loading-text {
  font-family: 'Orbitron', sans-serif;
  font-size: 4vw;
  color: #00d4ff;
  text-shadow: 0 0 20px rgba(0, 212, 255, 0.6);
  letter-spacing: 0.5vw;
}

.loading-sub {
  font-size: 2vw;
  color: #888;
  letter-spacing: 0.3vw;
}

.notfound-icon {
  font-size: 8vw;
}

.loading-spinner {
  width: 5vw;
  height: 5vw;
  max-width: 60px;
  max-height: 60px;
  border: 4px solid #333;
  border-top-color: #00d4ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ─── RESPONSIVE ────────────────────────────────── */
@media (max-width: 1000px) {
  .header h1 { font-size: 8vw; }
  .header-icon { width: 12vw; height: 12vw; }
  .brand-logo-wrap { width: 20vw; max-width: 120px; }
  .brand-sub { font-size: 2vw; }
  .schedule-table td { font-size: 5vw; }
  .schedule-table thead th { font-size: 3vw; }
  .schedule-table tbody tr { height: 7vh; }
  .clock-section { display: none; }
  .ticker-text { font-size: 2.5vh; }
}

@media (max-width: 600px) {
  .board { padding: 1vh 2vw; }
  .header { padding: 1.5vh 2vw; gap: 3vw; }
  .header h1 { font-size: 10vw; }
  .schedule-table td { font-size: 6vw; }
  .schedule-table thead th { font-size: 4vw; padding: 1vh 1.5vw; }
  .schedule-table td { padding: 0.8vh 1.5vw; }
  .col-time { width: 18vw; }
  .col-status { width: 35vw; }
}
`;
