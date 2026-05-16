'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  AlertCircle,
  Clock,
  Shield,
  Navigation,
  CheckCircle,
  Plane,
  RefreshCw,
  Phone,
  MessageCircle,
  MapPin,
  Globe,
  ArrowRight,
} from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { Language, LANGUAGE_NAMES } from '@/lib/i18n';
import type { ScanContext } from '@/lib/scan-context';
import { CONTEXT_ICONS, CONTEXT_COLORS } from '@/lib/scan-context';
import { generatePreFilledMessage, buildWhatsAppUrl } from '@/lib/whatsapp-message';
// TRANSPORT-FEATURE: Multi-transport support
import { safeTransportMode, getTransportIcon } from '@/lib/transport';
import type { TransportMode } from '@/lib/transport';

// ═══════════════════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════════════════

interface ScanEntry {
  id: string;
  location: string | null;
  city: string | null;
  country: string | null;
  context: string;
  finderName: string | null;
  finderPhone: string | null;
  message: string | null;
  hasMap: boolean;
  scannedAt: string;
  whatsappStatus: string | null;
}

interface LastPosition {
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  hasCoordinates: boolean;
}

interface BaggageInfo {
  reference: string;
  type: string;
  travelerName: string;
  baggageIndex: number;
  baggageType: string;
  status: string;
  airlineName: string | null;
  flightNumber: string | null;
  destination: string | null;
  departureDate: string | null;
  departureTime: string | null;
  // TRANSPORT-FEATURE: Transport mode + conditional fields
  transportMode: string;
  trainCompany: string | null;
  trainNumber: string | null;
  shipName: string | null;
  shipCabin: string | null;
  busCompany: string | null;
  busLineNumber: string | null;
  agency: string | null;
  createdAt: string | null;
  lastScanDate: string | null;
  lastLocation: string | null;
  declaredLostAt: string | null;
  foundAt: string | null;
  expiresAt: string | null;
}

interface SuiviData {
  status: string;
  baggage: BaggageInfo;
  lastFinder: { name: string | null; phone: string | null } | null;
  scans: ScanEntry[];
  lastPosition: LastPosition | null;
}

// ═══════════════════════════════════════════════════════
//  LANGUAGE SELECTOR (White Background — reuse pattern)
// ═══════════════════════════════════════════════════════

function LanguageSelector({ lang, setLang }: { lang: Language; setLang: (l: Language) => void }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 bg-white border border-blue-200 rounded-full text-blue-900 hover:bg-blue-50 transition-colors text-xs sm:text-sm md:text-base font-medium shadow-sm min-h-[36px] sm:min-h-[40px] md:min-h-[44px]"
      >
        <Globe className="w-4 h-4 sm:w-5 sm:h-5" />
        <span>{LANGUAGE_NAMES[lang]}</span>
      </button>

      {isOpen && (
        <div role="listbox" aria-label="Language" className="absolute top-full right-0 mt-1 sm:mt-2 bg-white border border-blue-200 rounded-xl shadow-lg overflow-hidden z-50 min-w-[140px] sm:min-w-[160px]">
          {(['fr', 'en', 'ar'] as Language[]).map((l) => (
            <button
              key={l}
              role="option"
              aria-selected={lang === l}
              onClick={() => {
                setLang(l);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-2.5 sm:px-5 sm:py-3 text-left text-xs sm:text-sm md:text-base font-medium transition-colors ${
                lang === l
                  ? 'bg-orange-500 text-white'
                  : 'text-blue-900 hover:bg-blue-50'
              }`}
            >
              {LANGUAGE_NAMES[l]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  DASHED ENCART (reuse pattern from scan page)
// ═══════════════════════════════════════════════════════

function DashedEncart({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`border-2 border-dashed border-white/80 rounded-xl p-4 mb-3 last:mb-0 ${className}`}>
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  LOADING SCREEN
// ═══════════════════════════════════════════════════════

function LoadingScreen({ t }: { t: (key: string) => string }) {
  return (
    <main className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-12 h-12 border-4 border-blue-900/20 border-t-orange-500 rounded-full mx-auto mb-4"></div>
        <p className="text-lg text-blue-900">{t('common.loading')}</p>
      </div>
    </main>
  );
}

// ═══════════════════════════════════════════════════════
//  ERROR SCREEN
// ═══════════════════════════════════════════════════════

function ErrorScreen({
  type,
  t,
  lang,
  setLang,
}: {
  type: string;
  t: (key: string) => string;
  lang: Language;
  setLang: (l: Language) => void;
}) {
  const errorConfig = {
    not_found: {
      icon: <AlertCircle className="w-12 h-12 text-red-500" />,
      title: t('tracking.baggage_not_found'),
      message: t('tracking.baggage_not_found_desc'),
    },
    blocked: {
      icon: <Shield className="w-12 h-12 text-gray-400" />,
      title: t('errors.baggage_blocked'),
      message: t('tracking.baggage_blocked_desc'),
    },
    expired: {
      icon: <Clock className="w-12 h-12 text-gray-400" />,
      title: t('errors.protection_expired'),
      message: t('tracking.baggage_expired_desc'),
    },
    pending_activation: {
      icon: <AlertCircle className="w-12 h-12 text-orange-500" />,
      title: t('tracking.baggage_not_found'),
      message: t('tracking.baggage_pending_desc'),
    },
  };

  const config = errorConfig[type as keyof typeof errorConfig] || errorConfig.not_found;

  return (
    <main className="min-h-screen bg-white flex items-center justify-center p-5 md:p-8 relative">
      <div className="absolute top-4 right-4">
        <LanguageSelector lang={lang} setLang={setLang} />
      </div>

      <div className="max-w-md w-full bg-[#0A192F] rounded-2xl p-6 md:p-8 text-center shadow-xl shadow-blue-900/20">
        <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
          {config.icon}
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">{config.title}</h1>
        <p className="text-white text-base md:text-lg mb-6">{config.message}</p>
        <div className="w-full py-4 px-6 bg-white/10 border border-white/20 text-white rounded-xl text-center text-base font-medium min-h-[56px]">
          {t('tracking.trust_note')}
        </div>
      </div>
    </main>
  );
}

// ═══════════════════════════════════════════════════════
//  GOOGLE MAPS IFRAME
// ═══════════════════════════════════════════════════════

function MapEmbed({
  latitude,
  longitude,
  address,
  t,
}: {
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  t: (key: string) => string;
}) {
  let mapSrc: string | null = null;

  if (latitude && longitude) {
    mapSrc = `https://maps.google.com/maps?q=${latitude},${longitude}&z=15&output=embed`;
  } else if (address) {
    mapSrc = `https://maps.google.com/maps?q=${encodeURIComponent(address)}&z=13&output=embed`;
  }

  if (!mapSrc) {
    return (
      <div className="bg-blue-800 rounded-xl p-4 text-center text-white">
        <MapPin className="w-6 h-6 mx-auto mb-2 opacity-70" />
        <p className="text-base font-medium">{address || t('tracking.no_location')}</p>
        <p className="text-sm text-blue-200 mt-1">{t('tracking.map_unavailable')}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden border border-white/20">
      <iframe
        src={mapSrc}
        width="100%"
        height="250"
        style={{ border: 0 }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title="Location"
        className="w-full"
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  CONTEXT BADGE
// ═══════════════════════════════════════════════════════

function ContextBadge({ context, t }: { context: string; t: (key: string) => string }) {
  const scanContext = context as ScanContext;
  const icon = CONTEXT_ICONS[scanContext] || '📍';
  const colorClass = CONTEXT_COLORS[scanContext] || 'bg-blue-500';

  // Get localized label
  const contextKeyMap: Record<string, string> = {
    departure_airport_urgent: 'tracking.context_departure',
    arrival_airport: 'tracking.context_arrival',
    in_transit: 'tracking.context_transit',
    static_location: 'tracking.context_static',
  };
  const labelKey = contextKeyMap[scanContext] || 'tracking.context_static';

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 ${colorClass} text-white text-xs font-bold rounded-full`}>
      <span>{icon}</span>
      <span>{t(labelKey)}</span>
    </span>
  );
}

// ═══════════════════════════════════════════════════════
//  MAIN PAGE
// ═══════════════════════════════════════════════════════

export default function SuiviPage() {
  const params = useParams();
  const reference = params.reference as string;

  const { t, lang, setLang, dir } = useTranslation();

  const [data, setData] = useState<SuiviData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshToast, setRefreshToast] = useState(false);

  // Fetch tracking data
  const fetchSuivi = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);

    try {
      const response = await fetch(`/api/suivi/${reference}`);
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching suivi:', error);
      setData({ status: 'error', baggage: null as unknown as BaggageInfo, lastFinder: null, scans: [], lastPosition: null });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [reference]);

  useEffect(() => {
    fetchSuivi(false);
  }, [fetchSuivi]);

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    await fetchSuivi(true);
    setRefreshToast(true);
    setTimeout(() => setRefreshToast(false), 2000);
  }, [fetchSuivi]);

  // WHATSAPP-HARMONIZED: WhatsApp handler — owner contacts finder (template harmonisé multi-transport)
  const handleWhatsApp = useCallback(() => {
    if (!data?.lastFinder?.phone) return;

    const lastScan = data.scans[0];
    const message = generatePreFilledMessage({
      baggage: {
        reference: data.baggage.reference,
        bagType: data.baggage.baggageType || 'cabine',
        transportMode: (data.baggage.transportMode || 'flight') as 'flight' | 'train' | 'boat' | 'bus',
        airlineName: data.baggage.airlineName || undefined,
        flightNumber: data.baggage.flightNumber || undefined,
        trainCompany: data.baggage.trainCompany || undefined,
        trainNumber: data.baggage.trainNumber || undefined,
        shipName: data.baggage.shipName || undefined,
        shipCabin: data.baggage.shipCabin || undefined,
        busCompany: data.baggage.busCompany || undefined,
        busLineNumber: data.baggage.busLineNumber || undefined,
        destination: data.baggage.destination || undefined,
      },
      scanData: {
        city: data.lastPosition?.address || data.baggage?.lastLocation || '',
        address: data.lastPosition?.address || '',
        context: (lastScan?.context || 'static_location') as ScanContext,
      },
      finder: {
        name: data.lastFinder?.name || '',
        whatsapp: data.lastFinder?.phone || '',
      },
      locale: lang,
      ownerName: data.baggage?.travelerName || undefined,
    });

    const url = buildWhatsAppUrl(data.lastFinder.phone, message);

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      window.location.href = url;
    } else {
      const newWindow = window.open(url, '_blank');
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        window.location.href = url;
      }
    }
  }, [data, reference, lang]);

  // Phone call handler
  const handlePhoneCall = useCallback(() => {
    if (!data?.lastFinder?.phone) return;
    window.location.href = `tel:${data.lastFinder.phone}`;
  }, [data]);

  // Format date for display
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return null;
    const locale = lang === 'ar' ? 'ar-SA' : lang === 'en' ? 'en-US' : 'fr-FR';
    return new Date(dateStr).toLocaleDateString(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return null;
    const locale = lang === 'ar' ? 'ar-SA' : lang === 'en' ? 'en-US' : 'fr-FR';
    return new Date(dateStr).toLocaleString(locale, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // ─── Loading ───
  if (loading) {
    return <LoadingScreen t={t} />;
  }

  // ─── Error states ───
  if (!data || data.status === 'not_found' || data.status === 'error') {
    return <ErrorScreen type="not_found" t={t} lang={lang} setLang={setLang} />;
  }
  if (data.status === 'blocked') {
    return <ErrorScreen type="blocked" t={t} lang={lang} setLang={setLang} />;
  }
  if (data.status === 'expired') {
    return <ErrorScreen type="expired" t={t} lang={lang} setLang={setLang} />;
  }
  if (data.status === 'pending_activation') {
    return <ErrorScreen type="pending_activation" t={t} lang={lang} setLang={setLang} />;
  }

  const baggage = data.baggage;
  const isDeclaredLost = !!baggage?.declaredLostAt && !baggage?.foundAt;
  const isFound = !!baggage?.foundAt;

  // ═══════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════

  return (
    <main
      className="min-h-[100dvh] min-h-screen bg-white flex flex-col px-4 sm:px-5 md:px-8 pb-[env(safe-area-inset-bottom,0px)]"
      dir={dir}
    >
      {/* ─── Header ─── */}
      <header className="sticky top-0 z-40 flex items-center justify-between pt-[env(safe-area-inset-top,0px)] px-0 py-2 sm:py-3 md:py-4 bg-white">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-1 text-blue-900 hover:text-orange-500 transition-colors text-sm font-medium min-h-[44px] px-2"
          aria-label={t('tracking.back_to_scan')}
        >
          <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          <span>{t('tracking.back_to_scan')}</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center justify-center w-10 h-10 rounded-full border border-blue-200 text-blue-900 hover:bg-blue-50 transition-colors disabled:opacity-50"
            aria-label={t('common.refresh')}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <LanguageSelector lang={lang} setLang={setLang} />
        </div>
      </header>

      {/* ─── Refresh Toast ─── */}
      {refreshToast && (
        <div className="fixed top-[calc(3.5rem+env(safe-area-inset-top,0px))] sm:top-[calc(4rem+env(safe-area-inset-top,0px))] left-1/2 -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-top-2 duration-300 text-sm font-medium">
          <CheckCircle className="w-4 h-4 inline mr-1.5" />
          {t('tracking.refresh_success')}
        </div>
      )}

      {/* ─── Container ─── */}
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col py-4 sm:py-6 md:py-0">

        {/* ═══ STATUS BADGE ═══ */}
        <div className="mt-2 sm:mt-4 md:mt-6 mb-4 sm:mb-6 text-center">
          <span className={`inline-flex items-center justify-center px-6 py-3 rounded-full font-bold text-lg shadow-lg transform transition-transform duration-300 ${
            isDeclaredLost
              ? 'bg-red-600 text-white shadow-red-500/30 animate-pulse'
              : isFound
              ? 'bg-green-600 text-white shadow-green-500/30'
              : 'bg-orange-500 text-white shadow-orange-500/30 hover:scale-105'
          }`}>
            {isDeclaredLost
              ? `🚨 ${t('tracking.badge_lost')}`
              : isFound
              ? `✅ ${t('tracking.badge_found')}`
              : `${t('tracking.badge_active')} ${getTransportIcon(safeTransportMode(baggage.transportMode))}`}
          </span>
          <p className="mt-3 text-blue-900 text-base md:text-lg leading-relaxed max-w-md mx-auto">
            {isDeclaredLost
              ? t('tracking.lost_description')
              : isFound
              ? t('tracking.found_description')
              : t('tracking.active_description')}
          </p>
        </div>

        {/* ─── Status Indicator ─── */}
        <div className="flex items-center justify-center gap-2 mb-5">
          <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse"></span>
          <span className="text-sm font-bold uppercase tracking-widest text-blue-900">
            {t(`tracking.status_${baggage.status === 'scanned' ? 'scanned' : baggage.status}`)}
          </span>
          {data.scans.length > 0 && (
            <span className="text-sm text-blue-900/60 ml-2">
              · {t('tracking.scan_count', { count: String(data.scans.length) })}
            </span>
          )}
        </div>

        {/* ═══ 🟦 BLOC 1 : INFORMATIONS DU BAGAGE ═══ */}
        <div className="w-full bg-[#0A192F] rounded-2xl p-5 md:p-6 mb-5 shadow-xl shadow-blue-900/20">
          <h2 className="text-xs uppercase tracking-widest text-white font-bold mb-4 flex items-center gap-2">
            <span>📦</span> {t('tracking.baggage_info')}
          </h2>

          {/* Reference */}
          <DashedEncart>
            <div className="flex items-center gap-3">
              <span className="text-xl">🏷️</span>
              <div>
                <p className="text-sm text-white/80 font-medium">{t('whatsapp.reference').replace(' :', '')}</p>
                <p className="text-lg font-bold text-white font-mono tracking-widest">{baggage.reference}</p>
              </div>
            </div>
          </DashedEncart>

          {/* Traveler Name */}
          <DashedEncart>
            <div className="flex items-center gap-3">
              <span className="text-xl">👤</span>
              <div>
                <p className="text-sm text-white/80 font-medium">{t('finder.fullName')}</p>
                <p className="text-lg font-bold text-white">{baggage.travelerName || t('finder.notSet')}</p>
              </div>
            </div>
          </DashedEncart>

          {/* TRANSPORT-FEATURE: Conditional transport info (flight/train/boat/bus) */}
          {(() => {
            const mode = safeTransportMode(baggage.transportMode);
            // Flight info
            if (mode === 'flight' && (baggage.airlineName || baggage.flightNumber)) {
              return (
                <DashedEncart>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      {baggage.airlineName && (
                        <div className="mb-2">
                          <p className="text-sm text-white/80 font-medium">{t('transport.airline')}</p>
                          <p className="text-lg font-bold text-white">{baggage.airlineName}</p>
                        </div>
                      )}
                      {baggage.flightNumber && (
                        <div>
                          <p className="text-sm text-white/80 font-medium">{t('transport.flight_number')}</p>
                          <p className="text-2xl font-bold text-white font-mono tracking-widest">{baggage.flightNumber}</p>
                        </div>
                      )}
                    </div>
                    <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center ml-4 flex-shrink-0">
                      <Plane className="w-7 h-7 text-orange-400" />
                    </div>
                  </div>
                </DashedEncart>
              );
            }
            // Train info
            if (mode === 'train' && (baggage.trainCompany || baggage.trainNumber)) {
              return (
                <DashedEncart>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      {baggage.trainCompany && (
                        <div className="mb-2">
                          <p className="text-sm text-white/80 font-medium">{t('transport.train_company')}</p>
                          <p className="text-lg font-bold text-white">{baggage.trainCompany}</p>
                        </div>
                      )}
                      {baggage.trainNumber && (
                        <div>
                          <p className="text-sm text-white/80 font-medium">{t('transport.train_number')}</p>
                          <p className="text-2xl font-bold text-white font-mono tracking-widest">{baggage.trainNumber}</p>
                        </div>
                      )}
                    </div>
                    <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center ml-4 flex-shrink-0">
                      <span className="text-3xl">🚆</span>
                    </div>
                  </div>
                </DashedEncart>
              );
            }
            // Boat info
            if (mode === 'boat' && (baggage.shipName || baggage.shipCabin)) {
              return (
                <DashedEncart>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      {baggage.shipName && (
                        <div className="mb-2">
                          <p className="text-sm text-white/80 font-medium">{t('transport.ship_name')}</p>
                          <p className="text-lg font-bold text-white">{baggage.shipName}</p>
                        </div>
                      )}
                      {baggage.shipCabin && (
                        <div>
                          <p className="text-sm text-white/80 font-medium">{t('transport.ship_cabin')}</p>
                          <p className="text-lg font-bold text-white">{baggage.shipCabin}</p>
                        </div>
                      )}
                    </div>
                    <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center ml-4 flex-shrink-0">
                      <span className="text-3xl">🚢</span>
                    </div>
                  </div>
                </DashedEncart>
              );
            }
            // Bus info
            if (mode === 'bus' && (baggage.busCompany || baggage.busLineNumber)) {
              return (
                <DashedEncart>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      {baggage.busCompany && (
                        <div className="mb-2">
                          <p className="text-sm text-white/80 font-medium">{t('transport.bus_company')}</p>
                          <p className="text-lg font-bold text-white">{baggage.busCompany}</p>
                        </div>
                      )}
                      {baggage.busLineNumber && (
                        <div>
                          <p className="text-sm text-white/80 font-medium">{t('transport.bus_line')}</p>
                          <p className="text-lg font-bold text-white">{baggage.busLineNumber}</p>
                        </div>
                      )}
                    </div>
                    <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center ml-4 flex-shrink-0">
                      <span className="text-3xl">🚌</span>
                    </div>
                  </div>
                </DashedEncart>
              );
            }
            return null;
          })()}

          {/* Destination */}
          {baggage.destination && (
            <DashedEncart>
              <div className="flex items-center gap-3">
                <span className="text-xl">📍</span>
                <div>
                  <p className="text-sm text-white/80 font-medium">{t('transport.common_destination')}</p>
                  <p className="text-lg font-bold text-white">{baggage.destination}</p>
                </div>
              </div>
            </DashedEncart>
          )}

          {/* Departure Date */}
          {(baggage.departureDate || baggage.createdAt) && (
            <DashedEncart className="mb-0">
              <div className="flex items-center gap-3">
                <span className="text-xl">📅</span>
                <div>
                  <p className="text-sm text-white/80 font-medium">{t('transport.common_departure_date')}</p>
                  <p className="text-lg font-bold text-white">
                    {formatDate(baggage.departureDate || baggage.createdAt)}{baggage.departureTime ? ` — ${baggage.departureTime}` : ''}
                  </p>
                </div>
              </div>
            </DashedEncart>
          )}
        </div>

        {/* ═══ 🟦 BLOC 2 : DERNIÈRE POSITION (Google Maps) ═══ */}
        {data.lastPosition && (data.lastPosition.hasCoordinates || data.lastPosition.address) && (
          <div className="w-full bg-[#0A192F] rounded-2xl p-5 md:p-6 mb-5 shadow-xl shadow-blue-900/20">
            <h2 className="text-xs uppercase tracking-widest text-white font-bold mb-4 flex items-center gap-2">
              <span>🗺️</span> {t('tracking.last_location')}
            </h2>

            {/* Map */}
            <DashedEncart>
              <MapEmbed
                latitude={data.lastPosition.latitude}
                longitude={data.lastPosition.longitude}
                address={data.lastPosition.address}
                t={t}
              />
            </DashedEncart>

            {/* Last scan date */}
            {baggage.lastScanDate && (
              <div className="mt-3 text-center">
                <span className="text-sm text-white/70">
                  {t('tracking.last_scan')} : {formatDateTime(baggage.lastScanDate)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* ═══ 🟦 BLOC 3 : INFORMATIONS DU TROUVEUR ═══ */}
        {data.lastFinder && (data.lastFinder.name || data.lastFinder.phone) ? (
          <div className="w-full bg-[#0A192F] rounded-2xl p-5 md:p-6 mb-5 shadow-xl shadow-blue-900/20">
            <h2 className="text-xs uppercase tracking-widest text-white font-bold mb-4 flex items-center gap-2">
              <span>🔍</span> {t('tracking.finder_info')}
            </h2>

            {/* Finder Name */}
            {data.lastFinder.name && (
              <DashedEncart>
                <div className="flex items-center gap-3">
                  <span className="text-xl">👤</span>
                  <div>
                    <p className="text-sm text-white/80 font-medium">{t('finder.fullName')}</p>
                    <p className="text-lg font-bold text-white">{data.lastFinder.name}</p>
                  </div>
                </div>
              </DashedEncart>
            )}

            {/* Finder Phone */}
            {data.lastFinder.phone && (
              <DashedEncart className="mb-0">
                <div className="flex items-center gap-3">
                  <span className="text-xl">📱</span>
                  <div>
                    <p className="text-sm text-white/80 font-medium">{t('finder.whatsapp')}</p>
                    <p className="text-lg font-bold text-white" dir="ltr">{data.lastFinder.phone}</p>
                  </div>
                </div>
              </DashedEncart>
            )}

            {/* ─── Contact Buttons ─── */}
            {data.lastFinder.phone && (
              <div className="mt-4">
                <h3 className="text-blue-900 text-sm font-bold uppercase tracking-widest text-center mb-4">
                  {t('tracking.contact_finder')}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* WhatsApp Button */}
                  <button
                    onClick={handleWhatsApp}
                    className="py-4 px-5 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 text-lg min-h-[56px] shadow-lg"
                  >
                    <MessageCircle className="w-5 h-5" />
                    {t('tracking.by_whatsapp')}
                  </button>
                  {/* Phone Button */}
                  <button
                    onClick={handlePhoneCall}
                    className="py-4 px-5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 text-lg min-h-[56px] shadow-lg"
                  >
                    <Phone className="w-5 h-5" />
                    {t('tracking.by_phone')}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* No finder yet */
          <div className="w-full bg-[#0A192F] rounded-2xl p-5 md:p-6 mb-5 shadow-xl shadow-blue-900/20 text-center">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-white/50" />
            </div>
            <p className="text-white/70 text-base">{t('tracking.no_finder')}</p>
          </div>
        )}

        {/* ═══ 🟦 BLOC 4 : HISTORIQUE DES SCANS (max 5) ═══ */}
        {data.scans.length > 0 ? (
          <div className="w-full bg-[#0A192F] rounded-2xl p-5 md:p-6 mb-5 shadow-xl shadow-blue-900/20">
            <h2 className="text-xs uppercase tracking-widest text-white font-bold mb-4 flex items-center gap-2">
              <span>📋</span> {t('tracking.scan_history')}
            </h2>

            <div className="space-y-3">
              {data.scans.map((scan, index) => (
                <DashedEncart key={scan.id} className={index === data.scans.length - 1 ? 'mb-0' : ''}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Date + Context */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-xs text-white/70">
                          {formatDateTime(scan.scannedAt)}
                        </span>
                        <ContextBadge context={scan.context} t={t} />
                      </div>

                      {/* Location */}
                      {scan.location && (
                        <p className="text-white font-medium text-sm truncate">
                          📍 {scan.location}
                        </p>
                      )}

                      {/* Finder info (compact) */}
                      {scan.finderName && (
                        <p className="text-white/70 text-xs mt-1">
                          👤 {scan.finderName}
                        </p>
                      )}
                    </div>

                    {/* Scan number badge */}
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-white">{index + 1}</span>
                    </div>
                  </div>
                </DashedEncart>
              ))}
            </div>
          </div>
        ) : (
          <div className="w-full bg-[#0A192F] rounded-2xl p-5 md:p-6 mb-5 shadow-xl shadow-blue-900/20 text-center">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Navigation className="w-8 h-8 text-white/50" />
            </div>
            <p className="text-white/70 text-base">{t('tracking.no_scans')}</p>
          </div>
        )}

        {/* ─── Trust Note ─── */}
        <div className="mt-4 mb-4 text-center text-sm text-blue-900/60 tracking-wide">
          <Shield className="w-4 h-4 inline mr-1.5" />
          {t('tracking.trust_note')}
        </div>
      </div>
    </main>
  );
}
