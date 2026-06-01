'use client'

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  QrCode, 
  ArrowLeft, 
  CheckCircle,
  Camera,
  FileText,
  Sparkles,
  Globe,
  ArrowRight,
  Shield
} from 'lucide-react';

// TRANSPORT-FEATURE: Import transport utilities
import { useTranslation } from '@/hooks/useTranslation';
import { Language, LANGUAGE_NAMES } from '@/lib/i18n';
import TransportModeSelector from '@/components/inscrire/TransportModeSelector';
import type { TransportMode } from '@/lib/transport';
import { TRANSPORT_ICONS, TRANSPORT_FIELDS } from '@/lib/transport';

// ─── Language Selector Component (Billet Premium) ───
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

// ─── Dashed Encart Helper (Billet Premium) ───
function DashedEncart({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`border-2 border-dashed border-white/80 rounded-xl p-4 mb-3 last:mb-0 ${className}`}>
      {children}
    </div>
  );
}

function InscrireContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qrFromUrl = searchParams.get('qr') || '';
  
  // TRANSPORT-FEATURE: Translation hook + transport mode + step state
  const { t, lang, setLang, dir } = useTranslation();
  // ACTIVATION-FLOW: Lire ?mode= depuis l'URL pour pré-sélectionner le mode de transport
  const modeFromUrl = searchParams.get('mode') || '';
  const isModeFromUrl = ['flight', 'train', 'boat', 'bus'].includes(modeFromUrl);
  const [transportMode, setTransportMode] = useState<TransportMode | ''>(
    isModeFromUrl ? (modeFromUrl as TransportMode) : ''
  );
  const [step, setStep] = useState(isModeFromUrl ? 2 : 1);
  const [activeTab, setActiveTab] = useState<'manual' | 'scan'>('manual');

  const [loading, setLoading] = useState(false);
  // TRANSPORT-FEATURE: Extended formData with all transport fields
  const [formData, setFormData] = useState({
    reference: '',
    firstName: '',
    lastName: '',
    destination: '',
    departureDate: '',
    departureTime: '',
    whatsapp: '',
    // TRANSPORT-FEATURE: Conditional fields (all modes)
    airlineName: '',
    flightNumber: '',
    trainCompany: '',
    trainNumber: '',
    shipName: '',
    shipCabin: '',
    busCompany: '',
    busLineNumber: '',
  });

  // Pre-fill reference from URL
  useEffect(() => {
    if (qrFromUrl) {
      setFormData(prev => ({ ...prev, reference: qrFromUrl.toUpperCase() }));
    }
  }, [qrFromUrl]);

  // TRANSPORT-FEATURE: Get dynamic fields for current transport mode
  const currentFields = transportMode ? TRANSPORT_FIELDS[transportMode] : [];

  // TRANSPORT-FEATURE: Handle transport mode selection → advance to step 2
  const handleModeSelect = (mode: TransportMode) => {
    setTransportMode(mode);
    setStep(2);
  };

  // TRANSPORT-FEATURE: Go back to mode selector
  const handleBackToMode = () => {
    setStep(1);
  };

  const doSubmit = async () => {
    if (!transportMode) return;
    setLoading(true);

    try {
      const response = await fetch('/api/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: formData.reference.toUpperCase(),
          travelerFirstName: formData.firstName,
          travelerLastName: formData.lastName,
          whatsappOwner: formData.whatsapp,
          // TRANSPORT-FEATURE: Send transportMode + all conditional fields
          transportMode: transportMode,
          airlineName: formData.airlineName,
          flightNumber: formData.flightNumber,
          trainCompany: formData.trainCompany,
          trainNumber: formData.trainNumber,
          shipName: formData.shipName,
          shipCabin: formData.shipCabin,
          busCompany: formData.busCompany,
          busLineNumber: formData.busLineNumber,
          destination: formData.destination,
          departureDate: formData.departureDate || undefined,
          departureTime: formData.departureTime || undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Store activation data for success page
        sessionStorage.setItem('activationData', JSON.stringify({
          reference: formData.reference.toUpperCase(),
          firstName: formData.firstName,
          lastName: formData.lastName,
          whatsapp: formData.whatsapp,
          destination: formData.destination,
          transportMode: transportMode,
          // All transport fields for the success page download proof
          airlineName: formData.airlineName,
          flightNumber: formData.flightNumber,
          trainCompany: formData.trainCompany,
          trainNumber: formData.trainNumber,
          shipName: formData.shipName,
          shipCabin: formData.shipCabin,
          busCompany: formData.busCompany,
          busLineNumber: formData.busLineNumber,
          type: 'voyageur',
          activatedAt: new Date().toISOString(),
          expiresAt: data.baggage?.expiresAt,
        }));
        router.push('/success?type=voyageur');
      } else {
        const error = await response.json();
        alert(error.message || t('inscrire.error_activation'));
      }
    } catch (error) {
      console.error('Activation error:', error);
      alert(t('inscrire.error_activation'));
    } finally {
      setLoading(false);
    }
  };

  // TRANSPORT-FEATURE: Dynamic icon based on selected transport mode
  const TransportIcon = transportMode ? TRANSPORT_ICONS[transportMode] : '✈️';

  return (
    <main
      className="min-h-[100dvh] min-h-screen bg-white flex flex-col px-4 sm:px-5 md:px-8 pb-[env(safe-area-inset-bottom,0px)]"
      dir={dir}
    >
      {/* ─── Header ─── */}
      <header className="sticky top-0 z-40 flex items-center justify-between pt-[env(safe-area-inset-top,0px)] px-0 py-2 sm:py-3 md:py-4 bg-white">
        <Link href="/" className="flex items-center gap-2 text-blue-900 hover:text-orange-500 transition-colors min-h-[44px]">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm md:text-base font-medium">{t('inscrire.back')}</span>
        </Link>
        <div className="flex items-center">
          <Image src="/logo-full.png" alt="SmarticketS" width={374} height={135} className="h-7 w-auto" />
        </div>
        <LanguageSelector lang={lang} setLang={setLang} />
      </header>

      {/* ─── Container ─── */}
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col py-4 sm:py-6 md:py-0">

        {/* ═══ 🔺 BADGE DE STATUT — Welcome ═══ */}
        <div className="mt-2 sm:mt-4 md:mt-6 mb-4 sm:mb-6 text-center">
          {qrFromUrl ? (
            <span className="inline-flex items-center justify-center px-6 py-3 rounded-full font-bold text-lg shadow-lg bg-orange-500 text-white shadow-orange-500/30">
              ✨ {t('inscrire.voyageur_badge')}
            </span>
          ) : (
            <span className="inline-flex items-center justify-center px-6 py-3 rounded-full font-bold text-lg shadow-lg bg-orange-500 text-white shadow-orange-500/30">
              🧳 {t('inscrire.title')}
            </span>
          )}
          <p className="mt-3 text-blue-900 text-base md:text-lg leading-relaxed max-w-md mx-auto">
            {qrFromUrl ? t('inscrire.welcome_desc') : t('inscrire.subtitle')}
          </p>
        </div>

        {/* ─── Status Indicator ─── */}
        <div className="flex items-center justify-center gap-2 mb-5">
          <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse"></span>
          <span className="text-sm font-bold uppercase tracking-widest text-blue-900">
            {step === 1 ? t('transport.select_mode') : t('inscrire.step_2_subtitle')}
          </span>
        </div>

        {/* ═══ 🟦 BLOC PRINCIPAL — Formulaire Activation ═══ */}
        <div className="w-full bg-[#0A192F] rounded-2xl p-5 md:p-6 mb-5 shadow-xl shadow-blue-900/20">

          {/* ─── Step 1: Transport Mode Selector ─── */}
          {step === 1 && (
            <>
              <h2 className="text-xs uppercase tracking-widest text-white font-bold mb-4 flex items-center gap-2">
                <span>🧳</span> {t('transport.select_mode')}
              </h2>

              {/* Tab Toggle — Manual / Scan */}
              <div className="flex gap-2 mb-5">
                <button
                  onClick={() => setActiveTab('manual')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all min-h-[44px] ${
                    activeTab === 'manual'
                      ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  {t('inscrire.manual_tab')}
                </button>
                <button
                  onClick={() => setActiveTab('scan')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all min-h-[44px] ${
                    activeTab === 'scan'
                      ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  <Camera className="w-4 h-4" />
                  {t('inscrire.scan_tab')}
                </button>
              </div>

              {activeTab === 'scan' ? (
                <div className="text-center py-6">
                  <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/20">
                    <Camera className="w-10 h-10 text-white/60" />
                  </div>
                  <h3 className="text-white font-semibold text-lg mb-2">
                    {t('inscrire.scan_title')}
                  </h3>
                  <p className="text-white/60 text-sm mb-5">
                    {t('inscrire.scan_desc')}
                  </p>
                  <button
                    className="w-full py-4 px-6 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-lg transition-colors flex items-center justify-center gap-2 min-h-[56px] shadow-lg shadow-orange-500/30"
                  >
                    <Camera className="w-5 h-5" />
                    {t('inscrire.scan_button')}
                  </button>
                </div>
              ) : (
                <>
                  <TransportModeSelector
                    selectedMode={transportMode}
                    onSelect={handleModeSelect}
                    t={t}
                    lang={lang}
                  />
                  <button
                    type="button"
                    disabled={!transportMode}
                    onClick={() => transportMode && setStep(2)}
                    className="w-full mt-5 py-4 px-6 bg-orange-500 hover:bg-orange-600 disabled:bg-white/10 disabled:text-white/40 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg transition-colors flex items-center justify-center gap-2 min-h-[56px] shadow-lg shadow-orange-500/30"
                  >
                    {t('inscrire.next_step')}
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </>
          )}

          {/* ─── Step 2: Activation Form ─── */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Back button */}
              <button
                type="button"
                onClick={handleBackToMode}
                className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors text-sm mb-2"
              >
                <ArrowLeft className="w-4 h-4" />
                {t('inscrire.back_step')}
              </button>

              {/* Mode indicator */}
              <DashedEncart>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{TransportIcon}</span>
                  <div>
                    <p className="text-sm text-white/80 font-medium">{t('common.baggage_type')}</p>
                    <p className="text-lg font-bold text-white">{t(`transport.mode_${transportMode}`)}</p>
                  </div>
                </div>
              </DashedEncart>

              <h2 className="text-xs uppercase tracking-widest text-white font-bold flex items-center gap-2">
                <span>{TransportIcon}</span> {t('transport.traveler_info')}
              </h2>

              {/* QR Reference — displayed in dashed encart */}
              <DashedEncart>
                <div className="flex items-center gap-3">
                  <span className="text-xl">🎫</span>
                  <div className="flex-1">
                    <p className="text-sm text-white/80 font-medium">{t('inscrire.reference_label')}</p>
                    {qrFromUrl ? (
                      <p className="text-lg font-bold text-white font-mono tracking-widest">
                        {formData.reference}
                      </p>
                    ) : (
                      <input
                        type="text"
                        placeholder={t('inscrire.reference_placeholder')}
                        value={formData.reference}
                        onChange={(e) => setFormData({ ...formData, reference: e.target.value.toUpperCase() })}
                        className="w-full bg-transparent border-b border-white/30 text-white placeholder:text-white/40 focus:outline-none focus:border-orange-400 text-base font-mono py-1 min-h-[36px]"
                        required
                      />
                    )}
                  </div>
                </div>
                {qrFromUrl && (
                  <p className="text-xs text-orange-400 mt-2 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    {t('inscrire.reference_detected')}
                  </p>
                )}
              </DashedEncart>

              {/* Name Fields — Dashed Encart */}
              <DashedEncart>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-white/80 font-medium mb-1.5">{t('inscrire.first_name_label')}</p>
                    <input
                      type="text"
                      placeholder={t('inscrire.first_name_placeholder')}
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent rounded-lg px-3 py-2.5 text-base min-h-[48px]"
                      required
                    />
                  </div>
                  <div>
                    <p className="text-sm text-white/80 font-medium mb-1.5">{t('inscrire.last_name_label')}</p>
                    <input
                      type="text"
                      placeholder={t('inscrire.last_name_placeholder')}
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent rounded-lg px-3 py-2.5 text-base min-h-[48px]"
                      required
                    />
                  </div>
                </div>
              </DashedEncart>

              {/* TRANSPORT-FEATURE: Dynamic conditional fields */}
              {currentFields.length > 0 && (
                <DashedEncart>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentFields.map((field) => (
                      <div key={field.key}>
                        <p className="text-sm text-white/80 font-medium mb-1.5">{t(field.labelKey)}</p>
                        <input
                          type="text"
                          placeholder={t(field.placeholderKey)}
                          value={(formData as Record<string, string>)[field.key] || ''}
                          onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                          className="w-full bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent rounded-lg px-3 py-2.5 text-base min-h-[48px]"
                        />
                      </div>
                    ))}
                  </div>
                </DashedEncart>
              )}

              {/* Destination — Dashed Encart */}
              <DashedEncart>
                <div className="flex items-center gap-3">
                  <span className="text-xl">📍</span>
                  <div className="flex-1">
                    <p className="text-sm text-white/80 font-medium">{t('inscrire.destination_label')}</p>
                    <input
                      type="text"
                      placeholder={t('inscrire.destination_placeholder')}
                      value={formData.destination}
                      onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                      className="w-full bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent rounded-lg px-3 py-2.5 text-base mt-1 min-h-[48px]"
                    />
                  </div>
                </div>
              </DashedEncart>

              {/* Departure Date & Time — Dashed Encart */}
              <DashedEncart>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xl">📅</span>
                  <p className="text-sm text-white/80 font-medium">{t('transport.common_departure_date')}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={formData.departureDate}
                    onChange={(e) => setFormData({ ...formData, departureDate: e.target.value })}
                    className="w-full bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent rounded-lg px-3 py-2.5 text-base min-h-[48px] [color-scheme:dark]"
                  />
                  <input
                    type="time"
                    value={formData.departureTime}
                    onChange={(e) => setFormData({ ...formData, departureTime: e.target.value })}
                    className="w-full bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent rounded-lg px-3 py-2.5 text-base min-h-[48px] [color-scheme:dark]"
                  />
                </div>
              </DashedEncart>

              {/* WhatsApp — Dashed Encart */}
              <DashedEncart className="mb-0">
                <div className="flex items-center gap-3">
                  <span className="text-xl">📱</span>
                  <div className="flex-1">
                    <p className="text-sm text-white/80 font-medium">{t('inscrire.whatsapp_label')}</p>
                    <input
                      type="tel"
                      placeholder={t('inscrire.whatsapp_placeholder')}
                      value={formData.whatsapp}
                      onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                      className="w-full bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent rounded-lg px-3 py-2.5 text-base mt-1 min-h-[48px]"
                      required
                    />
                    <p className="text-xs text-white/50 mt-1.5">
                      {t('inscrire.whatsapp_hint')}
                    </p>
                  </div>
                </div>
              </DashedEncart>
            </div>
          )}
        </div>

        {/* ═══ 🛡️ BLOC INFO — Protection ═══ */}
        <div className="w-full bg-[#0A192F] rounded-2xl p-5 md:p-6 mb-5 shadow-xl shadow-blue-900/20">
          <h2 className="text-xs uppercase tracking-widest text-white font-bold mb-4 flex items-center gap-2">
            <span>🛡️</span> {t('inscrire.protection_title')}
          </h2>
          <DashedEncart className="mb-0">
            <div className="flex items-start gap-3">
              <Shield className="w-6 h-6 text-orange-400 flex-shrink-0 mt-0.5" />
              <p className="text-white/70 text-sm md:text-base leading-relaxed">
                {t('inscrire.protection_desc')}
              </p>
            </div>
          </DashedEncart>
        </div>

        {/* ═══ 🟠 BOUTON SUBMIT ═══ */}
        {step === 2 && (
          <div className="mb-6">
            <button
              onClick={doSubmit}
              disabled={loading || !transportMode}
              className="w-full py-4 px-6 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold text-lg rounded-xl shadow-lg shadow-orange-500/30 transition-all duration-200 transform hover:-translate-y-1 min-h-[56px] focus:ring-2 focus:ring-orange-400 focus:ring-offset-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t('inscrire.submit_loading')}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  {t('inscrire.submit')}
                </span>
              )}
            </button>
          </div>
        )}

        {/* ─── Help Section ─── */}
        <div className="text-center pb-6">
          <p className="text-blue-900/50 text-sm">
            {t('inscrire.no_qr')}{' '}
            <Link href="/#pricing" className="text-orange-500 hover:text-orange-600 underline font-medium">
              {t('inscrire.order_sticker')}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function InscrirePage() {
  const { t, lang, setLang } = useTranslation();

  return (
    <Suspense fallback={
      <main className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-900/20 border-t-orange-500 rounded-full mx-auto mb-4"></div>
          <p className="text-lg text-blue-900">{t('common.loading')}</p>
        </div>
      </main>
    }>
      <InscrireContent />
    </Suspense>
  );
}
