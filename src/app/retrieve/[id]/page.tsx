'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import {
  Bus,
  User,
  MapPin,
  Clock,
  Armchair,
  Shield,
  ShieldCheck,
  Package,
  Home,
  ChevronRight,
  Copy,
  MessageCircle,
  Eye,
  EyeOff,
  Download,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';

// ═══════════════════════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════════════════════

interface ColisData {
  id: string;
  reference: string;
  status: string;
  category?: string;
  transportType: string;
  company: string;
  arrivalCity: string;
  departureCity: string;
  departureDate: string | null;
  departureTime: string | null;
  senderName: string;
  senderPhone: string;
  receiverName: string;
  receiverPhone: string;
  deliveredAt?: string | null;
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

interface TimelineEntry {
  id: string;
  type: 'event' | 'scan';
  title: string;
  description: string;
  timestamp: string;
  location: string | null;
}

interface ApiResponse {
  success: boolean;
  colis: ColisData;
  ticket?: TicketData | null;
  pin_masked?: string | null;
  pinAttempts?: number;
  timeline?: TimelineEntry[];
  message?: string;
}

// ═══════════════════════════════════════════════════════════
//  UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatDateTime(timestamp: string | null): string {
  if (!timestamp) return '';
  try {
    return (
      new Date(timestamp).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }) +
      ' à ' +
      new Date(timestamp).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    );
  } catch {
    return '';
  }
}

function maskDocument(docNum: string): string {
  if (!docNum || docNum.length < 4) return docNum;
  const visible = docNum.slice(-4);
  const masked = '*'.repeat(Math.max(docNum.length - 4, 4));
  return masked + visible;
}

function getTimelineIcon(title: string): { icon: string; bg: string } {
  const t = title.toLowerCase();
  if (t.includes('activ')) return { icon: '🟢', bg: 'bg-green-100' };
  if (t.includes('départ') || t.includes('partance'))
    return { icon: '🚌', bg: 'bg-blue-100' };
  if (t.includes('arriv') || t.includes('livr'))
    return { icon: '📍', bg: 'bg-emerald-100' };
  if (t.includes('scan')) return { icon: '📱', bg: 'bg-indigo-100' };
  if (t.includes('avert') || t.includes('warning') || t.includes('⚠'))
    return { icon: '⚠️', bg: 'bg-orange-100' };
  return { icon: '📋', bg: 'bg-gray-100' };
}

function getStatusConfig(ticketStatus: string): {
  label: string;
  bg: string;
  text: string;
  dot: string;
  animate: boolean;
} {
  const s = ticketStatus?.toUpperCase() || '';
  if (s.includes('ACTIVE') || s.includes('VALID'))
    return {
      label: 'VALIDÉ',
      bg: 'bg-emerald-100',
      text: 'text-emerald-700',
      dot: 'bg-emerald-500',
      animate: false,
    };
  if (s.includes('CANCEL') || s.includes('EXPIR') || s.includes('ANNUL'))
    return {
      label: 'ANNULÉ',
      bg: 'bg-red-100',
      text: 'text-red-700',
      dot: 'bg-red-500',
      animate: false,
    };
  return {
    label: 'EN ATTENTE',
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
    animate: true,
  };
}

// ═══════════════════════════════════════════════════════════
//  CSS ANIMATIONS
// ═══════════════════════════════════════════════════════════

function Animations() {
  return (
    <style>{`
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(16px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      @keyframes pulseStatus {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.65; }
      }
      @keyframes pulseQr {
        0%, 100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.25); }
        50% { box-shadow: 0 0 0 10px rgba(37, 99, 235, 0); }
      }
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      .animate-fade-in-up {
        animation: fadeInUp 0.5s ease-out both;
      }
      .animate-pulse-status {
        animation: pulseStatus 2s ease-in-out infinite;
      }
      .animate-pulse-qr {
        animation: pulseQr 2.5s ease-in-out infinite;
      }
      .skeleton {
        background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s ease-in-out infinite;
        border-radius: 8px;
      }
    `}</style>
  );
}

// ═══════════════════════════════════════════════════════════
//  LOADING SKELETON
// ═══════════════════════════════════════════════════════════

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[#f1f5f9] flex flex-col">
      <Animations />
      <div className="max-w-[440px] mx-auto w-full px-4 py-6 space-y-4 safe-top">
        {/* Header skeleton */}
        <div className="bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] rounded-3xl p-6 pb-8 space-y-3">
          <div className="skeleton h-5 w-48 bg-white/20" />
          <div className="skeleton h-3 w-28 bg-white/15" />
        </div>
        {/* Main info skeleton */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div className="flex gap-4">
            <div className="skeleton h-20 w-20 rounded-xl" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-4 w-36" />
              <div className="skeleton h-3 w-24" />
            </div>
          </div>
          <div className="skeleton h-12 w-full rounded-xl" />
        </div>
        {/* Trajet skeleton */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="skeleton h-8 w-28" />
            <div className="skeleton h-8 w-8 rounded-full" />
            <div className="skeleton h-8 w-28" />
          </div>
          <div className="flex gap-3">
            <div className="skeleton h-10 flex-1" />
            <div className="skeleton h-10 flex-1" />
            <div className="skeleton h-10 flex-1" />
          </div>
        </div>
        {/* Passenger skeleton */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <div className="skeleton h-5 w-24" />
          <div className="skeleton h-6 w-48" />
          <div className="flex gap-3">
            <div className="skeleton h-10 flex-1" />
            <div className="skeleton h-10 flex-1" />
          </div>
        </div>
        {/* Luggage skeleton */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex gap-3">
            <div className="skeleton h-16 flex-1" />
            <div className="skeleton h-16 flex-1" />
            <div className="skeleton h-16 flex-1" />
          </div>
        </div>
        {/* Control code skeleton */}
        <div className="bg-[#d1fae5] rounded-2xl p-5 text-center space-y-2">
          <div className="skeleton h-4 w-40 mx-auto" />
          <div className="skeleton h-10 w-56 mx-auto" />
        </div>
        {/* QR skeleton */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col items-center">
          <div className="skeleton h-[250px] w-[250px] rounded-2xl" />
          <div className="skeleton h-3 w-48 mt-3" />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  SECTION 1: TICKET HEADER
// ═══════════════════════════════════════════════════════════

function TicketHeader({
  reference,
  statusConfig,
}: {
  reference: string;
  statusConfig: ReturnType<typeof getStatusConfig>;
}) {
  return (
    <div
      className="bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] rounded-3xl p-6 pb-8 text-white relative overflow-hidden animate-fade-in-up"
      style={{ animationDelay: '0ms' }}
    >
      {/* Decorative circles */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full" />
      <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/5 rounded-full" />

      <div className="flex items-start justify-between relative z-10">
        {/* Left: Logo + Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <span className="text-lg font-black">S</span>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight leading-tight">
              TICKET DE TRANSPORT
            </h1>
            <p className="text-[11px] text-white/60 font-mono leading-tight mt-0.5">
              {reference}
            </p>
          </div>
        </div>

        {/* Right: Status badge */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${statusConfig.bg} ${statusConfig.text} ${statusConfig.animate ? 'animate-pulse-status' : ''}`}
        >
          <div className={`w-2 h-2 rounded-full ${statusConfig.dot}`} />
          <span className="text-xs font-bold">{statusConfig.label}</span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  SECTION 2: MAIN INFO (Boarding Pass Style)
// ═══════════════════════════════════════════════════════════

function MainInfoCard({
  ticket,
  colis,
}: {
  ticket: TicketData;
  colis: ColisData;
}) {
  return (
    <div
      className="bg-white rounded-2xl border-2 border-dashed border-[#2563eb]/30 shadow-sm overflow-hidden animate-fade-in-up"
      style={{ animationDelay: '80ms' }}
    >
      {/* Top: Seat + Company */}
      <div className="p-5 flex items-center gap-4">
        {/* Seat number */}
        <div className="flex flex-col items-center bg-[#f1f5f9] rounded-2xl px-5 py-3 min-w-[80px]">
          <Armchair className="w-5 h-5 text-[#2563eb] mb-1" />
          <span className="text-3xl font-black text-[#0f172a] leading-none">
            {ticket.seatNumber || '—'}
          </span>
          <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mt-1">
            Siège
          </span>
        </div>

        {/* Company info */}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
            Compagnie
          </p>
          <p className="text-base font-bold text-[#0f172a] truncate">
            {colis.company || '—'}
          </p>
          <p className="text-xs text-gray-500 font-mono mt-0.5">
            {colis.reference}
          </p>
        </div>
      </div>

      {/* Dark band: Date | Time | Reference */}
      <div className="bg-[#0f172a] px-5 py-3.5">
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center">
            <p className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">
              Date
            </p>
            <p className="text-sm font-bold text-white mt-0.5">
              {formatDate(colis.departureDate)}
            </p>
          </div>
          <div className="text-center border-x border-white/10">
            <p className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">
              Heure départ
            </p>
            <p className="text-sm font-bold text-white mt-0.5">
              {ticket.departureTime || colis.departureTime || '—'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">
              Référence
            </p>
            <p className="text-sm font-bold text-white mt-0.5 font-mono">
              {colis.reference}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  SECTION 3: TRAJET (Route)
// ═══════════════════════════════════════════════════════════

function TrajetCard({
  colis,
  ticket,
}: {
  colis: ColisData;
  ticket: TicketData;
}) {
  return (
    <div
      className="bg-white rounded-2xl border-2 border-dashed border-[#2563eb]/30 shadow-sm p-5 animate-fade-in-up"
      style={{ animationDelay: '160ms' }}
    >
      <div className="flex items-center justify-between items-center">
        {/* Departure */}
        <div className="text-center flex-1">
          <p className="text-2xl font-black text-[#0f172a] uppercase tracking-tight">
            {colis.departureCity || '—'}
          </p>
        </div>

        {/* Bus icon + line */}
        <div className="flex items-center gap-2 mx-3 flex-shrink-0">
          <div className="w-6 h-[2px] bg-gray-300 rounded" />
          <div className="w-10 h-10 rounded-full bg-[#2563eb]/10 flex items-center justify-center">
            <Bus className="w-5 h-5 text-[#2563eb]" />
          </div>
          <div className="w-6 h-[2px] bg-[#2563eb] rounded" />
        </div>

        {/* Arrival */}
        <div className="text-center flex-1">
          <p className="text-2xl font-black text-[#0f172a] uppercase tracking-tight">
            {ticket.destination || colis.arrivalCity || '—'}
          </p>
        </div>
      </div>

      {/* Info row */}
      <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs text-gray-500 font-medium">
            {ticket.departureTime || colis.departureTime || '—'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Armchair className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs text-gray-500 font-medium">
            Siège {ticket.seatNumber || '—'}
          </span>
        </div>
        {ticket.platform && (
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-500 font-medium">
              Quai {ticket.platform}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  SECTION 4: PASSAGER (Passenger)
// ═══════════════════════════════════════════════════════════

function PassengerCard({
  ticket,
  showDoc,
  onToggleDoc,
}: {
  ticket: TicketData;
  showDoc: boolean;
  onToggleDoc: () => void;
}) {
  return (
    <div
      className="bg-white rounded-2xl border-2 border-dashed border-[#2563eb]/30 shadow-sm p-5 animate-fade-in-up"
      style={{ animationDelay: '240ms' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <User className="w-4 h-4 text-[#2563eb]" />
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
          Passager
        </h3>
      </div>

      <p className="text-xl font-bold text-[#0f172a]">{ticket.passengerName}</p>

      <div className="grid grid-cols-3 gap-3 mt-3">
        <div className="bg-[#f8fafc] rounded-xl border border-dashed border-[#2563eb]/20 p-3 text-center">
          <p className="text-[10px] text-gray-400 font-semibold uppercase">
            Âge
          </p>
          <p className="text-sm font-bold text-[#0f172a] mt-0.5">
            {ticket.passengerAge} ans
          </p>
        </div>
        <div className="bg-[#f8fafc] rounded-xl border border-dashed border-[#2563eb]/20 p-3 text-center">
          <p className="text-[10px] text-gray-400 font-semibold uppercase">
            Document
          </p>
          <p className="text-sm font-bold text-[#0f172a] mt-0.5">
            {ticket.documentType}
          </p>
        </div>
        <div className="bg-[#f8fafc] rounded-xl border border-dashed border-[#2563eb]/20 p-3 text-center">
          <p className="text-[10px] text-gray-400 font-semibold uppercase">
            N° Document
          </p>
          <button
            type="button"
            onClick={onToggleDoc}
            className="flex items-center justify-center gap-1 mt-0.5 w-full"
            aria-label={showDoc ? 'Masquer le numéro' : 'Afficher le numéro'}
          >
            <p className="text-sm font-bold text-[#0f172a] font-mono truncate">
              {showDoc ? ticket.documentNumber : maskDocument(ticket.documentNumber)}
            </p>
            {showDoc ? (
              <EyeOff className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            ) : (
              <Eye className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  SECTION 5: BAGAGES (Luggage)
// ═══════════════════════════════════════════════════════════

function LuggageCard({ ticket }: { ticket: TicketData }) {
  return (
    <div
      className="bg-white rounded-2xl border-2 border-dashed border-[#2563eb]/30 shadow-sm p-5 animate-fade-in-up"
      style={{ animationDelay: '320ms' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Package className="w-4 h-4 text-gray-400" />
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
          Bagages
        </h3>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#f8fafc] rounded-xl border border-dashed border-[#2563eb]/20 p-4 text-center">
          <p className="text-2xl font-black text-[#0f172a]">
            {ticket.luggageCount}
          </p>
          <p className="text-[10px] text-gray-400 font-semibold uppercase mt-1">
            Quantité
          </p>
        </div>
        <div className="bg-[#f8fafc] rounded-xl border border-dashed border-[#2563eb]/20 p-4 text-center">
          <p className="text-2xl font-black text-[#0f172a]">
            {ticket.luggageWeightKg}
            <span className="text-sm font-semibold text-gray-400 ml-0.5">kg</span>
          </p>
          <p className="text-[10px] text-gray-400 font-semibold uppercase mt-1">
            Poids
          </p>
        </div>
        <div className="bg-[#f8fafc] rounded-xl border border-dashed border-[#2563eb]/20 p-4 text-center">
          <p className="text-2xl font-black text-[#0f172a]">
            {ticket.luggageFee}
            <span className="text-sm font-semibold text-gray-400 ml-0.5">F</span>
          </p>
          <p className="text-[10px] text-gray-400 font-semibold uppercase mt-1">
            Frais
          </p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  SECTION 6: CODE DE CONTRÔLE
// ═══════════════════════════════════════════════════════════

function ControlCodeCard({
  ticket,
  copied,
  onCopy,
}: {
  ticket: TicketData;
  copied: boolean;
  onCopy: () => void;
}) {
  const spacedCode = (ticket.controlCode || '').split('').join('  ');

  return (
    <div
      className="bg-[#d1fae5] rounded-2xl border-2 border-dashed border-[#10b981]/30 p-5 text-center space-y-2 animate-fade-in-up"
      style={{ animationDelay: '400ms' }}
    >
      <div className="flex items-center justify-center gap-2">
        <ShieldCheck className="w-5 h-5 text-[#059669]" />
        <h3 className="text-xs font-bold text-[#065f46] uppercase tracking-wider">
          Code de contrôle
        </h3>
      </div>

      <button
        type="button"
        onClick={onCopy}
        className="flex items-center justify-center gap-2 mx-auto group"
        aria-label="Copier le code de contrôle"
      >
        <p
          className="text-3xl font-black text-[#064e3b] tracking-[0.2em] py-1 font-mono"
          style={{ letterSpacing: '0.2em' }}
        >
          {spacedCode}
        </p>
        <Copy
          className={`w-4 h-4 mt-1 flex-shrink-0 transition-colors ${copied ? 'text-[#10b981]' : 'text-[#059669]/50 group-hover:text-[#059669]'}`}
        />
      </button>

      <p className="text-xs text-[#059669]">
        {copied ? '✅ Code copié !' : 'Présentez ce code lors du contrôle'}
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  SECTION 7: QR CODE
// ═══════════════════════════════════════════════════════════

function QRCodeSection({ reference }: { reference: string }) {
  const qrUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/retrieve/${reference}`
      : '';

  return (
    <div
      className="bg-white rounded-2xl border-2 border-dashed border-[#2563eb]/30 shadow-sm p-6 flex flex-col items-center animate-fade-in-up"
      style={{ animationDelay: '480ms' }}
    >
      <div className="w-[250px] h-[250px] rounded-2xl border-2 border-[#2563eb]/20 p-3 bg-white animate-pulse-qr shadow-lg shadow-[#2563eb]/5">
        <QRCodeSVG
          value={qrUrl}
          size={222}
          level="H"
          includeMargin={false}
          bgColor="#ffffff"
          fgColor="#0f172a"
        />
      </div>
      <p className="text-xs text-gray-400 mt-3 text-center">
        Scannez pour vérifier l&apos;authenticité
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  SECTION 8: TIMELINE (Historique)
// ═══════════════════════════════════════════════════════════

function TimelineSection({
  timeline,
}: {
  timeline: TimelineEntry[];
}) {
  const [expanded, setExpanded] = useState(false);
  const VISIBLE_COUNT = 4;
  const visibleItems = expanded
    ? timeline
    : timeline.slice(0, VISIBLE_COUNT);
  const hasMore = timeline.length > VISIBLE_COUNT;

  if (timeline.length === 0) return null;

  return (
    <div
      className="bg-white rounded-2xl border-2 border-dashed border-[#2563eb]/30 shadow-sm p-5 animate-fade-in-up"
      style={{ animationDelay: '560ms' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-4 h-4 text-gray-400" />
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
          Historique
        </h3>
        <span className="ml-auto text-xs text-gray-300">
          {timeline.length} événements
        </span>
      </div>

      <div className="space-y-0">
        {visibleItems.map((entry, i) => {
          const icon = getTimelineIcon(entry.title);
          const isLast = i === visibleItems.length - 1;

          return (
            <div key={entry.id} className="flex gap-3">
              {/* Vertical line + dot */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-7 h-7 rounded-full ${icon.bg} flex items-center justify-center flex-shrink-0 text-xs z-10`}
                >
                  {icon.icon}
                </div>
                {!isLast && <div className="w-0.5 flex-1 bg-gray-100 my-0.5" />}
              </div>

              {/* Content */}
              <div className={`pb-4 ${isLast ? 'pb-0' : ''}`}>
                <p className="text-sm font-semibold text-[#0f172a]">
                  {entry.title}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {formatDateTime(entry.timestamp)}
                </p>
                {entry.location && (
                  <p className="text-xs text-gray-300 mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {entry.location}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-center gap-1 w-full pt-3 mt-1 border-t border-gray-100 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
        >
          {expanded
            ? 'Voir moins'
            : `Voir les ${timeline.length - VISIBLE_COUNT} suivants`}
          <ChevronRight
            className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`}
          />
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  ACTION BUTTONS (Share / Download)
// ═══════════════════════════════════════════════════════════

function ActionButtons({ reference, colis, ticket }: {
  reference: string;
  colis: ColisData;
  ticket: TicketData;
}) {
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);

  // Generate PDF blob using jsPDF
  const generatePdfBlob = async (): Promise<Blob> => {
    const jsPDF = (await import('jspdf')).default;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [85, 170], // Mobile boarding pass size
    });

    const pw = 85; // page width
    const blue = [37, 99, 235]; // #2563eb
    const dark = [15, 23, 42]; // #0f172a
    const gray = [100, 116, 139]; // #64748b
    const green = [16, 185, 129]; // #10b981

    // ═══ HEADER ═══
    doc.setFillColor(...blue);
    doc.roundedRect(0, 0, pw, 25, 0, 0, 0, 'F');
    // bottom corners
    doc.roundedRect(0, 22, pw, 6, [0, 0, 3, 3], 'F');

    // Logo circle
    doc.setFillColor(255, 255, 255, 0.2);
    doc.circle(10, 12.5, 5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('S', 8.5, 14);

    // Title
    doc.setFontSize(7);
    doc.text('TICKET DE TRANSPORT', 17, 9);
    doc.setFontSize(5);
    doc.setTextColor(255, 255, 255, 0.6);
    doc.text(reference, 17, 14);

    // Status badge
    const status = ticket.ticketStatus?.toUpperCase() || '';
    const statusLabel = status.includes('ACTIVE') || status.includes('VALID') ? 'VALIDÉ'
      : status.includes('CANCEL') || status.includes('EXPIR') ? 'ANNULÉ'
      : 'EN ATTENTE';
    const statusClr = statusLabel === 'VALIDÉ' ? green : statusLabel === 'ANNULÉ' ? [239, 68, 68] : [245, 158, 11];

    doc.setFillColor(255, 255, 255, 0.9);
    doc.roundedRect(58, 6, 23, 12, 2, 'F');
    doc.setFillColor(...statusClr);
    doc.circle(62, 12, 1.5, 'F');
    doc.setTextColor(...statusClr);
    doc.setFontSize(5.5);
    doc.text(statusLabel, 64, 12);

    // ═══ SEAT + COMPANY ═══
    const y1 = 28;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(3, y1, pw - 6, 22, 2, 'FD');

    // Seat box
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(5, y1 + 3, 18, 16, 1.5, 'F');
    doc.setTextColor(...gray);
    doc.setFontSize(4);
    doc.setFont('helvetica', 'normal');
    doc.text('SIÈGE', 8, y1 + 6, { align: 'center' });
    doc.setTextColor(...dark);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(ticket.seatNumber || '—', 14, y1 + 15, { align: 'center' });

    // Company
    doc.setTextColor(...gray);
    doc.setFontSize(4);
    doc.setFont('helvetica', 'normal');
    doc.text('COMPAGNIE', 26, y1 + 5);
    doc.setTextColor(...dark);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    const company = colis.company || '—';
    doc.text(company.length > 20 ? company.slice(0, 20) + '…' : company, 26, y1 + 10);
    doc.setTextColor(...gray);
    doc.setFontSize(4.5);
    doc.setFont('helvetica', 'normal');
    doc.text(colis.reference, 26, y1 + 16);

    // ═══ DARK BAND ═══
    const bandY = y1 + 22;
    doc.setFillColor(...dark);
    doc.roundedRect(3, bandY, pw - 6, 10, [0, 0, 2, 2], 'F');

    const dateStr = colis.departureDate
      ? new Date(colis.departureDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
      : '—';
    const timeStr = ticket.departureTime || colis.departureTime || '—';

    doc.setTextColor(255, 255, 255, 0.5);
    doc.setFontSize(3.5);
    doc.text('DATE', 10, bandY + 3.5);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'bold');
    doc.text(dateStr, 10, bandY + 7.5);

    doc.setTextColor(255, 255, 255, 0.5);
    doc.setFontSize(3.5);
    doc.text('HEURE', 35, bandY + 3.5);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(5.5);
    doc.text(timeStr, 35, bandY + 7.5);

    doc.setTextColor(255, 255, 255, 0.5);
    doc.setFontSize(3.5);
    doc.text('RÉF', 55, bandY + 3.5);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(5.5);
    doc.text(colis.reference, 55, bandY + 7.5);

    // ═══ TRAJET ═══
    const y2 = bandY + 13;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(3, y2, pw - 6, 18, 2, 'FD');

    doc.setTextColor(...dark);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text((colis.departureCity || '—').toUpperCase(), 14, y2 + 8, { align: 'center' });

    // Arrow line
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.5);
    doc.line(27, y2 + 7, 37, y2 + 7);
    doc.setFillColor(...blue);
    doc.setDrawColor(...blue);
    doc.roundedRect(37, y2 + 4, 10, 6, 1, 'F');
    doc.setFillColor(255, 255, 255);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.text('>', 39.5, y2 + 8.5, { align: 'center' });
    doc.setDrawColor(...blue);
    doc.line(48, y2 + 7, 57, y2 + 7);

    doc.setTextColor(...dark);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text((ticket.destination || colis.arrivalCity || '—').toUpperCase(), 67, y2 + 8, { align: 'center' });

    // Info row
    doc.setDrawColor(241, 245, 249);
    doc.line(5, y2 + 12, pw - 5, y2 + 12);
    doc.setTextColor(...gray);
    doc.setFontSize(4);
    doc.setFont('helvetica', 'normal');
    doc.text(`${timeStr} | Siege ${ticket.seatNumber || '—'}`, 14, y2 + 15, { align: 'center' });

    // ═══ PASSENGER ═══
    const y3 = y2 + 22;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(3, y3, pw - 6, 25, 2, 'FD');

    doc.setTextColor(...gray);
    doc.setFontSize(4);
    doc.setFont('helvetica', 'bold');
    doc.text('PASSAGER', 5, y3 + 4);

    doc.setDrawColor(241, 245, 249);
    doc.line(5, y3 + 6, pw - 5, y3 + 6);

    doc.setTextColor(...dark);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(ticket.passengerName || '—', 5, y3 + 10);

    // 3 info boxes
    const bw = 23;
    const bg = 1.5;

    doc.setFillColor(241, 245, 249);
    doc.roundedRect(5, y3 + 13, bw, 9, 1, 'F');
    doc.setTextColor(...gray);
    doc.setFontSize(3.5);
    doc.setFont('helvetica', 'normal');
    doc.text('ÂGE', 6, y3 + 15);
    doc.setTextColor(...dark);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.text(`${ticket.passengerAge || '—'} ans`, 6, y3 + 19.5);

    doc.setFillColor(241, 245, 249);
    doc.roundedRect(5 + bw + bg, y3 + 13, bw, 9, 1, 'F');
    doc.setTextColor(...gray);
    doc.setFontSize(3.5);
    doc.setFont('helvetica', 'normal');
    doc.text('DOCUMENT', 6 + bw + bg, y3 + 15);
    doc.setTextColor(...dark);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.text(ticket.documentType || '—', 6 + bw + bg, y3 + 19.5);

    doc.setFillColor(241, 245, 249);
    doc.roundedRect(5 + (bw + bg) * 2, y3 + 13, bw, 9, 1, 'F');
    doc.setTextColor(...gray);
    doc.setFontSize(3.5);
    doc.setFont('helvetica', 'normal');
    doc.text('N° DOC', 6 + (bw + bg) * 2, y3 + 15);
    doc.setTextColor(...dark);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    const docNum = (ticket.documentNumber || '—').length > 12
      ? (ticket.documentNumber || '—').slice(0, 12) + '…'
      : (ticket.documentNumber || '—');
    doc.text(docNum, 6 + (bw + bg) * 2, y3 + 19.5);

    // ═══ BAGAGES ═══
    const y4 = y3 + 28;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(3, y4, pw - 6, 17, 2, 'FD');

    doc.setTextColor(...gray);
    doc.setFontSize(4);
    doc.setFont('helvetica', 'bold');
    doc.text('BAGAGES', 5, y4 + 3);

    doc.setFillColor(241, 245, 249);
    doc.roundedRect(5, y4 + 5, bw, 9, 1, 'F');
    doc.setTextColor(...gray);
    doc.setFontSize(3.5);
    doc.setFont('helvetica', 'normal');
    doc.text('QTÉ', 8, y4 + 7.5);
    doc.setTextColor(...dark);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(`${ticket.luggageCount || 0}`, 8, y4 + 12);

    doc.setFillColor(241, 245, 249);
    doc.roundedRect(5 + bw + bg, y4 + 5, bw, 9, 1, 'F');
    doc.setTextColor(...gray);
    doc.setFontSize(3.5);
    doc.setFont('helvetica', 'normal');
    doc.text('POIDS', 8 + bw + bg, y4 + 7.5);
    doc.setTextColor(...dark);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(`${ticket.luggageWeightKg || 0}kg`, 8 + bw + bg, y4 + 12);

    doc.setFillColor(241, 245, 249);
    doc.roundedRect(5 + (bw + bg) * 2, y4 + 5, bw, 9, 1, 'F');
    doc.setTextColor(...gray);
    doc.setFontSize(3.5);
    doc.setFont('helvetica', 'normal');
    doc.text('FRAIS', 8 + (bw + bg) * 2, y4 + 7.5);
    doc.setTextColor(...dark);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(`${ticket.luggageFee || 0}F`, 8 + (bw + bg) * 2, y4 + 12);

    // ═══ CODE CONTRÔLE ═══
    const y5 = y4 + 20;
    doc.setFillColor(209, 250, 229);
    doc.roundedRect(3, y5, pw - 6, 15, 2, 'F');

    doc.setTextColor(5, 150, 105);
    doc.setFontSize(4);
    doc.setFont('helvetica', 'bold');
    doc.text('CODE DE CONTRÔLE', 14, y5 + 4, { align: 'center' });

    const spacedCode = (ticket.controlCode || '').split('').join(' ');
    doc.setTextColor(6, 78, 59);
    doc.setFontSize(12);
    doc.text(spacedCode, 14, y5 + 11, { align: 'center', charSpace: 1 });

    // ═══ QR CODE ═══
    const y6 = y5 + 18;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(3, y6, pw - 6, 35, 2, 'FD');

    try {
      const QRCode = (await import('qrcode')).default;
      const qrUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://s21-senegal.com'}/retrieve/${reference}`;
      const qrDataUrl = await QRCode.toDataURL(qrUrl, {
        width: 200,
        margin: 1,
        errorCorrectionLevel: 'H',
        color: { dark: '#0f172a', light: '#ffffff' },
      });
      doc.addImage(qrDataUrl, 'PNG', 22, y6 + 2, 40, 40);
    } catch {
      // QR generation failed - skip
    }

    // ═══ FOOTER ═══
    const y7 = y6 + 38;
    doc.setTextColor(...gray);
    doc.setFontSize(4);
    doc.setFont('helvetica', 'normal');
    doc.text(`© ${new Date().getFullYear()} SmarticketS`, 14, y7, { align: 'center' });
    doc.setTextColor(203, 213, 225);
    doc.setFontSize(3.5);
    doc.text('Scannez le QR pour vérifier', 14, y7 + 3, { align: 'center' });

    return doc.output('blob');
  };

  // Download PDF
  const handleDownload = async () => {
    try {
      setDownloading(true);
      const blob = await generatePdfBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ticket-${reference}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setDownloading(false);
    }
  };

  // Share PDF via Web Share API (supports WhatsApp on mobile)
  const handleShare = async () => {
    // Try Web Share API with file first (mobile - can share PDF to WhatsApp)
    if (navigator.share && typeof navigator.canShare === 'function') {
      try {
        setSharing(true);
        const blob = await generatePdfBlob();
        const file = new File([blob], `ticket-${reference}.pdf`, { type: 'application/pdf' });

        const shareData: ShareData = { files: [file] };
        const shareText = `🎫 Ticket de transport\nRéf: ${reference}\n${colis.departureCity} → ${ticket.destination || colis.arrivalCity}\nPassager: ${ticket.passengerName}`;

        if (navigator.canShare(shareData)) {
          await navigator.share({ ...shareData, text: shareText });
          return;
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
        console.warn('File share failed, falling back to text share');
      } finally {
        setSharing(false);
      }
    }

    // Fallback: WhatsApp text share
    const shareText = `🎫 Ticket de transport\n` +
      `Réf: ${reference}\n` +
      `${colis.departureCity} → ${ticket.destination || colis.arrivalCity}\n` +
      `Départ: ${ticket.departureTime || colis.departureTime || ''} | Siège: ${ticket.seatNumber}\n` +
      `Passager: ${ticket.passengerName}\n` +
      `Code: ${ticket.controlCode}`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="flex gap-3 animate-fade-in-up" style={{ animationDelay: '640ms' }}>
      <button
        type="button"
        onClick={handleShare}
        disabled={sharing}
        className="flex-1 flex items-center justify-center gap-2 h-12 bg-[#25D366] hover:bg-[#1fb855] active:bg-[#1a9e49] text-white rounded-xl font-semibold text-sm transition-all shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-wait"
      >
        {sharing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <MessageCircle className="w-4 h-4" />
        )}
        {sharing ? 'Partage...' : 'Partager'}
      </button>
      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        className="flex-1 flex items-center justify-center gap-2 h-12 bg-[#2563eb] hover:bg-[#1d4ed8] active:bg-[#1e40af] text-white rounded-xl font-semibold text-sm transition-all shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-wait"
      >
        {downloading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        {downloading ? 'Génération...' : 'Télécharger'}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  FOOTER
// ═══════════════════════════════════════════════════════════

function PageFooter() {
  return (
    <footer className="mt-8 pt-6 border-t border-gray-200 text-center space-y-3">
      <div className="flex items-center justify-center gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#2563eb] transition-colors no-underline"
        >
          <Home className="w-4 h-4" />
          Retour à l&apos;accueil
        </Link>
        <Link
          href="/help"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#2563eb] transition-colors no-underline"
        >
          <MessageCircle className="w-4 h-4" />
          Besoin d&apos;aide ?
        </Link>
      </div>
      <p className="text-[11px] text-gray-300">
        © {new Date().getFullYear()} SmarticketS. Tous droits réservés.
      </p>
    </footer>
  );
}

// ═══════════════════════════════════════════════════════════
//  FULL TICKET VIEW
// ═══════════════════════════════════════════════════════════

function TicketView({
  colis,
  ticket,
  timeline,
}: {
  colis: ColisData;
  ticket: TicketData;
  timeline: TimelineEntry[];
}) {
  const statusConfig = getStatusConfig(ticket.ticketStatus);
  const [showDoc, setShowDoc] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyControlCode = async () => {
    try {
      await navigator.clipboard.writeText(ticket.controlCode);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = ticket.controlCode;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex flex-col">
      <Animations />
      <div className="max-w-[440px] mx-auto w-full px-4 py-6 space-y-4 safe-top">
        {/* 1. Header */}
        <TicketHeader reference={colis.reference} statusConfig={statusConfig} />

        {/* 2. Main Info */}
        <MainInfoCard ticket={ticket} colis={colis} />

        {/* 3. Trajet */}
        <TrajetCard colis={colis} ticket={ticket} />

        {/* 4. Passager */}
        <PassengerCard
          ticket={ticket}
          showDoc={showDoc}
          onToggleDoc={() => setShowDoc(!showDoc)}
        />

        {/* 5. Bagages */}
        <LuggageCard ticket={ticket} />

        {/* 6. Code de contrôle */}
        <ControlCodeCard
          ticket={ticket}
          copied={copied}
          onCopy={handleCopyControlCode}
        />

        {/* 7. QR Code */}
        <QRCodeSection reference={colis.reference} />

        {/* Action buttons */}
        <ActionButtons reference={colis.reference} colis={colis} ticket={ticket} />

        {/* 8. Historique */}
        <TimelineSection timeline={timeline} />

        {/* Footer */}
        <div className="safe-bottom">
          <PageFooter />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  PARCEL VIEW (category !== 'ticket')
// ═══════════════════════════════════════════════════════════

function ParcelView({
  colis,
  timeline,
}: {
  colis: ColisData;
  timeline: TimelineEntry[];
}) {
  const statusLabel =
    colis.status === 'delivered'
      ? 'LIVRÉ'
      : colis.status === 'in_transit'
        ? 'EN TRANSIT'
        : 'EN ATTENTE';

  const statusColor =
    colis.status === 'delivered'
      ? 'bg-emerald-100 text-emerald-700'
      : colis.status === 'in_transit'
        ? 'bg-blue-100 text-blue-700'
        : 'bg-amber-100 text-amber-700';

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex flex-col">
      <Animations />
      <div className="max-w-[440px] mx-auto w-full px-4 py-6 space-y-4 safe-top">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] rounded-3xl p-6 pb-8 text-white relative overflow-hidden animate-fade-in-up">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full" />
          <div className="flex items-start justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">COLIS</h1>
                <p className="text-[11px] text-white/60 font-mono mt-0.5">
                  {colis.reference}
                </p>
              </div>
            </div>
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${statusColor}`}
            >
              <span className="text-xs font-bold">{statusLabel}</span>
            </div>
          </div>
        </div>

        {/* Route */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-fade-in-up" style={{ animationDelay: '80ms' }}>
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <p className="text-xl font-black text-[#0f172a] uppercase">
                {colis.departureCity || '—'}
              </p>
            </div>
            <div className="flex items-center gap-2 mx-3">
              <div className="w-6 h-[2px] bg-gray-300 rounded" />
              <div className="w-8 h-8 rounded-full bg-[#2563eb]/10 flex items-center justify-center">
                <Package className="w-4 h-4 text-[#2563eb]" />
              </div>
              <div className="w-6 h-[2px] bg-[#2563eb] rounded" />
            </div>
            <div className="text-center flex-1">
              <p className="text-xl font-black text-[#0f172a] uppercase">
                {colis.arrivalCity || '—'}
              </p>
            </div>
          </div>
          {colis.company && (
            <p className="text-xs text-gray-400 text-center mt-3">
              {colis.company}
            </p>
          )}
        </div>

        {/* Details */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3 animate-fade-in-up" style={{ animationDelay: '160ms' }}>
          <div className="flex items-center gap-3 bg-[#f8fafc] rounded-xl p-3">
            <User className="w-4 h-4 text-gray-400" />
            <div className="flex-1">
              <p className="text-[10px] text-gray-400 uppercase font-semibold">Expéditeur</p>
              <p className="text-sm font-bold text-[#0f172a]">{colis.senderName || '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-[#f8fafc] rounded-xl p-3">
            <User className="w-4 h-4 text-gray-400" />
            <div className="flex-1">
              <p className="text-[10px] text-gray-400 uppercase font-semibold">Destinataire</p>
              <p className="text-sm font-bold text-[#0f172a]">{colis.receiverName || '—'}</p>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <TimelineSection timeline={timeline} />

        {/* Footer */}
        <div className="safe-bottom">
          <PageFooter />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  ERROR VIEW
// ═══════════════════════════════════════════════════════════

function ErrorView({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-[#f1f5f9] flex flex-col">
      <Animations />
      <div className="max-w-[440px] mx-auto w-full px-4 py-6 safe-top">
        <div className="text-center py-20 space-y-4 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-50 rounded-full">
            <Shield className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-lg font-bold text-[#0f172a]">{message}</h2>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 h-12 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl font-semibold text-sm transition-colors no-underline"
          >
            <Home className="w-4 h-4" />
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  MAIN CONTENT (inside Suspense)
// ═══════════════════════════════════════════════════════════

function RetrieveContent() {
  const params = useParams();
  const reference = ((params?.id as string) || '').trim();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [colis, setColis] = useState<ColisData | null>(null);
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);

  useEffect(() => {
    if (!reference) {
      setLoading(false);
      setError('Référence invalide.');
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/arrivee/${encodeURIComponent(reference)}`
        );
        const data: ApiResponse = await res.json();

        if (res.ok && data.success) {
          setColis(data.colis);
          setTicket(data.ticket || null);
          setTimeline(data.timeline || []);
        } else {
          setError(data.message || 'Colis introuvable.');
        }
      } catch {
        setError('Erreur de connexion. Vérifiez votre réseau.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [reference]);

  if (loading) return <LoadingSkeleton />;
  if (error && !colis) return <ErrorView message={error} />;
  if (!colis) return <ErrorView message="Données indisponibles." />;

  // Ticket view
  if (colis.category === 'ticket' && ticket) {
    return <TicketView colis={colis} ticket={ticket} timeline={timeline} />;
  }

  // Parcel view
  return <ParcelView colis={colis} timeline={timeline} />;
}

// ═══════════════════════════════════════════════════════════
//  PAGE EXPORT (with Suspense boundary for useSearchParams)
// ═══════════════════════════════════════════════════════════

export default function RetrievePage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <RetrieveContent />
    </Suspense>
  );
}
