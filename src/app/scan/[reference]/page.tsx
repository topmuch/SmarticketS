'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Badge } from "@/components/ui/badge";
import {
  Luggage,
  AlertCircle,
  Clock,
  Shield,
  Navigation,
  CheckCircle,
  Plane,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  Globe,
  Phone,
  MessageCircle,
} from "lucide-react";
import { useTranslation } from '@/hooks/useTranslation';
import { Language, LANGUAGE_NAMES } from '@/lib/i18n';
import dynamic from 'next/dynamic';

// AI-FEATURE: Lazy-load ChatbotWidget (Feature #1) — doesn't block page render
const ChatbotWidget = dynamic(() => import('@/components/finder/ChatbotWidget'), {
  ssr: false,
  loading: () => null,
});

const FALLBACK_PHONE = '33745349339';

interface BaggageData {
  status: string;
  message?: string;
  theme?: string;
  type?: string;
  expiredAt?: string;
  agency?: string;
  baggage?: {
    reference: string;
    type: string;
    travelerName: string;
    baggageIndex: number;
    baggageType: string;
    status: string;
    airlineName?: string;
    flightNumber?: string;
    destination?: string;
    agency?: string;
    whatsappOwner?: string;
    declaredLostAt?: string | null;
    foundAt?: string | null;
    createdAt?: string | null;
    departureDate?: string | null;
    departureTime?: string | null;
  };
}

// ─── Language Selector Component (White Background) ───
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

// ─── Activation Redirect Component ───
function ActivationRedirect({ type, reference, t, lang, setLang }: {
  type: string;
  reference: string;
  t: (key: string, params?: Record<string, string>) => string;
  lang: Language;
  setLang: (l: Language) => void;
}) {
  const router = useRouter();
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          const url = type === 'hajj'
            ? `/hajj/activate?qr=${reference}`
            : `/inscrire?qr=${reference}`;
          router.push(url);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [type, reference, router]);

  const isHajj = type === 'hajj';

  return (
    <main className="min-h-screen bg-white flex items-center justify-center p-5 md:p-8">
      <div className="relative max-w-md w-full bg-[#0A192F] rounded-2xl p-6 md:p-8 text-center shadow-xl shadow-blue-900/20">
        <div className="absolute top-4 right-4">
          <LanguageSelector lang={lang} setLang={setLang} />
        </div>

        <div className="relative inline-block mb-6">
          <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center animate-pulse border border-white/20">
            {isHajj ? (
              <Plane className="w-10 h-10 text-white" />
            ) : (
              <Luggage className="w-10 h-10 text-white" />
            )}
          </div>
          <div className="absolute -top-1 -right-1 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
          {t('common.welcome')}
        </h1>
        <p className="text-white text-base md:text-lg mb-4">
          {t('common.activate_in')}
        </p>

        <div className="border-2 border-dashed border-white/80 rounded-xl p-4 mb-6">
          <p className="text-white/80 text-sm mb-2">{t('common.baggage_type')}</p>
          <Badge className="bg-orange-500 text-white text-base md:text-lg px-5 py-1.5">
            {isHajj ? t('common.hajj_label') : t('common.voyageur_label')}
          </Badge>
        </div>

        <p className="text-white/70 text-base mb-5">
          {t('common.auto_redirect')} <span className="text-white font-bold text-lg">{countdown}s</span>
        </p>

        <button
          className="w-full py-4 px-6 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-lg transition-colors flex items-center justify-center gap-2 min-h-[56px] shadow-lg shadow-orange-500/30"
          onClick={() => {
            const url = isHajj
              ? `/hajj/activate?qr=${reference}`
              : `/inscrire?qr=${reference}`;
            router.push(url);
          }}
        >
          {t('common.start_activation')}
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </main>
  );
}

// ─── Loading Component ───
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

// ─── Error Screen ───
function ErrorScreen({
  type,
  t,
  lang,
  setLang
}: {
  type: string;
  t: (key: string) => string;
  lang: Language;
  setLang: (l: Language) => void;
}) {
  const router = useRouter();

  const errorConfig = {
    not_found: {
      icon: <AlertCircle className="w-12 h-12 text-red-500" />,
      title: t('errors.qr_not_valid'),
      message: t('errors.qr_not_valid_desc')
    },
    blocked: {
      icon: <Shield className="w-12 h-12 text-gray-400" />,
      title: t('errors.baggage_blocked'),
      message: t('errors.baggage_blocked_desc')
    },
    expired: {
      icon: <Clock className="w-12 h-12 text-gray-400" />,
      title: t('errors.protection_expired'),
      message: t('errors.protection_expired_desc')
    }
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
        <button
          className="w-full py-4 px-6 bg-white/10 border border-white/20 text-white rounded-xl hover:bg-white/20 transition-colors text-base font-medium min-h-[56px]"
          onClick={() => router.push('/')}
        >
          {t('common.back_home')}
        </button>
      </div>
    </main>
  );
}

// ─── Success Toast Component ───
function SuccessToast({ show, message, successTitle }: { show: boolean; message: string; successTitle: string }) {
  if (!show) return null;

  return (
    <div className="fixed top-[calc(3.5rem+env(safe-area-inset-top,0px))] sm:top-[calc(4rem+env(safe-area-inset-top,0px))] right-3 sm:right-5 bg-orange-500 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-xl shadow-lg z-50 animate-in slide-in-from-right duration-300 max-w-[calc(100vw-2rem)] sm:max-w-sm">
      <div className="flex items-center gap-3">
        <CheckCircle className="w-6 h-6" />
        <div>
          <div className="font-bold text-lg">{successTitle} 🎉</div>
          <div className="text-base opacity-90">{message}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Dashed Encart Helper ───
function DashedEncart({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`border-2 border-dashed border-white/80 rounded-xl p-4 mb-3 last:mb-0 ${className}`}>
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ─── MAIN SCAN PAGE ───
// ═══════════════════════════════════════════════════════════════
export default function ScanPage() {
  const params = useParams();
  const reference = params.reference as string;

  const { t, lang, setLang, dir } = useTranslation();

  const [baggageData, setBaggageData] = useState<BaggageData | null>(null);
  const [loading, setLoading] = useState(true);

  // Finder form state
  const [finderName, setFinderName] = useState('');
  const [finderPhone, setFinderPhone] = useState('');
  const [otherLocation, setOtherLocation] = useState('');
  const [sharedPosition, setSharedPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedContext, setSelectedContext] = useState('');

  // UI State
  const [showForm, setShowForm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [locationText, setLocationText] = useState('');
  const [geoError, setGeoError] = useState<string | null>(null);
  const [showManualLocation, setShowManualLocation] = useState(false);

  useEffect(() => {
    const fetchBaggage = async () => {
      try {
        const response = await fetch(`/api/scan/${reference}`);
        const data = await response.json();
        setBaggageData(data);
      } catch (error) {
        console.error('Error fetching baggage:', error);
        setBaggageData({ status: 'error', message: 'Erreur serveur' });
      } finally {
        setLoading(false);
      }
    };

    fetchBaggage();
  }, [reference]);

  // GPS Location Handler - iOS Optimized
  const handleShareLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setGeoError(t('errors.geolocation_not_supported'));
      setShowManualLocation(true);
      return;
    }

    setIsLoadingLocation(true);
    setGeoError(null);

    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          (error) => {
            console.error('Geolocation error:', error.code, error.message);
            reject(error);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      });

      setSharedPosition({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      });
      setLocationText(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
      setGeoError(null);
      setShowManualLocation(false);
    } catch (error) {
      const geoErr = error as GeolocationPositionError;
      let errorMessage = '';

      if (geoErr.code === 1) {
        errorMessage = t('errors.location_permission_denied');
      } else if (geoErr.code === 2) {
        errorMessage = t('errors.location_unavailable');
      } else if (geoErr.code === 3) {
        errorMessage = t('errors.location_timeout');
      } else {
        errorMessage = t('errors.location_failed');
      }

      setGeoError(errorMessage);
      setShowManualLocation(true);
    } finally {
      setIsLoadingLocation(false);
    }
  }, [t]);

  // Generate WhatsApp message (i18n-ready)
  const generateWhatsAppMessage = useCallback((finderName: string, finderPhone: string, locationText: string, mapLink: string) => {
    return encodeURIComponent(
      `${t('whatsapp.baggage_found')}\n\n` +
      `${t('whatsapp.reference')} ${reference}\n` +
      `${t('whatsapp.location')} ${locationText}\n` +
      `${t('whatsapp.map')} ${mapLink}\n\n` +
      `${t('whatsapp.found_by')} ${finderName}\n` +
      `${t('whatsapp.contact')} ${finderPhone}\n\n` +
      `${t('whatsapp.pickup_message')}\n` +
      `${t('whatsapp.signature')}`
    );
  }, [reference, t]);

  // Handle WhatsApp contact
  const handleWhatsApp = useCallback(async () => {
    setIsSubmitting(true);

    try {
      // Log the scan
      await fetch(`/api/scan/${reference}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: otherLocation.trim() || locationText || t('finder.not_specified'),
          finderName: finderName.trim(),
          finderPhone: finderPhone.trim(),
          message: '',
          latitude: sharedPosition?.lat,
          longitude: sharedPosition?.lng,
          context: selectedContext || undefined,
        }),
      });

      const finalLocationText = otherLocation.trim() || locationText || t('finder.not_specified');
      const mapLink = sharedPosition
        ? `https://maps.app.goo.gl/?link=https://www.google.com/maps?q=${sharedPosition.lat},${sharedPosition.lng}`
        : t('whatsapp.location_not_shared');

      const message = generateWhatsAppMessage(finderName, finderPhone, finalLocationText, mapLink);
      const ownerNumber = baggageData?.baggage?.whatsappOwner?.replace(/\D/g, '') || FALLBACK_PHONE;
      const url = `https://wa.me/${ownerNumber}?text=${message}`;

      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

      if (isIOS) {
        window.location.href = url;
      } else {
        const newWindow = window.open(url, '_blank');
        if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
          window.location.href = url;
        }
      }

      // Show success
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 4000);

    } catch (error) {
      console.error('Error:', error);
      alert(t('errors.error_occurred'));
    } finally {
      setIsSubmitting(false);
    }
  }, [reference, otherLocation, locationText, finderName, finderPhone, sharedPosition, baggageData, t, generateWhatsAppMessage, selectedContext]);

  // Handle phone call
  const handlePhoneCall = useCallback(async () => {
    // Log the scan before calling (same as WhatsApp)
    try {
      await fetch(`/api/scan/${reference}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: otherLocation.trim() || locationText || t('finder.not_specified'),
          finderName: finderName.trim(),
          finderPhone: finderPhone.trim(),
          message: '',
          latitude: sharedPosition?.lat,
          longitude: sharedPosition?.lng,
          context: selectedContext || undefined,
        }),
      });
    } catch (e) {
      // Continue with call even if logging fails
    }

    const phoneNumber = baggageData?.baggage?.whatsappOwner || FALLBACK_PHONE;
    window.location.href = `tel:${phoneNumber}`;
  }, [reference, otherLocation, locationText, finderName, finderPhone, sharedPosition, baggageData, t, selectedContext]);

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

  // Validate finder form before contacting
  const validateFinderForm = (): boolean => {
    if (!sharedPosition && !otherLocation.trim()) {
      setGeoError(t('finder.please_enter_location'));
      return false;
    }
    if (!finderName.trim() || !finderPhone.trim()) {
      alert(t('finder.fill_info'));
      return false;
    }
    return true;
  };

  // Loading state
  if (loading) {
    return <LoadingScreen t={t} />;
  }

  // Redirect to activation if pending
  if (baggageData?.status === 'pending_activation' && baggageData?.type) {
    return (
      <ActivationRedirect
        type={baggageData.type}
        reference={reference}
        t={t}
        lang={lang}
        setLang={setLang}
      />
    );
  }

  // Error states
  if (baggageData?.status === 'not_found') {
    return <ErrorScreen type="not_found" t={t} lang={lang} setLang={setLang} />;
  }

  if (baggageData?.status === 'blocked') {
    return <ErrorScreen type="blocked" t={t} lang={lang} setLang={setLang} />;
  }

  if (baggageData?.status === 'expired') {
    const expiredAt = baggageData.expiredAt || '';
    const agencyName = baggageData.agency || '';
    const urlParams = new URLSearchParams({
      ref: reference,
      ...(expiredAt && { expired: expiredAt }),
      ...(agencyName && { agency: agencyName })
    });
    if (typeof window !== 'undefined') {
      window.location.href = `/expired?${urlParams.toString()}`;
    }
    return <LoadingScreen t={t} />;
  }

  const baggage = baggageData?.baggage;

  // Lost baggage alert
  const isDeclaredLost = baggage?.declaredLostAt && !baggage?.foundAt;

  // ─── Main Render — White Background + Blue Blocks + Orange Buttons ───
  return (
    <main
      className="min-h-[100dvh] min-h-screen bg-white flex flex-col px-4 sm:px-5 md:px-8 pb-[env(safe-area-inset-bottom,0px)]"
      dir={dir}
    >
      {/* ─── Header ─── */}
      <header className="sticky top-0 z-40 flex items-center justify-end pt-[env(safe-area-inset-top,0px)] px-0 py-2 sm:py-3 md:py-4 bg-white">
        <LanguageSelector lang={lang} setLang={setLang} />
      </header>

      {/* Success Toast */}
      <SuccessToast show={showSuccess} message={t('finder.message_sent')} successTitle={t('finder.success_title')} />

      {/* ─── Container ─── */}
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col justify-center sm:justify-center py-4 sm:py-6 md:py-0">

        {/* ═══ 🔺 BADGE DE STATUT ═══ */}
        <div className="mt-2 sm:mt-4 md:mt-6 mb-4 sm:mb-6 text-center">
          <span className={`inline-flex items-center justify-center px-6 py-3 rounded-full font-bold text-lg shadow-lg transform transition-transform duration-300 ${
            isDeclaredLost
              ? 'bg-red-600 text-white shadow-red-500/30 animate-pulse'
              : 'bg-orange-500 text-white shadow-orange-500/30 hover:scale-105'
          }`}>
            {isDeclaredLost ? `🚨 ${t('finder.lost_badge')}` : `${t('finder.success_badge')} ✈️`}
          </span>
          <p className="mt-3 text-blue-900 text-base md:text-lg leading-relaxed max-w-md mx-auto">
            {isDeclaredLost
              ? t('finder.lost_description')
              : t('finder.found_description')}
          </p>
        </div>

        {/* ─── Status Indicator ─── */}
        <div className="flex items-center justify-center gap-2 mb-5">
          <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse"></span>
          <span className="text-sm font-bold uppercase tracking-widest text-blue-900">
            {t('finder.status_active')}
          </span>
        </div>

        {/* ═══ 🟦 BLOC 1 : IDENTITÉ PROPRIÉTAIRE ═══ */}
        {baggage && (
          <div className="w-full bg-[#0A192F] rounded-2xl p-5 md:p-6 mb-5 shadow-xl shadow-blue-900/20">
            <h2 className="text-xs uppercase tracking-widest text-white font-bold mb-4 flex items-center gap-2">
              <span>👤</span> {t('finder.owner_info')}
            </h2>

            {/* Full Name */}
            <DashedEncart>
              <div className="flex items-center gap-3">
                <span className="text-xl">👤</span>
                <div>
                  <p className="text-sm text-white/80 font-medium">{t('finder.fullName')}</p>
                  <p className="text-lg font-bold text-white">{baggage.travelerName || t('finder.notSet')}</p>
                </div>
              </div>
            </DashedEncart>

            {/* Agency */}
            <DashedEncart>
              <div className="flex items-center gap-3">
                <span className="text-xl">🏢</span>
                <div>
                  <p className="text-sm text-white/80 font-medium">{t('finder.agency')}</p>
                  <p className="text-lg font-bold text-white">{baggage.agency || t('finder.noAgency')}</p>
                </div>
              </div>
            </DashedEncart>

            {/* Baggage Type */}
            {baggage.baggageType && (
              <DashedEncart>
                <div className="flex items-center gap-3">
                  <span className="text-xl">🧳</span>
                  <div>
                    <p className="text-sm text-white/80 font-medium">{t('finder.bagType')}</p>
                    <p className="text-lg font-bold text-white capitalize">{baggage.baggageType}</p>
                  </div>
                </div>
              </DashedEncart>
            )}

            {/* Contact — Secured (NEVER show WhatsApp number) */}
            <DashedEncart className="mb-0">
              <div className="flex items-center gap-3">
                <span className="text-xl">⛔</span>
                <div>
                  <p className="text-sm text-white/80 font-medium">{t('finder.contact_label')}</p>
                  <p className="text-lg font-bold text-white">{t('finder.secure_contact')}</p>
                  <p className="text-sm text-white/70 mt-1">{t('finder.contact_reveal_note')}</p>
                </div>
              </div>
            </DashedEncart>
          </div>
        )}

        {/* ═══ 🟦 BLOC 2 : DÉTAILS DU VOYAGE ═══ */}
        {baggage && (
          <div className="w-full bg-[#0A192F] rounded-2xl p-5 md:p-6 mb-5 shadow-xl shadow-blue-900/20">
            <h2 className="text-xs uppercase tracking-widest text-white font-bold mb-4 flex items-center gap-2">
              <span>✈️</span> {t('finder.travel_details')}
            </h2>

            {/* Flight Info Encart — Airline + Flight Number */}
            {(baggage.airlineName || baggage.flightNumber) && (
              <DashedEncart>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    {baggage.airlineName && (
                      <div className="mb-2">
                        <p className="text-sm text-white/80 font-medium">{t('finder.airline')}</p>
                        <p className="text-lg font-bold text-white">{baggage.airlineName}</p>
                      </div>
                    )}
                    {baggage.flightNumber && (
                      <div>
                        <p className="text-sm text-white/80 font-medium">{t('finder.flightNum')}</p>
                        <p className="text-2xl font-bold text-white font-mono tracking-widest">{baggage.flightNumber}</p>
                      </div>
                    )}
                  </div>
                  <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center ml-4 flex-shrink-0">
                    <Plane className="w-7 h-7 text-orange-400" />
                  </div>
                </div>
              </DashedEncart>
            )}

            {/* Destination */}
            {baggage.destination && (
              <DashedEncart>
                <div className="flex items-center gap-3">
                  <span className="text-xl">📍</span>
                  <div>
                    <p className="text-sm text-white/80 font-medium">{t('finder.destination')}</p>
                    <p className="text-lg font-bold text-white">{baggage.destination}</p>
                  </div>
                </div>
              </DashedEncart>
            )}

            {/* Activation Date */}
            {(baggage.departureDate || baggage.createdAt) && (
              <DashedEncart className="mb-0">
                <div className="flex items-center gap-3">
                  <span className="text-xl">📅</span>
                  <div>
                    <p className="text-sm text-white/80 font-medium">{baggage.departureDate ? t('finder.departureDate') : t('finder.activation_date')}</p>
                    <p className="text-lg font-bold text-white">
                      {formatDate(baggage.departureDate || baggage.createdAt)}{baggage.departureTime ? ` — ${baggage.departureTime}` : ''}
                    </p>
                  </div>
                </div>
              </DashedEncart>
            )}
          </div>
        )}

        {/* ═══ 🟠 BOUTON ACTION — GPS ═══ */}
        {!showForm && (
          <div className="mb-6">
            <button
              onClick={() => {
                setShowForm(true);
                handleShareLocation();
              }}
              disabled={isLoadingLocation}
              className="w-full py-4 px-6 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold text-lg rounded-xl shadow-lg shadow-orange-500/30 transition-all duration-200 transform hover:-translate-y-1 min-h-[56px] focus:ring-2 focus:ring-orange-400 focus:ring-offset-2"
            >
              {isLoadingLocation ? (
                <>
                  <svg className="animate-spin h-6 w-6 text-white inline mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>{t('finder.locating')}</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 inline mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{t('finder.share_gps')}</span>
                </>
              )}
            </button>
            <p className="text-center text-blue-900/50 text-xs mt-3">
              {t('finder.gps_security_note')}
            </p>
          </div>
        )}

        {/* ═══ FORMULAIRE DU TROUVEUR ═══ */}
        {showForm && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* GPS Success */}
            {sharedPosition && !geoError && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <span className="text-green-800 text-base md:text-lg font-medium">
                  ✓ {locationText}
                </span>
              </div>
            )}

            {/* GPS Error */}
            {geoError && (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-orange-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-orange-900 text-base font-medium">{t('finder.gps_unavailable')}</p>
                    <p className="text-orange-800 text-base mt-1">{geoError}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Manual Location Input */}
            <div className={sharedPosition ? 'opacity-75' : ''}>
              <label className="text-sm font-semibold text-blue-700 mb-1.5 block">
                {sharedPosition ? t('finder.location_optional') : t('finder.location_label')}
              </label>
              <input
                type="text"
                placeholder={sharedPosition ? t('finder.location_optional_placeholder') : t('finder.location_placeholder')}
                value={otherLocation}
                onChange={(e) => setOtherLocation(e.target.value)}
                className="w-full px-4 py-3.5 bg-white border-2 border-blue-200 rounded-xl text-blue-900 text-base md:text-lg placeholder:text-blue-900/40 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all min-h-[52px]"
              />
            </div>

            {/* Name Input */}
            <input
              type="text"
              placeholder={t('finder.first_name')}
              value={finderName}
              onChange={(e) => setFinderName(e.target.value)}
              className="w-full px-4 py-3.5 bg-white border-2 border-blue-200 rounded-xl text-blue-900 text-base md:text-lg placeholder:text-blue-900/40 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all min-h-[52px]"
            />

            {/* WhatsApp Input */}
            <input
              type="tel"
              placeholder={`${t('finder.whatsapp')} ${t('finder.whatsapp_placeholder')}`}
              value={finderPhone}
              onChange={(e) => setFinderPhone(e.target.value)}
              className="w-full px-4 py-3.5 bg-white border-2 border-blue-200 rounded-xl text-blue-900 text-base md:text-lg placeholder:text-blue-900/40 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all min-h-[52px]"
            />

            {/* Context Dropdown — optional manual override */}
            <div>
              <label className="text-sm font-semibold text-blue-700 mb-1.5 block">
                {t('finder.context_label')}
              </label>
              <select
                value={selectedContext}
                onChange={(e) => setSelectedContext(e.target.value)}
                className="w-full px-4 py-3.5 bg-white border-2 border-blue-200 rounded-xl text-blue-900 text-base md:text-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all min-h-[52px] appearance-none cursor-pointer"
              >
                <option value="">{t('finder.context_placeholder')}</option>
                <option value="departure_airport_urgent">{t('finder.context_airport_departure')}</option>
                <option value="arrival_airport">{t('finder.context_airport_arrival')}</option>
                <option value="in_transit">{t('finder.context_taxi')}</option>
                <option value="static_location">{t('finder.context_static')}</option>
              </select>
            </div>

            {/* ─── Contact Buttons ─── */}
            <div className="pt-2">
              <h3 className="text-blue-900 text-sm font-bold uppercase tracking-widest text-center mb-4">
                {t('finder.contact_the_owner_title')}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* WhatsApp Button */}
                <button
                  onClick={() => {
                    if (!validateFinderForm()) return;
                    handleWhatsApp();
                  }}
                  disabled={isSubmitting}
                  className="py-4 px-5 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 text-lg min-h-[56px] disabled:opacity-70 shadow-lg"
                >
                  <MessageCircle className="w-5 h-5" />
                  {t('finder.by_whatsapp')}
                </button>
                {/* Phone Button */}
                <button
                  onClick={() => {
                    if (!validateFinderForm()) return;
                    handlePhoneCall();
                  }}
                  disabled={isSubmitting}
                  className="py-4 px-5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 text-lg min-h-[56px] disabled:opacity-70 shadow-lg"
                >
                  <Phone className="w-5 h-5" />
                  {t('finder.by_phone')}
                </button>
              </div>
            </div>

            {/* Retry GPS */}
            {geoError && !sharedPosition && (
              <button
                onClick={handleShareLocation}
                disabled={isLoadingLocation}
                className="w-full py-3 text-base text-blue-900 hover:text-orange-500 flex items-center justify-center gap-2 transition-colors min-h-[48px]"
              >
                <Navigation className="w-5 h-5" />
                {isLoadingLocation ? t('finder.locating') : t('finder.retry_gps')}
              </button>
            )}
          </div>
        )}

        {/* ─── Trust Note ─── */}
        <div className="mt-6 mb-4 text-center text-sm text-blue-900/60 tracking-wide">
          <Shield className="w-4 h-4 inline mr-1.5" />
          {t('finder.trust_note')}
        </div>
      </div>

      {/* AI-FEATURE: Chatbot Widget (Feature #1) — only on active/lost baggage */}
      {baggage && (baggageData?.status === 'active' || baggageData?.status === 'lost') && (
        <ChatbotWidget
          reference={reference}
          baggageContext={{
            destination: baggage.destination || undefined,
            city: locationText || undefined,
            agency: baggage.agency || undefined,
            status: baggage.status,
          }}
          locale={lang}
          t={t}
          dir={dir}
        />
      )}
    </main>
  );
}
