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
  destinationCity: string;
  scheduledTime: string;
  effectiveTime: string;
  platform: string | null;
  status: string;
  delayMinutes: number;
  countdownMin: number;
  countdownSec: number;
  shouldPlayAlert: boolean;
  availableSeats: number;
  totalSeats: number;
  fillRate: number;
  weather: { temp: number; emoji: string; description: string } | null;
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

interface NextDayPreview {
  id: string;
  time: string;
  destination: string;
  lineNumber: string;
  isNextDay: boolean;
}

interface SupervisionPlatform {
  name: string;
  departures: Departure[];
}

interface MapPlatform {
  id: string;
  label: string;
  x: number;
  y: number;
  currentCount: number;
}

interface StationMapData {
  name: string;
  platforms: MapPlatform[];
}

interface StationData {
  stationId: string;
  stationName: string;
  city: string;
  slug: string;
  viewMode: string;
  currentTime: string;
  currentDate: string;
  currentTimestamp: number;
  departures: Departure[];
  arrivals: Arrival[];
  alertSoundEnabled: boolean;
  tickerMessages: TickerMessage[];
  emergencyMessages: TickerMessage[];
  logoUrl: string;
  nextDayPreview: NextDayPreview[];
  nextDayFirstDeparture: string | null;
  supervisionPlatforms: SupervisionPlatform[];
  platformCount: number;
  stationMap: StationMapData;
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
    case 'SCHEDULED': return "\u00C0 l'heure";
    case 'BOARDING': return 'EMBARQUEMENT';
    case 'DEPARTED': return 'Parti';
    case 'CANCELLED': return 'Annul\u00E9';
    case 'DELAYED': return `Retard ${delayMinutes} min`;
    default: return status;
  }
}

function getStatusClass(status: string): string {
  switch (status) {
    case 'SCHEDULED': return 'sps-status--green';
    case 'BOARDING': return 'sps-status--orange';
    case 'DEPARTED': return 'sps-status--slate';
    case 'CANCELLED': return 'sps-status--red';
    case 'DELAYED': return 'sps-status--amber';
    default: return 'sps-status--green';
  }
}

function getCountdownColorClass(remainingSec: number): string {
  if (remainingSec <= 0) return 'sps-cd--departed';
  const mins = remainingSec / 60;
  if (mins < 5) return 'sps-cd--red';
  if (mins < 15) return 'sps-cd--orange';
  if (mins < 30) return 'sps-cd--yellow';
  if (mins < 60) return 'sps-cd--blue';
  return 'sps-cd--white';
}

function getDelayLevel(delayMinutes: number): 'yellow' | 'orange' | 'red' {
  if (delayMinutes > 30) return 'red';
  if (delayMinutes > 15) return 'orange';
  return 'yellow';
}

function formatCountdown(remainingSec: number): string {
  if (remainingSec <= 0) return 'PARTI';
  const m = Math.floor(remainingSec / 60);
  const s = remainingSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
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
   Departure Card — Live countdown, weather, delay, fill rate
   ══════════════════════════════════════════════════════════════════════════ */
function DepartureCard({
  dep,
  apiTimestamp,
  now,
}: {
  dep: Departure;
  apiTimestamp: number;
  now: number;
}) {
  const isBoarding = dep.status === 'BOARDING';
  const isDeparted = dep.status === 'DEPARTED';
  const isCancelled = dep.status === 'CANCELLED';
  const isDelayed = dep.status === 'DELAYED';

  const initialRemaining = (dep.countdownMin || 0) * 60 + (dep.countdownSec || 0);
  const remaining = isDeparted
    ? 0
    : Math.max(0, initialRemaining - Math.floor((now - apiTimestamp) / 1000));

  const countdownStr = formatCountdown(remaining);
  const cdColorClass = isDeparted ? 'sps-cd--departed' : getCountdownColorClass(remaining);
  const cdPulse = remaining > 0 && remaining < 300 && !isDeparted;
  const boardingPulse = isBoarding && remaining > 0;

  const delayLevel = isDelayed ? getDelayLevel(dep.delayMinutes) : null;

  return (
    <div
      className={[
        'sps-card',
        isBoarding ? 'sps-card--boarding' : '',
        isDeparted ? 'sps-card--departed' : '',
        isCancelled ? 'sps-card--cancelled' : '',
        isDelayed ? 'sps-card--delayed' : '',
      ].join(' ')}
    >
      {/* Top row: Time + Route + Status */}
      <div className="sps-card__row">
        <div
          className={[
            'sps-card__time',
            cdColorClass,
            cdPulse ? 'sps-card__time--pulse' : '',
            boardingPulse ? 'sps-card__time--boarding-pulse' : '',
          ].join(' ')}
        >
          {isDelayed && dep.scheduledTime !== dep.effectiveTime ? (
            <div className="sps-card__time-block">
              <span className="sps-card__time-old">{dep.scheduledTime}</span>
              <span className="sps-card__time-new">{dep.effectiveTime}</span>
            </div>
          ) : (
            <span>{isDeparted ? '---' : dep.effectiveTime}</span>
          )}
          <span className="sps-card__countdown-live">{countdownStr}</span>
        </div>
        <div className="sps-card__route">
          <span className="sps-card__line">{dep.lineNumber}</span>
          <span className="sps-card__route-text">
            {dep.origin}
            <span className="sps-card__arrow">{'\u00A0\u279C\u00A0'}</span>
            <span className={isCancelled ? 'sps-card__struck' : ''}>
              {dep.destination}
            </span>
            {dep.weather && (
              <span className="sps-card__weather">
                {dep.weather.emoji} {dep.weather.temp}&deg;
              </span>
            )}
          </span>
        </div>
        <div className="sps-card__right-badges">
          {isDelayed && delayLevel && (
            <span className={['sps-card__delay-badge', `sps-card__delay-badge--${delayLevel}`].join(' ')}>
              {delayLevel === 'red' ? '\uD83D\uDEA8' : '\u26A0\uFE0F'} Retard {dep.delayMinutes} min
            </span>
          )}
          <div className={['sps-card__badge', getStatusClass(dep.status)].join(' ')}>
            {getStatusLabel(dep.status, dep.delayMinutes)}
          </div>
        </div>
      </div>
      {/* Sub row: Platform + Seats + Fill rate */}
      <div className="sps-card__sub">
        {dep.platform && (
          <span className="sps-card__platform">Quai {dep.platform}</span>
        )}
        <span className="sps-card__seats">
          {dep.availableSeats}/{dep.totalSeats} places
        </span>
        {(dep.fillRate > 0 || dep.totalSeats > 0) && (
          <span className="sps-card__fillrate">
            <span
              className="sps-card__fillrate-bar"
              style={{ width: `${Math.min(100, dep.fillRate || 0)}%` }}
            />
            <span className="sps-card__fillrate-label">{dep.fillRate || 0}%</span>
          </span>
        )}
      </div>
    </div>
  );
}

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
          <span className="sps-card__platform">Quai {arr.platform}</span>
        )}
        {isDelayed && (
          <span className="sps-card__delay-info">Retard {arr.delayMinutes} min</span>
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
   Supervision Screen — Grid of platform cards
   ══════════════════════════════════════════════════════════════════════════ */
function SupervisionScreen({ platforms }: { platforms: SupervisionPlatform[] }) {
  if (!platforms || platforms.length === 0) {
    return <div className="sps-empty">Aucune plateforme de supervision</div>;
  }

  return (
    <main className="sps-supervision">
      <div className="sps-supervision__header">
        <span className="sps-supervision__title">SUPERVISION</span>
        <span className="sps-supervision__platform-count">{platforms.length} quais</span>
      </div>
      <div className="sps-supervision__grid">
        {platforms.map((pl) => {
          const activeDeps = pl.departures.filter(
            (d) => d.status !== 'DEPARTED' && d.status !== 'CANCELLED'
          );
          const next3 = activeDeps.slice(0, 3);
          const isEmpty = next3.length === 0;

          return (
            <div
              key={pl.name}
              className={[
                'sps-supervision__card',
                isEmpty ? 'sps-supervision__card--empty' : 'sps-supervision__card--active',
              ].join(' ')}
            >
              <div className="sps-supervision__card-head">
                <span className="sps-supervision__card-name">{pl.name}</span>
                <span className="sps-supervision__card-count">{activeDeps.length}</span>
              </div>
              <div className="sps-supervision__card-body">
                {isEmpty ? (
                  <span className="sps-supervision__card-empty">Aucun d&eacute;part</span>
                ) : (
                  next3.map((d) => (
                    <div key={d.id} className="sps-supervision__dep-row">
                      <span className="sps-supervision__dep-time">{d.effectiveTime}</span>
                      <span className="sps-supervision__dep-dest">{d.destination}</span>
                      <span className={['sps-supervision__dep-status', getStatusClass(d.status)].join(' ')}>
                        {getStatusLabel(d.status, d.delayMinutes)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Station Map Screen — SVG floor plan with interactive platforms
   ══════════════════════════════════════════════════════════════════════════ */
function StationMapScreen({
  stationMap,
  supervisionPlatforms,
}: {
  stationMap: StationMapData | null;
  supervisionPlatforms: SupervisionPlatform[];
}) {
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ x: number; y: number } | null>(null);

  if (!stationMap || !stationMap.platforms || stationMap.platforms.length === 0) {
    return <div className="sps-empty">Plan non disponible</div>;
  }

  const handlePlatformClick = (
    platformId: string,
    evt: React.MouseEvent<SVGGElement>
  ) => {
    evt.stopPropagation();
    if (selectedPlatform === platformId) {
      setSelectedPlatform(null);
      setPopoverPos(null);
      return;
    }
    const svgRect = (evt.currentTarget.closest('.sps-stationmap__svg') as SVGSVGElement | null)?.getBoundingClientRect();
    if (svgRect) {
      setPopoverPos({
        x: evt.clientX - svgRect.left,
        y: evt.clientY - svgRect.top,
      });
    }
    setSelectedPlatform(platformId);
  };

  const selectedData = selectedPlatform
    ? supervisionPlatforms?.find(
        (sp) =>
          sp.name === stationMap.platforms.find((p) => p.id === selectedPlatform)?.label ||
          sp.name === `Quai ${stationMap.platforms.find((p) => p.id === selectedPlatform)?.label}`
      )
    : null;

  const selectedPlat = selectedPlatform
    ? stationMap.platforms.find((p) => p.id === selectedPlatform)
    : null;

  return (
    <main className="sps-stationmap">
      <div className="sps-stationmap__header">
        <span className="sps-stationmap__title">PLAN DES QUAIS</span>
        <span className="sps-stationmap__station-name">{stationMap.name}</span>
      </div>
      <div className="sps-stationmap__canvas">
        <svg className="sps-stationmap__svg" viewBox="0 0 1000 500" preserveAspectRatio="xMidYMid meet">
          {/* Background */}
          <rect x="0" y="0" width="1000" height="500" fill="#0b0f19" rx="12" />

          {/* Station outline */}
          <rect x="30" y="30" width="940" height="440" rx="20"
            fill="#0d1220" stroke="#1e293b" strokeWidth="3" strokeDasharray="8 4" />

          {/* Grid lines */}
          <line x1="30" y1="165" x2="970" y2="165" stroke="#131a2b" strokeWidth="1" />
          <line x1="30" y1="335" x2="970" y2="335" stroke="#131a2b" strokeWidth="1" />
          <line x1="345" y1="30" x2="345" y2="470" stroke="#131a2b" strokeWidth="1" />
          <line x1="665" y1="30" x2="665" y2="470" stroke="#131a2b" strokeWidth="1" />

          {/* Entry marker */}
          <g className="sps-stationmap__marker">
            <rect x="2" y="220" width="32" height="60" rx="8" fill="rgba(34,197,94,0.25)" stroke="#22c55e" strokeWidth="2" />
            <text x="18" y="248" textAnchor="middle" fill="#22c55e" fontSize="11" fontWeight="700">IN</text>
          </g>

          {/* Exit marker */}
          <g className="sps-stationmap__marker">
            <rect x="966" y="220" width="32" height="60" rx="8" fill="rgba(239,68,68,0.25)" stroke="#ef4444" strokeWidth="2" />
            <text x="982" y="248" textAnchor="middle" fill="#ef4444" fontSize="11" fontWeight="700">OUT</text>
          </g>

          {/* Platforms */}
          {stationMap.platforms.map((p) => {
            const cx = 60 + (p.x / 100) * 880;
            const cy = 60 + (p.y / 100) * 380;
            const isActive = p.currentCount > 0;
            const isSelected = selectedPlatform === p.id;

            return (
              <g key={p.id} onClick={(evt) => handlePlatformClick(p.id, evt)} style={{ cursor: 'pointer' }}>
                <rect
                  x={cx - 45} y={cy - 30} width="90" height="60" rx="12"
                  fill={isActive ? 'rgba(249,115,22,0.1)' : 'rgba(100,116,139,0.08)'}
                  stroke={isSelected ? '#f97316' : isActive ? '#f97316' : '#475569'}
                  strokeWidth={isSelected ? 3 : 2}
                />
                <text x={cx} y={cy + 4} textAnchor="middle" fill="#e2e8f0"
                  fontSize="14" fontWeight="700">{p.label}</text>
                {isActive && (
                  <>
                    <circle cx={cx + 36} cy={cy - 22} r="13" fill="#f97316" />
                    <text x={cx + 36} y={cy - 18} textAnchor="middle" fill="#fff"
                      fontSize="10" fontWeight="700">{p.currentCount}</text>
                  </>
                )}
              </g>
            );
          })}
        </svg>

        {/* Popover */}
        {selectedPlatform && selectedPlat && (
          <div
            className="sps-stationmap__popover"
            style={{
              left: popoverPos ? `${Math.min(popoverPos.x, window.innerWidth * 0.6)}px` : 'auto',
              top: popoverPos ? `${popoverPos.y}px` : 'auto',
            }}
          >
            <div className="sps-stationmap__popover-head">
              <span>Quai {selectedPlat.label}</span>
              <span className="sps-stationmap__popover-count">{selectedPlat.currentCount} d&eacute;parts</span>
              <button className="sps-stationmap__popover-close" onClick={() => { setSelectedPlatform(null); setPopoverPos(null); }}>&times;</button>
            </div>
            <div className="sps-stationmap__popover-body">
              {selectedData && selectedData.departures.length > 0 ? (
                selectedData.departures.slice(0, 5).map((d) => (
                  <div key={d.id} className="sps-stationmap__popover-row">
                    <span className="sps-stationmap__popover-time">{d.effectiveTime}</span>
                    <span className="sps-stationmap__popover-dest">{d.destination}</span>
                    <span className={['sps-stationmap__popover-status', getStatusClass(d.status)].join(' ')}>
                      {getStatusLabel(d.status, d.delayMinutes)}
                    </span>
                  </div>
                ))
              ) : (
                <span className="sps-stationmap__popover-empty">Aucun d&eacute;part actif</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="sps-stationmap__legend">
        <span className="sps-stationmap__legend-item">
          <span className="sps-stationmap__legend-dot sps-stationmap__legend-dot--active" /> Quai actif
        </span>
        <span className="sps-stationmap__legend-item">
          <span className="sps-stationmap__legend-dot sps-stationmap__legend-dot--empty" /> Quai vide
        </span>
        <span className="sps-stationmap__legend-item">
          <span className="sps-stationmap__legend-dot sps-stationmap__legend-dot--entry" /> Entr&eacute;e
        </span>
        <span className="sps-stationmap__legend-item">
          <span className="sps-stationmap__legend-dot sps-stationmap__legend-dot--exit" /> Sortie
        </span>
      </div>
    </main>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Emergency Announcements Banner
   ══════════════════════════════════════════════════════════════════════════ */
function EmergencyBanner({ messages, now }: { messages: TickerMessage[]; now: number }) {
  const [startTs, setStartTs] = useState(0);

  // Set start time when messages appear; reset when they disappear
  useEffect(() => {
    if (messages.length > 0 && startTs === 0) {
      const t = setTimeout(() => setStartTs(Date.now()), 0);
      return () => clearTimeout(t);
    }
    if (messages.length === 0 && startTs !== 0) {
      const t = setTimeout(() => setStartTs(0), 0);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [messages.length, startTs]);

  const elapsed = startTs > 0 ? now - startTs : 0;
  const visible = messages.length > 0 && elapsed < 5 * 60 * 1000;

  if (!visible) return null;

  return (
    <div className="sps-emergency">
      <div className="sps-emergency__inner">
        {messages.map((msg, idx) => (
          <div key={msg.id || idx} className="sps-emergency__msg">
            <span className="sps-emergency__icon">{'\uD83D\uDEA8'}</span>
            <span className="sps-emergency__text">{msg.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

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
  const [now, setNow] = useState(Date.now());
  const [offline, setOffline] = useState(false);
  const [lastUpdate, setLastUpdate] = useState('');

  // Tab state: 4 tabs
  const [activeTab, setActiveTab] = useState<'departures' | 'arrivals' | 'supervision' | 'plan'>('departures');

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
      const t = new Date();
      setNow(Date.now());
      setCurrentTime(t.toLocaleTimeString('fr-FR', { hour12: false }));
      setCurrentDate(
        t.toLocaleDateString('fr-FR', {
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
        // Ads are non-critical
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

  // ─── Emergency messages ──────────────────────────────
  const emergencyMessages = useMemo(() => {
    if (!data) return [];
    return (data.emergencyMessages || []).filter((m) => m.active);
  }, [data]);

  // ─── Resolve ad media URL ──────────────────────────
  const resolveAdMedia = useCallback((ad: SignageAd) => {
    const ytUrl = getYouTubeEmbedUrl(ad.videoUrl || ad.imageUrl || ad.mediaUrl);
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

  if (!data) return null;
  const stationName = data.stationName || 'Gare Routi\u00E8re';
  const apiTimestamp = data.currentTimestamp || Date.now();

  // Determine content view
  const showSplitView = activeTab === 'departures' || activeTab === 'arrivals';

  return (
    <div className="sps-root" ref={rootRef}>
      <style>{spsStyles.main(cursorHidden)}</style>

      {/* ─── EMERGENCY BANNER ─────────────────────── */}
      <EmergencyBanner messages={emergencyMessages} now={now} />

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
            <img className="sps-header__logo" src={data.logoUrl} alt="Logo" />
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

      {/* ─── TAB BAR (always visible) ──────────────── */}
      <div className="sps-tabs">
        <button
          className={['sps-tab', activeTab === 'departures' ? 'sps-tab--active' : ''].join(' ')}
          onClick={() => setActiveTab('departures')}
        >
          D&Eacute;PARTS ({data.departures.length})
        </button>
        <button
          className={['sps-tab', activeTab === 'arrivals' ? 'sps-tab--active' : ''].join(' ')}
          onClick={() => setActiveTab('arrivals')}
        >
          ARRIV&Eacute;ES ({data.arrivals.length})
        </button>
        <button
          className={['sps-tab', activeTab === 'supervision' ? 'sps-tab--active' : ''].join(' ')}
          onClick={() => setActiveTab('supervision')}
        >
          SUPERVISION ({data.supervisionPlatforms?.length || 0})
        </button>
        <button
          className={['sps-tab', activeTab === 'plan' ? 'sps-tab--active' : ''].join(' ')}
          onClick={() => setActiveTab('plan')}
        >
          PLAN
        </button>
      </div>

      {/* ─── CONTENT ──────────────────────────────── */}
      {activeTab === 'supervision' ? (
        <SupervisionScreen platforms={data.supervisionPlatforms || []} />
      ) : activeTab === 'plan' ? (
        <StationMapScreen
          stationMap={data.stationMap || null}
          supervisionPlatforms={data.supervisionPlatforms || []}
        />
      ) : data.departures.length === 0 && data.arrivals.length === 0 ? (
        /* ═══ END OF DAY SCREEN ═══ */
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
        /* ═══ SPLIT DEPARTURES / ARRIVALS ═══ */
        <main className="sps-content">
          {/* D&eacute;parts Column */}
          <div className={['sps-col', activeTab === 'departures' ? 'sps-col--active' : ''].join(' ')}>
            <BoardSection
              title="D&Eacute;PARTS"
              count={data.departures.length}
              accentClass="sps-board__head--depart"
            >
              {data.departures.length === 0 ? (
                <div className="sps-empty">Aucun d&eacute;part pr&eacute;vu</div>
              ) : (
                data.departures.map((dep) => (
                  <DepartureCard key={dep.id} dep={dep} apiTimestamp={apiTimestamp} now={now} />
                ))
              )}
            </BoardSection>
          </div>

          {/* Arriv&eacute;es Column */}
          <div className={['sps-col', activeTab === 'arrivals' ? 'sps-col--active' : ''].join(' ')}>
            <BoardSection
              title="ARRIV&Eacute;ES"
              count={data.arrivals.length}
              accentClass="sps-board__head--arrive"
            >
              {data.arrivals.length === 0 ? (
                <div className="sps-empty">Aucune arriv&eacute;e pr&eacute;vue</div>
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
        <div className="sps-offline-badge">{'\u26D4'} HORS LIGNE</div>
      )}

      {/* ─── VOICE INDICATOR ──────────────────────── */}
      {hasAnnouncement && (
        <div className="sps-voice-badge">{'\uD83D\uDD0A'} Annonce en cours</div>
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
          <div className="sps-ad-label">PUBLICIT&Eacute; &mdash; Cliquez pour fermer</div>
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
            <br />
            Tab: {activeTab}
            <br />
            Timestamp: {apiTimestamp}
            <br />
            Supervision: {data.supervisionPlatforms?.length || 0}
            <br />
            Platform Count: {data.platformCount || 0}
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
      <iframe key={ad.id} src={media.url} className="sps-ad-frame"
        allow="autoplay; encrypted-media" allowFullScreen title={ad.title || 'Publicit\u00E9'} />
    );
  }
  if (media.type === 'video' && media.url) {
    return (
      <video key={ad.id} className="sps-ad-video" src={media.url}
        autoPlay muted loop playsInline />
    );
  }
  if (media.type === 'image' && media.url) {
    return (
      <img key={ad.id} className="sps-ad-image" src={media.url} alt={ad.title || 'Publicit\u00E9'} />
    );
  }
  return <div className="sps-ad-empty">Aucun m&eacute;dia</div>;
});

/* ══════════════════════════════════════════════════════════════════════════
   CSS Styles — All classes prefixed with `sps-`
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
      background: #0b0f19; color: #ffffff;
      width: 100vw; height: 100vh; height: 100dvh;
      overflow: hidden; display: flex; flex-direction: column;
      user-select: none; -webkit-user-select: none;
      cursor: ${cursorHidden ? 'none' : 'default'};
      touch-action: manipulation; position: fixed; inset: 0;
    }

    /* ═══ EMERGENCY BANNER ═══ */
    .sps-emergency {
      background: linear-gradient(90deg, #dc2626, #b91c1c);
      flex-shrink: 0;
      animation: sps-emergency-pulse-border 2s infinite;
      box-shadow: inset 0 0 0 3px rgba(239,68,68,0.3);
    }
    .sps-emergency__inner {
      padding: clamp(0.4rem, 1vh, 0.8rem) clamp(1rem, 2vw, 2rem);
      display: flex; flex-direction: column; gap: 0.3rem;
    }
    .sps-emergency__msg {
      display: flex; align-items: center; gap: clamp(0.4rem, 0.8vw, 0.8rem);
      color: #ffffff; font-weight: 700;
      font-size: clamp(0.7rem, 1.3vh, 1rem);
    }
    .sps-emergency__icon {
      font-size: 1.2em;
      animation: sps-blink 0.8s infinite;
    }
    .sps-emergency__text {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    @keyframes sps-emergency-pulse-border {
      0%, 100% { box-shadow: inset 0 0 0 3px rgba(239,68,68,0.3); }
      50% { box-shadow: inset 0 0 0 5px rgba(239,68,68,0.7); }
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
      flex-shrink: 0; border-bottom: 1px solid #1e293b;
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
      font-weight: 700; margin: 0; white-space: nowrap; letter-spacing: 0.5px;
    }
    .sps-header__city {
      color: #94a3b8; font-size: clamp(0.6rem, 1.2vh, 0.85rem);
      display: block; margin-top: 0.1rem;
    }
    .sps-header__right { text-align: right; flex-shrink: 0; }
    .sps-clock {
      font-family: ui-monospace, SFMono-Regular, "Cascadia Code", Menlo, Consolas, monospace;
      font-size: clamp(1.2rem, 4vh, 3.5rem);
      font-weight: 700; letter-spacing: 2px; line-height: 1; color: #ffffff;
    }
    .sps-date {
      color: #94a3b8; font-size: clamp(0.55rem, 1.1vh, 0.85rem);
      margin-top: 0.2rem; font-weight: 500;
    }

    /* ═══ TAB BAR (always visible) ═══ */
    .sps-tabs {
      display: flex; gap: 0; flex-shrink: 0;
      border-bottom: 1px solid #1e293b;
      overflow-x: auto; overflow-y: hidden;
      scrollbar-width: none;
    }
    .sps-tabs::-webkit-scrollbar { display: none; }
    .sps-tab {
      flex: 1; min-width: max-content; padding: clamp(0.4rem, 1vh, 0.7rem) clamp(0.6rem, 1.5vw, 1rem);
      background: transparent; border: none; color: #94a3b8;
      font-weight: 700; font-size: clamp(0.6rem, 1.2vh, 0.85rem);
      text-transform: uppercase; letter-spacing: 0.5px;
      cursor: pointer; transition: all 0.2s ease;
      border-bottom: 2px solid transparent;
      white-space: nowrap; font-family: inherit;
    }
    .sps-tab--active {
      color: #f97316; border-bottom-color: #f97316;
      background: rgba(249, 115, 22, 0.08);
    }
    .sps-tab:hover:not(.sps-tab--active) {
      color: #cbd5e1; background: rgba(255,255,255,0.03);
    }

    /* ═══ CONTENT: 2 Columns ═══ */
    .sps-content {
      flex: 1; display: flex; gap: clamp(0.5rem, 1.5vw, 1rem);
      padding: clamp(0.5rem, 1.2vh, 1rem) clamp(0.8rem, 2vw, 1.5rem);
      min-height: 0; overflow: hidden;
    }
    .sps-col { flex: 1; display: flex; flex-direction: column; min-height: 0; }

    /* ═══ BOARD ═══ */
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
    .sps-board__head--depart { background: linear-gradient(135deg, #f97316, #ea580c); }
    .sps-board__head--arrive { background: linear-gradient(135deg, #0ea5e9, #0284c7); }
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
    .sps-board__body::-webkit-scrollbar { width: 6px; }
    .sps-board__body::-webkit-scrollbar-track { background: #0b0f19; }
    .sps-board__body::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 3px; }
    .sps-board__body::-webkit-scrollbar-thumb:hover { background: #334155; }

    /* ═══ CARD ═══ */
    .sps-card {
      background: #131a2b; border: 1px solid #1e293b;
      border-radius: clamp(8px, 1vh, 12px);
      padding: clamp(0.6rem, 1.2vh, 1rem) clamp(0.8rem, 1.5vw, 1.2rem);
      margin-bottom: clamp(0.3rem, 0.6vh, 0.5rem);
      transition: all 0.3s ease;
    }
    .sps-card:last-child { margin-bottom: 0; }

    /* Card row */
    .sps-card__row {
      display: flex; align-items: center; gap: clamp(0.5rem, 1vw, 0.8rem);
    }

    /* Time block with live countdown */
    .sps-card__time {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: clamp(1rem, 2.2vh, 1.6rem);
      font-weight: 700; color: #ffffff;
      flex-shrink: 0; min-width: clamp(60px, 9vw, 90px);
      text-align: center; display: flex; flex-direction: column; gap: 0.1rem;
    }
    .sps-card__time-block { display: flex; flex-direction: column; line-height: 1.1; }
    .sps-card__time-old {
      font-size: 0.7em; text-decoration: line-through; opacity: 0.4; color: #94a3b8;
    }
    .sps-card__time-new { font-size: 1em; }
    .sps-card__countdown-live {
      font-size: clamp(0.7rem, 1.6vh, 1.1rem);
      font-weight: 800; letter-spacing: 1px;
    }

    /* Countdown color classes */
    .sps-cd--white { color: #ffffff; }
    .sps-cd--blue { color: #7dd3fc; }
    .sps-cd--yellow { color: #fbbf24; }
    .sps-cd--orange { color: #f97316; }
    .sps-cd--red { color: #ef4444; }
    .sps-cd--departed { color: #64748b; }

    /* Time pulse animations */
    .sps-card__time--pulse { animation: sps-countdown-pulse 1s infinite; }
    .sps-card__time--boarding-pulse { animation: sps-boarding-pulse 1.5s infinite; }
    @keyframes sps-countdown-pulse {
      0%, 100% { opacity: 1; text-shadow: 0 0 0 transparent; }
      50% { opacity: 0.7; text-shadow: 0 0 8px rgba(239,68,68,0.5); }
    }
    @keyframes sps-boarding-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }

    /* Route */
    .sps-card__route {
      flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.15rem;
    }
    .sps-card__line {
      font-size: clamp(0.5rem, 0.9vh, 0.7rem);
      color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
    }
    .sps-card__route-text {
      font-size: clamp(0.8rem, 1.8vh, 1.25rem);
      font-weight: 600; color: #ffffff;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      display: flex; align-items: center; gap: 0.3rem;
    }
    .sps-card__arrow { color: #f97316; font-weight: 400; flex-shrink: 0; }
    .sps-card__dest-here { color: #0ea5e9; font-weight: 700; }

    /* Weather badge */
    .sps-card__weather {
      display: inline-flex; align-items: center; gap: 0.15rem;
      font-size: clamp(0.5rem, 0.9vh, 0.7rem);
      color: #94a3b8; background: rgba(148,163,184,0.1);
      padding: 0.1em 0.5em; border-radius: 999px;
      flex-shrink: 0; margin-left: 0.2rem;
      font-weight: 600; white-space: nowrap;
    }

    /* Right badges */
    .sps-card__right-badges {
      display: flex; flex-direction: column; gap: 0.2rem;
      flex-shrink: 0; align-items: flex-end;
    }

    /* Delay badge */
    .sps-card__delay-badge {
      font-size: clamp(0.45rem, 0.8vh, 0.65rem);
      font-weight: 700; text-transform: uppercase;
      padding: 0.2em 0.5em; border-radius: 6px;
      white-space: nowrap; letter-spacing: 0.3px;
      animation: sps-blink 2s infinite;
    }
    .sps-card__delay-badge--yellow {
      background: rgba(251,191,36,0.15); color: #fbbf24;
      border: 1px solid rgba(251,191,36,0.3);
    }
    .sps-card__delay-badge--orange {
      background: rgba(249,115,22,0.15); color: #f97316;
      border: 1px solid rgba(249,115,22,0.3);
    }
    .sps-card__delay-badge--red {
      background: rgba(239,68,68,0.15); color: #ef4444;
      border: 1px solid rgba(239,68,68,0.3);
    }

    /* Badge */
    .sps-card__badge {
      flex-shrink: 0;
      font-size: clamp(0.5rem, 1vh, 0.75rem);
      font-weight: 700; text-transform: uppercase;
      padding: 0.2em 0.6em; border-radius: 6px;
      white-space: nowrap; letter-spacing: 0.3px;
    }
    .sps-status--green { background: rgba(34,197,94,0.15); color: #22c55e; border: 1px solid rgba(34,197,94,0.3); }
    .sps-status--orange { background: rgba(249,115,22,0.2); color: #f97316; border: 1px solid #f97316; animation: sps-blink 1.2s infinite; }
    .sps-status--amber { background: rgba(245,158,11,0.15); color: #f59e0b; border: 1px solid rgba(245,158,11,0.3); }
    .sps-status--red { background: rgba(239,68,68,0.15); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); }
    .sps-status--slate { background: rgba(100,116,139,0.15); color: #64748b; border: 1px solid rgba(100,116,139,0.2); }

    /* Sub row */
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
      padding: 0.1em 0.4em; background: #1e293b; border-radius: 4px;
    }
    .sps-card__seats { font-weight: 500; }
    .sps-card__delay-info { color: #f59e0b; font-weight: 600; }
    .sps-card__struck { text-decoration: line-through; opacity: 0.5; }

    /* Fill rate bar */
    .sps-card__fillrate {
      display: inline-flex; align-items: center; gap: 0.3rem;
      flex: 1; min-width: 0;
    }
    .sps-card__fillrate-bar {
      height: 4px; border-radius: 2px;
      background: #f97316; min-width: 4px;
      transition: width 0.5s ease;
    }
    .sps-card__fillrate-label {
      font-size: 0.85em; color: #64748b; font-weight: 600; white-space: nowrap;
    }

    /* Card variants */
    .sps-card--boarding {
      border-left: 4px solid #f97316;
      background: rgba(249, 115, 22, 0.08);
      animation: sps-pulse-bg 2s infinite;
    }
    .sps-card--departed { opacity: 0.4; }
    .sps-card--cancelled { opacity: 0.5; }
    .sps-card--delayed {
      border-color: rgba(251,191,36,0.4);
      animation: sps-delayed-pulse-border 2s infinite;
    }
    @keyframes sps-delayed-pulse-border {
      0%, 100% { border-color: rgba(251,191,36,0.2); }
      50% { border-color: rgba(251,191,36,0.6); }
    }

    /* ═══ SUPERVISION SCREEN ═══ */
    .sps-supervision {
      flex: 1; display: flex; flex-direction: column;
      padding: clamp(0.5rem, 1.2vh, 1rem) clamp(0.8rem, 2vw, 1.5rem);
      min-height: 0; overflow: hidden;
    }
    .sps-supervision__header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: clamp(0.5rem, 1vh, 1rem);
    }
    .sps-supervision__title {
      font-weight: 800; font-size: clamp(0.85rem, 1.8vh, 1.3rem);
      text-transform: uppercase; letter-spacing: 1px; color: #f97316;
    }
    .sps-supervision__platform-count {
      background: rgba(249,115,22,0.15); color: #f97316;
      padding: 0.2em 0.7em; border-radius: 999px;
      font-size: clamp(0.6rem, 1.1vh, 0.85rem); font-weight: 700;
    }
    .sps-supervision__grid {
      flex: 1; display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
      gap: clamp(0.5rem, 1vh, 0.8rem);
      overflow-y: auto; min-height: 0;
    }
    .sps-supervision__grid::-webkit-scrollbar { width: 6px; }
    .sps-supervision__grid::-webkit-scrollbar-track { background: #0b0f19; }
    .sps-supervision__grid::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 3px; }
    .sps-supervision__card {
      background: #131a2b; border-radius: clamp(8px, 1vh, 12px);
      border: 2px solid; overflow: hidden;
      display: flex; flex-direction: column;
    }
    .sps-supervision__card--active { border-color: #22c55e; }
    .sps-supervision__card--empty { border-color: #475569; }
    .sps-supervision__card-head {
      padding: clamp(0.4rem, 0.8vh, 0.7rem) clamp(0.6rem, 1.2vw, 1rem);
      display: flex; justify-content: space-between; align-items: center;
      border-bottom: 1px solid #1e293b;
    }
    .sps-supervision__card-name {
      font-weight: 700; font-size: clamp(0.7rem, 1.3vh, 1rem);
      color: #ffffff;
    }
    .sps-supervision__card-count {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      background: rgba(34,197,94,0.15); color: #22c55e;
      padding: 0.15em 0.5em; border-radius: 999px;
      font-size: clamp(0.6rem, 1vh, 0.85rem); font-weight: 700;
    }
    .sps-supervision__card--empty .sps-supervision__card-count {
      background: rgba(100,116,139,0.15); color: #64748b;
    }
    .sps-supervision__card-body { padding: clamp(0.3rem, 0.6vh, 0.5rem); }
    .sps-supervision__card-empty {
      color: #64748b; font-size: clamp(0.6rem, 1vh, 0.8rem);
      font-style: italic; display: block; padding: 0.3rem 0;
    }
    .sps-supervision__dep-row {
      display: flex; align-items: center; gap: clamp(0.3rem, 0.6vw, 0.5rem);
      padding: clamp(0.15rem, 0.3vh, 0.3rem) 0;
      font-size: clamp(0.55rem, 1vh, 0.75rem);
      border-bottom: 1px solid rgba(30,41,59,0.5);
    }
    .sps-supervision__dep-row:last-child { border-bottom: none; }
    .sps-supervision__dep-time {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-weight: 700; color: #ffffff; min-width: 42px; flex-shrink: 0;
    }
    .sps-supervision__dep-dest {
      flex: 1; min-width: 0; color: #e2e8f0;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      font-weight: 500;
    }
    .sps-supervision__dep-status {
      flex-shrink: 0;
      font-size: clamp(0.45rem, 0.8vh, 0.6rem);
      font-weight: 700; text-transform: uppercase;
      padding: 0.1em 0.4em; border-radius: 4px;
      white-space: nowrap;
    }

    /* ═══ STATION MAP ═══ */
    .sps-stationmap {
      flex: 1; display: flex; flex-direction: column;
      padding: clamp(0.5rem, 1.2vh, 1rem) clamp(0.8rem, 2vw, 1.5rem);
      min-height: 0; overflow: hidden;
    }
    .sps-stationmap__header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: clamp(0.5rem, 1vh, 0.8rem);
    }
    .sps-stationmap__title {
      font-weight: 800; font-size: clamp(0.85rem, 1.8vh, 1.3rem);
      text-transform: uppercase; letter-spacing: 1px; color: #f97316;
    }
    .sps-stationmap__station-name {
      color: #94a3b8; font-size: clamp(0.6rem, 1.1vh, 0.85rem);
    }
    .sps-stationmap__canvas {
      flex: 1; min-height: 0; position: relative;
      border: 1px solid #1e293b; border-radius: clamp(8px, 1vh, 12px);
      overflow: hidden; background: #0b0f19;
    }
    .sps-stationmap__svg {
      width: 100%; height: 100%; display: block;
    }
    .sps-stationmap__svg text {
      pointer-events: none; user-select: none;
    }
    .sps-stationmap__marker rect,
    .sps-stationmap__marker text {
      pointer-events: none;
    }
    .sps-stationmap__legend {
      display: flex; flex-wrap: wrap; gap: clamp(0.4rem, 1vw, 1rem);
      padding-top: clamp(0.4rem, 0.8vh, 0.6rem);
      justify-content: center;
    }
    .sps-stationmap__legend-item {
      display: flex; align-items: center; gap: 0.3rem;
      font-size: clamp(0.5rem, 0.9vh, 0.7rem);
      color: #94a3b8; font-weight: 500;
    }
    .sps-stationmap__legend-dot {
      width: 10px; height: 10px; border-radius: 50%;
      flex-shrink: 0;
    }
    .sps-stationmap__legend-dot--active { background: #f97316; }
    .sps-stationmap__legend-dot--empty { background: #475569; }
    .sps-stationmap__legend-dot--entry { background: #22c55e; }
    .sps-stationmap__legend-dot--exit { background: #ef4444; }

    /* Popover */
    .sps-stationmap__popover {
      position: absolute; z-index: 30;
      background: #1e293b; border: 1px solid #f97316;
      border-radius: 10px; min-width: clamp(180px, 25vw, 280px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.5);
      animation: sps-fadein 0.2s ease;
    }
    .sps-stationmap__popover-head {
      display: flex; align-items: center; gap: 0.5rem;
      padding: clamp(0.4rem, 0.8vh, 0.6rem) clamp(0.6rem, 1vw, 0.8rem);
      border-bottom: 1px solid #334155;
      font-weight: 700; font-size: clamp(0.65rem, 1.1vh, 0.85rem);
      color: #f97316;
    }
    .sps-stationmap__popover-count {
      margin-left: auto; color: #94a3b8; font-weight: 600;
    }
    .sps-stationmap__popover-close {
      background: none; border: none; color: #64748b;
      font-size: 1.2rem; cursor: pointer; padding: 0 0.2rem;
      line-height: 1; margin-left: 0.3rem;
    }
    .sps-stationmap__popover-close:hover { color: #ef4444; }
    .sps-stationmap__popover-body {
      padding: clamp(0.3rem, 0.5vh, 0.5rem);
    }
    .sps-stationmap__popover-row {
      display: flex; align-items: center; gap: 0.4rem;
      padding: 0.2rem 0; font-size: clamp(0.55rem, 1vh, 0.75rem);
      border-bottom: 1px solid rgba(51,65,85,0.5);
    }
    .sps-stationmap__popover-row:last-child { border-bottom: none; }
    .sps-stationmap__popover-time {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-weight: 700; color: #ffffff; min-width: 40px;
    }
    .sps-stationmap__popover-dest {
      flex: 1; min-width: 0; color: #e2e8f0;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .sps-stationmap__popover-status {
      flex-shrink: 0;
      font-size: 0.8em; font-weight: 700; text-transform: uppercase;
      padding: 0.1em 0.4em; border-radius: 4px; white-space: nowrap;
    }
    .sps-stationmap__popover-empty {
      color: #64748b; font-size: clamp(0.55rem, 1vh, 0.75rem);
      font-style: italic; display: block; padding: 0.3rem 0;
    }

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
      font-weight: 800; color: #f8fafc; margin: 0; letter-spacing: 0.5px;
    }
    .sps-eod-sub {
      font-size: clamp(0.9rem, 2vh, 1.3rem);
      color: #94a3b8; margin-top: clamp(0.3rem, 0.8vh, 0.6rem);
      margin-bottom: clamp(1rem, 3vh, 2rem);
    }
    .sps-eod-next {
      background: rgba(249,115,22,0.08); border: 1px solid rgba(249,115,22,0.2);
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
    .sps-eod-next-item + .sps-eod-next-item { border-top: 1px solid rgba(249,115,22,0.1); }
    .sps-eod-next-time {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-weight: 700; color: #ffffff; min-width: 50px;
    }
    .sps-eod-next-arrow { color: #f97316; font-weight: 300; }
    .sps-eod-next-dest { color: #e2e8f0; font-weight: 500; }
    .sps-eod-first {
      font-size: clamp(0.7rem, 1.3vh, 1rem);
      color: #64748b; margin-top: clamp(0.6rem, 1.5vh, 1.2rem); margin-bottom: 0;
    }
    .sps-eod-first-time {
      color: #f97316; font-weight: 700;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }

    /* ═══ FOOTER ═══ */
    .sps-footer {
      display: flex; justify-content: space-between; align-items: center;
      padding: clamp(0.5rem, 1vh, 0.8rem) clamp(1rem, 2vw, 2rem);
      border-top: 1px solid #1e293b; flex-shrink: 0; margin-top: auto;
    }
    .sps-footer__left { display: flex; flex-direction: column; gap: 0.1rem; }
    .sps-footer__date { font-size: clamp(0.55rem, 1vh, 0.75rem); color: #94a3b8; font-weight: 500; }
    .sps-footer__city { font-size: clamp(0.5rem, 0.9vh, 0.65rem); color: #64748b; }
    .sps-footer__center {
      display: flex; flex-direction: column; align-items: center; gap: 0.2rem;
      background: #ffffff; padding: clamp(4px, 0.5vh, 6px); border-radius: 8px;
    }
    .sps-footer__qr-label {
      font-size: clamp(0.4rem, 0.7vh, 0.55rem);
      color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
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
    .sps-fs-btn:hover { background: rgba(255,255,255,0.1); color: #ffffff; border-color: #f97316; }

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
      background: rgba(249,115,22,0.9); color: #fff;
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

    /* ═══ AD OVERLAY ═══ */
    .sps-ad-overlay {
      position: fixed; inset: 0; z-index: 100; background: #000;
      display: flex; align-items: center; justify-content: center;
      animation: sps-fadein 0.5s ease; cursor: pointer;
    }
    .sps-ad-overlay img, .sps-ad-overlay video, .sps-ad-overlay iframe {
      width: 100%; height: 100%;
    }
    .sps-ad-overlay img { object-fit: cover; }
    .sps-ad-overlay video { object-fit: contain; }
    .sps-ad-image, .sps-ad-video, .sps-ad-frame { display: block; width: 100%; height: 100%; }
    .sps-ad-image { object-fit: cover; }
    .sps-ad-video { object-fit: contain; }
    .sps-ad-frame { border: none; }
    .sps-ad-progress {
      position: absolute; bottom: 0; left: 0; height: 4px;
      background: #f97316; animation: sps-ad-progress linear forwards;
    }
    .sps-ad-label {
      position: absolute; top: clamp(8px, 2vh, 16px); right: clamp(8px, 2vw, 20px);
      background: rgba(0,0,0,0.7); color: rgba(255,255,255,0.7);
      padding: 4px 10px; border-radius: 6px;
      font-size: clamp(0.55rem, 1vh, 0.75rem); font-weight: 600;
    }
    .sps-ad-empty { color: #64748b; font-size: 1rem; }

    /* ═══ DEBUG PANEL ═══ */
    .sps-debug {
      position: fixed; bottom: 20px; right: 20px;
      background: #131a2b; padding: 0.8rem 1rem; border-radius: 10px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 1px solid #1e293b;
      z-index: 200; max-width: 220px;
    }
    .sps-debug__title {
      font-weight: 800; font-size: 0.7rem; color: #f97316;
      text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.4rem;
    }
    .sps-debug__info { font-size: 0.65rem; color: #94a3b8; line-height: 1.5; }

    /* ═══ ANIMATIONS ═══ */
    @keyframes sps-blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    @keyframes sps-pulse-bg {
      0%, 100% { background: rgba(249,115,22,0.08); }
      50% { background: rgba(249,115,22,0.15); }
    }
    @keyframes sps-fadein { from { opacity: 0; } to { opacity: 1; } }
    @keyframes sps-ad-progress { from { width: 0; } to { width: 100%; } }

    /* ═══ RESPONSIVE: Mobile (< 768px) ═══ */
    @media (max-width: 767px) {
      .sps-tab { font-size: clamp(0.55rem, 1.1vh, 0.75rem); padding: clamp(0.3rem, 0.8vh, 0.5rem) clamp(0.5rem, 1.2vw, 0.8rem); }
      .sps-content { flex-direction: column; }
      .sps-col { display: none; }
      .sps-col--active { display: flex; }
      .sps-header__name { font-size: 0.9rem; }
      .sps-header__city { display: none; }
      .sps-clock { font-size: 1.2rem; }
      .sps-date { font-size: 0.6rem; }
      .sps-card { padding: 0.5rem; margin-bottom: 0.3rem; }
      .sps-card__time { font-size: 0.85rem; min-width: 55px; }
      .sps-card__countdown-live { font-size: 0.7rem; }
      .sps-card__line { display: none; }
      .sps-card__route-text { font-size: 0.75rem; }
      .sps-card__badge { font-size: 0.45rem; padding: 0.15em 0.4em; }
      .sps-card__delay-badge { font-size: 0.4rem; padding: 0.1em 0.35em; }
      .sps-card__weather { font-size: 0.45rem; padding: 0.05em 0.35em; }
      .sps-card__sub { font-size: 0.5rem; gap: 0.3rem; margin-top: 0.15rem; padding-top: 0.1rem; }
      .sps-card__fillrate-bar { height: 3px; }
      .sps-footer { padding: 0.4rem 0.6rem; }
      .sps-footer__center { padding: 3px; }
      .sps-footer__brand { font-size: 0.6rem; }
      .sps-footer__qr-label { display: none; }
      .sps-fs-btn { width: 28px; height: 28px; font-size: 0.7rem; top: 4px; right: 4px; }
      .sps-ad-label { font-size: 0.5rem; }
      .sps-supervision__grid { grid-template-columns: 1fr; }
      .sps-stationmap__popover { min-width: 160px; }
      .sps-emergency__text { font-size: 0.65rem; }
    }

    /* ═══ RESPONSIVE: Tablet (768px – 1023px) ═══ */
    @media (min-width: 768px) and (max-width: 1023px) {
      .sps-content { flex-direction: row; }
      .sps-col { display: flex; }
      .sps-clock { font-size: 2rem; }
      .sps-card__time { font-size: 1.2rem; min-width: 70px; }
      .sps-card__route-text { font-size: 1rem; }
      .sps-supervision__grid { grid-template-columns: repeat(2, 1fr); }
    }

    /* ═══ RESPONSIVE: Desktop (1024px+) ═══ */
    @media (min-width: 1024px) {
      .sps-content { flex-direction: row; }
      .sps-col { display: flex; }
      .sps-supervision__grid { grid-template-columns: repeat(3, 1fr); }
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
      .sps-card__time { font-size: 1.8rem; min-width: 100px; }
      .sps-card__countdown-live { font-size: 1.1rem; }
      .sps-card__route-text { font-size: 1.6rem; }
      .sps-card__badge { font-size: 0.85rem; padding: 0.3em 0.8em; }
      .sps-card__sub { font-size: 0.85rem; margin-top: 0.5rem; padding-top: 0.4rem; }
      .sps-supervision__grid { grid-template-columns: repeat(3, 1fr); gap: 1.2rem; }
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
      .sps-card__time { font-size: 2.2rem; min-width: 130px; }
      .sps-card__countdown-live { font-size: 1.3rem; }
      .sps-card__route-text { font-size: 2rem; }
      .sps-card__badge { font-size: 1rem; }
      .sps-card__sub { font-size: 1rem; margin-top: 0.6rem; padding-top: 0.5rem; }
      .sps-supervision__grid { grid-template-columns: repeat(4, 1fr); gap: 1.5rem; }
      .sps-footer { padding: 1.5rem 3rem; }
      .sps-footer__brand { font-size: 1.5rem; }
    }
  `,
};
