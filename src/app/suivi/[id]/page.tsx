'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  QrCode,
  Loader2,
  MapPin,
  Clock,
  Truck,
  User,
  Package,
  Globe,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  CheckCircle,
  AlertTriangle,
  Home,
  ArrowRight,
  Shield,
  Send,
  Copy,
  Phone,
  Ticket,
  Luggage,
  ShieldCheck,
  Lock,
  PartyPopper,
} from 'lucide-react';
import Link from 'next/link';
import PinKeypad from '@/components/retrieve/PinKeypad';

// ═══════════════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════════════

interface TimelineEntry {
  id?: string;
  type: string;
  label: string;
  description: string;
  timestamp: string;
  icon: string;
  color: string;
  recipientName?: string | null;
  recipientPhone?: string | null;
  recipientType?: string;
  messageContent?: string;
  waLink?: string | null;
}

interface ColisInfo {
  reference: string;
  status: string;
  category?: string;
  statusLabel: string;
  statusColor: string;
  statusIcon: string;
  transportMode: string;
  transportIcon: string;
  company: string;
  departureCity: string;
  arrivalCity: string;
  departureDate: string | null;
  departureTime: string | null;
  senderName: string;
  receiverName: string;
  createdAt: string;
  arrivedAt: string | null;
  deliveredAt: string | null;
  deliveryLocation: string | null;
  driverPhone: string | null;
  shareDriverPhone: boolean;
}

interface TicketData {
  passengerName: string;
  passengerAge: number;
  documentType: string;
  documentNumber: string;
  destination: string;
  seatNumber: string;
  platform: string | null;
  departureTime: string | null;
  luggageCount: number;
  luggageWeightKg: number;
  luggageFee: number;
  controlCode: string;
  ticketStatus: string;
  activatedAt: string | null;
}

// ═══════════════════════════════════════════════════
//  HELPER
// ═══════════════════════════════════════════════════

function formatDate(iso: string, lang: 'fr' | 'en') {
  try {
    return new Date(iso).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatTime(iso: string, lang: 'fr' | 'en') {
  try {
    return new Date(iso).toLocaleTimeString(lang === 'fr' ? 'fr-FR' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function getEventDotColor(type: string): string {
  switch (type) {
    case 'activation': return 'bg-[#10b981]';
    case 'pin_generated': return 'bg-[#8b5cf6]';
    case 'arrival': return 'bg-[#f97316]';
    case 'delivery': return 'bg-[#10b981]';
    case 'created': return 'bg-gray-400';
    default: return 'bg-gray-300';
  }
}

function getEventLineGradient(from: string, to: string): string {
  const fromColor = from === 'delivery' ? 'from-emerald-500' : 'from-gray-200';
  return `bg-gradient-to-b ${fromColor} to-gray-200`;
}

// ═══════════════════════════════════════════════════
//  MESSAGE CARD (expandable)
// ═══════════════════════════════════════════════════

function MessageCard({
  entry,
  lang,
}: {
  entry: TimelineEntry;
  lang: 'fr' | 'en';
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const t = (fr: string, en: string) => lang === 'fr' ? fr : en;

  const isWhatsApp = entry.waLink || entry.type === 'activation' || entry.type === 'delivery';
  const recipientLabel = entry.recipientType === 'sender'
    ? t('Expéditeur', 'Sender')
    : entry.recipientType === 'receiver'
      ? t('Destinataire', 'Receiver')
      : t('Système', 'System');

  const handleCopyMessage = async () => {
    if (!entry.messageContent) return;
    try {
      await navigator.clipboard.writeText(entry.messageContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* silent */ }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50/50 transition-colors text-left"
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: entry.color + '15' }}
        >
          {isWhatsApp ? (
            <MessageCircle className="w-4 h-4" style={{ color: entry.color }} />
          ) : (
            <Shield className="w-4 h-4" style={{ color: entry.color }} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{entry.label}</p>
          <p className="text-xs text-gray-500">
            {recipientLabel}{entry.recipientName ? ` — ${entry.recipientName}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[11px] text-gray-400">
            {formatTime(entry.timestamp, lang)}
          </span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && entry.messageContent && (
        <div className="px-4 pb-4 space-y-3">
          {/* WhatsApp message preview */}
          <div className="bg-[#ECE5DD] rounded-lg p-3 relative">
            {/* WhatsApp header */}
            <div className="flex items-center gap-2 mb-2">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#25D366]" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              <span className="text-xs font-medium text-[#25D366]">WhatsApp</span>
            </div>
            {/* Message text (preserve formatting) */}
            <div className="text-[13px] text-gray-800 whitespace-pre-wrap leading-relaxed font-sans">
              {entry.messageContent}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {entry.waLink && (
              <a
                href={entry.waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/20 rounded-lg text-xs font-semibold text-[#25D366] transition-colors no-underline"
              >
                <Send className="w-3.5 h-3.5" />
                {t('Ouvrir WhatsApp', 'Open WhatsApp')}
              </a>
            )}
            <button
              onClick={handleCopyMessage}
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              {copied ? t('✅ Copié !', '✅ Copied!') : t('Copier', 'Copy')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
//  MAIN PAGE
// ═══════════════════════════════════════════════════

export default function SuiviPage() {
  const params = useParams();
  const reference = ((params?.id as string) || '').toUpperCase().trim();
  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [loading, setLoading] = useState(true);
  const [colis, setColis] = useState<ColisInfo | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPinKeypad, setShowPinKeypad] = useState(false);
  const [deliverySuccess, setDeliverySuccess] = useState(false);
  const [pinValidating, setPinValidating] = useState(false);

  const t = (fr: string, en: string) => lang === 'fr' ? fr : en;

  useEffect(() => {
    if (!reference) {
      setError(t('Référence manquante.', 'Missing reference.'));
      setLoading(false);
      return;
    }

    const fetchTracking = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/tracking/${encodeURIComponent(reference)}`);
        const data = await res.json();

        if (res.ok && data.success) {
          setColis(data.colis);
          setTimeline(data.timeline || []);
          setTicket(data.ticket || null);
        } else {
          setError(data.message || t('Colis introuvable.', 'Package not found.'));
        }
      } catch {
        setError(t('Erreur de connexion.', 'Connection error.'));
      } finally {
        setLoading(false);
      }
    };

    fetchTracking();
  }, [reference]);

  // ─── PIN Validation Handler ───
  const handlePinSubmit = useCallback(async (pin: string) => {
    try {
      const res = await fetch('/api/validate-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference, pin }),
      });
      const data = await res.json();

      if (data.success) {
        setShowPinKeypad(false);
        setDeliverySuccess(true);
        // Refresh tracking data
        const trackRes = await fetch(`/api/tracking/${encodeURIComponent(reference)}`);
        const trackData = await trackRes.json();
        if (trackRes.ok && trackData.success) {
          setColis(trackData.colis);
          setTimeline(trackData.timeline || []);
        }
        return { success: true };
      }

      if (data.blocked) {
        return { success: false, blocked: true, error: data.message };
      }

      return {
        success: false,
        error: data.message || 'Code incorrect.',
        attemptsLeft: data.attemptsLeft,
      };
    } catch {
      return { success: false, error: 'Erreur de connexion.' };
    }
  }, [reference]);

  // ─── Resend PIN handler ───
  const handleResendPin = useCallback(async () => {
    // Navigate to retrieve page where resend logic may exist
    window.open(`/retrieve/${reference}`, '_blank');
  }, [reference]);

  // ─── Loading ───
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#F8FAFC] to-white">
        <SuiviHeader reference={reference} lang={lang} onLangChange={setLang} />
        <div className="flex items-center justify-center py-32">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500">{t('Chargement du suivi...', 'Loading tracking...')}</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Error ───
  if (error && !colis) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#F8FAFC] to-white">
        <SuiviHeader reference={reference} lang={lang} onLangChange={setLang} />
        <div className="max-w-[600px] mx-auto px-4 py-16 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-50 rounded-full">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">{error}</h2>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 h-12 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-semibold text-sm transition-colors no-underline"
          >
            <Home className="w-4 h-4" />
            {t("Retour à l'accueil", 'Back to home')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F8FAFC] to-white">
      <SuiviHeader reference={reference} lang={lang} onLangChange={setLang} />

      <main className="max-w-[600px] mx-auto px-4 py-6 pb-20 space-y-5">
        {/* ─── STATUS BANNER ─── */}
        {colis && (
          <div
            className="rounded-2xl p-5 text-white relative overflow-hidden"
            style={{
              background: colis.status === 'delivered'
                ? 'linear-gradient(135deg, #10b981, #10b981cc)'
                : colis.status === 'in_transit'
                  ? 'linear-gradient(135deg, #f97316, #f97316cc)'
                  : 'linear-gradient(135deg, #6b7280, #6b7280cc)',
            }}
          >
            {/* Decorative circles */}
            <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10" />
            <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-white/5" />

            <div className="relative space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    {colis.status === 'delivered' ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : colis.status === 'in_transit' ? (
                      <Truck className="w-5 h-5" />
                    ) : (
                      <Clock className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h1 className="text-base font-bold leading-tight">{colis.statusLabel}</h1>
                    <p className="text-xs text-white/70">{colis.reference}</p>
                  </div>
                </div>
                <span className="text-3xl">{colis.transportIcon}</span>
              </div>

              {/* Route */}
              <div className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3">
                <div className="text-center flex-1">
                  <p className="text-lg font-bold">{colis.departureCity}</p>
                  <p className="text-[10px] text-white/60">{t('Départ', 'Departure')}</p>
                </div>
                <div className="flex items-center gap-1 text-white/40">
                  <ArrowRight className="w-5 h-5 text-[#FF6B35]" />
                </div>
                <div className="text-center flex-1">
                  <p className="text-lg font-bold">{colis.arrivalCity}</p>
                  <p className="text-[10px] text-white/60">{t('Arrivée', 'Arrival')}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── DELIVERY VALIDATION BUTTON (for in_transit parcels) ─── */}
        {colis && colis.status === 'in_transit' && !ticket && (
          <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-dashed border-emerald-300 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <p className="text-sm font-bold text-emerald-800">
                  {t('Validation de livraison', 'Delivery Validation')}
                </p>
              </div>
              <p className="text-xs text-emerald-600 mb-3">
                {t(
                  'Le destinataire a reçu un code PIN à 6 chiffres par WhatsApp. Demandez-lui de vous communiquer ce code pour valider la remise du colis.',
                  'The recipient received a 6-digit PIN code via WhatsApp. Ask them to share it with you to validate the package delivery.'
                )}
              </p>
              <button
                onClick={() => setShowPinKeypad(true)}
                className="w-full flex items-center justify-center gap-3 h-14 bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white rounded-2xl font-bold text-base shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40 active:scale-[0.98] transition-all"
              >
                <Lock className="w-5 h-5" />
                {t('🔐 Saisir le code de retrait', 'Enter withdrawal code')}
              </button>
            </div>
          </div>
        )}

        {/* ─── DELIVERY SUCCESS BANNER ─── */}
        {deliverySuccess && (
          <div className="bg-gradient-to-r from-emerald-500 to-green-500 rounded-2xl p-5 text-white text-center space-y-2 shadow-lg shadow-emerald-500/30 animate-in fade-in zoom-in-95 duration-500">
            <div className="flex items-center justify-center gap-2">
              <PartyPopper className="w-6 h-6" />
              <h3 className="text-lg font-bold">{t('Livraison validée !', 'Delivery validated!')}</h3>
              <PartyPopper className="w-6 h-6" />
            </div>
            <p className="text-sm text-white/90">
              {t('Le colis a été remis au destinataire avec succès.', 'The package was successfully delivered to the recipient.')}
            </p>
          </div>
        )}

        {/* ─── COLIS INFO CARD (color: Voyage green #10b981) ─── */}
        {colis && !ticket && (
          <div className="bg-[#10b981] rounded-2xl p-5 shadow-lg shadow-emerald-500/20 space-y-3">
            <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider">
              {t('Détails du colis', 'Package details')}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <InfoItem icon={Package} label={t('Référence', 'Reference')} value={colis.reference} mono />
              <InfoItem icon={Truck} label={t('Compagnie', 'Company')} value={colis.company} />
              <InfoItem icon={User} label={t('Expéditeur', 'Sender')} value={colis.senderName} />
              <InfoItem icon={User} label={t('Destinataire', 'Receiver')} value={colis.receiverName} />
              {colis.departureDate && (
                <InfoItem
                  icon={Clock}
                  label={t('Départ', 'Departure')}
                  value={`${formatDate(colis.departureDate, lang)}${colis.departureTime ? ` ${colis.departureTime}` : ''}`}
                />
              )}
              {colis.deliveryLocation && (
                <InfoItem icon={MapPin} label={t('Lieu de dépôt', 'Drop-off')} value={colis.deliveryLocation} />
              )}
              {colis.driverPhone && colis.shareDriverPhone && (
                <InfoItem
                  icon={Phone}
                  label={t('Chauffeur', 'Driver')}
                  value={colis.driverPhone}
                  mono
                  href={`https://wa.me/${colis.driverPhone.replace(/^\+/, '')}`}
                />
              )}
              {colis.deliveredAt && (
                <InfoItem icon={CheckCircle} label={t('Livré le', 'Delivered')} value={formatDate(colis.deliveredAt, lang)} />
              )}
            </div>
          </div>
        )}

        {/* ─── TICKET INFO CARD ─── */}
        {colis && ticket && (
          <SuiviTicketCard colis={colis} ticket={ticket} lang={lang} t={t} />
        )}

        {/* ─── TIMELINE (color: Sender orange #f97316) ─── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-900">
              📋 {t('Historique du voyage', 'Journey history')}
            </h2>
            <span className="text-xs font-medium text-[#f97316]">
              {timeline.length} {t('événement(s)', 'event(s)')}
            </span>
          </div>

          {timeline.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
              <Clock className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">
                {t('Aucun événement enregistré.', 'No events recorded.')}
              </p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-gray-200" />

              <div className="space-y-3">
                {timeline.map((entry, index) => (
                  <div key={entry.id || index} className="relative flex gap-4">
                    {/* Dot */}
                    <div className="relative z-10 flex-shrink-0 w-[31px] flex items-start justify-center pt-3">
                      <div className={`w-3 h-3 rounded-full ${getEventDotColor(entry.type)} ring-4 ring-white shadow-sm`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Date separator */}
                      {(index === 0 || formatDate(timeline[index - 1].timestamp, lang) !== formatDate(entry.timestamp, lang)) && (
                        <div className="mb-1.5">
                          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                            {formatDate(entry.timestamp, lang)}
                          </span>
                        </div>
                      )}

                      {/* Time */}
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-bold text-gray-700">
                          {formatTime(entry.timestamp, lang)}
                        </span>
                      </div>

                      {/* Message card */}
                      <MessageCard entry={entry} lang={lang} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ─── PIN KEYPAD MODAL ─── */}
        {showPinKeypad && colis && (
          <PinKeypad
            onSubmit={handlePinSubmit}
            onCancel={() => setShowPinKeypad(false)}
            onResendPin={handleResendPin}
            receiverName={colis.receiverName}
          />
        )}

        {/* ─── Back home ─── */}
        <div className="text-center pt-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors no-underline"
          >
            <Home className="w-4 h-4" />
            {t("Retour à l'accueil", 'Back to home')}
          </Link>
        </div>
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════
//  TICKET INFO CARD (for suivi page)
// ═══════════════════════════════════════════════════

function SuiviTicketCard({ colis, ticket, lang, t }: { colis: ColisInfo; ticket: TicketData; lang: 'fr' | 'en'; t: (fr: string, en: string) => string }) {
  const statusBadge = ticket.ticketStatus === 'ACTIVE'
    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
    : ticket.ticketStatus === 'CANCELLED'
      ? 'bg-red-50 border-red-200 text-red-700'
      : 'bg-amber-50 border-amber-200 text-amber-700';

  const statusLabel = ticket.ticketStatus === 'ACTIVE'
    ? t('✅ ACTIF', '✅ ACTIVE')
    : ticket.ticketStatus === 'CANCELLED'
      ? t('❌ ANNULÉ', '❌ CANCELLED')
      : t('⏳ EN ATTENTE', '⏳ PENDING');

  return (
    <div className="space-y-4">
      {/* Ticket Header Card */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Ticket className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-emerald-800">🎫 {t('Billet de Transport', 'Transport Ticket')}</h3>
              <p className="text-xs font-mono text-emerald-500">{colis.reference}</p>
            </div>
          </div>
          <div className={`flex items-center gap-1.5 border rounded-full px-3 py-1.5 text-xs font-semibold ${statusBadge}`}>
            {statusLabel}
          </div>
        </div>

        {/* Passenger info */}
        <div className="grid grid-cols-2 gap-3">
          <TicketInfoItem label={t('Passager', 'Passenger')} value={ticket.passengerName} />
          <TicketInfoItem label={t('Âge', 'Age')} value={`${ticket.passengerAge} ${t('ans', 'years')}`} />
          <TicketInfoItem label={t('Document', 'Document')} value={`${ticket.documentType} — ${ticket.documentNumber}`} />
          <TicketInfoItem label={t('Siège', 'Seat')} value={ticket.seatNumber} />
          <TicketInfoItem label={t('Destination', 'Destination')} value={ticket.destination || colis.arrivalCity} />
          {ticket.platform && (
            <TicketInfoItem label={t('Quai', 'Platform')} value={ticket.platform} />
          )}
        </div>

        {/* Departure time */}
        {ticket.departureTime && (
          <div className="flex items-center gap-2 text-sm text-emerald-700">
            <Clock className="w-4 h-4" />
            <span className="font-semibold">
              {t('Départ', 'Departure')} : {formatDate(ticket.departureTime, lang)}{' '}
              {new Date(ticket.departureTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}
      </div>

      {/* Luggage Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Luggage className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">{t('Bagages', 'Luggage')}</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500">{t('Quantité', 'Count')}</p>
            <p className="font-bold text-gray-900 text-lg">{ticket.luggageCount}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500">{t('Poids', 'Weight')}</p>
            <p className="font-bold text-gray-900 text-lg">{ticket.luggageWeightKg}<span className="text-sm font-normal">kg</span></p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500">{t('Frais', 'Fee')}</p>
            <p className="font-bold text-gray-900 text-lg">{ticket.luggageFee}<span className="text-sm font-normal">F</span></p>
          </div>
        </div>
      </div>

      {/* Control Code Card — Prominent */}
      <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-5 text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <h3 className="text-sm font-bold text-emerald-800 uppercase tracking-wider">{t('Code de contrôle', 'Control code')}</h3>
        </div>
        <p className="text-3xl font-mono font-black text-emerald-900 tracking-[0.15em] py-2">
          {ticket.controlCode}
        </p>
        <p className="text-xs text-emerald-600">
          {t('Présentez ce code lors du contrôle.', 'Present this code during inspection.')}
        </p>
      </div>
    </div>
  );
}

function TicketInfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/60 rounded-xl p-2.5">
      <p className="text-[11px] text-emerald-600 font-medium">{label}</p>
      <p className="text-sm text-emerald-900 font-semibold truncate">{value}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════
//  HEADER COMPONENT
// ═══════════════════════════════════════════════════

function SuiviHeader({
  reference,
  lang,
  onLangChange,
}: {
  reference: string;
  lang: 'fr' | 'en';
  onLangChange: (lang: 'fr' | 'en') => void;
}) {
  return (
    <header className="bg-[#8b5cf6] text-white sticky top-0 z-50">
      <div className="max-w-[600px] mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-[#FF6B35] flex items-center justify-center">
            <QrCode className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight block leading-tight">SmarticketS</span>
            {reference && (
              <span className="text-[10px] font-mono text-white/50 leading-tight">{reference}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[#FF6B35]/15 border border-[#FF6B35]/30 rounded-full px-3 py-1.5">
            <Truck className="w-3.5 h-3.5 text-[#FF6B35]" />
            <span className="text-xs font-semibold text-[#FF6B35]">
              {lang === 'fr' ? 'Suivi' : 'Tracking'}
            </span>
          </div>
          <button
            onClick={() => onLangChange(lang === 'fr' ? 'en' : 'fr')}
            className="flex items-center gap-1 text-xs font-medium text-white/70 hover:text-white transition-colors px-2 py-1 rounded-md"
            aria-label="Switch language"
          >
            <Globe className="w-3.5 h-3.5" />
            {lang === 'fr' ? 'EN' : 'FR'}
          </button>
        </div>
      </div>
      {/* Title bar */}
      <div className="border-t border-white/10">
        <div className="max-w-[600px] mx-auto px-4 py-3">
          <h1 className="text-sm font-semibold text-white/80">
            📋 {lang === 'fr' ? 'Suivi du voyage' : 'Journey tracking'}
          </h1>
        </div>
      </div>
    </header>
  );
}

// ═══════════════════════════════════════════════════
//  INFO ITEM
// ═══════════════════════════════════════════════════

function InfoItem({
  icon: Icon,
  label,
  value,
  mono,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  mono?: boolean;
  href?: string;
}) {
  const Wrapper = href ? 'a' : 'div';
  const wrapperProps = href
    ? { href, target: '_blank' as const, rel: 'noopener noreferrer' as const, className: 'flex items-start gap-2.5 no-underline hover:bg-white/5 rounded-lg p-1 -m-1 transition-colors cursor-pointer' }
    : { className: 'flex items-start gap-2.5' };

  return (
    <Wrapper {...wrapperProps}>
      <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5 text-white/80" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-white/60 font-medium">{label}</p>
        <p className={`text-sm text-white font-semibold truncate ${mono ? 'font-mono' : ''}`}>
          {value}
        </p>
      </div>
    </Wrapper>
  );
}
