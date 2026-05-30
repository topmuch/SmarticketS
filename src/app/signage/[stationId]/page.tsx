'use client';

import { useState, useEffect, useRef, memo, useMemo, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { playDingDong, playBoardingAnnouncement, cancelAnnouncements, preloadVoices } from '@/lib/audioSystem';

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
    if (match) return `https://www.youtube.com/embed/${match[1]}?autoplay=1&mute=1&loop=1&playlist=${match[1]}&controls=0&rel=0&playsinline=1`;
  }
  return null;
}

/* ══════════════════════════════════════════════════════════════════════════
   Status Helpers
   ══════════════════════════════════════════════════════════════════════════ */
function getStatusLabel(status: string, delayMinutes: number): string {
  switch (status) {
    case 'SCHEDULED': return 'À l\'heure';
    case 'BOARDING': return 'EMBARQUEMENT';
    case 'DEPARTED': return 'Parti';
    case 'CANCELLED': return 'Annulé';
    case 'DELAYED': return `Retard ${delayMinutes} min`;
    default: return status;
  }
}

function getStatusClass(status: string): string {
  switch (status) {
    case 'SCHEDULED': return 'sp-status--green';
    case 'BOARDING': return 'sp-status--orange';
    case 'DEPARTED': return 'sp-status--slate';
    case 'CANCELLED': return 'sp-status--red';
    case 'DELAYED': return 'sp-status--amber';
    default: return 'sp-status--green';
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
   Memoized Departure Card
   ══════════════════════════════════════════════════════════════════════════ */
const DepartureCard = memo(function DepartureCard({ dep }: { dep: Departure }) {
  const isBoarding = dep.status === 'BOARDING';
  const isDeparted = dep.status === 'DEPARTED';
  const isCancelled = dep.status === 'CANCELLED';
  const isDelayed = dep.status === 'DELAYED';

  return (
    <div className={[
      'sp-card',
      isBoarding ? 'sp-card--boarding' : '',
      isDeparted ? 'sp-card--departed' : '',
      isCancelled ? 'sp-card--cancelled' : '',
    ].join(' ')}>
      {/* Top row: Time + Route + Status */}
      <div className="sp-card__row">
        <div className={['sp-card__time', isBoarding ? 'sp-card__time--orange' : ''].join(' ')}>
          {dep.effectiveTime}
        </div>
        <div className="sp-card__route">
          <span className="sp-card__line">{dep.lineNumber}</span>
          <span className="sp-card__route-text">
            {dep.origin}
            <span className="sp-card__arrow">{'\u00A0➜\u00A0'}</span>
            <span className={isCancelled ? 'sp-card__struck' : ''}>{dep.destination}</span>
          </span>
        </div>
        <div className={['sp-card__badge', getStatusClass(dep.status)].join(' ')}>
          {getStatusLabel(dep.status, dep.delayMinutes)}
        </div>
      </div>
      {/* Sub row: Platform + Seats */}
      <div className="sp-card__sub">
        {dep.platform && <span className="sp-card__platform">{dep.platform}</span>}
        <span className="sp-card__seats">
          {dep.availableSeats}/{dep.totalSeats} places
        </span>
        {dep.countdownMin > 0 && dep.status !== 'DEPARTED' && (
          <span className="sp-card__countdown">dans {dep.countdownMin} min</span>
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
    <div className={[
      'sp-card',
      isDeparted ? 'sp-card--departed' : '',
      isCancelled ? 'sp-card--cancelled' : '',
    ].join(' ')}>
      <div className="sp-card__row">
        <div className="sp-card__time">{arr.effectiveTime}</div>
        <div className="sp-card__route">
          <span className="sp-card__line">{arr.lineNumber}</span>
          <span className="sp-card__route-text">
            {arr.originStationName || arr.origin}
            <span className="sp-card__arrow">{'\u00A0→\u00A0'}</span>
            <span className="sp-card__dest-here">ici</span>
          </span>
        </div>
        <div className={['sp-card__badge', getStatusClass(arr.status)].join(' ')}>
          {getStatusLabel(arr.status, arr.delayMinutes)}
        </div>
      </div>
      <div className="sp-card__sub">
        {arr.platform && <span className="sp-card__platform">{arr.platform}</span>}
        {isDelayed && <span className="sp-card__delay-info">Retard {arr.delayMinutes} min</span>}
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
    <div className="sp-board">
      <div className={['sp-board__head', accentClass].join(' ')}>
        <span className="sp-board__title">{title}</span>
        <span className="sp-board__count">{count}</span>
      </div>
      <div className="sp-board__body">
        {children}
      </div>
    </div>
  );
});

/* ══════════════════════════════════════════════════════════════════════════
   Main Page Component — Premium Card Design
   ══════════════════════════════════════════════════════════════════════════ */
export default function SignagePremiumPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const stationId = params.stationId as string;
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
  const [activeTab, setActiveTab] = useState<'departures' | 'arrivals'>('departures');

  // Ad rotation state
  const [ads, setAds] = useState<SignageAd[]>([]);
  const [activeAd, setActiveAd] = useState<SignageAd | null>(null);
  const [showAdOverlay, setShowAdOverlay] = useState(false);
  const adIntervalTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const adDisplayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAdShowTimeRef = useRef<number>(0);
  const showAdOverlayRef = useRef(false);

  // Audio alert tracking
  const announcedRef = useRef<Set<string>>(new Set());
  const [hasAnnouncement, setHasAnnouncement] = useState(false);

  // Cursor auto-hide
  const cursorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cursorHidden, setCursorHidden] = useState(false);

  // Portrait detection
  const isPortraitRef = useRef(false);

  // Root ref
  const rootRef = useRef<HTMLDivElement>(null);

  // ─── Portrait detection ───────────────────────────────
  useEffect(() => {
    const check = () => { isPortraitRef.current = window.innerHeight > window.innerWidth; };
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
    return () => { cancelAnnouncements(); };
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

  // ─── Live clock ──────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('fr-FR', { hour12: false }));
      setCurrentDate(now.toLocaleDateString('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // ─── Auto-hide cursor ───────────────────────────────
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
        // Ads non-critical
      }
    };
    fetchAds();
    const id = setInterval(fetchAds, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // ─── Ad rotation engine ─────────────────────────────
  useEffect(() => {
    if (ads.length === 0) return;

    const minInterval = Math.min(...ads.map(a => a.interval)) * 60 * 1000;

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

  // ─── Poll station data every 15s ────────────────────
  useEffect(() => {
    if (!stationId) return;

    const fetchData = async () => {
      try {
        const res = await fetch(`/api/signage-slug/${stationId}`);
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        const json = await res.json();
        if (res.ok) {
          setOffline(false);
          setData(json);
          setLastUpdate(new Date().toLocaleTimeString('fr-FR'));

          // Audio alerts for boarding
          if (json.alertSoundEnabled !== false) {
            for (const dep of json.departures) {
              if (dep.shouldPlayAlert && !announcedRef.current.has(dep.id)) {
                announcedRef.current.add(dep.id);
                setHasAnnouncement(true);
                playBoardingAnnouncement(dep.destination, dep.effectiveTime);
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
  }, [stationId]);

  // ─── Ticker text ─────────────────────────────────────
  const tickerText = useMemo(() => {
    if (!data) return '';
    const msgs = data.tickerMessages?.filter(m => m.active) || [];
    if (msgs.length === 0) return '';
    return msgs.map(m => `${m.priority === 'urgent' ? '🚨 ' : ''}${m.text}`).join('    —    ');
  }, [data]);

  // ─── Resolve ad media URL ──────────────────────────
  const resolveAdMedia = useCallback((ad: SignageAd) => {
    // Priority: videoUrl > mediaType VIDEO+mediaUrl > imageUrl > mobileImageUrl > mediaUrl
    const ytUrl = getYouTubeEmbedUrl(ad.videoUrl || ad.imageUrl || ad.mediaUrl);
    if (ytUrl) return { type: 'youtube' as const, url: ytUrl };

    if (ad.videoUrl) return { type: 'video' as const, url: ad.videoUrl };
    if (ad.mediaType === 'VIDEO' && ad.mediaUrl) return { type: 'video' as const, url: ad.mediaUrl };
    if (isPortraitRef.current && ad.mobileImageUrl) return { type: 'image' as const, url: ad.mobileImageUrl };
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
      <div className="sp-root">
        <div className="sp-loading">
          <div className="sp-spinner" />
          <p className="sp-loading-text">Chargement des informations...</p>
        </div>
        <style>{spStyles.loading}</style>
      </div>
    );
  }

  // ─── Not found state ──────────────────────────────
  if (notFound) {
    return (
      <div className="sp-root">
        <div className="sp-loading">
          <div className="sp-notfound-icon">⚠️</div>
          <p className="sp-loading-text">Station non trouvée</p>
          <p className="sp-loading-sub">Cette gare n&apos;existe pas ou est désactivée.</p>
        </div>
        <style>{spStyles.loading}</style>
      </div>
    );
  }

  // After loading + notFound guards, data is guaranteed non-null
  if (!data) return null;
  const stationName = data.stationName || 'Gare Routière';
  const slug = data.slug || stationId;

  return (
    <div className="sp-root" ref={rootRef}>
      <style>{spStyles.main(cursorHidden)}</style>

      {/* ─── TICKER BANDEAU ────────────────────────── */}
      {tickerText && (
        <div className="sp-ticker-wrap">
          <div className="sp-ticker">{tickerText}</div>
        </div>
      )}

      {/* ─── HEADER ────────────────────────────────── */}
      <header className="sp-header">
        <div className="sp-header__left">
          {data.logoUrl ? (
            <img className="sp-header__logo" src={data.logoUrl} alt="Logo" />
          ) : (
            <div className="sp-header__logo-fallback">ST</div>
          )}
          <div>
            <h1 className="sp-header__name">{stationName}</h1>
            <span className="sp-header__city">{data.city || ''}</span>
          </div>
        </div>
        <div className="sp-header__right">
          <div className="sp-clock">{currentTime}</div>
          <div className="sp-date">{currentDate}</div>
        </div>
      </header>

      {/* ─── MOBILE TAB BAR ───────────────────────── */}
      <div className="sp-tabs">
        <button
          className={['sp-tab', activeTab === 'departures' ? 'sp-tab--active' : ''].join(' ')}
          onClick={() => setActiveTab('departures')}
        >
          DÉPARTS ({data.departures.length})
        </button>
        <button
          className={['sp-tab', activeTab === 'arrivals' ? 'sp-tab--active' : ''].join(' ')}
          onClick={() => setActiveTab('arrivals')}
        >
          ARRIVÉES ({data.arrivals.length})
        </button>
      </div>

      {/* ─── CONTENT: 2 Columns OR End of Day ──── */}
      {data.departures.length === 0 && data.arrivals.length === 0 ? (
        <main className="sp-eod-wrap">
          <div className="sp-eod-moon">{'\uD83C\uDF19'}</div>
          <h2 className="sp-eod-title">Fin des d&eacute;parts aujourd&apos;hui</h2>
          <p className="sp-eod-sub">Merci de votre confiance. &Agrave; demain !</p>
          {data.nextDayPreview && data.nextDayPreview.length > 0 && (
            <div className="sp-eod-next">
              <p className="sp-eod-next-label">Prochains d&eacute;parts demain</p>
              {data.nextDayPreview.map((d) => (
                <div key={d.id} className="sp-eod-next-item">
                  <span className="sp-eod-next-time">{d.time}</span>
                  <span className="sp-eod-next-arrow">&rarr;</span>
                  <span className="sp-eod-next-dest">{d.destination}</span>
                </div>
              ))}
            </div>
          )}
          {data.nextDayFirstDeparture && (
            <p className="sp-eod-first">
              Prochain d&eacute;part demain &agrave;{' '}
              <span className="sp-eod-first-time">{data.nextDayFirstDeparture}</span>
            </p>
          )}
        </main>
      ) : (
        <main className="sp-content">
        {/* Départs Column */}
        <div className={['sp-col', activeTab === 'departures' ? 'sp-col--active' : ''].join(' ')}>
          <BoardSection
            title="DÉPARTS"
            count={data.departures.length}
            accentClass="sp-board__head--depart"
          >
            {data.departures.length === 0 ? (
              <div className="sp-empty">Aucun départ prévu</div>
            ) : (
              data.departures.map(dep => <DepartureCard key={dep.id} dep={dep} />)
            )}
          </BoardSection>
        </div>

        {/* Arrivées Column */}
        <div className={['sp-col', activeTab === 'arrivals' ? 'sp-col--active' : ''].join(' ')}>
          <BoardSection
            title="ARRIVÉES"
            count={data.arrivals.length}
            accentClass="sp-board__head--arrive"
          >
            {data.arrivals.length === 0 ? (
              <div className="sp-empty">Aucune arrivée prévue</div>
            ) : (
              data.arrivals.map(arr => <ArrivalCard key={arr.id} arr={arr} />)
            )}
          </BoardSection>
        </div>
        </main>
      )}

      {/* ─── FOOTER ────────────────────────────────── */}
      <footer className="sp-footer">
        <div className="sp-footer__left">
          <span className="sp-footer__date">{currentDate}</span>
          <span className="sp-footer__city">{data.city || ''}</span>
        </div>
        <div className="sp-footer__center">
          <QRCodeSVG
            value={`/signage/${slug}`}
            size={56}
            bgColor="#ffffff"
            fgColor="#0b0f19"
            level="M"
          />
          <span className="sp-footer__qr-label">Scanner</span>
        </div>
        <div className="sp-footer__right">
          <span className="sp-footer__brand">SmarticketS</span>
        </div>
      </footer>

      {/* ─── FULLSCREEN BUTTON ────────────────────── */}
      <button
        className="sp-fs-btn"
        onClick={() => toggleFullscreen(rootRef.current)}
        aria-label="Plein écran"
      >
        ⛶
      </button>

      {/* ─── OFFLINE BADGE ────────────────────────── */}
      {offline && (
        <div className="sp-offline-badge">⛔ HORS LIGNE</div>
      )}

      {/* ─── VOICE INDICATOR ──────────────────────── */}
      {hasAnnouncement && (
        <div className="sp-voice-badge">🔊 Annonce en cours</div>
      )}

      {/* ─── LAST UPDATE ─────────────────────────── */}
      {lastUpdate && (
        <div className="sp-last-update">MàJ {lastUpdate}</div>
      )}

      {/* ─── AD OVERLAY ──────────────────────────── */}
      {showAdOverlay && activeAd && (
        <div className="sp-ad-overlay" onClick={dismissAd}>
          <AdMedia ad={activeAd} resolveMedia={resolveAdMedia} />
          <div
            className="sp-ad-progress"
            style={{ animationDuration: `${activeAd.duration}s` }}
          />
          <div className="sp-ad-label">
            PUBLICITÉ — Cliquez pour fermer
          </div>
        </div>
      )}

      {/* ─── DEBUG PANEL ────────────────────────── */}
      {isDebug && (
        <div className="sp-debug">
          <div className="sp-debug__title">DEBUG</div>
          <div className="sp-debug__info">
            Slug: {stationId}<br />
            Départs: {data.departures.length}<br />
            Arrivées: {data.arrivals.length}<br />
            Ads: {ads.length}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Ad Media Sub-component
   ══════════════════════════════════════════════════════════════════════════ */
const AdMedia = memo(function AdMedia({
  ad,
  resolveMedia,
}: {
  ad: SignageAd;
  resolveMedia: (ad: SignageAd) => { type: 'image' | 'video' | 'youtube'; url: string };
}) {
  const media = resolveMedia(ad);

  if (media.type === 'youtube' && media.url) {
    return (
      <iframe
        key={ad.id}
        src={media.url}
        className="sp-ad-frame"
        allow="autoplay; encrypted-media"
        allowFullScreen
        title={ad.title || 'Ad'}
      />
    );
  }

  if (media.type === 'video' && media.url) {
    return (
      <video
        key={ad.id}
        className="sp-ad-video"
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
        className="sp-ad-image"
        src={media.url}
        alt={ad.title || 'Publicité'}
      />
    );
  }

  return <div className="sp-ad-empty">Aucun média</div>;
});

/* ══════════════════════════════════════════════════════════════════════════
   CSS Styles — "Style Aéroport" Premium Card
   All classes prefixed with `sp-` (signage premium) to avoid conflicts.
   ══════════════════════════════════════════════════════════════════════════ */
const spStyles = {
  loading: `
    @keyframes sp-spin { to { transform: rotate(360deg); } }
    .sp-root {
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      width: 100vw; height: 100vh; height: 100dvh;
      overflow: hidden; position: fixed; inset: 0;
      background: #0b0f19; color: #f8fafc;
      display: flex; align-items: center; justify-content: center;
    }
    .sp-loading { text-align: center; }
    .sp-spinner {
      width: 48px; height: 48px; border-radius: 50%;
      border: 4px solid #1e293b; border-top-color: #f97316;
      animation: sp-spin 1s linear infinite;
      margin: 0 auto 1rem;
    }
    .sp-loading-text { color: #94a3b8; font-size: 1.2rem; margin: 0; }
    .sp-loading-sub { color: #64748b; font-size: 0.9rem; margin-top: 0.5rem; }
    .sp-notfound-icon { font-size: 3rem; margin-bottom: 0.5rem; }
  `,

  main: (cursorHidden: boolean) => `
    /* ═══ RESET ═══ */
    *, *::before, *::after { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; overflow: hidden; }

    /* ═══ ROOT ═══ */
    .sp-root {
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
    .sp-ticker-wrap {
      background: #f97316; color: #0b0f19;
      padding: clamp(0.3rem, 0.7vh, 0.6rem) 0;
      overflow: hidden; white-space: nowrap;
      font-weight: 700; font-size: clamp(0.7rem, 1.4vh, 1rem);
      flex-shrink: 0;
    }
    .sp-ticker {
      display: inline-block;
      animation: sp-marquee 45s linear infinite;
      padding-left: 100%;
    }
    @keyframes sp-marquee {
      0% { transform: translateX(0); }
      100% { transform: translateX(-100%); }
    }

    /* ═══ HEADER ═══ */
    .sp-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: clamp(0.6rem, 1.5vh, 1.2rem) clamp(1rem, 2.5vw, 2rem);
      flex-shrink: 0;
      border-bottom: 1px solid #1e293b;
    }
    .sp-header__left {
      display: flex; align-items: center; gap: clamp(0.5rem, 1vw, 1rem);
    }
    .sp-header__logo {
      width: clamp(36px, 5vh, 56px); height: clamp(36px, 5vh, 56px);
      object-fit: contain; border-radius: 8px;
    }
    .sp-header__logo-fallback {
      width: clamp(36px, 5vh, 56px); height: clamp(36px, 5vh, 56px);
      background: #f97316; border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: clamp(0.7rem, 1.5vh, 1.1rem);
      color: #0b0f19; flex-shrink: 0;
    }
    .sp-header__name {
      font-size: clamp(1rem, 2.5vh, 1.75rem);
      font-weight: 700; margin: 0; white-space: nowrap;
      letter-spacing: 0.5px;
    }
    .sp-header__city {
      color: #94a3b8; font-size: clamp(0.6rem, 1.2vh, 0.85rem);
      display: block; margin-top: 0.1rem;
    }
    .sp-header__right { text-align: right; flex-shrink: 0; }

    .sp-clock {
      font-family: ui-monospace, SFMono-Regular, "Cascadia Code", Menlo, Consolas, monospace;
      font-size: clamp(1.2rem, 4vh, 3.5rem);
      font-weight: 700; letter-spacing: 2px; line-height: 1;
      color: #ffffff;
    }
    .sp-date {
      color: #94a3b8; font-size: clamp(0.55rem, 1.1vh, 0.85rem);
      margin-top: 0.2rem; font-weight: 500;
    }

    /* ═══ MOBILE TAB BAR ═══ */
    .sp-tabs {
      display: flex; gap: 0; flex-shrink: 0;
      border-bottom: 1px solid #1e293b;
    }
    .sp-tab {
      flex: 1; padding: clamp(0.4rem, 1vh, 0.7rem);
      background: transparent; border: none; color: #94a3b8;
      font-weight: 700; font-size: clamp(0.7rem, 1.3vh, 0.95rem);
      text-transform: uppercase; letter-spacing: 0.5px;
      cursor: pointer; transition: all 0.2s ease;
      border-bottom: 2px solid transparent;
    }
    .sp-tab--active {
      color: #f97316;
      border-bottom-color: #f97316;
      background: rgba(249, 115, 22, 0.08);
    }

    /* ═══ CONTENT: 2 Columns ═══ */
    .sp-content {
      flex: 1; display: flex; gap: clamp(0.5rem, 1.5vw, 1rem);
      padding: clamp(0.5rem, 1.2vh, 1rem) clamp(0.8rem, 2vw, 1.5rem);
      min-height: 0; overflow: hidden;
    }
    .sp-col { flex: 1; display: flex; flex-direction: column; min-height: 0; }

    /* ═══ BOARD (column container) ═══ */
    .sp-board {
      flex: 1; display: flex; flex-direction: column;
      background: #0b0f19; border-radius: clamp(8px, 1vh, 12px);
      overflow: hidden; min-height: 0;
    }
    .sp-board__head {
      padding: clamp(0.5rem, 1.2vh, 0.9rem) clamp(0.8rem, 1.5vw, 1.2rem);
      display: flex; justify-content: space-between; align-items: center;
      flex-shrink: 0;
      border-radius: clamp(8px, 1vh, 12px) clamp(8px, 1vh, 12px) 0 0;
    }
    .sp-board__head--depart {
      background: linear-gradient(135deg, #f97316, #ea580c);
    }
    .sp-board__head--arrive {
      background: linear-gradient(135deg, #0ea5e9, #0284c7);
    }
    .sp-board__title {
      font-weight: 800; font-size: clamp(0.75rem, 1.5vh, 1.15rem);
      text-transform: uppercase; letter-spacing: 1px; color: #ffffff;
    }
    .sp-board__count {
      background: rgba(255,255,255,0.2); color: #fff;
      padding: 0.15em 0.6em; border-radius: 999px;
      font-size: clamp(0.6rem, 1.1vh, 0.85rem); font-weight: 700;
    }
    .sp-board__body {
      flex: 1; overflow-y: auto; overflow-x: hidden; min-height: 0;
      padding: clamp(0.3rem, 0.6vh, 0.5rem);
    }
    /* Custom scrollbar */
    .sp-board__body::-webkit-scrollbar { width: 6px; }
    .sp-board__body::-webkit-scrollbar-track { background: #0b0f19; }
    .sp-board__body::-webkit-scrollbar-thumb {
      background: #1e293b; border-radius: 3px;
    }
    .sp-board__body::-webkit-scrollbar-thumb:hover { background: #334155; }

    /* ═══ CARD (departure / arrival item) ═══ */
    .sp-card {
      background: #131a2b;
      border: 1px solid #1e293b;
      border-radius: clamp(8px, 1vh, 12px);
      padding: clamp(0.6rem, 1.2vh, 1rem) clamp(0.8rem, 1.5vw, 1.2rem);
      margin-bottom: clamp(0.3rem, 0.6vh, 0.5rem);
      transition: all 0.3s ease;
    }
    .sp-card:last-child { margin-bottom: 0; }

    /* Card row: time + route + status */
    .sp-card__row {
      display: flex; align-items: center; gap: clamp(0.5rem, 1vw, 0.8rem);
    }

    /* Time */
    .sp-card__time {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: clamp(1.1rem, 2.5vh, 1.75rem);
      font-weight: 700; color: #ffffff;
      flex-shrink: 0; min-width: clamp(52px, 8vw, 80px);
      text-align: center;
    }
    .sp-card__time--orange { color: #f97316; }

    /* Route */
    .sp-card__route {
      flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.15rem;
    }
    .sp-card__line {
      font-size: clamp(0.5rem, 0.9vh, 0.7rem);
      color: #64748b; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .sp-card__route-text {
      font-size: clamp(0.8rem, 1.8vh, 1.25rem);
      font-weight: 600; color: #ffffff;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .sp-card__arrow { color: #f97316; font-weight: 400; }
    .sp-card__dest-here {
      color: #0ea5e9; font-weight: 700;
    }

    /* Badge */
    .sp-card__badge {
      flex-shrink: 0;
      font-size: clamp(0.5rem, 1vh, 0.75rem);
      font-weight: 700; text-transform: uppercase;
      padding: 0.2em 0.6em; border-radius: 6px;
      white-space: nowrap; letter-spacing: 0.3px;
    }

    /* Status colors */
    .sp-status--green {
      background: rgba(34, 197, 94, 0.15); color: #22c55e;
      border: 1px solid rgba(34, 197, 94, 0.3);
    }
    .sp-status--orange {
      background: rgba(249, 115, 22, 0.2); color: #f97316;
      border: 1px solid #f97316;
      animation: sp-blink 1.2s infinite;
    }
    .sp-status--amber {
      background: rgba(245, 158, 11, 0.15); color: #f59e0b;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }
    .sp-status--red {
      background: rgba(239, 68, 68, 0.15); color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }
    .sp-status--slate {
      background: rgba(100, 116, 139, 0.15); color: #64748b;
      border: 1px solid rgba(100, 116, 139, 0.2);
    }

    /* Sub row: platform + seats + countdown */
    .sp-card__sub {
      display: flex; align-items: center; gap: clamp(0.4rem, 0.8vw, 0.7rem);
      margin-top: clamp(0.2rem, 0.4vh, 0.4rem);
      padding-top: clamp(0.15rem, 0.3vh, 0.3rem);
      border-top: 1px solid #1e293b;
      font-size: clamp(0.55rem, 1vh, 0.75rem);
      color: #94a3b8;
    }
    .sp-card__platform {
      font-weight: 600; color: #64748b;
      padding: 0.1em 0.4em; background: #1e293b;
      border-radius: 4px;
    }
    .sp-card__seats { font-weight: 500; }
    .sp-card__countdown { color: #f97316; font-weight: 600; margin-left: auto; }
    .sp-card__delay-info { color: #f59e0b; font-weight: 600; }
    .sp-card__struck { text-decoration: line-through; opacity: 0.5; }

    /* ═══ BOARDING CARD ═══ */
    .sp-card--boarding {
      border-left: 4px solid #f97316;
      background: rgba(249, 115, 22, 0.08);
      animation: sp-pulse-bg 2s infinite;
    }

    /* ═══ DEPARTED CARD ═══ */
    .sp-card--departed { opacity: 0.4; }

    /* ═══ CANCELLED CARD ═══ */
    .sp-card--cancelled { opacity: 0.5; }

    /* ═══ EMPTY STATE ═══ */
    .sp-empty {
      text-align: center; padding: clamp(2rem, 5vh, 4rem);
      color: #64748b; font-size: clamp(0.85rem, 1.5vh, 1.1rem);
    }

    /* ═══ END OF DAY SCREEN ═══ */
    .sp-eod-wrap {
      flex: 1; display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      text-align: center; padding: clamp(2rem, 5vh, 4rem);
    }
    .sp-eod-moon {
      font-size: clamp(3rem, 8vh, 6rem);
      margin-bottom: clamp(0.8rem, 2vh, 1.5rem);
      animation: sp-moon-pulse 4s ease-in-out infinite;
    }
    @keyframes sp-moon-pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.8; transform: scale(1.05); }
    }
    .sp-eod-title {
      font-size: clamp(1.3rem, 3.5vh, 2.5rem);
      font-weight: 800; color: #f8fafc; margin: 0;
      letter-spacing: 0.5px;
    }
    .sp-eod-sub {
      font-size: clamp(0.9rem, 2vh, 1.3rem);
      color: #94a3b8; margin-top: clamp(0.3rem, 0.8vh, 0.6rem);
      margin-bottom: clamp(1rem, 3vh, 2rem);
    }
    .sp-eod-next {
      background: rgba(249, 115, 22, 0.08);
      border: 1px solid rgba(249, 115, 22, 0.2);
      border-radius: clamp(8px, 1.5vh, 16px);
      padding: clamp(0.8rem, 2vh, 1.5rem) clamp(1.5rem, 3vw, 2.5rem);
      min-width: clamp(200px, 30vw, 360px);
    }
    .sp-eod-next-label {
      font-size: clamp(0.6rem, 1.1vh, 0.85rem);
      font-weight: 700; color: #f97316;
      text-transform: uppercase; letter-spacing: 1px;
      margin: 0 0 clamp(0.5rem, 1vh, 0.8rem) 0;
    }
    .sp-eod-next-item {
      display: flex; align-items: center; gap: clamp(0.4rem, 1vw, 0.8rem);
      padding: clamp(0.25rem, 0.6vh, 0.5rem) 0;
      font-size: clamp(0.8rem, 1.6vh, 1.15rem);
    }
    .sp-eod-next-item + .sp-eod-next-item {
      border-top: 1px solid rgba(249, 115, 22, 0.1);
    }
    .sp-eod-next-time {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-weight: 700; color: #ffffff; min-width: 50px;
    }
    .sp-eod-next-arrow { color: #f97316; font-weight: 300; }
    .sp-eod-next-dest { color: #e2e8f0; font-weight: 500; }
    .sp-eod-first {
      font-size: clamp(0.7rem, 1.3vh, 1rem);
      color: #64748b; margin-top: clamp(0.6rem, 1.5vh, 1.2rem);
      margin-bottom: 0;
    }
    .sp-eod-first-time {
      color: #f97316; font-weight: 700;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }

    /* ═══ FOOTER ═══ */
    .sp-footer {
      display: flex; justify-content: space-between; align-items: center;
      padding: clamp(0.5rem, 1vh, 0.8rem) clamp(1rem, 2vw, 2rem);
      border-top: 1px solid #1e293b;
      flex-shrink: 0;
      margin-top: auto;
    }
    .sp-footer__left {
      display: flex; flex-direction: column; gap: 0.1rem;
    }
    .sp-footer__date {
      font-size: clamp(0.55rem, 1vh, 0.75rem);
      color: #94a3b8; font-weight: 500;
    }
    .sp-footer__city {
      font-size: clamp(0.5rem, 0.9vh, 0.65rem);
      color: #64748b;
    }
    .sp-footer__center {
      display: flex; flex-direction: column; align-items: center; gap: 0.2rem;
      background: #ffffff; padding: clamp(4px, 0.5vh, 6px);
      border-radius: 8px;
    }
    .sp-footer__qr-label {
      font-size: clamp(0.4rem, 0.7vh, 0.55rem);
      color: #64748b; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .sp-footer__right { display: flex; align-items: center; }
    .sp-footer__brand {
      font-weight: 800; font-size: clamp(0.7rem, 1.3vh, 1rem);
      color: #f97316; letter-spacing: 0.5px;
    }

    /* ═══ FULLSCREEN BUTTON ═══ */
    .sp-fs-btn {
      position: fixed; top: clamp(6px, 1vh, 12px); right: clamp(6px, 1vw, 12px);
      width: clamp(32px, 4vh, 44px); height: clamp(32px, 4vh, 44px);
      background: rgba(255,255,255,0.05); border: 1px solid #1e293b;
      border-radius: 8px; color: #94a3b8;
      font-size: clamp(0.8rem, 1.5vh, 1.2rem);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; z-index: 50; transition: all 0.2s;
    }
    .sp-fs-btn:hover {
      background: rgba(255,255,255,0.1); color: #ffffff;
      border-color: #f97316;
    }

    /* ═══ OFFLINE BADGE ═══ */
    .sp-offline-badge {
      position: fixed; top: 50px; right: 12px;
      background: #ef4444; color: #fff;
      padding: 6px 14px; border-radius: 8px;
      font-weight: 700; font-size: 0.75rem; z-index: 200;
      animation: sp-blink 1s infinite;
    }

    /* ═══ VOICE INDICATOR ═══ */
    .sp-voice-badge {
      position: fixed; top: 50px; left: 12px;
      background: rgba(249, 115, 22, 0.9); color: #fff;
      padding: 6px 14px; border-radius: 8px;
      font-weight: 600; font-size: 0.7rem; z-index: 200;
    }

    /* ═══ LAST UPDATE ═══ */
    .sp-last-update {
      position: fixed; bottom: 8px; left: 8px;
      background: rgba(0,0,0,0.5); color: rgba(255,255,255,0.6);
      padding: 3px 8px; border-radius: 4px;
      font-size: 0.6rem; z-index: 50;
    }

    /* ═══ AD OVERLAY ═══ */
    .sp-ad-overlay {
      position: fixed; inset: 0; z-index: 100; background: #000;
      display: flex; align-items: center; justify-content: center;
      animation: sp-fadein 0.5s ease; cursor: pointer;
    }
    .sp-ad-overlay img,
    .sp-ad-overlay video,
    .sp-ad-overlay iframe {
      width: 100%; height: 100%;
    }
    .sp-ad-overlay img { object-fit: cover; }
    .sp-ad-overlay video { object-fit: contain; }
    .sp-ad-image, .sp-ad-video, .sp-ad-frame {
      display: block; width: 100%; height: 100%;
    }
    .sp-ad-image { object-fit: cover; }
    .sp-ad-video { object-fit: contain; }
    .sp-ad-frame { border: none; }
    .sp-ad-progress {
      position: absolute; bottom: 0; left: 0; height: 4px;
      background: #f97316;
      animation: sp-ad-progress linear forwards;
    }
    .sp-ad-label {
      position: absolute; top: clamp(8px, 2vh, 16px); right: clamp(8px, 2vw, 20px);
      background: rgba(0,0,0,0.7); color: rgba(255,255,255,0.7);
      padding: 4px 10px; border-radius: 6px;
      font-size: clamp(0.55rem, 1vh, 0.75rem); font-weight: 600;
    }
    .sp-ad-empty {
      color: #64748b; font-size: 1rem;
    }

    /* ═══ DEBUG PANEL ═══ */
    .sp-debug {
      position: fixed; bottom: 20px; right: 20px;
      background: #131a2b; padding: 0.8rem 1rem; border-radius: 10px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 1px solid #1e293b;
      z-index: 200; max-width: 200px;
    }
    .sp-debug__title {
      font-weight: 800; font-size: 0.7rem; color: #f97316;
      text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.4rem;
    }
    .sp-debug__info {
      font-size: 0.65rem; color: #94a3b8; line-height: 1.5;
    }

    /* ═══ ANIMATIONS ═══ */
    @keyframes sp-blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    @keyframes sp-pulse-bg {
      0%, 100% { background: rgba(249, 115, 22, 0.08); }
      50% { background: rgba(249, 115, 22, 0.15); }
    }
    @keyframes sp-fadein {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes sp-ad-progress {
      from { width: 0; }
      to { width: 100%; }
    }

    /* ═══ RESPONSIVE: Mobile (< 768px) ═══ */
    @media (max-width: 767px) {
      .sp-tabs { display: flex; }
      .sp-content { flex-direction: column; }
      .sp-col { display: none; }
      .sp-col--active { display: flex; }
      .sp-header__name { font-size: 0.9rem; }
      .sp-header__city { display: none; }
      .sp-clock { font-size: 1.2rem; }
      .sp-date { font-size: 0.6rem; }
      .sp-card { padding: 0.5rem; margin-bottom: 0.3rem; }
      .sp-card__time { font-size: 0.9rem; min-width: 48px; }
      .sp-card__line { display: none; }
      .sp-card__route-text { font-size: 0.8rem; }
      .sp-card__badge { font-size: 0.5rem; padding: 0.15em 0.4em; }
      .sp-card__sub { font-size: 0.55rem; gap: 0.3rem; margin-top: 0.2rem; padding-top: 0.15rem; }
      .sp-footer { padding: 0.4rem 0.6rem; }
      .sp-footer__center { padding: 3px; }
      .sp-footer__brand { font-size: 0.6rem; }
      .sp-footer__qr-label { display: none; }
      .sp-fs-btn { width: 28px; height: 28px; font-size: 0.7rem; top: 4px; right: 4px; }
      .sp-ad-label { font-size: 0.5rem; }
    }

    /* ═══ RESPONSIVE: Tablet (768px – 1023px) ═══ */
    @media (min-width: 768px) and (max-width: 1023px) {
      .sp-tabs { display: none; }
      .sp-col { display: flex; }
      .sp-clock { font-size: 2rem; }
      .sp-card__time { font-size: 1.3rem; }
      .sp-card__route-text { font-size: 1rem; }
    }

    /* ═══ RESPONSIVE: Desktop/TV (1024px+) ═══ */
    @media (min-width: 1024px) {
      .sp-tabs { display: none; }
      .sp-col { display: flex; }
    }

    /* ═══ RESPONSIVE: Large TV (≥ 1920px) ═══ */
    @media (min-width: 1920px) {
      .sp-header { padding: 1.2rem 2.5rem; }
      .sp-header__name { font-size: 2rem; }
      .sp-header__city { font-size: 1rem; }
      .sp-clock { font-size: 4rem; }
      .sp-date { font-size: 1.1rem; }
      .sp-content { padding: 1.5rem 2rem; gap: 1.5rem; }
      .sp-board__head { padding: 1rem 1.5rem; }
      .sp-board__title { font-size: 1.3rem; }
      .sp-card { padding: 1.2rem 1.5rem; margin-bottom: 0.8rem; border-radius: 16px; }
      .sp-card__time { font-size: 2rem; min-width: 100px; }
      .sp-card__route-text { font-size: 1.6rem; }
      .sp-card__badge { font-size: 0.85rem; padding: 0.3em 0.8em; }
      .sp-card__sub { font-size: 0.85rem; margin-top: 0.5rem; padding-top: 0.4rem; }
      .sp-footer { padding: 1.2rem 2rem; }
      .sp-footer__brand { font-size: 1.2rem; }
    }

    /* ═══ RESPONSIVE: 4K (≥ 2560px) ═══ */
    @media (min-width: 2560px) {
      .sp-header { padding: 1.5rem 3rem; }
      .sp-header__name { font-size: 2.5rem; }
      .sp-clock { font-size: 5rem; letter-spacing: 4px; }
      .sp-date { font-size: 1.3rem; }
      .sp-content { padding: 2rem 3rem; gap: 2rem; }
      .sp-board__head { padding: 1.2rem 2rem; }
      .sp-board__title { font-size: 1.5rem; }
      .sp-card { padding: 1.5rem 2rem; margin-bottom: 1rem; border-radius: 20px; }
      .sp-card__time { font-size: 2.5rem; min-width: 130px; }
      .sp-card__route-text { font-size: 2rem; }
      .sp-card__badge { font-size: 1rem; }
      .sp-card__sub { font-size: 1rem; margin-top: 0.6rem; padding-top: 0.5rem; }
      .sp-footer { padding: 1.5rem 3rem; }
      .sp-footer__brand { font-size: 1.5rem; }
    }
  `,
};
