'use client';

import { useState, useEffect, useRef, memo, useMemo, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import {
  playDingDong,
  playBoardingAnnouncement,
  cancelAnnouncements,
  preloadVoices,
} from '@/lib/audioSystem';

/* ══════════════════════════════════════════════════════════════════════════
   Types
   ══════════════════════════════════════════════════════════════════════════ */
interface Departure {
  id: string;
  departureType: string;
  lineNumber: string;
  origin: string;
  destination: string;
  destinationStationName: string;
  scheduledTime: string;
  effectiveTime: string;
  platform: string | null;
  status: string;
  delayMinutes: number;
  countdownMin: number;
  shouldPlayAlert: boolean;
  availableSeats: number;
  totalSeats: number;
}

interface Arrival {
  id: string;
  lineNumber: string;
  origin: string;
  originStationName: string;
  destination: string;
  scheduledTime: string;
  effectiveTime: string;
  platform: string | null;
  status: string;
  delayMinutes: number;
}

interface TickerMessage {
  id?: string;
  text: string;
  priority: 'info' | 'urgent';
  active: boolean;
}

interface StationData {
  stationId: string;
  stationName: string;
  city: string;
  slug: string;
  currentTime: string;
  currentDate: string;
  departures: Departure[];
  arrivals: Arrival[];
  alertSoundEnabled: boolean;
  tickerMessages: TickerMessage[];
  logoUrl: string;
  nextDayPreview?: {
    id: string;
    time: string;
    destination: string;
    lineNumber: string;
    isNextDay: boolean;
  }[];
  nextDayFirstDeparture?: string | null;
}

interface SignageAd {
  id: string;
  title: string;
  mediaType: 'IMAGE' | 'VIDEO';
  mediaUrl: string;
  videoUrl: string | null;
  imageUrl: string | null;
  mobileImageUrl: string | null;
  duration: number;
  interval: number;
  isActive: boolean;
  priority: number;
  startDate: string;
  endDate: string | null;
  views: number;
  createdBy: string;
}

/* ══════════════════════════════════════════════════════════════════════════
   YouTube URL Detection
   ══════════════════════════════════════════════════════════════════════════ */
function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match)
      return `https://www.youtube.com/embed/${match[1]}?autoplay=1&mute=1&loop=1&playlist=${match[1]}&controls=0&rel=0&playsinline=1`;
  }
  return null;
}

/* ══════════════════════════════════════════════════════════════════════════
   Status Helpers
   ══════════════════════════════════════════════════════════════════════════ */
function getStatusLabel(status: string, delayMinutes: number): string {
  switch (status) {
    case 'SCHEDULED':
      return "\u00C0 l'heure";
    case 'BOARDING':
      return 'EMBARQUEMENT';
    case 'DEPARTED':
      return 'Parti';
    case 'CANCELLED':
      return 'Annul\u00E9';
    case 'DELAYED':
      return `Retard ${delayMinutes} min`;
    default:
      return status;
  }
}

function getStatusClass(status: string): string {
  switch (status) {
    case 'SCHEDULED':
      return 'sps-status--green';
    case 'BOARDING':
      return 'sps-status--orange';
    case 'DEPARTED':
      return 'sps-status--slate';
    case 'CANCELLED':
      return 'sps-status--red';
    case 'DELAYED':
      return 'sps-status--amber';
    default:
      return 'sps-status--green';
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
  } else if (
    (el as HTMLDivElement & { webkitRequestFullscreen?: () => void })
      .webkitRequestFullscreen
  ) {
    (
      el as HTMLDivElement & { webkitRequestFullscreen: () => void }
    ).webkitRequestFullscreen();
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   Memoized Departure Card
   ══════════════════════════════════════════════════════════════════════════ */
const DepartureCard = memo(function DepartureCard({ dep }: { dep: Departure }) {
  const isBoarding = dep.status === 'BOARDING';
  const isDeparted = dep.status === 'DEPARTED';
  const isCancelled = dep.status === 'CANCELLED';

  return (
    <div
      className={[
        'sps-card',
        isBoarding ? 'sps-card--boarding' : '',
        isDeparted ? 'sps-card--departed' : '',
        isCancelled ? 'sps-card--cancelled' : '',
      ].join(' ')}
    >
      {/* Top row: Time + Route + Status */}
      <div className="sps-card__row">
        <div
          className={[
            'sps-card__time',
            isBoarding ? 'sps-card__time--orange' : '',
          ].join(' ')}
        >
          {dep.effectiveTime}
        </div>
        <div className="sps-card__route">
          <span className="sps-card__line">{dep.lineNumber}</span>
          <span className="sps-card__route-text">
            {dep.origin}
            <span className="sps-card__arrow">{'\u00A0\u279C\u00A0'}</span>
            <span className={isCancelled ? 'sps-card__struck' : ''}>
              {dep.destination}
            </span>
          </span>
        </div>
        <div className={['sps-card__badge', getStatusClass(dep.status)].join(' ')}>
          {getStatusLabel(dep.status, dep.delayMinutes)}
        </div>
      </div>
      {/* Sub row: Platform + Seats + Countdown */}
      <div className="sps-card__sub">
        {dep.platform && (
          <span className="sps-card__platform">
            Quai {dep.platform}
          </span>
        )}
        <span className="sps-card__seats">
          {dep.availableSeats}/{dep.totalSeats} places
        </span>
        {dep.countdownMin > 0 && dep.status !== 'DEPARTED' && (
          <span className="sps-card__countdown">
            dans {dep.countdownMin} min
          </span>
        )}
      </div>
    </div>
  );
});

/* ══════════════════════════════════════════════════════════════════════════
   Memoized Arrival Card
   ══════════════════════════════════════════════════════════════════════════ */
const ArrivalCard = memo(function ArrivalCard({ arr }: { arr: Arrival }) {
  const isDeparted = arr.status === 'DEPARTED';
  const isCancelled = arr.status === 'CANCELLED';
  const isDelayed = arr.status === 'DELAYED';

  return (
    <div
      className={[
        'sps-card',
        isDeparted ? 'sps-card--departed' : '',
        isCancelled ? 'sps-card--cancelled' : '',
      ].join(' ')}
    >
      <div className="sps-card__row">
        <div className="sps-card__time">{arr.effectiveTime}</div>
        <div className="sps-card__route">
          <span className="sps-card__line">{arr.lineNumber}</span>
          <span className="sps-card__route-text">
            {arr.originStationName || arr.origin}
            <span className="sps-card__arrow">{'\u00A0\u2192\u00A0'}</span>
            <span className="sps-card__dest-here">ici</span>
          </span>
        </div>
        <div className={['sps-card__badge', getStatusClass(arr.status)].join(' ')}>
          {getStatusLabel(arr.status, arr.delayMinutes)}
        </div>
      </div>
      <div className="sps-card__sub">
        {arr.platform && (
          <span className="sps-card__platform">
            Quai {arr.platform}
          </span>
        )}
        {isDelayed && (
          <span className="sps-card__delay-info">
            Retard {arr.delayMinutes} min
          </span>
        )}
      </div>
    </div>
  );
});

/* ══════════════════════════════════════════════════════════════════════════
   Memoized Board Section
   ══════════════════════════════════════════════════════════════════════════ */
const BoardSection = memo(function BoardSection({
  title,
  count,
  children,
  accentClass,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
  accentClass: string;
}) {
  return (
    <div className="sps-board">
      <div className={['sps-board__head', accentClass].join(' ')}>
        <span className="sps-board__title">{title}</span>
        <span className="sps-board__count">{count}</span>
      </div>
      <div className="sps-board__body">{children}</div>
    </div>
  );
});

/* ══════════════════════════════════════════════════════════════════════════
   Main Page Component — Premium Card Design (Slug-based)
   ══════════════════════════════════════════════════════════════════════════ */
export default function SignageSlugPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const isKiosk = searchParams.get('kiosk') === '1';
  const isDebug = searchParams.get('debug') === '1';

  // Data state
  const [data, setData] = useState<StationData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [currentTime, setCurrentTime] = useState('00:00:00');
  const [currentDate, setCurrentDate] = useState('');
  const [offline, setOffline] = useState(false);
  const [lastUpdate, setLastUpdate] = useState('');

  // Mobile tab state
  const [activeTab, setActiveTab] = useState<'departures' | 'arrivals'>(
    'departures'
  );

  // Ad rotation state
  const [ads, setAds] = useState<SignageAd[]>([]);
  const [activeAd, setActiveAd] = useState<SignageAd | null>(null);
  const [showAdOverlay, setShowAdOverlay] = useState(false);
  const adIntervalTimerRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  const adDisplayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const lastAdShowTimeRef = useRef<number>(0);
  const showAdOverlayRef = useRef(false);

  // Audio alert tracking
  const announcedRef = useRef<Set<string>>(new Set());
  const [hasAnnouncement, setHasAnnouncement] = useState(false);

  // Cursor auto-hide (for kiosk mode)
  const cursorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cursorHidden, setCursorHidden] = useState(false);

  // Portrait detection (for mobile image ads)
  const isPortraitRef = useRef(false);

  // Root element ref
  const rootRef = useRef<HTMLDivElement>(null);

  // ─── Portrait detection ───────────────────────────────
  useEffect(() => {
    const check = () => {
      isPortraitRef.current = window.innerHeight > window.innerWidth;
    };
    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
    };
  }, []);

  // ─── First interaction: fullscreen + preload voices ─────
  useEffect(() => {
    const handle = () => {
      if (isKiosk && rootRef.current && !document.fullscreenElement) {
        toggleFullscreen(rootRef.current);
      }
      preloadVoices();
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

  // ─── Cleanup announcements on unmount ──────────────
  useEffect(() => {
    return () => {
      cancelAnnouncements();
    };
  }, []);

  // ─── Hide browser scrollbar (kiosk full-screen) ─────
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

  // ─── Live clock (updates every second) ──────────────
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('fr-FR', { hour12: false }));
      setCurrentDate(
        now.toLocaleDateString('fr-FR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // ─── Auto-hide cursor (kiosk) ───────────────────────
  useEffect(() => {
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
  }, []);

  // ─── Fetch ads (once + re-fetch every 5 min) ──────
  useEffect(() => {
    const fetchAds = async () => {
      try {
        const res = await fetch('/api/signage-ads');
        if (res.ok) {
          const json = await res.json();
          setAds((json as SignageAd[]) || []);
        }
      } catch {
        // Ads are non-critical — silently ignore errors
      }
    };
    fetchAds();
    const id = setInterval(fetchAds, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // ─── Ad rotation engine ─────────────────────────────
  useEffect(() => {
    if (ads.length === 0) return;

    const minInterval = Math.min(...ads.map((a) => a.interval)) * 60 * 1000;

    const showAd = () => {
      const now = Date.now();
      if (now - lastAdShowTimeRef.current < 5000) return;
      if (showAdOverlayRef.current) return;
      lastAdShowTimeRef.current = now;

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

    const initialDelay = setTimeout(() => {
      showAd();
      adIntervalTimerRef.current = setInterval(showAd, minInterval);
    }, 3000);

    return () => {
      clearTimeout(initialDelay);
      if (adIntervalTimerRef.current) clearInterval(adIntervalTimerRef.current);
      if (adDisplayTimerRef.current) clearTimeout(adDisplayTimerRef.current);
    };
  }, [ads]);

  // ─── Poll station data every 15 seconds ────────────
  useEffect(() => {
    if (!slug) return;

    const fetchData = async () => {
      try {
        const res = await fetch(`/api/signage-slug/${encodeURIComponent(slug)}`);
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        const json = await res.json();
        if (res.ok) {
          setOffline(false);
          setData(json);
          setLastUpdate(new Date().toLocaleTimeString('fr-FR'));

          // Audio alerts for boarding departures
          if (json.alertSoundEnabled !== false) {
            for (const dep of json.departures) {
              if (
                dep.shouldPlayAlert &&
                !announcedRef.current.has(dep.id)
              ) {
                announcedRef.current.add(dep.id);
                setHasAnnouncement(true);
                playBoardingAnnouncement(
                  dep.destination,
                  dep.effectiveTime
                );
              }
            }
          }
        }
      } catch {
        setOffline(true);
      }
    };

    fetchData();
    const id = setInterval(fetchData, 15000);
    return () => clearInterval(id);
  }, [slug]);

  // ─── Ticker text ─────────────────────────────────────
  const tickerText = useMemo(() => {
    if (!data) return '';
    const msgs = data.tickerMessages?.filter((m) => m.active) || [];
    if (msgs.length === 0) return '';
    return msgs
      .map((m) => `${m.priority === 'urgent' ? '\uD83D\uDEA8 ' : ''}${m.text}`)
      .join('    \u2014    ');
  }, [data]);

  // ─── Resolve ad media URL ──────────────────────────
  const resolveAdMedia = useCallback((ad: SignageAd) => {
    const ytUrl = getYouTubeEmbedUrl(
      ad.videoUrl || ad.imageUrl || ad.mediaUrl
    );
    if (ytUrl) return { type: 'youtube' as const, url: ytUrl };

    if (ad.videoUrl) return { type: 'video' as const, url: ad.videoUrl };
    if (ad.mediaType === 'VIDEO' && ad.mediaUrl)
      return { type: 'video' as const, url: ad.mediaUrl };
    if (isPortraitRef.current && ad.mobileImageUrl)
      return { type: 'image' as const, url: ad.mobileImageUrl };
    if (ad.imageUrl) return { type: 'image' as const, url: ad.imageUrl };
    if (ad.mediaUrl) return { type: 'image' as const, url: ad.mediaUrl };
    return { type: 'image' as const, url: '' };
  }, []);

  // ─── Dismiss ad overlay ─────────────────────────────
  const dismissAd = useCallback(() => {
    if (adDisplayTimerRef.current) clearTimeout(adDisplayTimerRef.current);
    setShowAdOverlay(false);
    setActiveAd(null);
    showAdOverlayRef.current = false;
  }, []);

  // ─── Loading state ──────────────────────────────────
  if (!data && !notFound) {
    return (
      <div className="sps-root">
        <div className="sps-loading">
          <div className="sps-spinner" />
          <p className="sps-loading-text">Chargement des informations...</p>
        </div>
        <style>{spsStyles.loading}</style>
      </div>
    );
  }

  // ─── Not found state ──────────────────────────────
  if (notFound) {
    return (
      <div className="sps-root">
        <div className="sps-loading">
          <div className="sps-notfound-icon">{'\u26A0\uFE0F'}</div>
          <p className="sps-loading-text">Station non trouv&eacute;e</p>
          <p className="sps-loading-sub">
            Cette gare n&apos;existe pas ou est d&eacute;sactiv&eacute;e.
          </p>
        </div>
        <style>{spsStyles.loading}</style>
      </div>
    );
  }

  // After loading + notFound guards, data is guaranteed non-null
  if (!data) return null;
  const stationName = data.stationName || 'Gare Routi\u00E8re';

  return (
    <div className="sps-root" ref={rootRef}>
      <style>{spsStyles.main(cursorHidden)}</style>

      {/* ─── TICKER BANDEAU ────────────────────────── */}
      {tickerText && (
        <div className="sps-ticker-wrap">
          <div className="sps-ticker">{tickerText}</div>
        </div>
      )}

      {/* ─── HEADER ────────────────────────────────── */}
      <header className="sps-header">
        <div className="sps-header__left">
          {data.logoUrl ? (
            <img
              className="sps-header__logo"
              src={data.logoUrl}
              alt="Logo"
            />
          ) : (
            <div className="sps-header__logo-fallback">ST</div>
          )}
          <div>
            <h1 className="sps-header__name">{stationName}</h1>
            <span className="sps-header__city">{data.city || ''}</span>
          </div>
        </div>
        <div className="sps-header__right">
          <div className="sps-clock">{currentTime}</div>
          <div className="sps-date">{currentDate}</div>
        </div>
      </header>

      {/* ─── MOBILE TAB BAR ───────────────────────── */}
      <div className="sps-tabs">
        <button
          className={[
            'sps-tab',
            activeTab === 'departures' ? 'sps-tab--active' : '',
          ].join(' ')}
          onClick={() => setActiveTab('departures')}
        >
          D&Eacute;PARTS ({data.departures.length})
        </button>
        <button
          className={[
            'sps-tab',
            activeTab === 'arrivals' ? 'sps-tab--active' : '',
          ].join(' ')}
          onClick={() => setActiveTab('arrivals')}
        >
          ARRIV&Eacute;ES ({data.arrivals.length})
        </button>
      </div>

      {/* ─── CONTENT: 2 Columns OR End of Day ──── */}
      {data.departures.length === 0 && data.arrivals.length === 0 ? (
        /* ═══ ÉCRAN FIN DE JOURNÉE ═══ */
        <main className="sps-eod-wrap">
          <div className="sps-eod-moon">{'\uD83C\uDF19'}</div>
          <h2 className="sps-eod-title">Fin des d&eacute;parts aujourd&apos;hui</h2>
          <p className="sps-eod-sub">Merci de votre confiance. &Agrave; demain !</p>
          {data.nextDayPreview && data.nextDayPreview.length > 0 && (
            <div className="sps-eod-next">
              <p className="sps-eod-next-label">Prochains d&eacute;parts demain</p>
              {data.nextDayPreview.map((d) => (
                <div key={d.id} className="sps-eod-next-item">
                  <span className="sps-eod-next-time">{d.time}</span>
                  <span className="sps-eod-next-arrow">&rarr;</span>
                  <span className="sps-eod-next-dest">{d.destination}</span>
                </div>
              ))}
            </div>
          )}
          {data.nextDayFirstDeparture && (
            <p className="sps-eod-first">
              Prochain d&eacute;part demain &agrave;{' '}
              <span className="sps-eod-first-time">{data.nextDayFirstDeparture}</span>
            </p>
          )}
        </main>
      ) : (
        <main className="sps-content">
          {/* D&eacute;parts Column */}
          <div
            className={[
              'sps-col',
              activeTab === 'departures' ? 'sps-col--active' : '',
            ].join(' ')}
          >
            <BoardSection
              title="D&Eacute;PARTS"
              count={data.departures.length}
              accentClass="sps-board__head--depart"
            >
              {data.departures.length === 0 ? (
                <div className="sps-empty">Aucun d&eacute;part pr&eacute;vu</div>
              ) : (
                data.departures.map((dep) => (
                  <DepartureCard key={dep.id} dep={dep} />
                ))
              )}
            </BoardSection>
          </div>

          {/* Arriv&eacute;es Column */}
          <div
            className={[
              'sps-col',
              activeTab === 'arrivals' ? 'sps-col--active' : '',
            ].join(' ')}
          >
            <BoardSection
              title="ARRIV&Eacute;ES"
              count={data.arrivals.length}
              accentClass="sps-board__head--arrive"
            >
              {data.arrivals.length === 0 ? (
                <div className="sps-empty">
                  Aucune arriv&eacute;e pr&eacute;vue
                </div>
              ) : (
                data.arrivals.map((arr) => (
                  <ArrivalCard key={arr.id} arr={arr} />
                ))
              )}
            </BoardSection>
          </div>
        </main>
      )}

      {/* ─── FOOTER ────────────────────────────────── */}
      <footer className="sps-footer">
        <div className="sps-footer__left">
          <span className="sps-footer__date">{currentDate}</span>
          <span className="sps-footer__city">{data.city || ''}</span>
        </div>
        <div className="sps-footer__center">
          <QRCodeSVG
            value={`/signage-slug/${slug}`}
            size={56}
            bgColor="#ffffff"
            fgColor="#0b0f19"
            level="M"
          />
          <span className="sps-footer__qr-label">Scanner</span>
        </div>
        <div className="sps-footer__right">
          <span className="sps-footer__brand">SmarticketS</span>
        </div>
      </footer>

      {/* ─── FULLSCREEN BUTTON ────────────────────── */}
      <button
        className="sps-fs-btn"
        onClick={() => toggleFullscreen(rootRef.current)}
        aria-label="Plein \u00E9cran"
      >
        {'\u26F6'}
      </button>

      {/* ─── OFFLINE BADGE ────────────────────────── */}
      {offline && (
        <div className="sps-offline-badge">
          {'\u26D4'} HORS LIGNE
        </div>
      )}

      {/* ─── VOICE INDICATOR ──────────────────────── */}
      {hasAnnouncement && (
        <div className="sps-voice-badge">
          {'\uD83D\uDD0A'} Annonce en cours
        </div>
      )}

      {/* ─── LAST UPDATE ─────────────────────────── */}
      {lastUpdate && (
        <div className="sps-last-update">M&Agrave;J {lastUpdate}</div>
      )}

      {/* ─── AD OVERLAY (z-50 fullscreen) ──────────── */}
      {showAdOverlay && activeAd && (
        <div className="sps-ad-overlay" onClick={dismissAd}>
          <AdMedia ad={activeAd} resolveMedia={resolveAdMedia} />
          <div
            className="sps-ad-progress"
            style={{ animationDuration: `${activeAd.duration}s` }}
          />
          <div className="sps-ad-label">
            PUBLICIT&Eacute; &mdash; Cliquez pour fermer
          </div>
        </div>
      )}

      {/* ─── DEBUG PANEL ────────────────────────── */}
      {isDebug && (
        <div className="sps-debug">
          <div className="sps-debug__title">DEBUG</div>
          <div className="sps-debug__info">
            Slug: {slug}
            <br />
            D&eacute;parts: {data.departures.length}
            <br />
            Arriv&eacute;es: {data.arrivals.length}
            <br />
            Ads: {ads.length}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Ad Media Sub-component
   Supports: YouTube iframe, video, image (including mobileImageUrl)
   ══════════════════════════════════════════════════════════════════════════ */
const AdMedia = memo(function AdMedia({
  ad,
  resolveMedia,
}: {
  ad: SignageAd;
  resolveMedia: (
    ad: SignageAd
  ) => { type: 'image' | 'video' | 'youtube'; url: string };
}) {
  const media = resolveMedia(ad);

  if (media.type === 'youtube' && media.url) {
    return (
      <iframe
        key={ad.id}
        src={media.url}
        className="sps-ad-frame"
        allow="autoplay; encrypted-media"
        allowFullScreen
        title={ad.title || 'Publicit\u00E9'}
      />
    );
  }

  if (media.type === 'video' && media.url) {
    return (
      <video
        key={ad.id}
        className="sps-ad-video"
        src={media.url}
        autoPlay
        muted
        loop
        playsInline
      />
    );
  }

  if (media.type === 'image' && media.url) {
    return (
      <img
        key={ad.id}
        className="sps-ad-image"
        src={media.url}
        alt={ad.title || 'Publicit\u00E9'}
      />
    );
  }

  return <div className="sps-ad-empty">Aucun m&eacute;dia</div>;
});

/* ══════════════════════════════════════════════════════════════════════════
   CSS Styles — "Style A&eacute;roport" Premium Card
   All classes prefixed with `sps-` (signage premium slug) to avoid
   conflicts with other pages.
   ══════════════════════════════════════════════════════════════════════════ */
const spsStyles = {
  loading: `
    @keyframes sps-spin { to { transform: rotate(360deg); } }
    .sps-root {
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      width: 100vw; height: 100vh; height: 100dvh;
      overflow: hidden; position: fixed; inset: 0;
      background: #0b0f19; color: #f8fafc;
      display: flex; align-items: center; justify-content: center;
    }
    .sps-loading { text-align: center; }
    .sps-spinner {
      width: 48px; height: 48px; border-radius: 50%;
      border: 4px solid #1e293b; border-top-color: #f97316;
      animation: sps-spin 1s linear infinite;
      margin: 0 auto 1rem;
    }
    .sps-loading-text { color: #94a3b8; font-size: 1.2rem; margin: 0; }
    .sps-loading-sub { color: #64748b; font-size: 0.9rem; margin-top: 0.5rem; }
    .sps-notfound-icon { font-size: 3rem; margin-bottom: 0.5rem; }
  `,

  main: (cursorHidden: boolean) => `
    /* ═══ RESET ═══ */
    *, *::before, *::after { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; overflow: hidden; }

    /* ═══ ROOT ═══ */
    .sps-root {
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      background: #0b0f19;
      color: #ffffff;
      width: 100vw; height: 100vh; height: 100dvh;
      overflow: hidden;
      display: flex; flex-direction: column;
      user-select: none; -webkit-user-select: none;
      cursor: ${cursorHidden ? 'none' : 'default'};
      touch-action: manipulation;
      position: fixed; inset: 0;
    }

    /* ═══ TICKER BANDEAU ═══ */
    .sps-ticker-wrap {
      background: #f97316; color: #0b0f19;
      padding: clamp(0.3rem, 0.7vh, 0.6rem) 0;
      overflow: hidden; white-space: nowrap;
      font-weight: 700; font-size: clamp(0.7rem, 1.4vh, 1rem);
      flex-shrink: 0;
    }
    .sps-ticker {
      display: inline-block;
      animation: sps-marquee 45s linear infinite;
      padding-left: 100%;
    }
    @keyframes sps-marquee {
      0% { transform: translateX(0); }
      100% { transform: translateX(-100%); }
    }

    /* ═══ HEADER ═══ */
    .sps-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: clamp(0.6rem, 1.5vh, 1.2rem) clamp(1rem, 2.5vw, 2rem);
      flex-shrink: 0;
      border-bottom: 1px solid #1e293b;
    }
    .sps-header__left {
      display: flex; align-items: center; gap: clamp(0.5rem, 1vw, 1rem);
    }
    .sps-header__logo {
      width: clamp(36px, 5vh, 56px); height: clamp(36px, 5vh, 56px);
      object-fit: contain; border-radius: 8px;
    }
    .sps-header__logo-fallback {
      width: clamp(36px, 5vh, 56px); height: clamp(36px, 5vh, 56px);
      background: #f97316; border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: clamp(0.7rem, 1.5vh, 1.1rem);
      color: #0b0f19; flex-shrink: 0;
    }
    .sps-header__name {
      font-size: clamp(1rem, 2.5vh, 1.75rem);
      font-weight: 700; margin: 0; white-space: nowrap;
      letter-spacing: 0.5px;
    }
    .sps-header__city {
      color: #94a3b8; font-size: clamp(0.6rem, 1.2vh, 0.85rem);
      display: block; margin-top: 0.1rem;
    }
    .sps-header__right { text-align: right; flex-shrink: 0; }

    .sps-clock {
      font-family: ui-monospace, SFMono-Regular, "Cascadia Code", Menlo, Consolas, monospace;
      font-size: clamp(1.2rem, 4vh, 3.5rem);
      font-weight: 700; letter-spacing: 2px; line-height: 1;
      color: #ffffff;
    }
    .sps-date {
      color: #94a3b8; font-size: clamp(0.55rem, 1.1vh, 0.85rem);
      margin-top: 0.2rem; font-weight: 500;
    }

    /* ═══ MOBILE TAB BAR ═══ */
    .sps-tabs {
      display: flex; gap: 0; flex-shrink: 0;
      border-bottom: 1px solid #1e293b;
    }
    .sps-tab {
      flex: 1; padding: clamp(0.4rem, 1vh, 0.7rem);
      background: transparent; border: none; color: #94a3b8;
      font-weight: 700; font-size: clamp(0.7rem, 1.3vh, 0.95rem);
      text-transform: uppercase; letter-spacing: 0.5px;
      cursor: pointer; transition: all 0.2s ease;
      border-bottom: 2px solid transparent;
    }
    .sps-tab--active {
      color: #f97316;
      border-bottom-color: #f97316;
      background: rgba(249, 115, 22, 0.08);
    }

    /* ═══ CONTENT: 2 Columns ═══ */
    .sps-content {
      flex: 1; display: flex; gap: clamp(0.5rem, 1.5vw, 1rem);
      padding: clamp(0.5rem, 1.2vh, 1rem) clamp(0.8rem, 2vw, 1.5rem);
      min-height: 0; overflow: hidden;
    }
    .sps-col { flex: 1; display: flex; flex-direction: column; min-height: 0; }

    /* ═══ BOARD (column container) ═══ */
    .sps-board {
      flex: 1; display: flex; flex-direction: column;
      background: #0b0f19; border-radius: clamp(8px, 1vh, 12px);
      overflow: hidden; min-height: 0;
    }
    .sps-board__head {
      padding: clamp(0.5rem, 1.2vh, 0.9rem) clamp(0.8rem, 1.5vw, 1.2rem);
      display: flex; justify-content: space-between; align-items: center;
      flex-shrink: 0;
      border-radius: clamp(8px, 1vh, 12px) clamp(8px, 1vh, 12px) 0 0;
    }
    .sps-board__head--depart {
      background: linear-gradient(135deg, #f97316, #ea580c);
    }
    .sps-board__head--arrive {
      background: linear-gradient(135deg, #0ea5e9, #0284c7);
    }
    .sps-board__title {
      font-weight: 800; font-size: clamp(0.75rem, 1.5vh, 1.15rem);
      text-transform: uppercase; letter-spacing: 1px; color: #ffffff;
    }
    .sps-board__count {
      background: rgba(255,255,255,0.2); color: #fff;
      padding: 0.15em 0.6em; border-radius: 999px;
      font-size: clamp(0.6rem, 1.1vh, 0.85rem); font-weight: 700;
    }
    .sps-board__body {
      flex: 1; overflow-y: auto; overflow-x: hidden; min-height: 0;
      padding: clamp(0.3rem, 0.6vh, 0.5rem);
    }
    /* Custom scrollbar */
    .sps-board__body::-webkit-scrollbar { width: 6px; }
    .sps-board__body::-webkit-scrollbar-track { background: #0b0f19; }
    .sps-board__body::-webkit-scrollbar-thumb {
      background: #1e293b; border-radius: 3px;
    }
    .sps-board__body::-webkit-scrollbar-thumb:hover { background: #334155; }

    /* ═══ CARD (departure / arrival item) — bg #131a2b ═══ */
    .sps-card {
      background: #131a2b;
      border: 1px solid #1e293b;
      border-radius: clamp(8px, 1vh, 12px);
      padding: clamp(0.6rem, 1.2vh, 1rem) clamp(0.8rem, 1.5vw, 1.2rem);
      margin-bottom: clamp(0.3rem, 0.6vh, 0.5rem);
      transition: all 0.3s ease;
    }
    .sps-card:last-child { margin-bottom: 0; }

    /* Card row: time + route + status */
    .sps-card__row {
      display: flex; align-items: center; gap: clamp(0.5rem, 1vw, 0.8rem);
    }

    /* Time */
    .sps-card__time {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: clamp(1.1rem, 2.5vh, 1.75rem);
      font-weight: 700; color: #ffffff;
      flex-shrink: 0; min-width: clamp(52px, 8vw, 80px);
      text-align: center;
    }
    .sps-card__time--orange { color: #f97316; }

    /* Route */
    .sps-card__route {
      flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.15rem;
    }
    .sps-card__line {
      font-size: clamp(0.5rem, 0.9vh, 0.7rem);
      color: #64748b; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .sps-card__route-text {
      font-size: clamp(0.8rem, 1.8vh, 1.25rem);
      font-weight: 600; color: #ffffff;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .sps-card__arrow { color: #f97316; font-weight: 400; }
    .sps-card__dest-here {
      color: #0ea5e9; font-weight: 700;
    }

    /* Badge */
    .sps-card__badge {
      flex-shrink: 0;
      font-size: clamp(0.5rem, 1vh, 0.75rem);
      font-weight: 700; text-transform: uppercase;
      padding: 0.2em 0.6em; border-radius: 6px;
      white-space: nowrap; letter-spacing: 0.3px;
    }

    /* Status colors */
    .sps-status--green {
      background: rgba(34, 197, 94, 0.15); color: #22c55e;
      border: 1px solid rgba(34, 197, 94, 0.3);
    }
    .sps-status--orange {
      background: rgba(249, 115, 22, 0.2); color: #f97316;
      border: 1px solid #f97316;
      animation: sps-blink 1.2s infinite;
    }
    .sps-status--amber {
      background: rgba(245, 158, 11, 0.15); color: #f59e0b;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }
    .sps-status--red {
      background: rgba(239, 68, 68, 0.15); color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }
    .sps-status--slate {
      background: rgba(100, 116, 139, 0.15); color: #64748b;
      border: 1px solid rgba(100, 116, 139, 0.2);
    }

    /* Sub row: platform + seats + countdown */
    .sps-card__sub {
      display: flex; align-items: center; gap: clamp(0.4rem, 0.8vw, 0.7rem);
      margin-top: clamp(0.2rem, 0.4vh, 0.4rem);
      padding-top: clamp(0.15rem, 0.3vh, 0.3rem);
      border-top: 1px solid #1e293b;
      font-size: clamp(0.55rem, 1vh, 0.75rem);
      color: #94a3b8;
    }
    .sps-card__platform {
      font-weight: 600; color: #64748b;
      padding: 0.1em 0.4em; background: #1e293b;
      border-radius: 4px;
    }
    .sps-card__seats { font-weight: 500; }
    .sps-card__countdown { color: #f97316; font-weight: 600; margin-left: auto; }
    .sps-card__delay-info { color: #f59e0b; font-weight: 600; }
    .sps-card__struck { text-decoration: line-through; opacity: 0.5; }

    /* ═══ BOARDING CARD — orange left border + pulse ═══ */
    .sps-card--boarding {
      border-left: 4px solid #f97316;
      background: rgba(249, 115, 22, 0.08);
      animation: sps-pulse-bg 2s infinite;
    }

    /* ═══ DEPARTED CARD — reduced opacity ═══ */
    .sps-card--departed { opacity: 0.4; }

    /* ═══ CANCELLED CARD ═══ */
    .sps-card--cancelled { opacity: 0.5; }

    /* ═══ EMPTY STATE ═══ */
    .sps-empty {
      text-align: center; padding: clamp(2rem, 5vh, 4rem);
      color: #64748b; font-size: clamp(0.85rem, 1.5vh, 1.1rem);
    }

    /* ═══ END OF DAY SCREEN ═══ */
    .sps-eod-wrap {
      flex: 1; display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      text-align: center; padding: clamp(2rem, 5vh, 4rem);
    }
    .sps-eod-moon {
      font-size: clamp(3rem, 8vh, 6rem);
      margin-bottom: clamp(0.8rem, 2vh, 1.5rem);
      animation: sps-moon-pulse 4s ease-in-out infinite;
    }
    @keyframes sps-moon-pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.8; transform: scale(1.05); }
    }
    .sps-eod-title {
      font-size: clamp(1.3rem, 3.5vh, 2.5rem);
      font-weight: 800; color: #f8fafc; margin: 0;
      letter-spacing: 0.5px;
    }
    .sps-eod-sub {
      font-size: clamp(0.9rem, 2vh, 1.3rem);
      color: #94a3b8; margin-top: clamp(0.3rem, 0.8vh, 0.6rem);
      margin-bottom: clamp(1rem, 3vh, 2rem);
    }
    .sps-eod-next {
      background: rgba(249, 115, 22, 0.08);
      border: 1px solid rgba(249, 115, 22, 0.2);
      border-radius: clamp(8px, 1.5vh, 16px);
      padding: clamp(0.8rem, 2vh, 1.5rem) clamp(1.5rem, 3vw, 2.5rem);
      min-width: clamp(200px, 30vw, 360px);
    }
    .sps-eod-next-label {
      font-size: clamp(0.6rem, 1.1vh, 0.85rem);
      font-weight: 700; color: #f97316;
      text-transform: uppercase; letter-spacing: 1px;
      margin: 0 0 clamp(0.5rem, 1vh, 0.8rem) 0;
    }
    .sps-eod-next-item {
      display: flex; align-items: center; gap: clamp(0.4rem, 1vw, 0.8rem);
      padding: clamp(0.25rem, 0.6vh, 0.5rem) 0;
      font-size: clamp(0.8rem, 1.6vh, 1.15rem);
    }
    .sps-eod-next-item + .sps-eod-next-item {
      border-top: 1px solid rgba(249, 115, 22, 0.1);
    }
    .sps-eod-next-time {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-weight: 700; color: #ffffff; min-width: 50px;
    }
    .sps-eod-next-arrow { color: #f97316; font-weight: 300; }
    .sps-eod-next-dest { color: #e2e8f0; font-weight: 500; }
    .sps-eod-first {
      font-size: clamp(0.7rem, 1.3vh, 1rem);
      color: #64748b; margin-top: clamp(0.6rem, 1.5vh, 1.2rem);
      margin-bottom: 0;
    }
    .sps-eod-first-time {
      color: #f97316; font-weight: 700;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }

    /* ═══ FOOTER ═══ */
    .sps-footer {
      display: flex; justify-content: space-between; align-items: center;
      padding: clamp(0.5rem, 1vh, 0.8rem) clamp(1rem, 2vw, 2rem);
      border-top: 1px solid #1e293b;
      flex-shrink: 0;
      margin-top: auto;
    }
    .sps-footer__left {
      display: flex; flex-direction: column; gap: 0.1rem;
    }
    .sps-footer__date {
      font-size: clamp(0.55rem, 1vh, 0.75rem);
      color: #94a3b8; font-weight: 500;
    }
    .sps-footer__city {
      font-size: clamp(0.5rem, 0.9vh, 0.65rem);
      color: #64748b;
    }
    .sps-footer__center {
      display: flex; flex-direction: column; align-items: center; gap: 0.2rem;
      background: #ffffff; padding: clamp(4px, 0.5vh, 6px);
      border-radius: 8px;
    }
    .sps-footer__qr-label {
      font-size: clamp(0.4rem, 0.7vh, 0.55rem);
      color: #64748b; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .sps-footer__right { display: flex; align-items: center; }
    .sps-footer__brand {
      font-weight: 800; font-size: clamp(0.7rem, 1.3vh, 1rem);
      color: #f97316; letter-spacing: 0.5px;
    }

    /* ═══ FULLSCREEN BUTTON ═══ */
    .sps-fs-btn {
      position: fixed; top: clamp(6px, 1vh, 12px); right: clamp(6px, 1vw, 12px);
      width: clamp(32px, 4vh, 44px); height: clamp(32px, 4vh, 44px);
      background: rgba(255,255,255,0.05); border: 1px solid #1e293b;
      border-radius: 8px; color: #94a3b8;
      font-size: clamp(0.8rem, 1.5vh, 1.2rem);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; z-index: 50; transition: all 0.2s;
    }
    .sps-fs-btn:hover {
      background: rgba(255,255,255,0.1); color: #ffffff;
      border-color: #f97316;
    }

    /* ═══ OFFLINE BADGE ═══ */
    .sps-offline-badge {
      position: fixed; top: 50px; right: 12px;
      background: #ef4444; color: #fff;
      padding: 6px 14px; border-radius: 8px;
      font-weight: 700; font-size: 0.75rem; z-index: 200;
      animation: sps-blink 1s infinite;
    }

    /* ═══ VOICE INDICATOR ═══ */
    .sps-voice-badge {
      position: fixed; top: 50px; left: 12px;
      background: rgba(249, 115, 22, 0.9); color: #fff;
      padding: 6px 14px; border-radius: 8px;
      font-weight: 600; font-size: 0.7rem; z-index: 200;
    }

    /* ═══ LAST UPDATE ═══ */
    .sps-last-update {
      position: fixed; bottom: 8px; left: 8px;
      background: rgba(0,0,0,0.5); color: rgba(255,255,255,0.6);
      padding: 3px 8px; border-radius: 4px;
      font-size: 0.6rem; z-index: 50;
    }

    /* ═══ AD OVERLAY (z-50 fullscreen) ═══ */
    .sps-ad-overlay {
      position: fixed; inset: 0; z-index: 100; background: #000;
      display: flex; align-items: center; justify-content: center;
      animation: sps-fadein 0.5s ease; cursor: pointer;
    }
    .sps-ad-overlay img,
    .sps-ad-overlay video,
    .sps-ad-overlay iframe {
      width: 100%; height: 100%;
    }
    .sps-ad-overlay img { object-fit: cover; }
    .sps-ad-overlay video { object-fit: contain; }
    .sps-ad-image, .sps-ad-video, .sps-ad-frame {
      display: block; width: 100%; height: 100%;
    }
    .sps-ad-image { object-fit: cover; }
    .sps-ad-video { object-fit: contain; }
    .sps-ad-frame { border: none; }
    .sps-ad-progress {
      position: absolute; bottom: 0; left: 0; height: 4px;
      background: #f97316;
      animation: sps-ad-progress linear forwards;
    }
    .sps-ad-label {
      position: absolute; top: clamp(8px, 2vh, 16px); right: clamp(8px, 2vw, 20px);
      background: rgba(0,0,0,0.7); color: rgba(255,255,255,0.7);
      padding: 4px 10px; border-radius: 6px;
      font-size: clamp(0.55rem, 1vh, 0.75rem); font-weight: 600;
    }
    .sps-ad-empty {
      color: #64748b; font-size: 1rem;
    }

    /* ═══ DEBUG PANEL ═══ */
    .sps-debug {
      position: fixed; bottom: 20px; right: 20px;
      background: #131a2b; padding: 0.8rem 1rem; border-radius: 10px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 1px solid #1e293b;
      z-index: 200; max-width: 200px;
    }
    .sps-debug__title {
      font-weight: 800; font-size: 0.7rem; color: #f97316;
      text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.4rem;
    }
    .sps-debug__info {
      font-size: 0.65rem; color: #94a3b8; line-height: 1.5;
    }

    /* ═══ ANIMATIONS ═══ */
    @keyframes sps-blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    @keyframes sps-pulse-bg {
      0%, 100% { background: rgba(249, 115, 22, 0.08); }
      50% { background: rgba(249, 115, 22, 0.15); }
    }
    @keyframes sps-fadein {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes sps-ad-progress {
      from { width: 0; }
      to { width: 100%; }
    }

    /* ═══ RESPONSIVE: Mobile (< 768px) ═══ */
    @media (max-width: 767px) {
      .sps-tabs { display: flex; }
      .sps-content { flex-direction: column; }
      .sps-col { display: none; }
      .sps-col--active { display: flex; }
      .sps-header__name { font-size: 0.9rem; }
      .sps-header__city { display: none; }
      .sps-clock { font-size: 1.2rem; }
      .sps-date { font-size: 0.6rem; }
      .sps-card { padding: 0.5rem; margin-bottom: 0.3rem; }
      .sps-card__time { font-size: 0.9rem; min-width: 48px; }
      .sps-card__line { display: none; }
      .sps-card__route-text { font-size: 0.8rem; }
      .sps-card__badge { font-size: 0.5rem; padding: 0.15em 0.4em; }
      .sps-card__sub { font-size: 0.55rem; gap: 0.3rem; margin-top: 0.2rem; padding-top: 0.15rem; }
      .sps-footer { padding: 0.4rem 0.6rem; }
      .sps-footer__center { padding: 3px; }
      .sps-footer__brand { font-size: 0.6rem; }
      .sps-footer__qr-label { display: none; }
      .sps-fs-btn { width: 28px; height: 28px; font-size: 0.7rem; top: 4px; right: 4px; }
      .sps-ad-label { font-size: 0.5rem; }
    }

    /* ═══ RESPONSIVE: Tablet (768px – 1023px) ═══ */
    @media (min-width: 768px) and (max-width: 1023px) {
      .sps-tabs { display: none; }
      .sps-col { display: flex; }
      .sps-clock { font-size: 2rem; }
      .sps-card__time { font-size: 1.3rem; }
      .sps-card__route-text { font-size: 1rem; }
    }

    /* ═══ RESPONSIVE: Desktop/TV (1024px+) ═══ */
    @media (min-width: 1024px) {
      .sps-tabs { display: none; }
      .sps-col { display: flex; }
    }

    /* ═══ RESPONSIVE: Large TV (>= 1920px) ═══ */
    @media (min-width: 1920px) {
      .sps-header { padding: 1.2rem 2.5rem; }
      .sps-header__name { font-size: 2rem; }
      .sps-header__city { font-size: 1rem; }
      .sps-clock { font-size: 4rem; }
      .sps-date { font-size: 1.1rem; }
      .sps-content { padding: 1.5rem 2rem; gap: 1.5rem; }
      .sps-board__head { padding: 1rem 1.5rem; }
      .sps-board__title { font-size: 1.3rem; }
      .sps-card { padding: 1.2rem 1.5rem; margin-bottom: 0.8rem; border-radius: 16px; }
      .sps-card__time { font-size: 2rem; min-width: 100px; }
      .sps-card__route-text { font-size: 1.6rem; }
      .sps-card__badge { font-size: 0.85rem; padding: 0.3em 0.8em; }
      .sps-card__sub { font-size: 0.85rem; margin-top: 0.5rem; padding-top: 0.4rem; }
      .sps-footer { padding: 1.2rem 2rem; }
      .sps-footer__brand { font-size: 1.2rem; }
    }

    /* ═══ RESPONSIVE: 4K (>= 2560px) ═══ */
    @media (min-width: 2560px) {
      .sps-header { padding: 1.5rem 3rem; }
      .sps-header__name { font-size: 2.5rem; }
      .sps-clock { font-size: 5rem; letter-spacing: 4px; }
      .sps-date { font-size: 1.3rem; }
      .sps-content { padding: 2rem 3rem; gap: 2rem; }
      .sps-board__head { padding: 1.2rem 2rem; }
      .sps-board__title { font-size: 1.5rem; }
      .sps-card { padding: 1.5rem 2rem; margin-bottom: 1rem; border-radius: 20px; }
      .sps-card__time { font-size: 2.5rem; min-width: 130px; }
      .sps-card__route-text { font-size: 2rem; }
      .sps-card__badge { font-size: 1rem; }
      .sps-card__sub { font-size: 1rem; margin-top: 0.6rem; padding-top: 0.5rem; }
      .sps-footer { padding: 1.5rem 3rem; }
      .sps-footer__brand { font-size: 1.5rem; }
    }
  `,
};
