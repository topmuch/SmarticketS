'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle, Copy, ExternalLink, RotateCcw, ArrowRight, Truck } from 'lucide-react';
import { createDepartureLinks, formatDateFR, formatTime } from '@/lib/wame';

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
  lang: 'fr' | 'en';
  onReset: () => void;
}

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
  lang,
  onReset,
}: SuccessScreenProps) {
  const t = (fr: string, en: string) => lang === 'fr' ? fr : en;

  const trackingUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/suivi/${reference}`
    : `/suivi/${reference}`;

  // Build vars for wame.ts
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

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Success banner */}
      <div className="bg-gradient-to-br from-[#25D366]/10 to-[#25D366]/5 border border-[#25D366]/20 rounded-xl p-6 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-[#25D366] rounded-full mb-3 shadow-lg shadow-green-500/30">
          <CheckCircle className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">
          ✅ {t('Colis Enregistré avec Succès !', 'Package Registered Successfully!')}
        </h2>
        <div className="mt-3 flex items-center justify-center gap-2 text-sm text-gray-500">
          <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-xs">#{reference}</span>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] p-5 space-y-3">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          {t('Résumé', 'Summary')}
        </h3>

        <div className="flex items-center gap-3 bg-[#F8FAFC] rounded-lg p-3">
          <div className="flex-1">
            <p className="text-xs text-gray-400">{t('Trajet', 'Route')}</p>
            <p className="font-semibold text-gray-900">{departureCity} <span className="text-[#FF6B35]">→</span> {arrivalCity}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">{t('Transport', 'Transport')}</p>
            <p className="font-semibold text-gray-900 text-sm">{transportType}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-[#F8FAFC] rounded-lg p-3">
          <div className="flex-1">
            <p className="text-xs text-gray-400">{t('Départ', 'Departure')}</p>
            <p className="font-semibold text-gray-900 text-sm">{formattedDate} {t('à', 'at')} {formattedTime}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#F8FAFC] rounded-lg p-3">
            <p className="text-xs text-gray-400">{t('Expéditeur', 'Sender')}</p>
            <p className="font-medium text-gray-900 text-sm mt-0.5">{senderName}</p>
          </div>
          <div className="bg-[#F8FAFC] rounded-lg p-3">
            <p className="text-xs text-gray-400">{t('Destinataire', 'Receiver')}</p>
            <p className="font-medium text-gray-900 text-sm mt-0.5">{receiverName}</p>
          </div>
        </div>
      </div>

      {/* Section: Notifier les contacts */}
      <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] p-5 space-y-3">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          📱 {t('Notifier les contacts', 'Notify contacts')}
        </h3>
        <p className="text-xs text-gray-500">
          {t(
            'Envoyez une notification WhatsApp professionnelle à l\'expéditeur et au destinataire du colis.',
            'Send a professional WhatsApp notification to the sender and receiver.'
          )}
        </p>
      </div>

      {/* WhatsApp Buttons */}
      <div className="space-y-3">
        <a
          href={links.sender}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full h-[56px] bg-[#25D366] hover:bg-[#1fb855] active:bg-[#1a9e49] text-white rounded-xl font-bold text-[15px] shadow-lg shadow-green-500/25 transition-all no-underline"
        >
          🟢 {t('NOTIFIER L\'ENVOYEUR', 'NOTIFY SENDER')}
          <ExternalLink className="w-3.5 h-3.5 opacity-50" />
        </a>
        <a
          href={links.receiver}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full h-[56px] bg-[#0077B6] hover:bg-[#005f8d] active:bg-[#004a6e] text-white rounded-xl font-bold text-[15px] shadow-lg shadow-blue-500/25 transition-all no-underline"
        >
          🔵 {t('NOTIFIER LE DESTINATAIRE', 'NOTIFY RECEIVER')}
          <ExternalLink className="w-3.5 h-3.5 opacity-50" />
        </a>
      </div>

      {/* === TRANSITION CRITIQUE : Vers page d'arrivée === */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2 text-amber-800">
          <Truck className="w-5 h-5" />
          <p className="text-sm font-bold">
            {t('Colis en route — Prêt pour la livraison', 'Package in transit — Ready for delivery')}
          </p>
        </div>
        <p className="text-xs text-gray-600">
          {t(
            'À l\'arrivée, rescannez ce QR code ou cliquez ci-dessous pour confirmer la livraison.',
            'On arrival, rescan this QR code or click below to confirm delivery.'
          )}
        </p>
        <Link
          href={`/arrivee/${reference}`}
          className="flex items-center justify-center gap-2 w-full h-14 bg-[#FF6B35] hover:bg-[#e65a28] active:bg-[#d35400] text-white rounded-xl font-bold text-base shadow-lg shadow-orange-500/25 transition-all no-underline"
        >
          <Truck className="w-5 h-5" />
          {t('Accéder à la Page de Livraison', 'Go to Delivery Page')}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Copy tracking link */}
      <button
        onClick={copyLink}
        className="flex items-center justify-center gap-2 w-full h-12 border-2 border-[#E5E7EB] hover:border-[#25D366] hover:bg-[#25D366]/5 rounded-xl text-sm font-semibold text-gray-500 hover:text-[#25D366] transition-all"
      >
        <Copy className="w-4 h-4" />
        {copied ? '✅ ' + t('Copié !', 'Copied!') : t('Copier le lien de suivi', 'Copy tracking link')}
      </button>

      {/* New registration */}
      <button
        onClick={onReset}
        className="flex items-center justify-center gap-2 w-full h-12 text-gray-400 hover:text-gray-600 text-sm transition-colors mx-auto"
      >
        <RotateCcw className="w-4 h-4" />
        {t('Enregistrer un autre colis', 'Register another package')}
      </button>
    </div>
  );
}
