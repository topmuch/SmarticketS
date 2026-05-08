'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
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
  X
} from "lucide-react";
import { useTranslation } from '@/hooks/useTranslation';
import { Language, LANGUAGE_NAMES } from '@/lib/i18n';

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

// Language Selector Component
function LanguageSelector({ lang, setLang }: { lang: Language; setLang: (l: Language) => void }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-full text-slate-300 hover:bg-white/20 transition-colors text-sm font-medium backdrop-blur-sm border border-white/10"
      >
        <Globe className="w-4 h-4" />
        <span>{LANGUAGE_NAMES[lang]}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 bg-[#1a1a2e] border border-indigo-700 rounded-xl shadow-2xl overflow-hidden z-50 min-w-[140px] backdrop-blur-sm">
          {(['fr', 'en', 'ar'] as Language[]).map((l) => (
            <button
              key={l}
              onClick={() => {
                setLang(l);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-3 text-left text-sm font-medium transition-colors ${
                lang === l 
                  ? 'bg-indigo-600/30 text-amber-400' 
                  : 'text-slate-300 hover:bg-indigo-900/50 hover:text-slate-100'
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

// Activation Redirect Component
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
  const bgGradient = isHajj
    ? 'from-[#0d5e34] to-[#0a4a2a]'
    : 'from-[#d35400] to-[#b34700]';

  return (
    <main className={`min-h-screen bg-gradient-to-b ${bgGradient} flex items-center justify-center p-4`}>
      <div className="relative max-w-md w-full bg-white/10 backdrop-blur-sm rounded-xl p-8 text-center border border-white/20">
        <div className="absolute top-4 right-4">
          <LanguageSelector lang={lang} setLang={setLang} />
        </div>

        <div className="relative inline-block mb-6">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
            {isHajj ? (
              <Plane className="w-10 h-10 text-white" />
            ) : (
              <Luggage className="w-10 h-10 text-white" />
            )}
          </div>
          <div className="absolute -top-1 -right-1 w-8 h-8 bg-[#ffd700] rounded-full flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-[#080c1a]" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">
          {t('common.welcome')}
        </h1>
        <p className="text-white/70 mb-4">
          {t('common.activate_in')}
        </p>

        <div className="bg-white/10 rounded-lg p-4 mb-6">
          <p className="text-white/60 text-sm mb-2">{t('common.baggage_type')}</p>
          <Badge className={`${isHajj ? 'bg-[#1e3a2e] text-green-300' : 'bg-[#7a3e00] text-orange-300'} text-sm px-4 py-1`}>
            {isHajj ? t('common.hajj_label') : t('common.voyageur_label')}
          </Badge>
        </div>

        <p className="text-white/50 text-sm mb-4">
          {t('common.auto_redirect')} <span className="text-white font-bold">{countdown}s</span>
        </p>

        <button
          className="w-full py-3 px-6 bg-white text-[#080c1a] rounded-lg font-semibold hover:bg-white/90 transition-colors flex items-center justify-center gap-2"
          onClick={() => {
            const url = isHajj
              ? `/hajj/activate?qr=${reference}`
              : `/inscrire?qr=${reference}`;
            router.push(url);
          }}
        >
          {t('common.start_activation')}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </main>
  );
}

// Loading Component
function LoadingScreen({ t }: { t: (key: string) => string }) {
  return (
    <main className="min-h-screen bg-[#0c0a2a] flex items-center justify-center">
      <div className="text-center text-white">
        <div className="animate-spin w-12 h-12 border-4 border-indigo-500/30 border-t-amber-500 rounded-full mx-auto mb-4"></div>
        <p className="text-slate-300">{t('common.loading')}</p>
      </div>
    </main>
  );
}

// Error Screen
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
      icon: <AlertCircle className="w-10 h-10 text-red-400" />,
      title: t('errors.qr_not_valid'),
      message: t('errors.qr_not_valid_desc')
    },
    blocked: {
      icon: <Shield className="w-10 h-10 text-gray-400" />,
      title: t('errors.baggage_blocked'),
      message: t('errors.baggage_blocked_desc')
    },
    expired: {
      icon: <Clock className="w-10 h-10 text-gray-400" />,
      title: t('errors.protection_expired'),
      message: t('errors.protection_expired_desc')
    }
  };

  const config = errorConfig[type as keyof typeof errorConfig] || errorConfig.not_found;

  return (
    <main className="min-h-screen bg-[#0c0a2a] flex items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4">
        <LanguageSelector lang={lang} setLang={setLang} />
      </div>

      <div className="max-w-md w-full bg-indigo-900/60 rounded-xl p-8 text-center border border-indigo-700">
        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          {config.icon}
        </div>
        <h1 className="text-2xl font-bold text-slate-100 mb-2">{config.title}</h1>
        <p className="text-slate-400 mb-6">{config.message}</p>
        <button
          className="px-6 py-2 border border-indigo-700 text-slate-400 rounded-lg hover:bg-indigo-800/50 transition-colors"
          onClick={() => router.push('/')}
        >
          {t('common.back_home')}
        </button>
      </div>
    </main>
  );
}

// Success Toast Component
function SuccessToast({ show, message }: { show: boolean; message: string }) {
  if (!show) return null;
  
  return (
    <div className="fixed top-5 right-5 bg-amber-500 text-slate-900 px-6 py-4 rounded-xl shadow-lg z-50 animate-in slide-in-from-right duration-300">
      <div className="flex items-center gap-3">
        <CheckCircle className="w-5 h-5" />
        <div>
          <div className="font-bold">Wahoo ! 🎉</div>
          <div className="text-sm opacity-80">{message}</div>
        </div>
      </div>
    </div>
  );
}

// Contact Modal Component — Dark Indigo Theme
function ContactModal({ 
  show, 
  onClose, 
  onWhatsApp, 
  onPhone,
  t 
}: { 
  show: boolean; 
  onClose: () => void; 
  onWhatsApp: () => void;
  onPhone: () => void;
  t: (key: string) => string;
}) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-indigo-900 border border-indigo-700 rounded-xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg text-slate-100">{t('finder.contact_owner')}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-slate-400 text-center text-sm mb-6">
          {t('finder.choose_method')}
        </p>
        
        {/* WhatsApp Button */}
        <button 
          onClick={onWhatsApp}
          className="w-full py-4 bg-green-600 hover:bg-green-500 text-white rounded-xl mb-3 flex items-center justify-center gap-3 font-semibold transition-colors"
        >
          <MessageCircle className="w-5 h-5" />
          {t('finder.by_whatsapp')}
        </button>
        
        {/* Phone Button */}
        <button 
          onClick={onPhone}
          className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-xl flex items-center justify-center gap-3 font-semibold transition-colors"
        >
          <Phone className="w-5 h-5" />
          {t('finder.by_phone')}
        </button>
        
        <button 
          onClick={onClose} 
          className="mt-4 text-slate-500 w-full text-center text-sm hover:text-slate-300 transition-colors"
        >
          {t('common.cancel')}
        </button>
      </div>
    </div>
  );
}

// Main Scan Page
export default function ScanPage() {
  const params = useParams();
  const router = useRouter();
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
  
  // UI State
  const [showForm, setShowForm] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [locationText, setLocationText] = useState('');
  const [geoError, setGeoError] = useState<string | null>(null);
  const [showManualLocation, setShowManualLocation] = useState(false);

  const hasLocation = sharedPosition !== null || otherLocation.trim().length > 0;
  const isFormComplete = finderName.trim().length > 0 && finderPhone.trim().length > 0 && hasLocation;

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
        errorMessage = t('errors.location_permission_denied') || '⚠️ Accès à la localisation refusé. Activez-la dans Réglages > Safari > QRBag ou entrez le lieu manuellement.';
      } else if (geoErr.code === 2) {
        errorMessage = t('errors.location_unavailable') || '📍 Service de localisation indisponible. Activez-le dans Réglages > Confidentialité > Services de localisation.';
      } else if (geoErr.code === 3) {
        errorMessage = t('errors.location_timeout') || '⏳ Détection impossible. Veuillez entrer le lieu manuellement.';
      } else {
        errorMessage = t('errors.location_failed') || 'Impossible de détecter votre position.';
      }

      setGeoError(errorMessage);
      setShowManualLocation(true);
    } finally {
      setIsLoadingLocation(false);
    }
  }, [t]);

  // Generate WhatsApp message
  const generateWhatsAppMessage = useCallback((finderName: string, finderPhone: string, locationText: string, mapLink: string) => {
    return encodeURIComponent(
      `📦 *QRBag – Bagage trouvé !*\n\n` +
      `📍 *Référence* : ${reference}\n` +
      `📍 *Lieu* : ${locationText}\n` +
      `🗺️ *Carte* : ${mapLink}\n\n` +
      `👤 *Trouvé par* : ${finderName}\n` +
      `📱 *Contact* : ${finderPhone}\n\n` +
      `👉 Merci de le récupérer rapidement.\n` +
      `*QRBag – Protégez vos bagages, en toute sérénité.*`
    );
  }, [reference]);

  // Handle WhatsApp contact
  const handleWhatsApp = useCallback(async () => {
    setIsSubmitting(true);
    setShowContactModal(false);

    try {
      // Log the scan
      await fetch(`/api/scan/${reference}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: otherLocation.trim() || locationText || "Non précisé",
          finderName: finderName.trim(),
          finderPhone: finderPhone.trim(),
          message: '',
          latitude: sharedPosition?.lat,
          longitude: sharedPosition?.lng,
        }),
      });

      const finalLocationText = otherLocation.trim() || locationText || "Non précisé";
      const mapLink = sharedPosition
        ? `https://maps.app.goo.gl/?link=https://www.google.com/maps?q=${sharedPosition.lat},${sharedPosition.lng}`
        : "Localisation non partagée";

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
  }, [reference, otherLocation, locationText, finderName, finderPhone, sharedPosition, baggageData, t, generateWhatsAppMessage]);

  // Handle phone call
  const handlePhoneCall = useCallback(async () => {
    setShowContactModal(false);

    // Log the scan before calling (same as WhatsApp)
    try {
      await fetch(`/api/scan/${reference}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: otherLocation.trim() || locationText || "Non précisé",
          finderName: finderName.trim(),
          finderPhone: finderPhone.trim(),
          message: '',
          latitude: sharedPosition?.lat,
          longitude: sharedPosition?.lng,
        }),
      });
    } catch (e) {
      // Continue with call even if logging fails
    }

    const phoneNumber = baggageData?.baggage?.whatsappOwner || FALLBACK_PHONE;
    window.location.href = `tel:${phoneNumber}`;
  }, [reference, otherLocation, locationText, finderName, finderPhone, sharedPosition, baggageData]);

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
      setGeoError(t('finder.please_enter_location') || 'Veuillez entrer le lieu où vous avez trouvé le bagage.');
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

  // ─── Main Render — Dark Violet Night Theme ───
  return (
    <main 
      className="min-h-screen bg-[#0c0a2a] flex items-center justify-center p-4" 
      dir={dir}
    >
      {/* Language Selector */}
      <div className="absolute top-4 right-4 z-40">
        <LanguageSelector lang={lang} setLang={setLang} />
      </div>

      {/* Success Toast */}
      <SuccessToast show={showSuccess} message={t('finder.message_sent')} />

      {/* Content Container */}
      <div className="w-full max-w-sm">
        {/* Urgent Banner for Lost Baggage */}
        {isDeclaredLost && (
          <div className="bg-red-600 text-white text-center py-2.5 px-4 rounded-t-2xl">
            <p className="font-bold text-sm flex items-center justify-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              URGENT – Bagage signalé perdu !
            </p>
          </div>
        )}

        {/* Success Badge — Amber, Premium rounded-full */}
        <div className={`bg-amber-500 text-slate-900 text-center py-3 px-6 rounded-full font-bold text-base md:text-lg shadow-lg hover:shadow-xl transition-shadow tracking-wide mx-4 -mt-2 relative z-10 ${isDeclaredLost ? '' : ''}`}>
          {t('finder.success_badge')} ✈️
        </div>

        {/* Main Card — Dark Indigo */}
        <div className="bg-indigo-950/80 border border-indigo-800 rounded-b-2xl p-5 backdrop-blur-sm">
          
          {/* ─── Owner Info Block ─── */}
          {baggage && (
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-4 mb-3">
              <h3 className="text-amber-400/90 text-[10px] font-bold uppercase tracking-widest mb-3">
                {t('finder.owner_info')}
              </h3>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-11 h-11 bg-indigo-700/60 rounded-full flex items-center justify-center border border-indigo-600/40">
                  <Luggage className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <div className="text-slate-100 font-bold text-base leading-tight">
                    {baggage.travelerName}
                  </div>
                  <div className="text-slate-500 text-xs font-mono mt-0.5">{reference}</div>
                </div>
              </div>
              {baggage.agency && (
                <div className="text-slate-400 text-xs flex items-center gap-1.5 mt-2 pl-1">
                  <Shield className="w-3.5 h-3.5 text-indigo-400" />
                  {baggage.agency}
                </div>
              )}
            </div>
          )}

          {/* ─── Travel Details Block ─── */}
          {baggage && (
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-4 mb-4">
              <h3 className="text-amber-400/90 text-[10px] font-bold uppercase tracking-widest mb-3">
                {t('finder.travel_details')}
              </h3>
              <div className="space-y-2.5">
                {baggage.flightNumber && (
                  <div className="flex items-center gap-2.5">
                    <Plane className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                    <span className="text-slate-100 text-sm font-medium">{baggage.flightNumber}</span>
                  </div>
                )}
                {baggage.destination && (
                  <div className="flex items-center gap-2.5">
                    <MapPin className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                    <span className="text-slate-100 text-sm">{baggage.destination}</span>
                  </div>
                )}
                {baggage.departureDate && (
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                    <span className="text-slate-100 text-sm">
                      {formatDate(baggage.departureDate)}{baggage.departureTime ? ` – ${baggage.departureTime}` : ''}
                    </span>
                  </div>
                )}
                {!baggage.departureDate && baggage.createdAt && (
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                    <span className="text-slate-200 text-sm">
                      {t('finder.activation_date')} {formatDate(baggage.createdAt)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── Step 1: GPS Share Button (Amber) ─── */}
          {!showForm && (
            <button
              onClick={() => {
                setShowForm(true);
                handleShareLocation();
              }}
              disabled={isLoadingLocation}
              className="w-full py-4 px-6 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-xl mb-4 disabled:opacity-70"
            >
              {isLoadingLocation ? (
                <>
                  <span className="animate-spin">⏳</span>
                  {t('finder.locating')}
                </>
              ) : (
                <>
                  <Navigation className="w-5 h-5" />
                  {t('finder.share_gps')}
                </>
              )}
            </button>
          )}

          {/* ─── Step 2: Finder Form ─── */}
          {showForm && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
              {/* GPS Success */}
              {sharedPosition && !geoError && (
                <div className="p-3 bg-green-500/15 border border-green-500/30 rounded-xl flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-slate-200 text-sm">
                    ✓ {locationText}
                  </span>
                </div>
              )}

              {/* GPS Error — Orange */}
              {geoError && (
                <div className="p-3 bg-orange-500/15 border border-orange-500/30 rounded-xl">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-orange-300 text-sm font-medium">{t('finder.gps_unavailable')}</p>
                      <p className="text-orange-400/80 text-xs mt-1">{geoError}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Manual Location Input */}
              <div className={sharedPosition ? 'opacity-75' : ''}>
                <label className="text-[10px] text-slate-400 mb-1 block font-medium uppercase tracking-wider">
                  {sharedPosition ? t('finder.location_optional') : t('finder.location_label')}
                </label>
                <input
                  type="text"
                  placeholder={sharedPosition ? t('finder.location_optional_placeholder') : t('finder.location_placeholder')}
                  value={otherLocation}
                  onChange={(e) => setOtherLocation(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800/80 border border-slate-600/50 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/60 focus:border-transparent transition-all"
                />
              </div>

              {/* Name Input */}
              <input
                type="text"
                placeholder={t('finder.first_name')}
                value={finderName}
                onChange={(e) => setFinderName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800/80 border border-slate-600/50 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/60 focus:border-transparent transition-all"
              />

              {/* WhatsApp Input */}
              <input
                type="tel"
                placeholder={`${t('finder.whatsapp')} (+33612345678)`}
                value={finderPhone}
                onChange={(e) => setFinderPhone(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800/80 border border-slate-600/50 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/60 focus:border-transparent transition-all"
              />

              {/* ─── Contact The Owner — Two Buttons ─── */}
              <div className="pt-2">
                <h3 className="text-amber-400/90 text-[10px] font-bold uppercase tracking-widest text-center mb-3">
                  {t('finder.contact_the_owner_title')}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {/* WhatsApp Button */}
                  <button
                    onClick={() => {
                      if (!validateFinderForm()) return;
                      handleWhatsApp();
                    }}
                    disabled={isSubmitting}
                    className="py-3.5 px-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-70 shadow-lg shadow-green-600/20"
                  >
                    <MessageCircle className="w-4 h-4" />
                    {t('finder.by_whatsapp')}
                  </button>
                  {/* Phone Button */}
                  <button
                    onClick={() => {
                      if (!validateFinderForm()) return;
                      handlePhoneCall();
                    }}
                    disabled={isSubmitting}
                    className="py-3.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-70 shadow-lg shadow-amber-500/20"
                  >
                    <Phone className="w-4 h-4" />
                    {t('finder.by_phone')}
                  </button>
                </div>
              </div>

              {/* Retry GPS */}
              {geoError && !sharedPosition && (
                <button
                  onClick={handleShareLocation}
                  disabled={isLoadingLocation}
                  className="w-full py-2 text-sm text-slate-500 hover:text-slate-300 flex items-center justify-center gap-2 transition-colors"
                >
                  <Navigation className="w-4 h-4" />
                  {isLoadingLocation ? t('finder.locating') : t('finder.retry_gps')}
                </button>
              )}
            </div>
          )}

          {/* ─── Trust Note ─── */}
          <div className="mt-5 text-center text-[10px] text-slate-500 tracking-wide">
            <Shield className="w-3.5 h-3.5 inline mr-1 text-indigo-400/60" />
            {t('finder.trust_note')}
          </div>
        </div>
      </div>

      {/* Contact Modal — Dark Theme */}
      <ContactModal
        show={showContactModal}
        onClose={() => setShowContactModal(false)}
        onWhatsApp={handleWhatsApp}
        onPhone={handlePhoneCall}
        t={t}
      />
    </main>
  );
}
