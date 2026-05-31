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
    <div className="min-h-screen bg-[#e8f0fe] flex flex-col">
      <Animations />
      <div className="max-w-[440px] mx-auto w-full px-4 py-6 safe-top">
        {/* Unified card skeleton */}
        <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
          {/* Header skeleton */}
          <div className="bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] p-6 pb-8 space-y-3">
            <div className="skeleton h-5 w-40 bg-white/20" />
            <div className="skeleton h-3 w-24 bg-white/15" />
          </div>
          {/* Seat + company skeleton */}
          <div className="p-5 flex items-center justify-center gap-4">
            <div className="skeleton h-20 w-24 rounded-2xl" />
            <div className="skeleton h-11 w-11 rounded-full" />
            <div className="skeleton h-20 w-24 rounded-2xl" />
          </div>
          {/* Black band skeleton */}
          <div className="bg-[#0f172a] p-4 grid grid-cols-3 gap-3">
            <div className="skeleton h-5 mx-auto w-16 bg-white/15" />
            <div className="skeleton h-5 mx-auto w-16 bg-white/15" />
            <div className="skeleton h-5 mx-auto w-16 bg-white/15" />
          </div>
          {/* Trajet skeleton */}
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="skeleton h-10 w-28" />
              <div className="skeleton h-10 w-10 rounded-full" />
              <div className="skeleton h-10 w-28" />
            </div>
          </div>
          {/* Passenger skeleton */}
          <div className="p-5 space-y-3 border-t border-gray-100">
            <div className="skeleton h-4 w-20" />
            <div className="skeleton h-6 w-48" />
            <div className="flex gap-3">
              <div className="skeleton h-12 flex-1 rounded-xl" />
              <div className="skeleton h-12 flex-1 rounded-xl" />
              <div className="skeleton h-12 flex-1 rounded-xl" />
            </div>
          </div>
          {/* Luggage skeleton */}
          <div className="p-5 border-t border-gray-100">
            <div className="flex gap-3">
              <div className="skeleton h-16 flex-1 rounded-xl" />
              <div className="skeleton h-16 flex-1 rounded-xl" />
              <div className="skeleton h-16 flex-1 rounded-xl" />
            </div>
          </div>
          {/* Bottom blue + QR skeleton */}
          <div className="bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] p-5 flex gap-4 items-center">
            <div className="flex-1 space-y-3">
              <div className="skeleton h-3 w-24 bg-white/15" />
              <div className="skeleton h-4 w-32 bg-white/20" />
              <div className="skeleton h-3 w-20 bg-white/15" />
              <div className="skeleton h-4 w-36 bg-white/20" />
            </div>
            <div className="skeleton w-[130px] h-[130px] rounded-2xl bg-white/10" />
          </div>
        </div>
        {/* Control code skeleton */}
        <div className="bg-[#d1fae5] rounded-2xl border-2 border-dashed border-[#10b981]/30 p-5 text-center space-y-2 mt-4">
          <div className="skeleton h-4 w-40 mx-auto" />
          <div className="skeleton h-10 w-56 mx-auto" />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  SECTION 1: TICKET HEADER
// ═══════════════════════════════════════════════════════════

function TicketHeader({
  statusConfig,
}: {
  reference: string;
  statusConfig: ReturnType<typeof getStatusConfig>;
}) {
  return (
    <div
      className="bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] rounded-t-3xl p-6 pb-8 text-white relative overflow-hidden animate-fade-in-up"
      style={{ animationDelay: '0ms' }}
    >
      {/* Decorative circles */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full" />
      <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/5 rounded-full" />

      <div className="flex items-start justify-between relative z-10">
        {/* Left: Logo + Title */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <span className="text-xl font-black">S</span>
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight leading-tight">
              SMARTICKETS
            </h1>
            <p className="text-[11px] text-white/50 font-medium leading-tight mt-0.5">
              Ticket de transport
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
      className="bg-white shadow-sm overflow-hidden animate-fade-in-up"
      style={{ animationDelay: '80ms' }}
    >
      {/* Top: Seat + Bus icon + Company */}
      <div className="p-5 flex items-center justify-center gap-4">
        {/* Seat number */}
        <div className="flex flex-col items-center bg-[#f1f5f9] rounded-2xl px-6 py-3.5 min-w-[90px]">
          <Armchair className="w-5 h-5 text-[#2563eb] mb-1" />
          <span className="text-3xl font-black text-[#0f172a] leading-none">
            {ticket.seatNumber || '—'}
          </span>
          <span className="text-[10px] text-[#475569] font-semibold uppercase tracking-widest mt-1">
            Siège
          </span>
        </div>

        {/* Bus icon separator */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-[2px] bg-[#cbd5e1] rounded" />
          <div className="w-11 h-11 rounded-full bg-[#2563eb]/10 flex items-center justify-center">
            <Bus className="w-5 h-5 text-[#2563eb]" />
          </div>
          <div className="w-7 h-[2px] bg-[#cbd5e1] rounded" />
        </div>

        {/* Company box */}
        <div className="flex flex-col items-center bg-[#f1f5f9] rounded-2xl px-6 py-3.5 min-w-[90px]">
          <span className="text-lg mb-1">🏢</span>
          <span className="text-base font-bold text-[#0f172a] truncate max-w-[120px]">
            {colis.company || '—'}
          </span>
          <span className="text-[10px] text-[#475569] font-semibold uppercase tracking-widest mt-1">
            Compagnie
          </span>
        </div>
      </div>

      {/* Dark band: Date | Time | Reference */}
      <div className="bg-[#0f172a] px-5 py-3.5">
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center">
            <p className="text-[10px] text-white/70 font-semibold uppercase tracking-wider">
              Date
            </p>
            <p className="text-sm font-bold text-white mt-0.5">
              {colis.departureDate
                ? new Date(colis.departureDate).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: '2-digit',
                  })
                : '—'}
            </p>
          </div>
          <div className="text-center border-x border-white/10">
            <p className="text-[10px] text-white/70 font-semibold uppercase tracking-wider">
              Départ
            </p>
            <p className="text-sm font-bold text-white mt-0.5">
              {ticket.departureTime || colis.departureTime || '—'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-white/70 font-semibold uppercase tracking-wider">
              Code réservation
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
      className="bg-white shadow-sm p-5 animate-fade-in-up"
      style={{ animationDelay: '160ms' }}
    >
      <div className="flex items-center justify-between">
        {/* Departure - Blue city code style */}
        <div className="text-center flex-1">
          <p className="text-3xl font-black text-[#2563eb] uppercase tracking-tight">
            {colis.departureCity || colis.departureCity || '—'}
          </p>
        </div>

        {/* Bus icon + line */}
        <div className="flex items-center gap-2 mx-3 flex-shrink-0">
          <div className="w-8 h-[2px] bg-[#93c5fd] rounded" />
          <div className="w-11 h-11 rounded-full bg-[#2563eb]/10 flex items-center justify-center">
            <Bus className="w-5 h-5 text-[#2563eb]" />
          </div>
          <div className="w-8 h-[2px] bg-[#93c5fd] rounded" />
        </div>

        {/* Arrival - Blue city code style */}
        <div className="text-center flex-1">
          <p className="text-3xl font-black text-[#2563eb] uppercase tracking-tight">
            {ticket.destination || colis.arrivalCity || '—'}
          </p>
        </div>
      </div>

      {/* Info row */}
      <div className="flex items-center justify-center gap-5 mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-[#475569]" />
          <span className="text-xs text-[#475569] font-medium">
            {ticket.departureTime || colis.departureTime || '—'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Armchair className="w-3.5 h-3.5 text-[#475569]" />
          <span className="text-xs text-[#475569] font-medium">
            Siège {ticket.seatNumber || '—'}
          </span>
        </div>
        {(colis.company) && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[#475569] font-medium">
              🏢 {colis.company}
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
      className="bg-white shadow-sm p-5 animate-fade-in-up"
      style={{ animationDelay: '240ms' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <User className="w-4 h-4 text-[#2563eb]" />
        <h3 className="text-xs font-bold text-[#475569] uppercase tracking-wider">
          Passager
        </h3>
      </div>

      <p className="text-xl font-extrabold text-[#0f172a]">{ticket.passengerName}</p>

      <div className="grid grid-cols-3 gap-3 mt-3">
        <div className="bg-[#f8fafc] rounded-xl border border-dashed border-[#2563eb]/20 p-3 text-center">
          <p className="text-[10px] text-[#475569] font-semibold uppercase">
            Âge
          </p>
          <p className="text-sm font-bold text-[#0f172a] mt-0.5">
            {ticket.passengerAge} ans
          </p>
        </div>
        <div className="bg-[#f8fafc] rounded-xl border border-dashed border-[#2563eb]/20 p-3 text-center">
          <p className="text-[10px] text-[#475569] font-semibold uppercase">
            Document
          </p>
          <p className="text-sm font-bold text-[#0f172a] mt-0.5">
            {ticket.documentType}
          </p>
        </div>
        <div className="bg-[#f8fafc] rounded-xl border border-dashed border-[#2563eb]/20 p-3 text-center">
          <p className="text-[10px] text-[#475569] font-semibold uppercase">
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
              <EyeOff className="w-3.5 h-3.5 text-[#475569] flex-shrink-0" />
            ) : (
              <Eye className="w-3.5 h-3.5 text-[#475569] flex-shrink-0" />
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
      className="bg-white shadow-sm p-5 border-t border-gray-100 animate-fade-in-up"
      style={{ animationDelay: '320ms' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Package className="w-4 h-4 text-[#475569]" />
        <h3 className="text-xs font-bold text-[#475569] uppercase tracking-wider">
          Bagages
        </h3>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#f8fafc] rounded-xl border border-dashed border-[#2563eb]/20 p-4 text-center">
          <p className="text-2xl font-black text-[#0f172a]">
            {ticket.luggageCount}
          </p>
          <p className="text-[10px] text-[#475569] font-semibold uppercase mt-1">
            Quantité
          </p>
        </div>
        <div className="bg-[#f8fafc] rounded-xl border border-dashed border-[#2563eb]/20 p-4 text-center">
          <p className="text-2xl font-black text-[#0f172a]">
            {ticket.luggageWeightKg}
            <span className="text-sm font-semibold text-[#475569] ml-0.5">kg</span>
          </p>
          <p className="text-[10px] text-[#475569] font-semibold uppercase mt-1">
            Poids
          </p>
        </div>
        <div className="bg-[#f8fafc] rounded-xl border border-dashed border-[#2563eb]/20 p-4 text-center">
          <p className="text-2xl font-black text-[#0f172a]">
            {ticket.luggageFee}
            <span className="text-sm font-semibold text-[#475569] ml-0.5">F</span>
          </p>
          <p className="text-[10px] text-[#475569] font-semibold uppercase mt-1">
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
//  SECTION 7: BOTTOM BLUE SECTION WITH QR CODE
// ═══════════════════════════════════════════════════════════

function BottomBlueSection({
  reference,
  colis,
  ticket,
}: {
  reference: string;
  colis: ColisData;
  ticket: TicketData;
}) {
  const qrUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/retrieve/${reference}`
      : '';

  return (
    <div
      className="bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] p-5 flex gap-4 items-center animate-fade-in-up rounded-b-3xl"
      style={{ animationDelay: '480ms' }}
    >
      {/* Left: Info */}
      <div className="flex-1 text-white space-y-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider font-semibold text-white/50">
            Passager
          </p>
          <p className="text-sm font-bold mt-0.5">
            {ticket.passengerName || '—'}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider font-semibold text-white/50">
            Compagnie
          </p>
          <p className="text-sm font-bold mt-0.5">
            {colis.company || '—'}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider font-semibold text-white/50">
            Siège / Compagnie
          </p>
          <p className="text-sm font-bold mt-0.5">
            {ticket.seatNumber || '—'} / {colis.company || '—'}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider font-semibold text-white/50">
            Code réservation
          </p>
          <p className="text-sm font-bold font-mono mt-0.5">
            {reference}
          </p>
        </div>
      </div>

      {/* Right: QR Code */}
      <div className="w-[130px] h-[130px] bg-white rounded-2xl p-2 flex-shrink-0 animate-pulse-qr">
        <QRCodeSVG
          value={qrUrl}
          size={114}
          level="H"
          includeMargin={false}
          bgColor="#ffffff"
          fgColor="#0f172a"
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  SECTION 8: TIMELINE (Historique)
// ═══════════════════════════════════════════════════════════

function TimelineSection({
  timeline,
  dark = false,
}: {
  timeline: TimelineEntry[];
  dark?: boolean;
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
      className={dark ? 'bg-[#215ae2] rounded-2xl border-2 border-dashed border-white/50 shadow-sm p-5 animate-fade-in-up' : 'bg-white rounded-2xl border-2 border-dashed border-[#2563eb]/30 shadow-sm p-5 animate-fade-in-up'}
      style={{ animationDelay: '560ms' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Clock className={`w-4 h-4 ${dark ? 'text-white' : 'text-black'}`} />
        <h3 className={`text-xs font-bold ${dark ? 'text-white' : 'text-black'} uppercase tracking-wider`}>
          Historique
        </h3>
        <span className={`ml-auto text-xs ${dark ? 'text-white/70' : 'text-black'}`}>
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
                {!isLast && <div className={`w-0.5 flex-1 ${dark ? 'bg-white/30' : 'bg-gray-100'} my-0.5`} />}
              </div>

              {/* Content */}
              <div className={`pb-4 ${isLast ? 'pb-0' : ''}`}>
                <p className={`text-sm font-semibold ${dark ? 'text-white' : 'text-[#0f172a]'}`}>
                  {entry.title}
                </p>
                <p className={`text-xs ${dark ? 'text-white/70' : 'text-black'} mt-0.5`}>
                  {formatDateTime(entry.timestamp)}
                </p>
                {entry.location && (
                  <p className={`text-xs ${dark ? 'text-white/70' : 'text-black'} mt-0.5 flex items-center gap-1`}>
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
          className={`flex items-center justify-center gap-1 w-full pt-3 mt-1 border-t ${dark ? 'border-white/30 text-white/70 hover:text-white' : 'border-gray-100 text-black hover:text-gray-600'} text-xs font-medium transition-colors`}
        >
          <span>
            {expanded ? 'Voir moins' : `Voir les ${timeline.length - VISIBLE_COUNT} suivants`}
          </span>
          <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`} />
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
  // Download: open printable HTML ticket in new tab
  const handleDownload = () => {
    window.open(`/api/ticket-pdf/${encodeURIComponent(reference)}`, '_blank');
  };

  // Thermal print: open 80mm thermal receipt in new tab
  const handleThermalPrint = () => {
    window.open(`/api/ticket-thermal/${encodeURIComponent(reference)}`, '_blank');
  };

  // Share: WhatsApp message with full formatted template
  const handleShare = () => {
    const shareText =
      `🚌 *SMARTICKETS — BILLET CONFIRMÉ*\n\n` +
      `👤 ${ticket.passengerName}\n` +
      `🚌 Destination : ${ticket.destination || colis.arrivalCity}\n` +
      `💺 Siège : ${ticket.seatNumber}\n` +
      `🧳 Bagages : ${ticket.luggageCount} valise(s) (${ticket.luggageWeightKg}kg)\n\n` +
      `🔢 *CODE DE CONTRÔLE : ${ticket.controlCode}*\n\n` +
      `⚠️ CONDITIONS :\n` +
      `* Arrivez 1h avant le départ\n` +
      `* Pièce d'identité obligatoire\n` +
      `* Billet non remboursable\n` +
      `* Report possible 1x ≥24h avant\n\n` +
      `Merci de votre confiance ! Bon voyage 🚌`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <>
      <div className="flex gap-3 animate-fade-in-up" style={{ animationDelay: '640ms' }}>
        <button
          type="button"
          onClick={handleShare}
          className="flex-1 flex items-center justify-center gap-2 h-12 bg-[#25D366] hover:bg-[#1fb855] active:bg-[#1a9e49] text-white rounded-xl font-semibold text-sm transition-all shadow-sm hover:shadow-md"
        >
          <MessageCircle className="w-4 h-4" />
          Partager
        </button>
        <button
          type="button"
          onClick={handleDownload}
          className="flex-1 flex items-center justify-center gap-2 h-12 bg-[#2563eb] hover:bg-[#1d4ed8] active:bg-[#1e40af] text-white rounded-xl font-semibold text-sm transition-all shadow-sm hover:shadow-md"
        >
          <Download className="w-4 h-4" />
          Télécharger
        </button>
      </div>
      <div className="mt-3 animate-fade-in-up" style={{ animationDelay: '680ms' }}>
        <button
          type="button"
          onClick={handleThermalPrint}
          className="w-full flex items-center justify-center gap-2 h-11 bg-[#0f172a] hover:bg-[#1e293b] active:bg-[#0f172a] text-white rounded-xl font-semibold text-sm transition-all shadow-sm hover:shadow-md"
        >
          🧾 Imprimer thermique (80mm)
        </button>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════
//  FOOTER
// ═══════════════════════════════════════════════════════════

function PageFooter({ dark = false }: { dark?: boolean }) {
  return (
    <footer className={`mt-8 pt-6 border-t ${dark ? 'border-white/20' : 'border-gray-200'} text-center space-y-3`}>
      <div className="flex items-center justify-center gap-4">
        <Link
          href="/"
          className={`inline-flex items-center gap-1.5 text-sm ${dark ? 'text-white/70 hover:text-white' : 'text-black hover:text-[#2563eb]'} transition-colors no-underline`}
        >
          <Home className="w-4 h-4" />
          Retour à l&apos;accueil
        </Link>
        <Link
          href="/help"
          className={`inline-flex items-center gap-1.5 text-sm ${dark ? 'text-white/70 hover:text-white' : 'text-black hover:text-[#2563eb]'} transition-colors no-underline`}
        >
          <MessageCircle className="w-4 h-4" />
          Besoin d&apos;aide ?
        </Link>
      </div>
      <p className={`text-[11px] ${dark ? 'text-white/50' : 'text-black'}`}>
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
    <div className="min-h-screen bg-[#e8f0fe] flex flex-col">
      <Animations />
      <div className="max-w-[440px] mx-auto w-full px-4 py-6 safe-top">
        {/* Unified ticket card wrapper */}
        <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
          {/* 1. Header (blue, rounded top) */}
          <TicketHeader reference={colis.reference} statusConfig={statusConfig} />

          {/* 2. Main Info (seat + company + black band) */}
          <MainInfoCard ticket={ticket} colis={colis} />

          {/* 3. Trajet (city route in blue) */}
          <TrajetCard colis={colis} ticket={ticket} />

          {/* 4. Passager */}
          <PassengerCard
            ticket={ticket}
            showDoc={showDoc}
            onToggleDoc={() => setShowDoc(!showDoc)}
          />

          {/* 5. Bagages */}
          <LuggageCard ticket={ticket} />

          {/* 6. Bottom Blue Section with QR Code (rounded bottom) */}
          <BottomBlueSection reference={colis.reference} colis={colis} ticket={ticket} />
        </div>
        {/* End unified ticket card */}

        {/* Code de contrôle (outside ticket card) */}
        <div className="mt-4">
          <ControlCodeCard
            ticket={ticket}
            copied={copied}
            onCopy={handleCopyControlCode}
          />
        </div>

        {/* Action buttons */}
        <div className="mt-4">
          <ActionButtons reference={colis.reference} colis={colis} ticket={ticket} />
        </div>

        {/* Historique */}
        <div className="mt-4">
          <TimelineSection timeline={timeline} />
        </div>

        {/* Footer */}
        <div className="safe-bottom mt-8">
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
    <div className="min-h-screen bg-[#0d1b3e] flex flex-col">
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
        <div className="bg-[#215ae2] rounded-2xl border-2 border-dashed border-white/50 shadow-sm p-5 animate-fade-in-up" style={{ animationDelay: '80ms' }}>
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <p className="text-xl font-black text-white uppercase">
                {colis.departureCity || '—'}
              </p>
            </div>
            <div className="flex items-center gap-2 mx-3">
              <div className="w-6 h-[2px] bg-white/50 rounded" />
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                <Package className="w-4 h-4 text-white" />
              </div>
              <div className="w-6 h-[2px] bg-white/50 rounded" />
            </div>
            <div className="text-center flex-1">
              <p className="text-xl font-black text-white uppercase">
                {colis.arrivalCity || '—'}
              </p>
            </div>
          </div>
          {colis.company && (
            <p className="text-xs text-white/80 text-center mt-3">
              {colis.company}
            </p>
          )}
        </div>

        {/* Details */}
        <div className="bg-[#215ae2] rounded-2xl border-2 border-dashed border-white/50 shadow-sm p-5 space-y-3 animate-fade-in-up" style={{ animationDelay: '160ms' }}>
          <div className="flex items-center gap-3 bg-white/10 rounded-xl p-3">
            <User className="w-4 h-4 text-white" />
            <div className="flex-1">
              <p className="text-[10px] text-white/70 uppercase font-semibold">Expéditeur</p>
              <p className="text-sm font-bold text-white">{colis.senderName || '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white/10 rounded-xl p-3">
            <User className="w-4 h-4 text-white" />
            <div className="flex-1">
              <p className="text-[10px] text-white/70 uppercase font-semibold">Destinataire</p>
              <p className="text-sm font-bold text-white">{colis.receiverName || '—'}</p>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <TimelineSection timeline={timeline} dark />

        {/* Footer */}
        <div className="safe-bottom">
          <PageFooter dark />
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
  const searchParams = useSearchParams();
  const reference = ((params?.id as string) || '').trim();
  const forceType = searchParams.get('type');
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
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
          `/api/arrivee/${encodeURIComponent(reference)}?t=${Date.now()}`
        );
        const data: ApiResponse = await res.json();

        if (res.ok && data.success) {
          setColis(data.colis);
          setTicket(data.ticket || null);
          setTimeline(data.timeline || []);

          // Race condition fix: si on attend un ticket (type=ticket) mais
          // category n'est pas encore 'ticket' ou ticket=null, refetch après 1s
          if (forceType === 'ticket' && (!data.ticket || data.colis?.category !== 'ticket') && retryCount < 3) {
            setTimeout(() => {
              setRetryCount(prev => prev + 1);
              fetchData();
            }, 1000);
            return;
          }
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

  // Ticket view: via category OU via paramètre URL type=ticket
  if ((colis.category === 'ticket' || forceType === 'ticket') && ticket) {
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
