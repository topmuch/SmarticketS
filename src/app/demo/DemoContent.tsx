'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  QrCode,
  CheckCircle2,
  MessageCircle,
  MapPin,
  LayoutDashboard,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Package,
  Lock,
  Bell,
  Shield,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import FadeIn from '@/components/landing/FadeIn';

const steps = [
  {
    id: 1,
    title: 'Scan du QR Code',
    subtitle: 'Étape 1 sur 5',
    icon: QrCode,
    color: '#FF6B35',
    description:
      'Le chauffeur scanne le QR code du colis avec son application QRTrans. Le système identifie instantanément le colis et ses informations.',
    details: [
      'Scan instantané du QR code',
      'Identification automatique du colis',
      'Vérification de la référence',
      'Démarrage du processus de suivi',
    ],
  },
  {
    id: 2,
    title: 'Formulaire d\'activation',
    subtitle: 'Étape 2 sur 5',
    icon: Package,
    color: '#10B981',
    description:
      'Les informations du colis sont pré-remplies automatiquement. Le chauffeur valide l\'expédition en un clic.',
    details: [
      'Nom de l\'expéditeur : Diallo Mamadou',
      'Nom du destinataire : Ndiaye Fatou',
      'Itinéraire : Dakar → Saint-Louis',
      'Type de colis : Valise 23kg',
      'Frais de livraison : 5 000 FCFA',
    ],
  },
  {
    id: 3,
    title: 'PIN & Notifications WhatsApp',
    subtitle: 'Étape 3 sur 5',
    icon: Bell,
    color: '#8a2be2',
    description:
      'Un code PIN sécurisé est généré. Le client et le propriétaire reçoivent automatiquement des notifications WhatsApp avec le code.',
    details: [
      'Code PIN : 482 915',
      'Notification WhatsApp envoyée au client',
      'Notification WhatsApp envoyée au propriétaire',
      'Confirmation de prise en charge',
    ],
  },
  {
    id: 4,
    title: 'Suivi & Validation',
    subtitle: 'Étape 4 sur 5',
    icon: Shield,
    color: '#3B82F6',
    description:
      'Le colis est suivi en temps réel. À l\'arrivée, le destinataire entre le code PIN pour valider la réception.',
    details: [
      'Suivi GPS en temps réel',
      'Statut : En transit Dakar → Saint-Louis',
      'Arrivée prévue : 14h30',
      'Validation par code PIN à la livraison',
    ],
  },
  {
    id: 5,
    title: 'Dashboard Agence',
    subtitle: 'Étape 5 sur 5',
    icon: LayoutDashboard,
    color: '#ff8c00',
    description:
      'L\'agence consulte son tableau de bord complet : toutes les livraisons, statistiques, revenus et alertes en un seul endroit.',
    details: [
      'Vue d\'ensemble des livraisons du jour',
      '12 colis en transit, 8 livrés',
      'Revenus journaliers : 60 000 FCFA',
      'Taux de réussite : 98%',
    ],
  },
];

export default function DemoContent() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

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
              <span className="text-[#FF6B35]">QRTrans</span>
            </h1>
          </FadeIn>

          <FadeIn delay={0.2}>
            <p className="text-base sm:text-lg text-white/80 max-w-2xl mx-auto leading-relaxed">
              Suivez chaque étape du processus de livraison, de la numérisation du QR code
              jusqu&apos;au tableau de bord de l&apos;agence.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Progress bar */}
      <section className="bg-white border-b border-gray-100 sticky top-16 lg:top-20 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-2 sm:gap-3">
            {steps.map((s, i) => {
              const Icon = s.icon;
              const isActive = i === currentStep;
              const isDone = i < currentStep;
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    if (!isAnimating) {
                      setIsAnimating(true);
                      setCurrentStep(i);
                      setTimeout(() => setIsAnimating(false), 400);
                    }
                  }}
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
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
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
                  </div>
                </div>

                {/* Right: Visual mockup */}
                <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 border border-gray-100 p-6 sm:p-8 flex flex-col items-center justify-center min-h-[400px]">
                  {currentStep === 0 && (
                    <QRScanMockup />
                  )}
                  {currentStep === 1 && (
                    <FormMockup />
                  )}
                  {currentStep === 2 && (
                    <PinNotificationMockup />
                  )}
                  {currentStep === 3 && (
                    <TrackingMockup />
                  )}
                  {currentStep === 4 && (
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

/* ────────────── Step 1: QR Scan Mockup ────────────── */
function QRScanMockup() {
  return (
    <div className="flex flex-col items-center gap-6">
      <motion.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        className="relative"
      >
        <div className="w-48 h-48 bg-white border-2 border-gray-200 rounded-2xl flex items-center justify-center shadow-xl">
          {/* QR code pattern */}
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
        {/* Scan line animation */}
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

/* ────────────── Step 2: Activation Form Mockup ────────────── */
function FormMockup() {
  return (
    <div className="w-full max-w-sm space-y-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-[#10B981]/10 rounded-lg flex items-center justify-center">
          <Package className="w-4 h-4 text-[#10B981]" />
        </div>
        <div>
          <p className="font-bold text-[#0A2540] text-sm">Activation du colis</p>
          <p className="text-xs text-gray-400">Pré-rempli automatiquement</p>
        </div>
      </div>

      {[
        { label: 'Expéditeur', value: 'Diallo Mamadou' },
        { label: 'Tél. expéditeur', value: '+221 77 123 45 67' },
        { label: 'Destinataire', value: 'Ndiaye Fatou' },
        { label: 'Tél. destinataire', value: '+221 78 987 65 43' },
        { label: 'Itinéraire', value: 'Dakar → Saint-Louis' },
        { label: 'Type / Poids', value: 'Valise — 23 kg' },
      ].map((field, i) => (
        <motion.div
          key={field.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1, duration: 0.3 }}
          className="space-y-1"
        >
          <label className="text-xs font-medium text-gray-500">{field.label}</label>
          <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2.5 text-sm font-medium text-[#0A2540]">
            {field.value}
          </div>
        </motion.div>
      ))}

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.3 }}
      >
        <button className="w-full mt-2 bg-[#10B981] hover:bg-[#059669] text-white font-semibold text-sm py-3 rounded-lg shadow-lg shadow-[#10B981]/20 transition-all flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          Confirmer l&apos;expédition
        </button>
      </motion.div>
    </div>
  );
}

/* ────────────── Step 3: PIN & WhatsApp Mockup ────────────── */
function PinNotificationMockup() {
  return (
    <div className="w-full max-w-sm space-y-5">
      {/* PIN display */}
      <div className="bg-gradient-to-br from-[#8a2be2] to-[#6b21a8] rounded-2xl p-6 text-center shadow-xl shadow-[#8a2be2]/20">
        <Lock className="w-8 h-8 text-white/80 mx-auto mb-3" />
        <p className="text-white/70 text-xs font-medium uppercase tracking-wider mb-2">
          Code PIN de livraison
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
          À communiquer uniquement au destinataire
        </p>
      </div>

      {/* WhatsApp notification bubbles */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">
          Notifications envoyées
        </p>

        {/* Client notification */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="flex items-start gap-3 bg-[#DCF8C6] rounded-2xl rounded-tr-sm p-3 shadow-sm"
        >
          <MessageCircle className="w-5 h-5 text-[#25D366] shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-[#075E54]">
              📦 Ndiaye Fatou (Client)
            </p>
            <p className="text-xs text-[#075E54]/80 mt-1">
              Votre colis TRSP-2026-0042 est en route Dakar → Saint-Louis.
              Code de retrait : <strong>482 915</strong>
            </p>
          </div>
        </motion.div>

        {/* Owner notification */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="flex items-start gap-3 bg-[#E7FDBB] rounded-2xl rounded-tl-sm p-3 shadow-sm"
        >
          <MessageCircle className="w-5 h-5 text-[#25D366] shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-[#075E54]">
              👤 Diallo Mamadou (Expéditeur)
            </p>
            <p className="text-xs text-[#075E54]/80 mt-1">
              Votre colis a été pris en charge. Suivez-le en temps réel.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/* ────────────── Step 4: Tracking Mockup ────────────── */
function TrackingMockup() {
  return (
    <div className="w-full max-w-sm space-y-5">
      {/* Status badge */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <span className="absolute inset-0 animate-ping rounded-full bg-[#3B82F6] opacity-30" />
          <div className="relative w-3 h-3 rounded-full bg-[#3B82F6]" />
        </div>
        <span className="text-sm font-bold text-[#0A2540]">En transit</span>
        <span className="text-xs text-gray-400 ml-auto">Mis à jour il y a 5 min</span>
      </div>

      {/* Route card */}
      <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="text-center">
            <MapPin className="w-5 h-5 text-[#10B981] mx-auto mb-1" />
            <p className="text-sm font-bold text-[#0A2540]">Dakar</p>
            <p className="text-xs text-gray-400">Départ 08:00</p>
          </div>
          <div className="flex-1 mx-4 relative">
            <div className="h-0.5 bg-gray-200 w-full" />
            <motion.div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#FF6B35] shadow-lg shadow-[#FF6B35]/30"
              animate={{ left: ['10%', '60%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
            <div className="absolute top-1/2 -translate-y-1/2 right-0 w-2 h-2 rounded-full bg-gray-300" />
          </div>
          <div className="text-center">
            <MapPin className="w-5 h-5 text-[#FF6B35] mx-auto mb-1" />
            <p className="text-sm font-bold text-[#0A2540]">Saint-Louis</p>
            <p className="text-xs text-gray-400">Arrivée 14:30</p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-0">
        {[
          { time: '08:00', label: 'Colis pris en charge à Dakar', done: true },
          { time: '09:15', label: 'Passage au péage de Thiès', done: true },
          { time: '10:45', label: 'En route vers Louga', done: true },
          { time: '~14:30', label: 'Arrivée à Saint-Louis', done: false },
        ].map((event, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.15, duration: 0.3 }}
            className="flex items-start gap-3 pb-4 last:pb-0"
          >
            <div className="flex flex-col items-center">
              <div
                className={`w-3 h-3 rounded-full shrink-0 ${
                  event.done ? 'bg-[#10B981]' : 'bg-gray-200 border-2 border-gray-300'
                }`}
              />
              {i < 3 && <div className="w-0.5 h-8 bg-gray-100 mt-1" />}
            </div>
            <div className="flex-1 -mt-0.5">
              <div className="flex items-center justify-between">
                <p
                  className={`text-sm font-medium ${
                    event.done ? 'text-[#0A2540]' : 'text-gray-400'
                  }`}
                >
                  {event.label}
                </p>
                <span className="text-xs text-gray-400">{event.time}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* PIN input */}
      <div className="bg-[#FFF7ED] border border-[#FF6B35]/20 rounded-xl p-4">
        <p className="text-xs font-semibold text-[#FF6B35] mb-2">
          🔐 Saisissez le code PIN pour valider la réception
        </p>
        <div className="flex gap-2">
          {['', '', '', '', '', ''].map((_, i) => (
            <div
              key={i}
              className="w-9 h-11 bg-white border-2 border-gray-200 rounded-lg flex items-center justify-center text-sm font-bold text-gray-300"
            >
              •
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ────────────── Step 5: Dashboard Mockup ────────────── */
function DashboardMockup() {
  const stats = [
    { label: 'Colis aujourd\'hui', value: '20', color: '#FF6B35', icon: Package },
    { label: 'En transit', value: '12', color: '#3B82F6', icon: MapPin },
    { label: 'Livrés', value: '8', color: '#10B981', icon: CheckCircle2 },
    { label: 'Revenus', value: '60 000', color: '#8a2be2', icon: MessageCircle },
  ];

  return (
    <div className="w-full space-y-5">
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1, duration: 0.3 }}
              className="bg-gray-50 rounded-xl p-4 border border-gray-100"
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: stat.color + '15' }}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color: stat.color }} />
                </div>
              </div>
              <p className="text-xl font-bold text-[#0A2540]">{stat.value}</p>
              <p className="text-xs text-gray-400">{stat.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Recent deliveries list */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Livraisons récentes
        </p>
        <div className="space-y-2.5">
          {[
            { ref: 'TRSP-0038', from: 'Dakar', to: 'Thiès', status: 'Livré', color: '#10B981' },
            { ref: 'TRSP-0039', from: 'Dakar', to: 'Kaolack', status: 'En transit', color: '#3B82F6' },
            { ref: 'TRSP-0040', from: 'Dakar', to: 'Ziguinchor', status: 'En transit', color: '#3B82F6' },
            { ref: 'TRSP-0041', from: 'Dakar', to: 'Saint-Louis', status: 'Livré', color: '#10B981' },
          ].map((item, i) => (
            <motion.div
              key={item.ref}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.08, duration: 0.3 }}
              className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
            >
              <div>
                <p className="text-sm font-semibold text-[#0A2540]">{item.ref}</p>
                <p className="text-xs text-gray-400">
                  {item.from} → {item.to}
                </p>
              </div>
              <span
                className="text-xs font-medium px-2.5 py-1 rounded-full"
                style={{
                  backgroundColor: item.color + '15',
                  color: item.color,
                }}
              >
                {item.status}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
