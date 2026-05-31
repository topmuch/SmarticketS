'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  QrCode,
  CheckCircle2,
  MessageCircle,
  MapPin,
  LayoutDashboard,
  ArrowRight,
  ArrowLeft,
  ArrowRightLeft,
  RotateCcw,
  Package,
  Lock,
  Bell,
  Shield,
  Eye,
  Bus,
  Clock,
  Calendar,
  Armchair,
  Route,
  Timer,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import FadeIn from '@/components/landing/FadeIn';

/* ═══════════════════════════════════════════════════════
   MOCK DATA — Bus schedules
   ═══════════════════════════════════════════════════════ */
const MOCK_SCHEDULES = [
  { id: 's1', origin: 'Dakar', destination: 'Saint-Louis', departure: '06:30', arrival: '10:45', bus: 'DST-Express-01', seats: 42, available: 18, type: 'ALLER', price: '8 500', duration: '4h15' },
  { id: 's2', origin: 'Dakar', destination: 'Saint-Louis', departure: '08:00', arrival: '12:30', bus: 'DST-Express-03', seats: 55, available: 7, type: 'ALLER', price: '8 500', duration: '4h30' },
  { id: 's3', origin: 'Dakar', destination: 'Saint-Louis', departure: '10:30', arrival: '14:45', bus: 'DST-Express-05', seats: 42, available: 31, type: 'ALLER', price: '8 500', duration: '4h15' },
  { id: 's4', origin: 'Saint-Louis', destination: 'Dakar', departure: '07:00', arrival: '11:15', bus: 'DST-Express-02', seats: 42, available: 22, type: 'RETOUR', price: '8 500', duration: '4h15' },
  { id: 's5', origin: 'Saint-Louis', destination: 'Dakar', departure: '12:00', arrival: '16:30', bus: 'DST-Express-04', seats: 55, available: 3, type: 'RETOUR', price: '8 500', duration: '4h30' },
  { id: 's6', origin: 'Dakar', destination: 'Thiès', departure: '07:15', arrival: '08:45', bus: 'THS-Voyageur-01', seats: 38, available: 14, type: 'ALLER', price: '3 000', duration: '1h30' },
  { id: 's7', origin: 'Thiès', destination: 'Dakar', departure: '17:00', arrival: '18:30', bus: 'THS-Voyageur-02', seats: 38, available: 25, type: 'RETOUR', price: '3 000', duration: '1h30' },
];

const MOCK_ROUTES = [
  { id: 'r1', origin: 'Dakar', destination: 'Saint-Louis', distance: '264 km', duration: '4h15', price: '8 500', isRoundTrip: true, frequency: '6 départs / jour' },
  { id: 'r2', origin: 'Dakar', destination: 'Thiès', distance: '70 km', duration: '1h30', price: '3 000', isRoundTrip: true, frequency: '12 départs / jour' },
  { id: 'r3', origin: 'Dakar', destination: 'Kaolack', distance: '192 km', duration: '3h', price: '6 500', isRoundTrip: true, frequency: '8 départs / jour' },
];

/* ═══════════════════════════════════════════════════════
   STEPS CONFIG
   ═══════════════════════════════════════════════════════ */
const steps = [
  {
    id: 1,
    title: 'Horaires & Trajets',
    subtitle: 'Étape 1 sur 7',
    icon: Bus,
    color: '#FF6B35',
    description:
      'Consultez les horaires de bus en temps réel. Tous les trajets aller-retour sont affichés avec les places disponibles, les prix et les durées.',
    details: [
      'Horaires temps réel avec mise à jour automatique',
      'Trajets aller-retour clairement identifiés',
      'Places disponibles et taux d\'occupation',
      'Prix et durée de trajet affichés',
    ],
  },
  {
    id: 2,
    title: 'Scan du QR Code',
    subtitle: 'Étape 2 sur 7',
    icon: QrCode,
    color: '#10B981',
    description:
      'Le chauffeur scanne le QR code du billet ou colis avec son application SmarticketS. Le système identifie instantanément la réservation.',
    details: [
      'Scan instantané du QR code',
      'Identification automatique du billet/colis',
      'Vérification de la référence et du trajet',
      'Démarre le processus de suivi',
    ],
  },
  {
    id: 3,
    title: 'Formulaire d\'activation',
    subtitle: 'Étape 3 sur 7',
    icon: Package,
    color: '#3B82F6',
    description:
      'Les informations sont pré-remplies automatiquement. Le chauffeur valide le billet ou l\'expédition de colis en un clic.',
    details: [
      'Passager : Diallo Mamadou',
      'Itinéraire : Dakar → Saint-Louis (Aller)',
      'Numéro de bus : DST-Express-01',
      'Siège réservé : 12B',
    ],
  },
  {
    id: 4,
    title: 'PIN & Notifications WhatsApp',
    subtitle: 'Étape 4 sur 7',
    icon: Bell,
    color: '#8a2be2',
    description:
      'Un code PIN sécurisé est généré. Le passager et le destinataire reçoivent automatiquement des notifications WhatsApp avec le code de retrait.',
    details: [
      'Code PIN : 482 915',
      'Notification WhatsApp envoyée au passager',
      'Confirmation de départ du bus',
      'Alerte arrivée automatique',
    ],
  },
  {
    id: 5,
    title: 'Suivi Aller-Retour',
    subtitle: 'Étape 5 sur 7',
    icon: Route,
    color: '#06b6d4',
    description:
      'Suivez le bus en temps réel sur les trajets aller et retour. Le passager peut voir la progression, l\'arrivée prévue et planifier son retour.',
    details: [
      'Suivi GPS en temps réel du bus',
      'Trajet Aller : Dakar → Saint-Louis',
      'Trajet Retour : Saint-Louis → Dakar',
      'Correspondance automatique aller-retour',
    ],
  },
  {
    id: 6,
    title: 'Validation Billet',
    subtitle: 'Étape 6 sur 7',
    icon: Shield,
    color: '#f43f5e',
    description:
      'À l\'arrivée, le passager valide son billet avec le code PIN. Le système confirme le trajet et génère un reçu numérique.',
    details: [
      'Validation par code PIN à l\'arrivée',
      'Confirmation automatique du trajet aller',
      'Billet retour activé automatiquement',
      'Reçu numérique téléchargeable',
    ],
  },
  {
    id: 7,
    title: 'Dashboard Agence',
    subtitle: 'Étape 7 sur 7',
    icon: LayoutDashboard,
    color: '#ff8c00',
    description:
      'L\'agence consulte son tableau de bord complet : tous les bus, trajets aller-retour, billets vendus, revenus et alertes en un seul endroit.',
    details: [
      'Vue d\'ensemble des 3 lignes actives',
      '24 bus en service, 12 trajets aller-retour',
      'Revenus journaliers : 285 000 FCFA',
      'Taux de remplissage : 87%',
    ],
  },
];

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════ */
export default function DemoContent() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [scheduleFilter, setScheduleFilter] = useState<'ALL' | 'ALLER' | 'RETOUR'>('ALL');

  const step = steps[currentStep];

  const goNext = () => {
    if (currentStep < steps.length - 1 && !isAnimating) {
      setIsAnimating(true);
      setCurrentStep((s) => s + 1);
      setTimeout(() => setIsAnimating(false), 400);
    }
  };

  const goPrev = () => {
    if (currentStep > 0 && !isAnimating) {
      setIsAnimating(true);
      setCurrentStep((s) => s - 1);
      setTimeout(() => setIsAnimating(false), 400);
    }
  };

  const restart = () => {
    if (!isAnimating) {
      setIsAnimating(true);
      setCurrentStep(0);
      setTimeout(() => setIsAnimating(false), 400);
    }
  };

  const goToStep = (i: number) => {
    if (!isAnimating) {
      setIsAnimating(true);
      setCurrentStep(i);
      setTimeout(() => setIsAnimating(false), 400);
    }
  };

  // Computed filtered schedules — only used on step 0
  const filteredSchedules = scheduleFilter === 'ALL'
    ? MOCK_SCHEDULES
    : MOCK_SCHEDULES.filter(s => s.type === scheduleFilter);

  const goToHoraires = useCallback(() => {
    window.location.href = '/horaires';
  }, []);

  return (
    <>
      {/* Hero header */}
      <section className="relative overflow-hidden bg-[#0A2540] pt-12 pb-20 sm:pt-16 sm:pb-28">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-[#FF6B35] rounded-full blur-[120px]" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-[#10B981] rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <FadeIn>
            <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full">
              <Eye className="w-4 h-4 text-[#FF6B35]" />
              <span className="text-sm font-medium text-white/90">
                Démonstration interactive
              </span>
            </div>
          </FadeIn>

          <FadeIn delay={0.1}>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-4 leading-tight">
              Découvrez comment fonctionne{' '}
              <span className="text-[#FF6B35]">SmarticketS</span>
            </h1>
          </FadeIn>

          <FadeIn delay={0.2}>
            <p className="text-base sm:text-lg text-white/80 max-w-2xl mx-auto leading-relaxed">
              Horaires en temps réel, billets aller-retour, suivi GPS, validation PIN —
              explorez chaque étape du transport intelligent.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Progress bar */}
      <section className="bg-white border-b border-gray-100 sticky top-16 lg:top-20 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-1 sm:gap-2">
            {steps.map((s, i) => {
              const Icon = s.icon;
              const isActive = i === currentStep;
              const isDone = i < currentStep;
              return (
                <button
                  key={s.id}
                  onClick={() => goToStep(i)}
                  className="flex-1 flex flex-col sm:flex-row items-center gap-1 sm:gap-2 group"
                >
                  <div
                    className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full transition-all duration-300 ${
                      isActive
                        ? 'bg-[#FF6B35] text-white shadow-lg shadow-[#FF6B35]/25 scale-110'
                        : isDone
                        ? 'bg-[#10B981] text-white'
                        : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200'
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    ) : (
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}
                  </div>
                  <span
                    className={`text-[10px] sm:text-xs font-medium transition-colors hidden sm:block ${
                      isActive
                        ? 'text-[#FF6B35]'
                        : isDone
                        ? 'text-[#10B981]'
                        : 'text-gray-400 group-hover:text-gray-600'
                    }`}
                  >
                    {s.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Step content */}
      <section className="py-12 sm:py-16 lg:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
                {/* Left: Info card */}
                <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 border border-gray-100 overflow-hidden">
                  {/* Card header */}
                  <div
                    className="px-6 py-5 flex items-center gap-4"
                    style={{ backgroundColor: step.color }}
                  >
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                      <step.icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-white/80 text-xs font-medium uppercase tracking-wider">
                        {step.subtitle}
                      </p>
                      <h2 className="text-xl font-bold text-white">{step.title}</h2>
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="p-6">
                    <p className="text-gray-600 leading-relaxed mb-6">
                      {step.description}
                    </p>

                    <div className="space-y-3">
                      {step.details.map((detail, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.08, duration: 0.3 }}
                          className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl"
                        >
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                            style={{ backgroundColor: step.color + '15' }}
                          >
                            <CheckCircle2
                              className="w-3.5 h-3.5"
                              style={{ color: step.color }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-700">
                            {detail}
                          </span>
                        </motion.div>
                      ))}
                    </div>

                    {/* CTA for horaires page */}
                    {currentStep === 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="mt-6"
                      >
                        <button
                          onClick={goToHoraires}
                          className="w-full py-3 px-4 bg-[#FF6B35] hover:bg-[#e55a28] text-white font-semibold text-sm rounded-xl shadow-lg shadow-[#FF6B35]/20 transition-all flex items-center justify-center gap-2"
                        >
                          <Calendar className="w-4 h-4" />
                          Voir les horaires en direct
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Right: Visual mockup */}
                <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 border border-gray-100 p-6 sm:p-8 flex flex-col items-center justify-center min-h-[400px]">
                  {currentStep === 0 && (
                    <ScheduleMockup filter={scheduleFilter} setFilter={setScheduleFilter} schedules={filteredSchedules} />
                  )}
                  {currentStep === 1 && (
                    <QRScanMockup />
                  )}
                  {currentStep === 2 && (
                    <FormMockup />
                  )}
                  {currentStep === 3 && (
                    <PinNotificationMockup />
                  )}
                  {currentStep === 4 && (
                    <RoundTripMockup />
                  )}
                  {currentStep === 5 && (
                    <ValidationMockup />
                  )}
                  {currentStep === 6 && (
                    <DashboardMockup />
                  )}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation buttons */}
          <div className="flex items-center justify-between mt-8 sm:mt-12">
            <Button
              variant="outline"
              onClick={goPrev}
              disabled={currentStep === 0}
              className="gap-2 border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              <ArrowLeft className="w-4 h-4" />
              Précédent
            </Button>

            <Button
              variant="ghost"
              onClick={restart}
              className="gap-2 text-gray-500 hover:text-[#FF6B35] hover:bg-[#FF6B35]/5"
            >
              <RotateCcw className="w-4 h-4" />
              Recommencer
            </Button>

            {currentStep < steps.length - 1 ? (
              <Button
                onClick={goNext}
                className="gap-2 bg-[#FF6B35] hover:bg-[#e65a28] text-white font-medium shadow-lg shadow-[#FF6B35]/20 hover:shadow-[#FF6B35]/30 transition-all"
              >
                Suivant
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={restart}
                className="gap-2 bg-[#10B981] hover:bg-[#059669] text-white font-medium shadow-lg shadow-[#10B981]/20 hover:shadow-[#10B981]/30 transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                Fin de la démo
              </Button>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MOCKUP: Step 1 — Bus Schedules
   ═══════════════════════════════════════════════════════════════════ */
function ScheduleMockup({ filter, setFilter, schedules }: {
  filter: 'ALL' | 'ALLER' | 'RETOUR';
  setFilter: (f: 'ALL' | 'ALLER' | 'RETOUR') => void;
  schedules: typeof MOCK_SCHEDULES;
}) {
  return (
    <div className="w-full max-w-lg space-y-4">
      {/* Route summary cards */}
      <div className="flex items-center gap-2 mb-2">
        <Route className="w-4 h-4 text-[#FF6B35]" />
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Lignes actives</p>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {MOCK_ROUTES.map((route) => (
          <motion.div
            key={route.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-3 border border-gray-100 text-center"
          >
            <div className="flex items-center justify-center gap-1 text-xs text-[#FF6B35] font-bold mb-1">
              <MapPin className="w-3 h-3" />
              {route.origin}
            </div>
            <ArrowRightLeft className="w-3 h-3 text-gray-400 mx-auto" />
            <div className="flex items-center justify-center gap-1 text-xs text-[#0A2540] font-bold">
              <MapPin className="w-3 h-3" />
              {route.destination}
            </div>
            <p className="text-[10px] text-gray-400 mt-1">{route.frequency}</p>
            <span className={`inline-block mt-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
              route.isRoundTrip ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {route.isRoundTrip ? 'A/R' : 'Simple'}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl">
        {(['ALL', 'ALLER', 'RETOUR'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              filter === f
                ? 'bg-white text-[#0A2540] shadow-sm'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {f === 'ALL' ? 'Tous' : f === 'ALLER' ? '🚌 Aller' : '🔄 Retour'}
          </button>
        ))}
      </div>

      {/* Schedule table */}
      <div className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
        <div className="grid grid-cols-12 gap-0 px-3 py-2 bg-gray-100 border-b border-gray-200">
          <span className="col-span-3 text-[10px] font-bold text-gray-500 uppercase">Départ</span>
          <span className="col-span-3 text-[10px] font-bold text-gray-500 uppercase">Arrivée</span>
          <span className="col-span-3 text-[10px] font-bold text-gray-500 uppercase">Bus</span>
          <span className="col-span-3 text-[10px] font-bold text-gray-500 uppercase text-right">Places</span>
        </div>
        <div className="divide-y divide-gray-100 max-h-52 overflow-y-auto">
          {schedules.slice(0, 6).map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06, duration: 0.25 }}
              className="grid grid-cols-12 gap-0 px-3 py-2.5 items-center hover:bg-white transition-colors"
            >
              <div className="col-span-3">
                <span className="text-sm font-bold text-[#0A2540]">{s.departure}</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin className="w-2.5 h-2.5 text-gray-400" />
                  <span className="text-[10px] text-gray-400 truncate">{s.origin}</span>
                </div>
              </div>
              <div className="col-span-3">
                <span className="text-sm font-medium text-gray-600">{s.arrival}</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin className="w-2.5 h-2.5 text-[#FF6B35]" />
                  <span className="text-[10px] text-gray-400 truncate">{s.destination}</span>
                </div>
              </div>
              <div className="col-span-3">
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                  s.type === 'RETOUR' ? 'bg-purple-100 text-purple-700' : 'bg-sky-100 text-sky-700'
                }`}>
                  {s.type === 'RETOUR' ? '↩' : '→'} {s.duration}
                </span>
                <p className="text-[10px] text-gray-400 mt-0.5">{s.price} FCFA</p>
              </div>
              <div className="col-span-3 text-right">
                <div className="flex items-center justify-end gap-1">
                  <Armchair className="w-3 h-3 text-gray-400" />
                  <span className={`text-sm font-bold ${
                    s.available <= 5 ? 'text-red-500' : s.available <= 15 ? 'text-amber-600' : 'text-emerald-600'
                  }`}>
                    {s.available}
                  </span>
                  <span className="text-[10px] text-gray-400">/{s.seats}</span>
                </div>
                {/* Occupancy bar */}
                <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                  <motion.div
                    className={`h-1 rounded-full ${
                      s.available <= 5 ? 'bg-red-500' : s.available <= 15 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${((s.seats - s.available) / s.seats) * 100}%` }}
                    transition={{ delay: i * 0.08, duration: 0.5 }}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1"><Bus className="w-3 h-3" /> {MOCK_SCHEDULES.length} départs</span>
        <span className="flex items-center gap-1"><ArrowRightLeft className="w-3 h-3" /> {MOCK_ROUTES.length} lignes A/R</span>
        <span className="flex items-center gap-1"><Timer className="w-3 h-3" /> Temps réel</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MOCKUP: Step 2 — QR Scan
   ═══════════════════════════════════════════════════════════════════ */
function QRScanMockup() {
  return (
    <div className="flex flex-col items-center gap-6">
      <motion.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        className="relative"
      >
        <div className="w-48 h-48 bg-white border-2 border-gray-200 rounded-2xl flex items-center justify-center shadow-xl">
          <div className="w-40 h-40 relative">
            <div className="absolute top-0 left-0 w-14 h-14 border-4 border-[#0A2540] rounded-sm" />
            <div className="absolute top-0 right-0 w-14 h-14 border-4 border-[#0A2540] rounded-sm" />
            <div className="absolute bottom-0 left-0 w-14 h-14 border-4 border-[#0A2540] rounded-sm" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-[#FF6B35] rounded-lg flex items-center justify-center">
              <QrCode className="w-8 h-8 text-white" />
            </div>
            <div className="absolute top-16 right-4 w-4 h-4 bg-[#0A2540] rounded-sm" />
            <div className="absolute bottom-16 right-8 w-6 h-6 bg-[#0A2540] rounded-sm" />
            <div className="absolute bottom-8 right-4 w-3 h-3 bg-[#0A2540] rounded-sm" />
            <div className="absolute top-4 left-16 w-5 h-3 bg-[#0A2540] rounded-sm" />
            <div className="absolute bottom-4 left-16 w-3 h-5 bg-[#0A2540] rounded-sm" />
          </div>
        </div>
        <motion.div
          className="absolute left-2 right-2 h-1 bg-[#FF6B35] rounded-full shadow-lg shadow-[#FF6B35]/50"
          animate={{ top: ['8px', '184px', '8px'] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>
      <div className="text-center">
        <p className="text-sm font-semibold text-[#0A2540]">Scannage en cours...</p>
        <p className="text-xs text-gray-400 mt-1">Référence : TRSP-2026-0042</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MOCKUP: Step 3 — Activation Form (Bus)
   ═══════════════════════════════════════════════════════════════════ */
function FormMockup() {
  return (
    <div className="w-full max-w-sm space-y-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-[#3B82F6]/10 rounded-lg flex items-center justify-center">
          <Bus className="w-4 h-4 text-[#3B82F6]" />
        </div>
        <div>
          <p className="font-bold text-[#0A2540] text-sm">Activation Billet Bus</p>
          <p className="text-xs text-gray-400">Pré-rempli automatiquement</p>
        </div>
      </div>

      {[
        { label: 'Passager', value: 'Diallo Mamadou', icon: Users },
        { label: 'Téléphone', value: '+221 77 123 45 67', icon: MessageCircle },
        { label: 'Trajet', value: 'Dakar → Saint-Louis', icon: Route },
        { label: 'Type', value: 'Aller (aller-retour)', icon: ArrowRightLeft },
        { label: 'Bus', value: 'DST-Express-01', icon: Bus },
        { label: 'Siège', value: '12B', icon: Armchair },
        { label: 'Départ', value: '06:30 — 15 Jan 2026', icon: Clock },
      ].map((field, i) => {
        const Icon = field.icon;
        return (
          <motion.div
            key={field.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.25 }}
            className="space-y-1"
          >
            <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
              <Icon className="w-3 h-3" /> {field.label}
            </label>
            <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2.5 text-sm font-medium text-[#0A2540]">
              {field.value}
            </div>
          </motion.div>
        );
      })}

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.3 }}
      >
        <button className="w-full mt-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white font-semibold text-sm py-3 rounded-lg shadow-lg shadow-[#3B82F6]/20 transition-all flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          Valider le billet
        </button>
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MOCKUP: Step 4 — PIN & WhatsApp
   ═══════════════════════════════════════════════════════════════════ */
function PinNotificationMockup() {
  return (
    <div className="w-full max-w-sm space-y-5">
      <div className="bg-gradient-to-br from-[#8a2be2] to-[#6b21a8] rounded-2xl p-6 text-center shadow-xl shadow-[#8a2be2]/20">
        <Lock className="w-8 h-8 text-white/80 mx-auto mb-3" />
        <p className="text-white/70 text-xs font-medium uppercase tracking-wider mb-2">
          Code PIN de validation
        </p>
        <div className="flex items-center justify-center gap-3 mb-3">
          {['4', '8', '2', '9', '1', '5'].map((digit, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, rotateY: 90 }}
              animate={{ scale: 1, rotateY: 0 }}
              transition={{ delay: i * 0.12, duration: 0.3, type: 'spring' }}
              className="w-10 h-12 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center border border-white/20"
            >
              <span className="text-2xl font-bold text-white">{digit}</span>
            </motion.div>
          ))}
        </div>
        <p className="text-white/60 text-xs">
          À communiquer uniquement au passager
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">
          Notifications WhatsApp envoyées
        </p>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="flex items-start gap-3 bg-[#DCF8C6] rounded-2xl rounded-tr-sm p-3 shadow-sm"
        >
          <MessageCircle className="w-5 h-5 text-[#25D366] shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-[#075E54]">
              🚌 Billet Aller Dakar → Saint-Louis
            </p>
            <p className="text-xs text-[#075E54]/80 mt-1">
              Bus DST-Express-01 départ 06:30. Code : <strong>482 915</strong>
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="flex items-start gap-3 bg-[#E7FDBB] rounded-2xl rounded-tl-sm p-3 shadow-sm"
        >
          <MessageCircle className="w-5 h-5 text-[#25D366] shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-[#075E54]">
              🔄 Billet Retour automatique activé
            </p>
            <p className="text-xs text-[#075E54]/80 mt-1">
              Saint-Louis → Dakar. Code : <strong>482 915</strong>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MOCKUP: Step 5 — Round Trip Tracking
   ═════════════════════════════════════════════════════════════════ */
function RoundTripMockup() {
  return (
    <div className="w-full max-w-sm space-y-4">
      {/* Round trip badge */}
      <div className="flex items-center justify-center gap-2">
        <span className="px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center gap-1.5">
          <ArrowRightLeft className="w-3.5 h-3.5" />
          Trajet Aller-Retour
        </span>
      </div>

      {/* ALLER */}
      <div className="bg-gradient-to-r from-sky-50 to-white rounded-xl p-4 border border-sky-200">
        <div className="flex items-center gap-2 mb-3">
          <span className="px-2 py-0.5 rounded-md bg-sky-100 text-sky-700 text-[10px] font-bold">ALLER</span>
          <span className="text-xs text-gray-400">DST-Express-01 — 06:30</span>
          <span className="ml-auto px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">En cours</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-center flex-1">
            <MapPin className="w-4 h-4 text-[#10B981] mx-auto mb-1" />
            <p className="text-sm font-bold text-[#0A2540]">Dakar</p>
            <p className="text-[10px] text-gray-400">06:30</p>
          </div>
          <div className="flex-1 relative">
            <div className="h-0.5 bg-sky-200 w-full" />
            <motion.div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#FF6B35] shadow-lg shadow-[#FF6B35]/30"
              animate={{ left: ['10%', '65%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
          <div className="text-center flex-1">
            <MapPin className="w-4 h-4 text-[#FF6B35] mx-auto mb-1" />
            <p className="text-sm font-bold text-[#0A2540]">Saint-Louis</p>
            <p className="text-[10px] text-gray-400">10:45</p>
          </div>
        </div>
      </div>

      {/* RETOUR */}
      <div className="bg-gradient-to-r from-purple-50 to-white rounded-xl p-4 border border-purple-200">
        <div className="flex items-center gap-2 mb-3">
          <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 text-[10px] font-bold">RETOUR</span>
          <span className="text-xs text-gray-400">DST-Express-02 — 14:00</span>
          <span className="ml-auto px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold">Planifié</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-center flex-1">
            <MapPin className="w-4 h-4 text-purple-400 mx-auto mb-1" />
            <p className="text-sm font-bold text-[#0A2540]">Saint-Louis</p>
            <p className="text-[10px] text-gray-400">14:00</p>
          </div>
          <div className="flex-1 relative">
            <div className="h-0.5 bg-purple-200 w-full" />
            <div className="absolute top-1/2 -translate-y-1/2 left-0 w-2 h-2 rounded-full bg-gray-300" />
          </div>
          <div className="text-center flex-1">
            <MapPin className="w-4 h-4 text-[#10B981] mx-auto mb-1" />
            <p className="text-sm font-bold text-[#0A2540]">Dakar</p>
            <p className="text-[10px] text-gray-400">18:15</p>
          </div>
        </div>
      </div>

      {/* Connection indicator */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
        <p className="text-xs text-amber-700 font-medium flex items-center justify-center gap-1.5">
          <Clock className="w-3 h-3" />
          Temps d&apos;attente à Saint-Louis : ~3h15 avant le retour
        </p>
      </div>

      {/* Timeline */}
      <div className="space-y-0">
        {[
          { time: '06:30', label: 'Départ Dakar — Aller', done: true },
          { time: '~10:45', label: 'Arrivée Saint-Louis', done: false },
          { time: '14:00', label: 'Départ Saint-Louis — Retour', done: false },
          { time: '~18:15', label: 'Arrivée Dakar', done: false },
        ].map((event, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.12, duration: 0.3 }}
            className="flex items-start gap-3 pb-3 last:pb-0"
          >
            <div className="flex flex-col items-center">
              <div className={`w-3 h-3 rounded-full shrink-0 ${
                event.done ? 'bg-[#10B981]' : i === 1 ? 'bg-[#FF6B35] animate-pulse' : 'bg-gray-200 border-2 border-gray-300'
              }`} />
              {i < 3 && <div className="w-0.5 h-6 bg-gray-100 mt-1" />}
            </div>
            <div className="flex-1 -mt-0.5">
              <div className="flex items-center justify-between">
                <p className={`text-sm font-medium ${event.done ? 'text-[#0A2540]' : 'text-gray-400'}`}>
                  {event.label}
                </p>
                <span className="text-xs text-gray-400">{event.time}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MOCKUP: Step 6 — Ticket Validation
   ═══════════════════════════════════════════════════════════════════ */
function ValidationMockup() {
  return (
    <div className="w-full max-w-sm space-y-5">
      {/* Ticket card */}
      <div className="bg-gradient-to-br from-[#0A2540] to-[#1a365d] rounded-2xl p-5 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-white/50">BILLET ALLER-RETOUR</span>
            <span className="px-2 py-0.5 rounded-full bg-[#FF6B35] text-white text-[10px] font-bold">Aller ✅</span>
          </div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-2xl font-bold">Dakar</p>
              <p className="text-xs text-white/50">06:30</p>
            </div>
            <div className="flex-1 mx-4 flex items-center">
              <div className="h-px flex-1 bg-white/20" />
              <Bus className="w-5 h-5 mx-2 text-[#FF6B35]" />
              <div className="h-px flex-1 bg-white/20" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">Saint-Louis</p>
              <p className="text-xs text-white/50">10:45</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-[10px] text-white/60">
            <div>
              <p className="text-white/40">Passager</p>
              <p className="text-white font-medium">Diallo M.</p>
            </div>
            <div>
              <p className="text-white/40">Siège</p>
              <p className="text-white font-medium">12B</p>
            </div>
            <div>
              <p className="text-white/40">Réf.</p>
              <p className="text-white font-medium font-mono">TRSP-0042</p>
            </div>
          </div>
        </div>
      </div>

      {/* PIN validation */}
      <div className="bg-[#FFF7ED] border border-[#FF6B35]/20 rounded-xl p-4">
        <p className="text-xs font-semibold text-[#FF6B35] mb-3">
          🔐 Saisissez le code PIN pour valider l&apos;arrivée
        </p>
        <div className="flex gap-2">
          {['4', '8', '2', '9', '1', '5'].map((d, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.08 }}
              className="w-9 h-11 bg-white border-2 border-[#FF6B35] rounded-lg flex items-center justify-center text-sm font-bold text-[#FF6B35]"
            >
              {d}
            </motion.div>
          ))}
        </div>
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-3 text-center"
        >
          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Billet retour activé automatiquement
          </span>
        </motion.div>
      </div>

      {/* Receipt */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="bg-gray-50 rounded-xl p-4 border border-gray-100"
      >
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Reçu numérique</p>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">Prix total (A/R)</span>
          <span className="font-bold text-[#0A2540]">17 000 FCFA</span>
        </div>
        <div className="flex items-center justify-between text-xs mt-1">
          <span className="text-gray-400">Statut</span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">Aller validé ✅</span>
        </div>
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MOCKUP: Step 7 — Dashboard
   ═══════════════════════════════════════════════════════════════════ */
function DashboardMockup() {
  const stats = [
    { label: 'Bus en service', value: '24', color: '#FF6B35', icon: Bus },
    { label: 'Lignes A/R', value: '3', color: '#06b6d4', icon: ArrowRightLeft },
    { label: 'Billets vendus', value: '87', color: '#10B981', icon: CheckCircle2 },
    { label: 'Revenus', value: '285 000', color: '#8a2be2', icon: MessageCircle },
  ];

  return (
    <div className="w-full space-y-4">
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08, duration: 0.3 }}
              className="bg-gray-50 rounded-xl p-3.5 border border-gray-100"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: stat.color + '15' }}>
                  <Icon className="w-3.5 h-3.5" style={{ color: stat.color }} />
                </div>
              </div>
              <p className="text-lg font-bold text-[#0A2540]">{stat.value}</p>
              <p className="text-[10px] text-gray-400">{stat.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Routes overview */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1">
          <Route className="w-3 h-3" /> Lignes & Trajets A/R
        </p>
        <div className="space-y-2">
          {MOCK_ROUTES.map((route, i) => (
            <motion.div
              key={route.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.08 }}
              className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-[#FF6B35]/10 flex items-center justify-center">
                  <Bus className="w-3 h-3 text-[#FF6B35]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#0A2540]">
                    {route.origin} ↔ {route.destination}
                  </p>
                  <p className="text-[10px] text-gray-400">{route.distance} — {route.duration} — {route.price} FCFA</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">A/R</span>
                <span className="text-[10px] text-gray-400">{route.frequency}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Recent tickets */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Billets récents
        </p>
        <div className="space-y-2">
          {[
            { ref: 'TK-0038', route: 'Dakar → St-Louis', type: 'Aller', status: 'Validé', color: '#10B981' },
            { ref: 'TK-0038', route: 'St-Louis → Dakar', type: 'Retour', status: 'En attente', color: '#f59e0b' },
            { ref: 'TK-0039', route: 'Dakar → Thiès', type: 'Aller', status: 'En cours', color: '#3B82F6' },
          ].map((item, i) => (
            <motion.div
              key={item.ref + item.type}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.08 }}
              className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
            >
              <div className="flex items-center gap-2">
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                  item.type === 'Retour' ? 'bg-purple-100 text-purple-700' : 'bg-sky-100 text-sky-700'
                }`}>
                  {item.type === 'Retour' ? '↩' : '→'} {item.type}
                </span>
                <div>
                  <p className="text-xs font-semibold text-[#0A2540]">{item.ref}</p>
                  <p className="text-[10px] text-gray-400">{item.route}</p>
                </div>
              </div>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: item.color + '15', color: item.color }}>
                {item.status}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
