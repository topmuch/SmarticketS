'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle, Copy, RotateCcw, ArrowRight, Truck, MessageCircle } from 'lucide-react';
import { createDepartureLinks, formatDateFR, formatTime } from '@/lib/wame';
import { notificationSound } from '@/lib/notification-sound';

interface SuccessScreenProps {
  reference: string;
  transportType: string;
  company: string;
  departureCity: string;
  arrivalCity: string;
  departureDate: string;
  departureTime: string;
  senderName: string;
  senderPhone: string;
  receiverName: string;
  receiverPhone: string;
  waSenderUrl?: string;
  waReceiverUrl?: string;
  lang: 'fr' | 'en';
  onReset: () => void;
  /** 'none' = both buttons active, 'sender' = sender done, 'receiver' = receiver done */
  notified?: 'none' | 'sender' | 'receiver';
  // New baggage fields
  baggageType: string;
  baggageTypeOther?: string;
  baggageWeight?: string;
  isFragile?: boolean;
  paymentStatus?: string;
  pickupAddress?: string;
}

const BAGGAGE_TYPE_LABELS: Record<string, string> = {
  VALISE: '🧳 Valise', SAC: '👜 Sac', CARTON: '📦 Carton',
  BACKPACK: '🎒 Sac à dos', CABIN: '✈️ Bagage cabine', OTHER: '📦 Autre',
};

export default function SuccessScreen({
  reference,
  transportType,
  company,
  departureCity,
  arrivalCity,
  departureDate,
  departureTime,
  senderName,
  senderPhone,
  receiverName,
  receiverPhone,
  waSenderUrl,
  waReceiverUrl,
  lang,
  onReset,
  notified: notifiedProp = 'none',
  baggageType,
  baggageTypeOther,
  baggageWeight,
  isFragile,
  paymentStatus,
  pickupAddress,
}: SuccessScreenProps) {
  const t = (fr: string, en: string) => lang === 'fr' ? fr : en;

  const trackingUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/activate/${reference}`
    : `/activate/${reference}`;

  const formattedDate = formatDateFR(departureDate);
  const formattedTime = formatTime(departureTime);

  const vars = {
    reference,
    sender_name: senderName,
    sender_whatsapp: senderPhone,
    receiver_name: receiverName,
    receiver_whatsapp: receiverPhone,
    company_name: company,
    departure_city: departureCity,
    arrival_city: arrivalCity,
    departure_date: formattedDate,
    departure_time: formattedTime,
    tracking_url: trackingUrl,
  };

  const links = createDepartureLinks(vars);
  const senderLink = waSenderUrl || links.sender;
  const receiverLink = waReceiverUrl || links.receiver;

  const router = useRouter();
  const [notified, setNotified] = useState<'none' | 'sender' | 'receiver'>(notifiedProp);

  // ─── Navigate to /sending page for WhatsApp notification ───
  const handleNotify = useCallback(
    (waLink: string, name: string, type: 'sender' | 'receiver') => {
      // Unlock audio on first user gesture (iOS/Safari requirement)
      notificationSound.unlock();

      // If both notified, go to retrieve page; otherwise come back here
      const otherNotified = notified !== 'none' && notified !== type;
      const callback = otherNotified
        ? `/retrieve/${reference}`
        : `/activate/parcel/${reference}?notified=${type}`;

      const params = new URLSearchParams({
        waLink,
        to: name,
        type,
        callback,
        suivi: `/suivi/${reference}`,
      });
      router.push(`/sending?${params.toString()}`);
    },
    [notified, reference, router],
  );

  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(trackingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = trackingUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Baggage description
  const baggageLabel = baggageType === 'OTHER'
    ? (baggageTypeOther || 'Autre')
    : (BAGGAGE_TYPE_LABELS[baggageType] || baggageType);
  const baggageDesc = `${baggageLabel}${baggageWeight ? ` — ${baggageWeight}kg` : ''}${isFragile ? ' ⚠️' : ''}`;

  // Payment label
  const paymentLabel = paymentStatus === 'SENDER_PAID'
    ? t('✅ Payé par l\'expéditeur', '✅ Paid by sender')
    : t('💸 À payer par le destinataire', '💸 Pay on delivery');

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Success banner */}
      <div className="bg-gradient-to-br from-[#25D366]/20 to-[#25D366]/10 border border-[#25D366]/30 rounded-xl p-4 sm:p-6 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 sm:w-[72px] sm:h-[72px] bg-[#25D366] rounded-full mb-2 sm:mb-3 shadow-lg shadow-green-500/30">
          <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-white">
          ✅ {t('Colis Activé avec Succès !', 'Package Activated Successfully!')}
        </h2>
        <div className="mt-2 sm:mt-3 flex items-center justify-center gap-2 text-sm sm:text-base text-white/70">
          <span className="font-mono bg-white/10 px-2 py-0.5 rounded text-xs sm:text-sm text-white">#{reference}</span>
        </div>

        {/* PIN warning banner */}
        <div className="mt-3 sm:mt-4 bg-amber-900/50 border border-amber-500/30 rounded-lg p-3 sm:p-4">
          <p className="text-sm sm:text-base font-bold text-white">
            ⚠️ {t(
              'Le code PIN a été envoyé UNIQUEMENT au destinataire par WhatsApp. Ne le partagez pas.',
              'The PIN code was sent ONLY to the receiver via WhatsApp. Do not share it.'
            )}
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white/10 backdrop-blur rounded-xl border border-white/10 p-4 sm:p-5 space-y-2.5 sm:space-y-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-widest">
          {t('Résumé', 'Summary')}
        </h3>

        {/* Route */}
        <div className="flex items-center gap-3 bg-white/5 rounded-lg p-3">
          <div className="flex-1">
            <p className="text-sm text-white/60">{t('Trajet', 'Route')}</p>
            <p className="font-bold text-white text-base">{departureCity} <span className="text-[#FF6B35]">→</span> {arrivalCity}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-white/60">{t('Transport', 'Transport')}</p>
            <p className="font-bold text-white text-base">{transportType}</p>
          </div>
        </div>

        {/* Departure */}
        <div className="flex items-center gap-3 bg-white/5 rounded-lg p-3">
          <div className="flex-1">
            <p className="text-sm text-white/60">{t('Départ', 'Departure')}</p>
            <p className="font-bold text-white text-base">{formattedDate} {t('à', 'at')} {formattedTime}</p>
          </div>
        </div>

        {/* Baggage */}
        <div className="bg-white/5 rounded-lg p-3">
          <p className="text-sm text-white/60">{t('Colis', 'Package')}</p>
          <p className="font-bold text-white text-base">{baggageDesc}</p>
        </div>

        {/* Payment */}
        <div className="bg-white/5 rounded-lg p-3">
          <p className="text-sm text-white/60">{t('Paiement', 'Payment')}</p>
          <p className="font-bold text-white text-base">{paymentLabel}</p>
        </div>

        {/* Pickup address if provided */}
        {pickupAddress && (
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-sm text-white/60">{t('Point de retrait', 'Pickup point')}</p>
            <p className="font-bold text-white text-base">📍 {pickupAddress}</p>
          </div>
        )}

        {/* Sender & Receiver */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-sm text-white/60">{t('Expéditeur', 'Sender')}</p>
            <p className="font-bold text-white text-base mt-0.5">{senderName}</p>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-sm text-white/60">{t('Destinataire', 'Receiver')}</p>
            <p className="font-bold text-white text-base mt-0.5">{receiverName}</p>
          </div>
        </div>
      </div>

      {/* Section: Notifier les contacts */}
      <div className="bg-white/10 backdrop-blur rounded-xl border border-white/10 p-4 sm:p-5 space-y-2.5 sm:space-y-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-widest">
          📱 {t('Notifier les contacts', 'Notify contacts')}
        </h3>
        <p className="text-sm text-white/70">
          {t(
            'Envoyez une notification WhatsApp professionnelle à l\'expéditeur et au destinataire du colis.',
            'Send a professional WhatsApp notification to the sender and receiver.'
          )}
        </p>
      </div>

      {/* WhatsApp Buttons — redirect via /sending page */}
      <div className="space-y-3">
        {notified === 'sender' ? (
          <div className="flex items-center justify-center gap-3 w-full h-12 sm:h-[56px] bg-white/10 border border-white/20 rounded-xl text-white/50">
            <CheckCircle className="w-5 h-5" />
            <span className="font-bold text-sm sm:text-lg">✅ {t('EXPÉDITEUR NOTIFIÉ', 'SENDER NOTIFIED')}</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => handleNotify(senderLink, senderName, 'sender')}
            className="flex items-center justify-center gap-2 w-full h-12 sm:h-[56px] bg-[#FF6B35] hover:bg-[#e55a28] active:bg-[#d04e1f] text-white rounded-xl font-bold text-sm sm:text-lg shadow-lg shadow-orange-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <MessageCircle className="w-5 h-5" />
            {t("NOTIFIER L'EXPÉDITEUR", 'NOTIFY SENDER')}
          </button>
        )}

        {notified === 'receiver' ? (
          <div className="flex items-center justify-center gap-3 w-full h-12 sm:h-[56px] bg-white/10 border border-white/20 rounded-xl text-white/50">
            <CheckCircle className="w-5 h-5" />
            <span className="font-bold text-sm sm:text-lg">✅ {t('DESTINATAIRE NOTIFIÉ', 'RECEIVER NOTIFIED')}</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => handleNotify(receiverLink, receiverName, 'receiver')}
            className="flex items-center justify-center gap-2 w-full h-12 sm:h-[56px] bg-[#25D366] hover:bg-[#1fb855] active:bg-[#1a9e49] text-white rounded-xl font-bold text-sm sm:text-lg shadow-lg shadow-green-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <MessageCircle className="w-5 h-5" />
            {t('NOTIFIER LE DESTINATAIRE', 'NOTIFY RECEIVER')}
          </button>
        )}
      </div>

      {/* Transition to retrieval */}
      <div className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 border border-amber-500/30 rounded-xl p-4 sm:p-5 space-y-2.5 sm:space-y-3">
        <div className="flex items-center gap-2 text-white">
          <Truck className="w-5 h-5" />
          <p className="text-base font-bold">
            {t('Colis en route — Prêt pour la livraison', 'Package in transit — Ready for delivery')}
          </p>
        </div>
        <p className="text-sm text-white/70">
          {t(
            "À l'arrivée, le destinataire devra fournir son code de retrait à 6 chiffres pour valider la livraison.",
            'On arrival, the recipient must provide their 6-digit withdrawal code to validate delivery.'
          )}
        </p>
        <Link
          href={`/retrieve/${reference}`}
          className="flex items-center justify-center gap-2 w-full h-12 sm:h-14 bg-[#FF6B35] hover:bg-[#e65a28] active:bg-[#d35400] text-white rounded-xl font-bold text-sm sm:text-lg shadow-lg shadow-orange-500/25 transition-all no-underline"
        >
          <Truck className="w-5 h-5" />
          {t('Accéder à la Page de Récupération', 'Go to Retrieval Page')}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Delivery validation info */}
      <div className="bg-gradient-to-r from-emerald-900/30 to-green-900/30 border border-emerald-500/30 rounded-xl p-4 sm:p-5 space-y-2.5 sm:space-y-3">
        <div className="flex items-center gap-2 text-white">
          <Lock className="w-5 h-5" />
          <p className="text-base font-bold">
            {t('Validation de livraison par code PIN', 'PIN code delivery validation')}
          </p>
        </div>
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-emerald-400 flex-shrink-0 mt-0.5">①</span>
            <p className="text-sm text-white/70">
              {t(
                "Le code PIN à 6 chiffres a été envoyé au destinataire par WhatsApp.",
                'The 6-digit PIN code was sent to the recipient via WhatsApp.'
              )}
            </p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-emerald-400 flex-shrink-0 mt-0.5">②</span>
            <p className="text-sm text-white/70">
              {t(
                'À l\'arrivée, le destinataire communique son code à l\'agent de livraison.',
                'On arrival, the recipient gives their code to the delivery agent.'
              )}
            </p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-emerald-400 flex-shrink-0 mt-0.5">③</span>
            <p className="text-sm text-white/70">
              {t(
                "L'agent saisit le code sur la page de récupération pour valider la livraison.",
                'The agent enters the code on the retrieval page to validate delivery.'
              )}
            </p>
          </div>
        </div>
        <Link
          href={`/suivi/${reference}`}
          className="flex items-center justify-center gap-2 w-full h-12 sm:h-14 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 active:from-emerald-700 active:to-green-700 text-white rounded-xl font-bold text-sm sm:text-lg shadow-lg shadow-emerald-500/25 transition-all no-underline"
        >
          <Truck className="w-5 h-5" />
          {t('Voir le suivi et valider la livraison', 'View tracking and validate delivery')}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Copy tracking link */}
      <button
        onClick={copyLink}
        className="flex items-center justify-center gap-2 w-full h-12 sm:h-14 border-2 border-white/20 hover:border-[#25D366] hover:bg-[#25D366]/10 rounded-xl text-sm sm:text-base font-bold text-white hover:text-[#25D366] transition-all"
      >
        <Copy className="w-4 h-4" />
        {copied ? '✅ ' + t('Copié !', 'Copied!') : t('Copier le lien de suivi', 'Copy tracking link')}
      </button>

      {/* New registration */}
      <button
        onClick={onReset}
        className="flex items-center justify-center gap-2 w-full h-12 text-white/50 hover:text-white text-base transition-colors mx-auto"
      >
        <RotateCcw className="w-4 h-4" />
        {t('Enregistrer un autre colis', 'Register another package')}
      </button>
    </div>
  );
}
