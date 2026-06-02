// @ts-nocheck
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
  buildArrivalIncomingText,
  buildArrivalArrivedText,
  buildArrivalDelayedText,
  buildArrivalCancelledText,
  buildArrivalDelayRepeatText,
} from '@/lib/audioSystem';

/* ══════════════════════════════════════════════════════════════════════════
   Signage Ad Type
   ══════════════════════════════════════════════════════════════════════════ */
interface SignageAd {
  id: string;
  title: string;
  mediaType: string;
  mediaUrl: string;
  videoUrl: string | null;
  imageUrl: string | null;
  mobileImageUrl: string | null;
  duration: number;
  interval: number;
  isActive: boolean;
  priority: number;
}

/* ══════════════════════════════════════════════════════════════════════════
   Types
   ══════════════════════════════════════════════════════════════════════════ */
interface Departure {
  id: string;
  lineNumber: string;
  destination: string;
  effectiveTime: string;
  scheduledTime: string;
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
const AD_SLIDE_DURATION = 60; // seconds for ads slide
const MAX_ROWS = 10;
const POLL_INTERVAL = 15000; // 15s
const ARRIVALS_BLOCK_DURATION = 10 * 60 * 1000; // 10 minutes in ms
const DEPARTURE_IMMINENT_THRESHOLD = 5 * 60 * 1000; // 5 minutes in ms
const DEPARTED_FADE_DURATION = 5 * 60 * 1000; // 5 minutes in ms — show PARTI rows before removing

/* ══════════════════════════════════════════════════════════════════════════
   Status Helpers
   ══════════════════════════════════════════════════════════════════════════ */
function getStatusInfo(status: string, delayMinutes: number, isArrival?: boolean) {
  switch (status) {
    case 'SCHEDULED':
      return { label: "À L'HEURE", cls: 'status-ontime' };
    case 'BOARDING':
      return { label: 'EMBARQUEMENT', cls: 'status-boarding blink-slow' };
    case 'IMMINENT':
      return { label: 'DÉPART IMMINENT', cls: 'status-imminent blink-fast' };
    case 'DELAYED':
      return { label: `RETARD +${delayMinutes} MIN`, cls: 'status-delayed blink-medium' };
    case 'CANCELLED':
      return { label: 'ANNULÉ', cls: 'status-cancelled' };
    case 'RESOLUTION_RETARD':
      return { label: 'RETARD RÉSOLU', cls: 'status-resolution-retard blink-slow' };
    case 'DEPARTED':
      return { label: 'PARTI', cls: 'status-departed' };
    case 'IMMINENT_ARRIVAL':
      return { label: 'ARRIVÉE IMMINENTE', cls: 'status-imminent-arrival blink-slow' };
    case 'ARRIVED':
      return { label: 'ARRIVÉ', cls: 'status-arrived blink-slow' };
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

  /* ─── Signage Ads state ─────────────────────────────── */
  const [signageAds, setSignageAds] = useState<SignageAd[]>([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);

  /* ─── Slide state ──────────────────────────────────── */
  const [currentMode, setCurrentMode] = useState<'departures' | 'arrivals' | 'ads'>('departures');
  const [timeRemaining, setTimeRemaining] = useState(SLIDE_DURATION);

  /* ─── Arrivals blocking state ──────────────────────── */
  const [arrivalsBlockedUntil, setArrivalsBlockedUntil] = useState<number>(0);

  /* ─── Refs ────────────────────────────────────────── */
  const rootRef = useRef<HTMLDivElement>(null);
  const cursorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const announcedRef = useRef<Set<string>>(new Set());
  const socketRef = useRef<Socket | null>(null);
  const generalMessageCleanupRef = useRef<(() => void) | null>(null);
  const departedTimersRef = useRef<Map<string, number>>(new Map()); // departureId → timestamp when marked DEPARTED

  /* ─── Departed fade tick: forces re-evaluation of visible departures ─── */
  const [departedFadeTick, setDepartedFadeTick] = useState(0);

  /* ─── Computed: active departures (show DEPARTED for 5 min then hide) ────── */
  const visibleDepartures = useMemo(() => {
    if (!data) return [];
    const nowMs = Date.now();
    // Force dependency on tick so this re-evaluates periodically
    void departedFadeTick;
    return data.departures.filter((d) => {
      if (d.status !== 'DEPARTED') return true;
      const departedAt = departedTimersRef.current.get(d.id);
      if (departedAt === undefined) {
        // If no timestamp recorded, record now and keep visible
        departedTimersRef.current.set(d.id, nowMs);
        return true;
      }
      // Remove if DEPARTED for longer than fade duration
      return (nowMs - departedAt) < DEPARTED_FADE_DURATION;
    });
  }, [data, departedFadeTick]);

  const visibleArrivals = useMemo(() => {
    if (!data) return [];
    return data.arrivals.filter((a) => a.status !== 'DEPARTED');
  }, [data]);

  /* ─── Computed: is any departure imminent (within 5 min)? ─── */
  const hasImminentDeparture = useMemo(() => {
    if (!data) return false;
    const nowMs = Date.now();
    return data.departures.some((d) => {
      if (d.status === 'DEPARTED' || d.status === 'CANCELLED') return false;
      // Parse effectiveTime (HH:MM) to today's timestamp
      const [h, m] = d.effectiveTime.split(':').map(Number);
      const effective = new Date();
      effective.setHours(h, m, 0, 0);
      const diff = effective.getTime() - nowMs;
      // Within 5 minutes before or 5 minutes after the scheduled departure
      return diff >= -5 * 60 * 1000 && diff <= DEPARTURE_IMMINENT_THRESHOLD;
    });
  }, [data, now]);

  /* ─── Computed: are arrivals currently blocked? ─── */
  const isArrivalsBlocked = useMemo(() => {
    return Date.now() < arrivalsBlockedUntil;
  }, [arrivalsBlockedUntil, now]);

  /* ─── Computed: current slide duration based on mode ─── */
  const currentSlideDuration = currentMode === 'ads' ? AD_SLIDE_DURATION : SLIDE_DURATION;

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

  /* ─── Departed fade tick (every 5s) — re-evaluate which DEPARTED rows to hide ─── */
  useEffect(() => {
    const id = setInterval(() => {
      setDepartedFadeTick((t) => t + 1);
    }, 5000);
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

  /* ─── Slide sequence based on blocking and ads availability ─── */
  const slideSequence = useMemo(() => {
    const hasAds = signageAds.length > 0;
    const blocked = isArrivalsBlocked;
    if (!hasAds && blocked) return ['departures'] as const;
    if (!hasAds && !blocked) return ['departures', 'arrivals'] as const;
    if (hasAds && blocked) return ['departures', 'ads'] as const;
    return ['departures', 'ads', 'arrivals'] as const;
  }, [signageAds.length, isArrivalsBlocked]);

  /* ─── Switch mode function ─────────────────────────── */
  const switchMode = useCallback(() => {
    setCurrentMode((prev) => {
      const seq = slideSequence;
      const idx = seq.indexOf(prev);
      const nextIdx = (idx + 1) % seq.length;
      const next = seq[nextIdx];
      setTimeRemaining(next === 'ads' ? AD_SLIDE_DURATION : SLIDE_DURATION);
      if (next === 'ads' && signageAds.length > 1) {
        setCurrentAdIndex((i) => (i + 1) % signageAds.length);
      }
      return next;
    });
  }, [slideSequence, signageAds.length]);

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

  /* ─── Fetch signage ads ──────────────────────────── */
  useEffect(() => {
    const fetchAds = async () => {
      try {
        const res = await fetch('/api/signage-ads');
        if (res.ok) {
          const ads = await res.json();
          // Filter: only keep ads that have at least one valid media URL
          const validAds = (Array.isArray(ads) ? ads : []).filter(
            (ad: SignageAd) =>
              (ad.imageUrl && ad.imageUrl.trim()) ||
              (ad.videoUrl && ad.videoUrl.trim()) ||
              (ad.mediaUrl && ad.mediaUrl.trim()) ||
              (ad.mobileImageUrl && ad.mobileImageUrl.trim())
          );
          setSignageAds(validAds);
        }
      } catch {
        // silent
      }
    };
    fetchAds();
    const id = setInterval(fetchAds, 60000); // refresh every 60s
    return () => clearInterval(id);
  }, []);

  /* ─── Auto-block arrivals when departure imminent ────────────────── */
  useEffect(() => {
    if (!hasImminentDeparture) return;
    const nowMs = Date.now();
    if (nowMs < arrivalsBlockedUntil) return; // already blocked
    setArrivalsBlockedUntil(nowMs + ARRIVALS_BLOCK_DURATION);
    // Force switch to departures if currently showing arrivals
    setCurrentMode((prev) => (prev === 'arrivals' ? 'departures' : prev));
  }, [hasImminentDeparture, arrivalsBlockedUntil]);

  /* ─── Slide timer ──────────────────────────────────── */
  useEffect(() => {
    const id = setInterval(() => {
      setTimeRemaining((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          setTimeout(() => switchMode(), 0);
          return currentSlideDuration;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [switchMode, currentSlideDuration]);

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

          // Audio alerts for boarding departures (use departureKey to prevent duplicates)
          if (json.alertSoundEnabled !== false) {
            for (const dep of json.departures) {
              if (dep.shouldPlayAlert && !announcedRef.current.has(dep.id)) {
                announcedRef.current.add(dep.id);
                const dedupKey = `${dep.id}:alert`;
                addToQueue(
                  `Madame, Monsieur, les passagers en direction de ${dep.destination} sont priés de monter à bord. Le bus va partir à ${dep.effectiveTime}. Quai ${dep.platform}.`,
                  AnnouncementPriority.MEDIUM,
                  undefined,
                  dedupKey
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

  /* ─── Auto Phase Detection ─────────────────── */
  useEffect(() => {
    if (!data) return;

    const checkPhases = () => {
      const now = new Date();
      const announced = announcedRef.current;

      for (const dep of data.departures) {
        if (dep.status === 'DEPARTED' || dep.status === 'CANCELLED') continue;

        const scheduledTime = new Date(dep.scheduledTime);
        const diffMs = scheduledTime.getTime() - now.getTime();
        const diffMin = diffMs / 60000;

        // Phase 1: EMBARQUEMENT (T-15 min)
        if (diffMin <= 15 && diffMin > 2 && dep.status === 'SCHEDULED') {
          const key = `${dep.id}:boarding`;
          if (!announced.has(key)) {
            announced.add(key);
            setData(prev => prev ? {
              ...prev,
              departures: prev.departures.map(d =>
                d.id === dep.id ? { ...d, status: 'BOARDING' } : d
              )
            } : prev);
            addToQueue(
              `Madame, Monsieur, le bus à destination de ${dep.destination} est en cours d'embarquement. Le bus va partir à ${dep.effectiveTime}.`,
              AnnouncementPriority.MEDIUM,
              undefined,
              key
            );
          }
        }

        // Phase 2: DÉPART IMMINENT (T-2 min) — also allow DELAYED departures
        if (diffMin <= 2 && diffMin > -5 && dep.status !== 'DEPARTED' && dep.status !== 'CANCELLED' && dep.status !== 'RESOLUTION_RETARD') {
          const key = `${dep.id}:imminent`;
          if (!announced.has(key)) {
            announced.add(key);
            setData(prev => prev ? {
              ...prev,
              departures: prev.departures.map(d =>
                d.id === dep.id ? { ...d, status: 'IMMINENT' } : d
              )
            } : prev);
            addToQueue(
              `Madame, Monsieur, attention. Le bus à destination de ${dep.destination} va partir dans deux minutes. Merci de monter à bord immédiatement.`,
              AnnouncementPriority.CRITICAL,
              undefined,
              key
            );
          }
        }

        // Phase 3: RETARD (T+5 min without departure)
        if (diffMin < -5 && dep.status === 'SCHEDULED') {
          const key = `${dep.id}:autodelay`;
          if (!announced.has(key)) {
            announced.add(key);
            setData(prev => prev ? {
              ...prev,
              departures: prev.departures.map(d =>
                d.id === dep.id ? { ...d, status: 'DELAYED', delayMinutes: Math.abs(Math.round(diffMin)) } : d
              )
            } : prev);
            const delayMins = Math.abs(Math.round(diffMin));
            addToQueue(
              `Madame, Monsieur, le bus en direction de ${dep.destination} est en retard de ${delayMins} minutes, merci de patienter.`,
              AnnouncementPriority.HIGH,
              undefined,
              key
            );
          }
        }
      }
    };

    checkPhases();
    const id = setInterval(checkPhases, 30000); // Check every 30 seconds
    return () => clearInterval(id);
  }, [data]);

  /* ─── Delay Repeat Timer (every 5min) ─────────────────── */
  useEffect(() => {
    if (!data) return;

    const repeatDelayAnnouncements = () => {
      if (!data) return;
      const announced = announcedRef.current;

      for (const dep of data.departures) {
        if (dep.status === 'DELAYED') {
          // Use timestamp-based key to allow repeat (different from one-time key)
          const repeatKey = `${dep.id}:delayrepeat:${Math.floor(Date.now() / 300000)}`;
          if (!announced.has(repeatKey)) {
            announced.add(repeatKey);
            addToQueue(
              `Madame, Monsieur, le bus en direction de ${dep.destination} est toujours en retard. Nous vous prions de patienter.`,
              AnnouncementPriority.NORMAL,
              undefined,
              repeatKey
            );
          }
        }
      }
    };

    repeatDelayAnnouncements();
    const id = setInterval(repeatDelayAnnouncements, 300000); // every 5 minutes
    return () => clearInterval(id);
  }, [data]);

  /* ─── Arrival Auto Phase Detection ─────────────────── */
  useEffect(() => {
    if (!data) return;

    const checkArrivalPhases = () => {
      const now = new Date();
      const announced = announcedRef.current;

      for (const arr of data.arrivals) {
        if (arr.status === 'DEPARTED' || arr.status === 'CANCELLED') continue;

        // Parse scheduledTime from API (HH:MM string) to today's date
        const [h, m] = arr.effectiveTime.split(':').map(Number);
        const effective = new Date();
        effective.setHours(h, m, 0, 0);
        const diffMs = effective.getTime() - now.getTime();
        const diffMin = diffMs / 60000;

        // Phase 1: ARRIVÉE IMMINENTE (H-10 min)
        if (diffMin <= 10 && diffMin > 0 && arr.status === 'SCHEDULED') {
          const key = `${arr.id}:arrival_incoming`;
          if (!announced.has(key)) {
            announced.add(key);
            setData(prev => prev ? {
              ...prev,
              arrivals: prev.arrivals.map(a =>
                a.id === arr.id ? { ...a, status: 'IMMINENT_ARRIVAL' } : a
              )
            } : prev);
            addToQueue(
              buildArrivalIncomingText(arr.originStationName, arr.platform),
              AnnouncementPriority.NORMAL,
              undefined,
              key
            );
          }
        }

        // Phase 2: Auto-delay for arrivals (H+10min without arrival)
        if (diffMin < -10 && arr.status === 'SCHEDULED') {
          const key = `${arr.id}:arrival_autodelay`;
          if (!announced.has(key)) {
            announced.add(key);
            const delayMins = Math.abs(Math.round(diffMin));
            setData(prev => prev ? {
              ...prev,
              arrivals: prev.arrivals.map(a =>
                a.id === arr.id ? { ...a, status: 'DELAYED', delayMinutes: delayMins } : a
              )
            } : prev);
            addToQueue(
              buildArrivalDelayedText(arr.originStationName, delayMins),
              AnnouncementPriority.HIGH,
              undefined,
              key
            );
          }
        }
      }
    };

    checkArrivalPhases();
    const id = setInterval(checkArrivalPhases, 30000); // Check every 30 seconds
    return () => clearInterval(id);
  }, [data]);

  /* ─── Arrival Delay Repeat Timer (every 5min) ────────── */
  useEffect(() => {
    if (!data) return;

    const repeatArrivalDelayAnnouncements = () => {
      if (!data) return;
      const announced = announcedRef.current;

      for (const arr of data.arrivals) {
        if (arr.status === 'DELAYED') {
          // Use timestamp-based key to allow repeat (different from one-time key)
          const repeatKey = `${arr.id}:arrival_delayrepeat:${Math.floor(Date.now() / 300000)}`;
          if (!announced.has(repeatKey)) {
            announced.add(repeatKey);
            addToQueue(
              buildArrivalDelayRepeatText(arr.originStationName),
              AnnouncementPriority.HIGH,
              undefined,
              repeatKey
            );
          }
        }
      }
    };

    repeatArrivalDelayAnnouncements();
    const id = setInterval(repeatArrivalDelayAnnouncements, 300000); // every 5 minutes
    return () => clearInterval(id);
  }, [data]);

  /* ─── WebSocket connection ────────────────────────── */
  useEffect(() => {
    if (!slug) return;

    const socket = io('/?XTransformPort=3004');
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join:station', { slug, role: 'kiosk' });
    });

    socket.on('kiosk:delay', (payload: { departureId: string; minutes: number; destination: string; timestamp: number }) => {
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
        AnnouncementPriority.HIGH,
        undefined,
        `${payload.departureId}:delay`
      );
    });

    socket.on('kiosk:departed', (payload: { departureId: string; destination: string; timestamp: number }) => {
      // Record the departure timestamp for the 5-minute fade timer
      departedTimersRef.current.set(payload.departureId, Date.now());
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
        AnnouncementPriority.CRITICAL,
        undefined,
        `${payload.departureId}:departed`
      );
    });

    socket.on('kiosk:cancelled', (payload: { departureId: string; destination: string; timestamp: number }) => {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          departures: prev.departures.map((d) =>
            d.id === payload.departureId ? { ...d, status: 'CANCELLED' } : d
          ),
        };
      });
      addToQueue(
        `Attention, le départ en direction de ${payload.destination} est annulé. Nous nous excusons pour la gêne occasionnée.`,
        AnnouncementPriority.HIGH,
        undefined,
        `${payload.departureId}:cancelled`
      );
    });

    socket.on('kiosk:boarding', (payload: { departureId: string; destination: string; scheduledTime: string; platform: string | null; timestamp: number }) => {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          departures: prev.departures.map((d) =>
            d.id === payload.departureId ? { ...d, status: 'BOARDING' } : d
          ),
        };
      });
      addToQueue(
        `Madame, Monsieur, le bus à destination de ${payload.destination} est en cours d'embarquement. Le bus va partir à ${payload.scheduledTime}.`,
        AnnouncementPriority.MEDIUM,
        undefined,
        `${payload.departureId}:boarding`
      );
    });

    socket.on('kiosk:imminent', (payload: { departureId: string; destination: string; timestamp: number }) => {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          departures: prev.departures.map((d) =>
            d.id === payload.departureId ? { ...d, status: 'IMMINENT' } : d
          ),
        };
      });
      addToQueue(
        `Madame, Monsieur, attention. Le bus à destination de ${payload.destination} va partir dans deux minutes. Merci de monter à bord immédiatement.`,
        AnnouncementPriority.CRITICAL,
        undefined,
        `${payload.departureId}:imminent`
      );
    });

    socket.on('kiosk:resolutionDelay', (payload: { departureId: string; destination: string; timestamp: number }) => {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          departures: prev.departures.map((d) =>
            d.id === payload.departureId ? { ...d, status: 'RESOLUTION_RETARD', delayMinutes: 0 } : d
          ),
        };
      });
      addToQueue(
        `Merci de votre patience, le bus en direction de ${payload.destination} va partir. Merci de monter à bord.`,
        AnnouncementPriority.HIGH,
        undefined,
        `${payload.departureId}:resolution`
      );
    });

    // ── Arrival WebSocket handlers ──
    socket.on('kiosk:arrivalArrived', (payload: { arrivalId: string; origin: string; platform: string | null; timestamp: number }) => {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          arrivals: prev.arrivals.map((a) =>
            a.id === payload.arrivalId ? { ...a, status: 'ARRIVED' } : a
          ),
        };
      });
      const key = `${payload.arrivalId}:arrived`;
      announcedRef.current.delete(`${payload.arrivalId}:arrival_incoming`); // clear incoming dedup
      announcedRef.current.delete(`${payload.arrivalId}:arrival_autodelay`); // clear delay dedup
      addToQueue(
        buildArrivalArrivedText(payload.origin, payload.platform),
        AnnouncementPriority.HIGH,
        undefined,
        key
      );
    });

    socket.on('kiosk:arrivalDelayed', (payload: { arrivalId: string; origin: string; minutes: number; timestamp: number }) => {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          arrivals: prev.arrivals.map((a) =>
            a.id === payload.arrivalId ? { ...a, status: 'DELAYED', delayMinutes: payload.minutes } : a
          ),
        };
      });
      addToQueue(
        buildArrivalDelayedText(payload.origin, payload.minutes),
        AnnouncementPriority.HIGH,
        undefined,
        `${payload.arrivalId}:arrival_delayed`
      );
    });

    socket.on('kiosk:arrivalCancelled', (payload: { arrivalId: string; origin: string; scheduledTime: string; timestamp: number }) => {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          arrivals: prev.arrivals.map((a) =>
            a.id === payload.arrivalId ? { ...a, status: 'CANCELLED' } : a
          ),
        };
      });
      addToQueue(
        buildArrivalCancelledText(payload.origin, payload.scheduledTime),
        AnnouncementPriority.HIGH,
        undefined,
        `${payload.arrivalId}:arrival_cancelled`
      );
    });

    socket.on('kiosk:generalMessage', (payload: { text: string; priority: number; timestamp: number }) => {
      // Play the general announcement via TTS immediately
      addToQueue(payload.text, AnnouncementPriority.LOW, undefined, `gm:${payload.timestamp}`);
      // Also show on ticker for visual display
      setData((prev) => {
        if (!prev) return prev;
        const newTicker: TickerMessage = {
          id: `gm-${payload.timestamp}`,
          text: payload.text,
          priority: 'info',
          active: true,
        };
        return {
          ...prev,
          tickerMessages: [...prev.tickerMessages, newTicker],
        };
      });
    });

    socket.on('kiosk:config', (config: { volume?: number; muted?: boolean; generalMessage?: string; generalMessageInterval?: number }) => {
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

    socket.on('kiosk:manualAnnounce', (payload: { text: string; priority?: number; timestamp: number }) => {
      // Map payload.priority to AnnouncementPriority and queue
      const priority = AnnouncementPriority[(payload.priority as keyof typeof AnnouncementPriority)] || AnnouncementPriority.HIGH;
      addToQueue(payload.text, priority, undefined, `ma:${payload.timestamp}`);
      // Also show on ticker for visual display
      setData((prev) => {
        if (!prev) return prev;
        const newTicker: TickerMessage = {
          id: `ma-${payload.timestamp}`,
          text: payload.text,
          priority: 'urgent',
          active: true,
        };
        return {
          ...prev,
          tickerMessages: [...prev.tickerMessages, newTicker],
        };
      });
    });

    socket.on('kiosk:updateTrip', (payload: { departureId: string; status: string; delayMinutes?: number; timestamp: number }) => {
      // Update departure status in state based on payload.status
      setData((prev) => {
        if (!prev) return prev;
        const update: Partial<Departure> = { status: payload.status };
        if (typeof payload.delayMinutes === 'number') {
          update.delayMinutes = payload.delayMinutes;
        }
        // If transitioning to DEPARTED, record the timestamp for fade timer
        if (payload.status === 'DEPARTED') {
          departedTimersRef.current.set(payload.departureId, Date.now());
        }
        return {
          ...prev,
          departures: prev.departures.map((d) =>
            d.id === payload.departureId ? { ...d, ...update } : d
          ),
        };
      });
    });

    socket.on('disconnect', () => {
      // silently disconnect
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [slug]);

  /* ─── Render Ad Slide ────────────────────────────── */
  const renderAdSlide = () => {
    if (signageAds.length === 0) return null;
    const ad = signageAds[currentAdIndex % signageAds.length];
    const adImageUrl = ad.imageUrl || ad.mobileImageUrl || ad.mediaUrl || '';
    const isVideo = ad.mediaType === 'VIDEO' && ad.videoUrl;

    return (
      <div className={`slide-panel ${currentMode === 'ads' ? 'active' : 'left'} ads-panel`}>
        <div className="ads-content">
          <div className="ads-badge">PUBLICITÉ</div>
          {isVideo ? (
            <video
              key={ad.id}
              src={ad.videoUrl}
              autoPlay
              muted
              loop
              playsInline
              className="ads-media"
            />
          ) : adImageUrl ? (
            <div style={{ position: 'relative', width: '80%', maxWidth: 'min(900px, 85vw)', aspectRatio: '16/9' }}>
              <Image
                key={ad.id}
                src={adImageUrl}
                alt={ad.title}
                fill
                className="ads-media"
                style={{ objectFit: 'contain' }}
                unoptimized
              />
            </div>
          ) : (
            <div className="ads-placeholder">
              <p className="ads-placeholder-text">{ad.title}</p>
            </div>
          )}
          {ad.title && !isVideo && (
            <div className="ads-caption">
              <span className="ads-caption-text">{ad.title}</span>
            </div>
          )}
          {signageAds.length > 1 && (
            <div className="ads-dots">
              {signageAds.map((_, idx) => (
                <div
                  key={idx}
                  className={`ads-dot ${idx === currentAdIndex % signageAds.length ? 'ads-dot-active' : ''}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  /* ─── Progress bar % ───────────────────────────────── */
  const progressPercent = ((currentSlideDuration - timeRemaining) / currentSlideDuration) * 100;

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
  const isArrivalsMode = currentMode === 'arrivals';
  const isAdsMode = currentMode === 'ads';
  const boardModeClass = isDeparturesMode ? 'departures-mode-active' : isArrivalsMode ? 'arrivals-mode-active' : 'ads-mode-active';
  const headerModeClass = isDeparturesMode ? 'departures-mode' : isArrivalsMode ? 'arrivals-mode' : 'ads-mode';
  const departuresPanelClass = isDeparturesMode ? 'slide-panel departures-panel active' : 'slide-panel departures-panel left';
  const arrivalsPanelClass = isArrivalsMode ? 'slide-panel arrivals-panel active' : 'slide-panel arrivals-panel left';
  const titleText = isDeparturesMode ? 'DÉPARTS' : isArrivalsMode ? 'ARRIVÉES' : 'PUBLICITÉ';
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
            <div className="brand-sub">SmarticketS Gare Routière</div>
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

          {/* Ads Panel */}
          {renderAdSlide()}

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
  font-size: clamp(12px, 2vh, 28px);
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
  font-size: clamp(20px, 5vw, 80px);
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
  font-size: clamp(10px, 1.2vw, 18px);
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
  table-layout: fixed;
  width: 100%;
}

.schedule-table thead th {
  font-family: 'Orbitron', sans-serif;
  font-size: clamp(11px, 2.2vw, 30px);
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
  height: clamp(5.5vh, 7.5vh, 8vh);
}

.schedule-table td {
  padding: 1vh 2vw;
  font-size: clamp(14px, 3.2vw, 44px);
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
.departures-panel .status-imminent {
  color: #ef4444;
  text-shadow: 0 0 20px rgba(239, 68, 68, 0.9);
  animation: blink-fast 0.5s infinite;
  font-weight: 900;
}
.departures-panel .status-delayed {
  color: #f97316;
  text-shadow: 0 0 15px rgba(249, 115, 22, 0.8);
  animation: blink-medium 1s infinite;
}
.departures-panel .status-cancelled {
  color: #ef4444;
  text-shadow: 0 0 15px rgba(239, 68, 68, 0.9);
  text-decoration: line-through;
}
.departures-panel .status-resolution-retard {
  color: #4ade80;
  text-shadow: 0 0 15px rgba(74, 222, 128, 0.8);
  animation: blink-slow 1.5s infinite;
}
.departures-panel .status-departed {
  color: #666;
  text-shadow: none;
  text-decoration: line-through;
  opacity: 0.6;
}
.departures-panel .status-imminent-arrival {
  color: #00d4ff;
  text-shadow: 0 0 15px rgba(0, 212, 255, 0.8);
}
.departures-panel .status-arrived {
  color: #4ade80;
  text-shadow: 0 0 15px rgba(74, 222, 128, 0.8);
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
.arrivals-panel .status-ontime {
  color: #4ade80;
  text-shadow: 0 0 15px rgba(74, 222, 128, 0.8);
}
.arrivals-panel .status-arrived {
  color: #4ade80;
  text-shadow: 0 0 15px rgba(74, 222, 128, 0.8);
  animation: blink-slow 1.5s infinite;
}
.arrivals-panel .status-boarding {
  color: #00d4ff;
  text-shadow: 0 0 15px rgba(0, 212, 255, 0.7);
}
.arrivals-panel .status-imminent {
  color: #ef4444;
  text-shadow: 0 0 20px rgba(239, 68, 68, 0.9);
  animation: blink-fast 0.5s infinite;
  font-weight: 900;
}
.arrivals-panel .status-delayed {
  color: #ef4444;
  text-shadow: 0 0 15px rgba(239, 68, 68, 0.8);
  animation: blink-medium 1s infinite;
}
.arrivals-panel .status-departed {
  color: #666;
  text-shadow: none;
}
.arrivals-panel .status-imminent-arrival {
  color: #00d4ff;
  text-shadow: 0 0 15px rgba(0, 212, 255, 0.8);
}
.arrivals-panel .status-cancelled {
  color: #ef4444;
  text-shadow: 0 0 15px rgba(239, 68, 68, 0.9);
  text-decoration: line-through;
}
.arrivals-panel .status-resolution-retard {
  color: #4ade80;
  text-shadow: 0 0 15px rgba(74, 222, 128, 0.8);
  animation: blink-slow 1.5s infinite;
}

/* ─── 3-LEVEL BLINKING SYSTEM ─── */
/* Slow blink (1.5s) — EMBARQUEMENT (boarding) */
.blink-slow {
  animation: blink-slow 1.5s infinite;
}
@keyframes blink-slow {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

/* Medium blink (1s) — RETARD (delayed) */
.blink-medium {
  animation: blink-medium 1s infinite;
}
@keyframes blink-medium {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.2; }
}

/* Fast blink (0.5s) — DÉPART IMMINENT (imminent) */
.blink-fast {
  animation: blink-fast 0.5s infinite;
}
@keyframes blink-fast {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.1; }
}

/* ─── ADS SLIDE ──────────────────────────────── */
.ads-panel {
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ads-content {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 4vh 4vw;
}
.ads-badge {
  font-family: 'Orbitron', sans-serif;
  font-size: 1.2vw;
  color: #888;
  letter-spacing: 0.3vw;
  text-transform: uppercase;
  margin-bottom: 2vh;
  border: 1px solid #333;
  padding: 0.5vh 2vw;
}
.ads-media {
  max-width: 85%;
  max-height: 70vh;
  border-radius: 12px;
  object-fit: contain;
  box-shadow: 0 0 40px rgba(255,255,255,0.1);
}
.ads-placeholder {
  width: 70vw;
  height: 50vh;
  border: 3px dashed #333;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ads-placeholder-text {
  font-family: 'Share Tech Mono', monospace;
  font-size: 3vw;
  color: #555;
  text-align: center;
}
.ads-caption {
  margin-top: 2vh;
  text-align: center;
}
.ads-caption-text {
  font-family: 'Share Tech Mono', monospace;
  font-size: 2vw;
  color: #ccc;
  text-shadow: 0 0 10px rgba(255,255,255,0.3);
  letter-spacing: 0.1vw;
}
.ads-dots {
  display: flex;
  gap: 1vw;
  margin-top: 2vh;
}
.ads-dot {
  width: 1.2vw;
  height: 1.2vw;
  max-width: 12px;
  max-height: 12px;
  border-radius: 50%;
  background: #333;
  transition: all 0.3s ease;
}
.ads-dot-active {
  background: #22c55e;
  box-shadow: 0 0 10px rgba(34,197,94,0.6);
}

/* ─── ARRIVALS BLOCKED BANNER ──────────────────── */
.arrivals-blocked-banner {
  background: linear-gradient(90deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05));
  border: 1px solid rgba(239,68,68,0.4);
  border-top: none;
  padding: 0.8vh 2vw;
  text-align: center;
  flex-shrink: 0;
  margin-bottom: 1vh;
}
.arrivals-blocked-text {
  font-family: 'Share Tech Mono', monospace;
  font-size: 1.6vh;
  color: #ef4444;
  letter-spacing: 0.2vw;
  animation: blink-medium 1s infinite;
}

/* ─── ADS MODE HEADER ─────────────────────────── */
.header.ads-mode {
  border-top-color: #22c55e;
  border-bottom-color: #22c55e;
}
.header.ads-mode .header-icon {
  background: #22c55e;
  box-shadow: 0 0 30px rgba(34,197,94,0.8);
}
.header.ads-mode h1 {
  color: #22c55e;
  text-shadow: 0 0 20px rgba(34,197,94,0.6);
}
.board.ads-mode-active .timer-bar {
  background: linear-gradient(90deg, #22c55e, #16a34a);
}

/* ─── COLUMN WIDTHS ─────────────────────────────── */
.col-time { width: 12vw; }
.col-dest { width: auto; }
.col-status { width: 25vw; overflow: hidden; text-overflow: ellipsis; }

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

/* Tablet & mid-screens: hide analog clock, tighter rows, max 7 rows */
@media (max-width: 1200px) {
  .clock-section { display: none; }
  .schedule-table tbody tr { height: 6.5vh; }
  .schedule-table tbody tr:nth-child(n+8) { display: none; }
  .header h1 { font-size: clamp(20px, 4.5vw, 72px); }
  .schedule-table thead th { font-size: clamp(11px, 2vw, 26px); }
  .schedule-table td { font-size: clamp(14px, 3vw, 40px); }
  .col-status { width: 22vw; }
}

/* Mobile: compact layout, max 5 visible rows, truncate status */
@media (max-width: 768px) {
  .board { padding: 1vh 1.5vw; }
  .header {
    padding: 1vh 1.5vw;
    gap: 1.5vw;
    border-top-width: 4px;
    border-bottom-width: 4px;
  }
  .header h1 { font-size: clamp(18px, 7vw, 56px); letter-spacing: 0.2vw; }
  .header-icon { width: 8vw; height: 8vw; min-width: 32px; min-height: 32px; }
  .brand-logo-wrap { width: 15vw; max-width: 80px; height: 3vh; }
  .brand-sub { font-size: clamp(8px, 2.5vw, 14px); }
  .schedule-table { border-spacing: 0 0.5vh; }
  .schedule-table thead th {
    font-size: clamp(10px, 3vw, 22px);
    padding: 0.6vh 1.5vw;
    letter-spacing: 0.1vw;
  }
  .schedule-table td {
    font-size: clamp(11px, 4.5vw, 32px);
    padding: 0.4vh 1.5vw;
    letter-spacing: 0.05vw;
  }
  .schedule-table tbody tr { height: 5.5vh; }
  .schedule-table tbody tr:nth-child(n+6) { display: none; }
  .col-time { width: 16vw; }
  .col-status { width: 30vw; font-size: clamp(9px, 3.5vw, 24px) !important; }
  .ticker-text { font-size: clamp(10px, 2.5vh, 22px); }
  .ticker-wrap { padding: 0.5vh 1.5vw; margin-bottom: 0.5vh; }
  .arrivals-blocked-banner { padding: 0.5vh 1.5vw; }
  .arrivals-blocked-text { font-size: clamp(8px, 1.8vh, 18px); }
  .slide-wrapper { margin-top: 1vh; }
  .ads-badge { font-size: clamp(9px, 2vw, 16px); padding: 0.4vh 1.5vw; }
  .ads-caption-text { font-size: clamp(10px, 2.5vw, 20px); }
  .ads-placeholder { width: 85vw; height: 40vh; }
  .loading-text { font-size: clamp(16px, 6vw, 48px); }
  .loading-sub { font-size: clamp(10px, 3vw, 24px); }
}

/* Small mobile: ultra-compact, hide brand */
@media (max-width: 480px) {
  .board { padding: 0.5vh 1vw; }
  .header { padding: 0.8vh 1vw; border-top-width: 3px; border-bottom-width: 3px; }
  .header-icon { width: 10vw; height: 10vw; min-width: 28px; min-height: 28px; border-radius: 8px; }
  .header-brand { display: none; }
  .schedule-table thead th {
    font-size: clamp(9px, 3.5vw, 18px);
    padding: 0.4vh 1vw;
    border-bottom-width: 2px;
  }
  .schedule-table td {
    font-size: clamp(10px, 5.5vw, 28px);
    padding: 0.3vh 1vw;
  }
  .schedule-table tbody tr { height: 5vh; }
  .col-time { width: 18vw; }
  .col-status { width: 35vw; font-size: clamp(8px, 4vw, 20px) !important; }
  .ticker-wrap { padding: 0.4vh 1vw; }
  .ticker-text { font-size: clamp(9px, 2vh, 18px); }
}
`;
