'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  QrCode,
  MapPin,
  CheckCircle,
  Truck,
  Lock,
  MessageCircle,
  ArrowRight,
  RefreshCw,
  Pencil,
  Copy,
  Check,
  Clock,
  User,
  Phone,
  Building2,
  BarChart3,
  Send,
  AlertCircle,
  X,
  Users,
  Package,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────
type Step = 1 | 2 | 3 | 4 | 5;
type Toast = { id: number; message: string; type: 'success' | 'info' | 'error' };

const CORRECT_PIN = '482915';
const TOTAL_STEPS = 5;

const stepLabels = [
  '',
  'Scan QR',
  'Activation',
  'PIN & Notifications',
  'Suivi & Livraison',
  'Dashboard Agence',
];

// ─── Demo Data ────────────────────────────────────────
const demoData = {
  reference: 'TRSP-DEMO-001',
  pin: '482915',
  itineraire: {
    depart: 'Dakar',
    arrivee: 'Ziguinchor',
    compagnie: 'Salam Transport',
    date: '15/05/2026 08:00',
    prix: '5 000 FCFA',
    statut_paiement: 'Payé par l\'expéditeur',
  },
  expediteur: { nom: 'Moussa Diop', telephone: '+221 77 123 45 67' },
  destinataire: { nom: 'Fatou Sow', telephone: '+221 76 987 65 43' },
};

// ─── Component ────────────────────────────────────────
export default function DemoPage() {
  const [step, setStep] = useState<Step>(1);
  const [scanning, setScanning] = useState(false);
  const [scanDone, setScanDone] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [waExpediteur, setWaExpediteur] = useState(false);
  const [waDestinataire, setWaDestinataire] = useState(false);
  const [pinCopied, setPinCopied] = useState(false);
  const [transitDone, setTransitDone] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinAttempts, setPinAttempts] = useState(3);
  const [delivered, setDelivered] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [sendingExp, setSendingExp] = useState(false);
  const [sendingDest, setSendingDest] = useState(false);
  const toastIdRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer
  useEffect(() => {
    if (step >= 1 && step <= 4) {
      timerRef.current = setInterval(() => setElapsed((p) => p + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [step]);

  const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = ++toastIdRef.current;
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
  }, []);

  const resetDemo = useCallback(() => {
    setStep(1); setScanning(false); setScanDone(false);
    setWaExpediteur(false); setWaDestinataire(false); setPinCopied(false);
    setTransitDone(false); setShowPinModal(false); setPinInput('');
    setPinAttempts(3); setDelivered(false); setElapsed(0);
    setToasts([]); setSendingExp(false); setSendingDest(false);
  }, []);

  // ─── Step 1: Scan ──────────────────────────────────
  const handleScan = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false); setScanDone(true);
      addToast('✅ QR Code détecté : ' + demoData.reference);
      setTimeout(() => setStep(2), 1200);
    }, 2000);
  };

  // ─── Step 2: Activate ─────────────────────────────
  const handleActivate = () => {
    addToast('✅ Colis activé — PIN ' + demoData.pin + ' généré');
    setTimeout(() => setStep(3), 600);
  };

  // ─── Step 3: PIN & WhatsApp ───────────────────────
  const handleCopyPin = () => {
    navigator.clipboard?.writeText(demoData.pin);
    setPinCopied(true);
    addToast('📋 PIN copié dans le presse-papier', 'info');
    setTimeout(() => setPinCopied(false), 2000);
  };

  const handleSendExp = () => {
    setSendingExp(true);
    setTimeout(() => { setSendingExp(false); setWaExpediteur(true); addToast('📩 Message envoyé à Moussa : Colis en route vers Ziguinchor...'); }, 1000);
  };

  const handleSendDest = () => {
    setSendingDest(true);
    setTimeout(() => { setSendingDest(false); setWaDestinataire(true); addToast('💬 Message envoyé à Fatou : Code de retrait *' + demoData.pin + '*...'); }, 1000);
  };

  // ─── Step 4: Tracking & Delivery ──────────────────
  const handleSimulateArrival = () => setShowPinModal(true);

  const handleValidatePin = () => {
    if (pinInput === CORRECT_PIN) {
      setDelivered(true); setShowPinModal(false);
      addToast('✅ Livraison confirmée. Preuve enregistrée.');
      setTimeout(() => setStep(5), 1500);
    } else {
      const remaining = pinAttempts - 1;
      setPinAttempts(remaining);
      addToast('❌ Code incorrect. Tentatives restantes : ' + remaining, 'error');
      setPinInput('');
      if (remaining <= 0) {
        setShowPinModal(false);
        addToast('🔒 Trop de tentatives. Veuillez relancer la démo.', 'error');
      }
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // ─── RENDER ─────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-[#E2E8F0]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FF6B35] flex items-center justify-center">
              <QrCode className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-[#0A2540]">QRTrans Demo</span>
            <span className="hidden sm:inline-block text-xs bg-[#FF6B35]/10 text-[#FF6B35] font-semibold px-2.5 py-0.5 rounded-full">Simulation</span>
          </div>
          <div className="flex items-center gap-3">
            {step >= 1 && step <= 4 && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-[#475569] bg-[#F8FAFC] px-3 py-1.5 rounded-lg border border-[#E2E8F0]">
                <Clock className="w-3.5 h-3.5" />
                {formatTime(elapsed)}
              </div>
            )}
            <button
              onClick={resetDemo}
              className="flex items-center gap-1.5 text-xs font-medium text-[#475569] hover:text-[#0A2540] transition-colors px-3 py-1.5 rounded-lg border border-[#E2E8F0] hover:bg-[#F8FAFC]"
              aria-label="Recommencer la démo"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Recommencer</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Step progress bar ── */}
      <div className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              onClick={() => { if (s <= step) setStep(s as Step); }}
              disabled={s > step}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                s === step
                  ? 'bg-[#FF6B35] text-white shadow-sm'
                  : s < step
                    ? 'bg-[#10B981]/10 text-[#10B981] cursor-pointer hover:bg-[#10B981]/20'
                    : 'text-[#475569]/40 cursor-not-allowed'
              }`}
            >
              {s < step ? <Check className="w-3.5 h-3.5" /> : <span>{s}</span>}
              <span className="hidden md:inline">{stepLabels[s]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Main content ── */}
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

          {/* ═══════════════ STEP 1: SCAN ═══════════════ */}
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center"
              >
                <h2 className="text-2xl sm:text-3xl font-bold text-[#0A2540] mb-2">
                  Étape 1 : Scanner le QR Code
                </h2>
                <p className="text-[#475569] mb-10 max-w-md mx-auto">
                  Cliquez sur le QR code pour simuler le scan du colis.
                </p>

                <div className="flex justify-center mb-8">
                  <button
                    onClick={handleScan}
                    disabled={scanning || scanDone}
                    className="relative group cursor-pointer"
                    aria-label="Scanner le QR code"
                  >
                    {/* Glow */}
                    <div className="absolute -inset-6 bg-[#FF6B35]/10 rounded-3xl blur-2xl group-hover:bg-[#FF6B35]/20 transition-all" />

                    <div className={`relative bg-white border-2 rounded-2xl p-8 sm:p-10 shadow-lg transition-all duration-500 ${
                      scanDone ? 'border-[#10B981] shadow-[0_8px_32px_rgba(16,185,129,0.15)]' : 'border-[#E2E8F0] group-hover:border-[#FF6B35]/50 group-hover:shadow-xl'
                    }`}>
                      {scanDone ? (
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-20 h-20 rounded-full bg-[#10B981]/10 flex items-center justify-center">
                            <CheckCircle className="w-10 h-10 text-[#10B981]" />
                          </div>
                          <span className="text-sm font-semibold text-[#10B981]">QR Détecté</span>
                        </div>
                      ) : (
                        <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex flex-col items-center justify-center">
                          {/* Scan line */}
                          {scanning && (
                            <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
                              <motion.div
                                className="w-full h-1 bg-[#10B981]"
                                initial={{ y: 0 }}
                                animate={{ y: [0, 224, 0] }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                              />
                            </div>
                          )}
                          <QrCode className={`w-28 h-28 sm:w-32 sm:h-32 text-[#0A2540] ${scanning ? 'opacity-30' : ''}`} />
                          <p className="text-xs font-mono text-[#475569] mt-3 font-semibold">{demoData.reference}</p>
                          {!scanning && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2 border border-[#E2E8F0] shadow-md">
                                <span className="text-sm font-medium text-[#0A2540]">📷 Cliquer pour scanner</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                </div>

                {!scanDone && !scanning && (
                  <button
                    onClick={() => { setScanDone(true); addToast('⏩ Scan ignoré — ' + demoData.reference + ' détecté', 'info'); setTimeout(() => setStep(2), 600); }}
                    className="text-sm text-[#475569] hover:text-[#FF6B35] underline transition-colors"
                  >
                    Passer cette étape →
                  </button>
                )}
              </motion.div>
            )}

            {/* ═══════════════ STEP 2: ACTIVATION ═══════════════ */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="text-center mb-8">
                  <h2 className="text-2xl sm:text-3xl font-bold text-[#0A2540] mb-2">
                    Étape 2 : Activer le colis
                  </h2>
                  <p className="text-[#475569] max-w-md mx-auto">
                    Remplissez les informations du colis. Les champs sont pré-remplis avec des données démo.
                  </p>
                </div>

                <div className="grid md:grid-cols-3 gap-5 mb-8">
                  {/* Card: Itinéraire */}
                  <DemoCard color="blue" emoji="🟦" title="Itinéraire">
                    <Field label="Départ" value={demoData.itineraire.depart} />
                    <Field label="Arrivée" value={demoData.itineraire.arrivee} />
                    <Field label="Compagnie" value={demoData.itineraire.compagnie} />
                    <Field label="Date & Heure" value={demoData.itineraire.date} />
                    <Field label="Montant" value={demoData.itineraire.prix} />
                    <div className="mt-2 px-3 py-1.5 bg-[#10B981]/10 rounded-lg border border-[#10B981]/20">
                      <span className="text-xs font-semibold text-[#10B981]">✅ {demoData.itineraire.statut_paiement}</span>
                    </div>
                  </DemoCard>

                  {/* Card: Expéditeur */}
                  <DemoCard color="orange" emoji="🟧" title="Expéditeur">
                    <Field label="Nom complet" value={demoData.expediteur.nom} />
                    <Field label="Téléphone" value={demoData.expediteur.telephone} />
                  </DemoCard>

                  {/* Card: Destinataire */}
                  <DemoCard color="green" emoji="🟩" title="Destinataire">
                    <Field label="Nom complet" value={demoData.destinataire.nom} />
                    <Field label="Téléphone" value={demoData.destinataire.telephone} />
                  </DemoCard>
                </div>

                <div className="text-center">
                  <button
                    onClick={handleActivate}
                    className="inline-flex items-center gap-2 bg-[#FF6B35] hover:bg-[#e65a28] text-white px-8 py-3.5 rounded-lg font-semibold text-sm shadow-[0_4px_12px_rgba(255,107,53,0.25)] hover:shadow-[0_4px_16px_rgba(255,107,53,0.35)] transition-all hover:scale-[1.02]"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Activer le Colis
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ═══════════════ STEP 3: PIN & WHATSAPP ═══════════════ */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="text-center mb-8">
                  <h2 className="text-2xl sm:text-3xl font-bold text-[#0A2540] mb-2">
                    Étape 3 : PIN & Notifications
                  </h2>
                  <p className="text-[#475569] max-w-lg mx-auto">
                    Le code PIN est généré. Simulez l&apos;envoi des notifications WhatsApp.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  {/* PIN Card */}
                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-6 sm:p-8 text-center">
                    <div className="w-14 h-14 rounded-xl bg-[#8a2be2]/10 flex items-center justify-center mx-auto mb-4">
                      <Lock className="w-7 h-7 text-[#8a2be2]" />
                    </div>
                    <h3 className="text-sm font-semibold text-[#475569] uppercase tracking-wider mb-3">Code de retrait</h3>
                    <div className="flex items-center justify-center gap-2 mb-3">
                      {demoData.pin.split('').map((digit, i) => (
                        <span key={i} className="w-11 h-14 bg-white border-2 border-[#8a2be2]/30 rounded-lg flex items-center justify-center text-2xl font-bold text-[#8a2be2]">
                          {digit}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-[#475569] mb-4">À communiquer au destinataire</p>
                    <button
                      onClick={handleCopyPin}
                      className="inline-flex items-center gap-2 text-sm font-medium text-[#8a2be2] hover:text-[#6d1fbf] transition-colors"
                    >
                      {pinCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {pinCopied ? 'Copié !' : 'Copier le PIN'}
                    </button>
                  </div>

                  {/* WhatsApp Cards */}
                  <div className="flex flex-col gap-4">
                    {/* Expéditeur */}
                    <div className="bg-[#25D366]/5 border border-[#25D366]/20 rounded-2xl p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-full bg-[#FF6B35]/10 flex items-center justify-center">
                          <Truck className="w-4 h-4 text-[#FF6B35]" />
                        </div>
                        <span className="text-sm font-semibold text-[#0A2540]">Expéditeur — {demoData.expediteur.nom}</span>
                      </div>
                      <div className="bg-white rounded-xl p-3 border border-[#E2E8F0] text-sm text-[#475569] mb-3">
                        📦 Colis <strong>{demoData.reference}</strong> activé. Trajet {demoData.itineraire.depart} → {demoData.itineraire.arrivee}. Suivez en temps réel.
                      </div>
                      <button
                        onClick={handleSendExp}
                        disabled={sendingExp || waExpediteur}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed bg-[#25D366] hover:bg-[#1da851] text-white shadow-sm"
                      >
                        {sendingExp ? (
                          <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Envoi...</>
                        ) : waExpediteur ? (
                          <><CheckCircle className="w-4 h-4" /> Message envoyé ✓</>
                        ) : (
                          <><Send className="w-4 h-4" /> Envoyer WhatsApp</>
                        )}
                      </button>
                    </div>

                    {/* Destinataire */}
                    <div className="bg-[#25D366]/5 border border-[#25D366]/20 rounded-2xl p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-full bg-[#10B981]/10 flex items-center justify-center">
                          <User className="w-4 h-4 text-[#10B981]" />
                        </div>
                        <span className="text-sm font-semibold text-[#0A2540]">Destinataire — {demoData.destinataire.nom}</span>
                      </div>
                      <div className="bg-white rounded-xl p-3 border border-[#E2E8F0] text-sm text-[#475569] mb-3">
                        🔐 Votre code de retrait est <strong>*{demoData.pin}*</strong>. Présentez-le à la livraison.
                      </div>
                      <button
                        onClick={handleSendDest}
                        disabled={sendingDest || waDestinataire}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed bg-[#25D366] hover:bg-[#1da851] text-white shadow-sm"
                      >
                        {sendingDest ? (
                          <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Envoi...</>
                        ) : waDestinataire ? (
                          <><CheckCircle className="w-4 h-4" /> Message envoyé ✓</>
                        ) : (
                          <><Send className="w-4 h-4" /> Envoyer WhatsApp</>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-[#475569]/60 text-center mb-6">
                  ⚠️ Simulation : aucun message réel n&apos;est envoyé
                </p>

                {waExpediteur && waDestinataire && (
                  <div className="text-center">
                    <button
                      onClick={() => { addToast('🚚 Colis en transit — suivi activé', 'info'); setStep(4); }}
                      className="inline-flex items-center gap-2 bg-[#0A2540] hover:bg-[#1A3A52] text-white px-8 py-3.5 rounded-lg font-semibold text-sm shadow-[0_4px_12px_rgba(10,37,64,0.15)] transition-all hover:scale-[1.02]"
                    >
                      Continuer vers le suivi
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {/* ═══════════════ STEP 4: SUIVI & LIVRAISON ═══════════════ */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="text-center mb-8">
                  <h2 className="text-2xl sm:text-3xl font-bold text-[#0A2540] mb-2">
                    Étape 4 : Suivi & Livraison
                  </h2>
                  <p className="text-[#475569] max-w-md mx-auto">
                    Suivez le trajet en temps réel et validez la livraison avec le PIN.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6 items-start">
                  {/* Timeline */}
                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-6">
                    <h3 className="text-sm font-semibold text-[#0A2540] uppercase tracking-wider mb-5">Timeline du trajet</h3>
                    <div className="space-y-0">
                      {[
                        { label: 'Colis activé', time: '08:02', icon: QrCode, done: true },
                        { label: 'Départ Dakar', time: '08:15', icon: Truck, done: true },
                        { label: 'En transit', time: 'En cours...', icon: MapPin, done: false },
                        { label: 'Arrivée Ziguinchor', time: delivered ? '14:32' : '—', icon: CheckCircle, done: delivered },
                        { label: 'Livré', time: delivered ? '14:35' : '—', icon: CheckCircle, done: delivered },
                      ].map((item, i) => (
                        <div key={i} className="flex gap-4">
                          {/* Line + dot */}
                          <div className="flex flex-col items-center">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                              item.done
                                ? 'bg-[#10B981] text-white'
                                : delivered
                                  ? 'bg-[#10B981] text-white'
                                  : 'bg-white border-2 border-[#E2E8F0] text-[#475569]/40'
                            }`}>
                              <item.icon className="w-4 h-4" />
                            </div>
                            {i < 4 && (
                              <div className={`w-0.5 h-12 ${item.done ? 'bg-[#10B981]' : 'bg-[#E2E8F0]'}`} />
                            )}
                          </div>
                          {/* Text */}
                          <div className="pt-1.5 pb-4">
                            <p className={`text-sm font-semibold ${item.done ? 'text-[#0A2540]' : 'text-[#475569]/60'}`}>
                              {item.label}
                            </p>
                            <p className="text-xs text-[#475569]/60">{item.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action panel */}
                  <div className="flex flex-col gap-4">
                    {/* Status card */}
                    <div className={`rounded-2xl p-6 border-2 ${
                      delivered
                        ? 'bg-[#10B981]/5 border-[#10B981]/30'
                        : 'bg-[#FF6B35]/5 border-[#FF6B35]/30'
                    }`}>
                      <div className="flex items-center gap-3 mb-3">
                        {delivered ? (
                          <>
                            <div className="w-10 h-10 rounded-full bg-[#10B981]/10 flex items-center justify-center">
                              <CheckCircle className="w-5 h-5 text-[#10B981]" />
                            </div>
                            <div>
                              <p className="font-bold text-[#10B981]">✅ Colis livré</p>
                              <p className="text-xs text-[#475569]">{new Date().toLocaleDateString('fr-FR')} à 14:35</p>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="w-10 h-10 rounded-full bg-[#FF6B35]/10 flex items-center justify-center">
                              <Truck className="w-5 h-5 text-[#FF6B35]" />
                            </div>
                            <div>
                              <p className="font-bold text-[#FF6B35]">🚚 En transit</p>
                              <p className="text-xs text-[#475569]">Dakar → Ziguinchor</p>
                            </div>
                          </>
                        )}
                      </div>
                      {!delivered && (
                        <button
                          onClick={handleSimulateArrival}
                          className="w-full flex items-center justify-center gap-2 bg-[#0A2540] hover:bg-[#1A3A52] text-white py-3 rounded-lg font-semibold text-sm transition-all hover:scale-[1.01]"
                        >
                          <MapPin className="w-4 h-4" />
                          Simuler l&apos;arrivée
                        </button>
                      )}
                    </div>

                    {/* Info card */}
                    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5">
                      <h4 className="text-sm font-semibold text-[#0A2540] mb-3">Informations du colis</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-[#475569]">Référence</span><span className="font-semibold text-[#0A2540]">{demoData.reference}</span></div>
                        <div className="flex justify-between"><span className="text-[#475569]">Expéditeur</span><span className="font-semibold text-[#0A2540]">{demoData.expediteur.nom}</span></div>
                        <div className="flex justify-between"><span className="text-[#475569]">Destinataire</span><span className="font-semibold text-[#0A2540]">{demoData.destinataire.nom}</span></div>
                        <div className="flex justify-between"><span className="text-[#475569]">PIN</span><span className="font-mono font-semibold text-[#8a2be2]">{demoData.pin}</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ═══════════════ STEP 5: DASHBOARD ═══════════════ */}
            {step === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="text-center mb-8">
                  <h2 className="text-2xl sm:text-3xl font-bold text-[#0A2540] mb-2">
                    Étape 5 : Dashboard Agence
                  </h2>
                  <p className="text-[#475569] max-w-lg mx-auto">
                    Aperçu du tableau de bord disponible pour les agences partenaires.
                  </p>
                </div>

                {/* Stats cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                  {[
                    { icon: Package, label: 'Colis actifs', value: '12', color: '#FF6B35', bg: 'bg-[#FF6B35]/10' },
                    { icon: CheckCircle, label: 'Livraisons à l\'heure', value: '98%', color: '#10B981', bg: 'bg-[#10B981]/10' },
                    { icon: Users, label: 'Chauffeurs en ligne', value: '3', color: '#3B82F6', bg: 'bg-[#3B82F6]/10' },
                    { icon: BarChart3, label: 'Temps moyen', value: '4h30', color: '#8a2be2', bg: 'bg-[#8a2be2]/10' },
                  ].map((s) => (
                    <div key={s.label} className="bg-white border border-[#E2E8F0] rounded-xl p-4 text-center">
                      <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center mx-auto mb-2`}>
                        <s.icon className="w-5 h-5" style={{ color: s.color }} />
                      </div>
                      <p className="text-2xl font-bold text-[#0A2540]">{s.value}</p>
                      <p className="text-xs text-[#475569]">{s.label}</p>
                    </div>
                  ))}
                </div>

                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  {/* Table */}
                  <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-[#E2E8F0]">
                      <h3 className="text-sm font-semibold text-[#0A2540]">Colis récents</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-[#F8FAFC] text-left">
                            <th className="px-4 py-2.5 text-xs font-semibold text-[#475569] uppercase">Réf.</th>
                            <th className="px-4 py-2.5 text-xs font-semibold text-[#475569] uppercase hidden sm:table-cell">Trajet</th>
                            <th className="px-4 py-2.5 text-xs font-semibold text-[#475569] uppercase">Statut</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2E8F0]">
                          <tr className="hover:bg-[#F8FAFC]">
                            <td className="px-4 py-3 font-mono text-xs font-semibold text-[#0A2540]">{demoData.reference}</td>
                            <td className="px-4 py-3 text-xs text-[#475569] hidden sm:table-cell">DKR → ZIG</td>
                            <td className="px-4 py-3"><span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#10B981]/10 text-[#10B981] text-xs font-semibold rounded-full">✅ Livré</span></td>
                          </tr>
                          <tr className="hover:bg-[#F8FAFC]">
                            <td className="px-4 py-3 font-mono text-xs font-semibold text-[#0A2540]">TRSP-2026-0088</td>
                            <td className="px-4 py-3 text-xs text-[#475569] hidden sm:table-cell">DKR → STL</td>
                            <td className="px-4 py-3"><span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FF6B35]/10 text-[#FF6B35] text-xs font-semibold rounded-full">🚚 En transit</span></td>
                          </tr>
                          <tr className="hover:bg-[#F8FAFC]">
                            <td className="px-4 py-3 font-mono text-xs font-semibold text-[#0A2540]">TRSP-2026-0085</td>
                            <td className="px-4 py-3 text-xs text-[#475569] hidden sm:table-cell">DKR → KOL</td>
                            <td className="px-4 py-3"><span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#10B981]/10 text-[#10B981] text-xs font-semibold rounded-full">✅ Livré</span></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Bar chart */}
                  <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5">
                    <h3 className="text-sm font-semibold text-[#0A2540] mb-5">Livraisons cette semaine</h3>
                    <div className="flex items-end gap-3 h-40">
                      {[
                        { day: 'Lun', val: 65, color: '#FF6B35' },
                        { day: 'Mar', val: 80, color: '#FF6B35' },
                        { day: 'Mer', val: 55, color: '#FF6B35' },
                        { day: 'Jeu', val: 90, color: '#10B981' },
                        { day: 'Ven', val: 75, color: '#10B981' },
                        { day: 'Sam', val: 40, color: '#3B82F6' },
                        { day: 'Dim', val: 20, color: '#3B82F6' },
                      ].map((d) => (
                        <div key={d.day} className="flex-1 flex flex-col items-center gap-2">
                          <div className="w-full rounded-t-md transition-all duration-500" style={{ height: `${d.val}%`, backgroundColor: d.color, minHeight: '8px' }} />
                          <span className="text-xs text-[#475569] font-medium">{d.day}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/agence/tableau-de-bord">
                    <button className="inline-flex items-center justify-center gap-2 bg-[#0A2540] hover:bg-[#1A3A52] text-white px-6 py-3 rounded-lg font-semibold text-sm transition-all hover:scale-[1.02] w-full sm:w-auto">
                      <BarChart3 className="w-4 h-4" />
                      Voir le dashboard complet
                    </button>
                  </Link>
                  <Link href="/devenir-partenaire">
                    <button className="inline-flex items-center justify-center gap-2 bg-[#FF6B35] hover:bg-[#e65a28] text-white px-6 py-3 rounded-lg font-semibold text-sm shadow-[0_4px_12px_rgba(255,107,53,0.25)] transition-all hover:scale-[1.02] w-full sm:w-auto">
                      <Building2 className="w-4 h-4" />
                      Demander un compte
                    </button>
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* ── PIN Modal ── */}
      <AnimatePresence>
        {showPinModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0A2540]/60 backdrop-blur-sm p-4"
            onClick={() => setShowPinModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-[#0A2540]">🔐 Validation PIN</h3>
                <button onClick={() => setShowPinModal(false)} className="text-[#475569] hover:text-[#0A2540]">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-[#475569] mb-4">
                Entrez le code à 6 chiffres communiqué au destinataire :
              </p>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="• • • • • •"
                className="w-full px-4 py-4 text-center text-2xl font-mono font-bold tracking-[0.3em] bg-[#F8FAFC] border-2 border-[#E2E8F0] rounded-xl text-[#0A2540] focus:outline-none focus:border-[#8a2be2] focus:ring-2 focus:ring-[#8a2be2]/10 mb-3"
                autoFocus
              />
              <p className="text-xs text-[#475569]/60 mb-4">
                Tentatives restantes : <strong>{pinAttempts}</strong>
                {pinAttempts <= 1 && <span className="text-red-500 ml-1">⚠️ Dernière tentative</span>}
              </p>
              <button
                onClick={handleValidatePin}
                disabled={pinInput.length !== 6}
                className="w-full flex items-center justify-center gap-2 bg-[#10B981] hover:bg-[#059669] text-white py-3.5 rounded-lg font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle className="w-5 h-5" />
                Valider la livraison
              </button>
              <p className="text-xs text-[#475569]/50 text-center mt-3">
                💡 Indice : le code est <strong>482915</strong> (visible à l&apos;étape 3)
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Toast stack ── */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] flex flex-col gap-2 items-center pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className={`pointer-events-auto px-5 py-3 rounded-xl shadow-lg text-sm font-medium backdrop-blur-xl max-w-sm text-center ${
                t.type === 'success'
                  ? 'bg-[#10B981] text-white'
                  : t.type === 'error'
                    ? 'bg-red-500 text-white'
                    : 'bg-[#0A2540] text-white'
              }`}
            >
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── Floating reset (mobile) ── */}
      <button
        onClick={resetDemo}
        className="sm:hidden fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-[#0A2540] text-white flex items-center justify-center shadow-lg hover:bg-[#1A3A52] transition-colors"
        aria-label="Recommencer la démo"
      >
        <RefreshCw className="w-5 h-5" />
      </button>

      {/* ── Simple footer ── */}
      <footer className="bg-[#0A2540] text-white py-8 mt-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#FF6B35] flex items-center justify-center">
              <QrCode className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-sm">QRTrans</span>
          </div>
          <p className="text-white/50 text-xs">
            © 2026 QRTrans • Démo interactive — aucune donnée réelle enregistrée
          </p>
          <Link href="/" className="text-white/50 hover:text-white text-sm transition-colors">
            ← Retour au site
          </Link>
        </div>
      </footer>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────
function DemoCard({ color, emoji, title, children }: { color: string; emoji: string; title: string; children: React.ReactNode }) {
  const colorMap: Record<string, string> = {
    blue: 'border-blue-200 bg-blue-50/50',
    orange: 'border-orange-200 bg-orange-50/50',
    green: 'border-emerald-200 bg-emerald-50/50',
  };
  return (
    <div className={`border rounded-2xl p-5 ${colorMap[color] || 'border-[#E2E8F0] bg-white'}`}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">{emoji}</span>
        <h3 className="text-sm font-bold text-[#0A2540]">{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#475569] mb-0.5">{label}</label>
      <input
        type="text"
        defaultValue={value}
        readOnly
        className="w-full px-3 py-2 rounded-lg bg-white border border-[#E2E8F0] text-sm font-medium text-[#0A2540] focus:outline-none"
      />
    </div>
  );
}
