'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ScanSearch,
  Search,
  Eye,
  Clock,
  MapPin,
  QrCode,
  X,
  Package,
  Ticket,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Luggage,
  History,
  Trash2,
  Send,
  User,
  Phone,
  Bus,
  Plane,
  Ship,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useAgency } from '../layout';
import { normalizeStatus, isActive, isPending, isLost, isInTransit, isDelivered } from '@/lib/status';

// ═══════════════════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════════════════

interface Baggage {
  id: string;
  reference: string;
  type: string;
  category: string;
  travelerFirstName: string | null;
  travelerLastName: string | null;
  whatsappOwner: string | null;
  baggageType: string;
  baggageIndex: number;
  status: string;
  transportMode: string;
  busCompany: string | null;
  departureCity: string | null;
  destination: string | null;
  departureDate: string | null;
  departureTime: string | null;
  receiverName: string | null;
  receiverWhatsapp: string | null;
  deliveryLocation: string | null;
  deliveredAt: string | null;
  foundAt: string | null;
  createdAt: string;
  lastScanDate: string | null;
  lastLocation: string | null;
}

// ═══════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════

const RECENT_SEARCHES_KEY = 'smartickets_agency_recent_searches';
const MAX_RECENT = 10;

// ═══════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════

function formatDate(dateString: string | null): string {
  if (!dateString) return 'Jamais';
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDateTime(dateString: string | null): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return (
    date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }) +
    ' \u00e0 ' +
    date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  );
}

function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  if (typeof window === 'undefined') return;
  try {
    const existing = getRecentSearches().filter((s) => s !== query);
    existing.unshift(query);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(existing.slice(0, MAX_RECENT)));
  } catch {
    // silent
  }
}

function clearRecentSearches() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(RECENT_SEARCHES_KEY);
}

// ═══════════════════════════════════════════════════════
//  STATUS BADGE
// ═══════════════════════════════════════════════════════

const STATUS_CONFIG: Record<string, { label: string; className: string; dotColor: string }> = {
  pending_activation: { label: 'En attente', className: 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400', dotColor: 'bg-amber-500' },
  active: { label: 'Actif', className: 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400', dotColor: 'bg-emerald-500' },
  scanned: { label: 'Scanné', className: 'bg-sky-100 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400', dotColor: 'bg-sky-500' },
  in_transit: { label: 'En transit', className: 'bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400', dotColor: 'bg-orange-500' },
  delivered: { label: 'Livré', className: 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400', dotColor: 'bg-green-500' },
  lost: { label: 'Perdu', className: 'bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400', dotColor: 'bg-rose-500' },
  found: { label: 'Retrouvé', className: 'bg-teal-100 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400', dotColor: 'bg-teal-500' },
  blocked: { label: 'Bloqué', className: 'bg-slate-100 dark:bg-slate-500/10 text-slate-600 dark:text-slate-400', dotColor: 'bg-slate-500' },
  expired: { label: 'Expiré', className: 'bg-slate-100 dark:bg-slate-500/10 text-slate-600 dark:text-slate-400', dotColor: 'bg-slate-400' },
};

function getStatusBadge(status: string) {
  const normalized = normalizeStatus(status);
  const config = STATUS_CONFIG[normalized] || { label: status, className: 'bg-slate-100 dark:bg-slate-500/10 text-slate-600 dark:text-slate-400', dotColor: 'bg-slate-400' };
  return { ...config, normalized };
}

function StatusBadge({ status }: { status: string }) {
  const { label, className, dotColor } = getStatusBadge(status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      {label}
    </span>
  );
}

// ═══════════════════════════════════════════════════════
//  CATEGORY BADGE
// ═══════════════════════════════════════════════════════

function getCategoryBadge(category: string | null | undefined) {
  if (!category || category === 'hajj') {
    return {
      label: 'Hajj',
      className: 'bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400',
      icon: <Luggage className="w-3.5 h-3.5" />,
    };
  }
  if (category === 'ticket') {
    return {
      label: 'Ticket',
      className: 'bg-sky-100 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400',
      icon: <Ticket className="w-3.5 h-3.5" />,
    };
  }
  return {
    label: 'Colis',
    className: 'bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400',
    icon: <Package className="w-3.5 h-3.5" />,
  };
}

function CategoryBadge({ category }: { category: string | null | undefined }) {
  const { label, className, icon } = getCategoryBadge(category);
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${className}`}>
      {icon}
      {label}
    </span>
  );
}

// ═══════════════════════════════════════════════════════
//  TRANSPORT ICON
// ═══════════════════════════════════════════════════════

function TransportIcon({ mode }: { mode: string }) {
  const m = (mode || '').toLowerCase();
  if (m === 'bus' || m === 'car') return <Bus className="w-4 h-4" />;
  if (m === 'plane' || m === 'flight') return <Plane className="w-4 h-4" />;
  if (m === 'ship' || m === 'boat') return <Ship className="w-4 h-4" />;
  return <Bus className="w-4 h-4" />;
}

// ═══════════════════════════════════════════════════════
//  BAGGAGE RESULT CARD
// ═══════════════════════════════════════════════════════

function BaggageCard({ baggage, onSelect }: { baggage: Baggage; onSelect: () => void }) {
  const { dotColor } = getStatusBadge(baggage.status);

  return (
    <div
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50 transition-all duration-300 cursor-pointer group"
      onClick={onSelect}
    >
      {/* Top row — Reference + Status */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isInTransit(baggage.status)
                ? 'bg-orange-100 dark:bg-orange-500/10'
                : isDelivered(baggage.status)
                  ? 'bg-green-100 dark:bg-green-500/10'
                  : isLost(baggage.status)
                    ? 'bg-rose-100 dark:bg-rose-500/10'
                    : 'bg-emerald-100 dark:bg-emerald-500/10'
            }`}
          >
            <QrCode
              className={`w-5 h-5 ${
                isInTransit(baggage.status)
                  ? 'text-orange-500'
                  : isDelivered(baggage.status)
                    ? 'text-green-500'
                    : isLost(baggage.status)
                      ? 'text-rose-500'
                      : 'text-emerald-500'
              }`}
            />
          </div>
          <div>
            <p className="text-lg font-mono font-bold text-slate-800 dark:text-white group-hover:text-amber-500 transition-colors">
              {baggage.reference}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-2 h-2 rounded-full ${dotColor} animate-pulse`} />
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {formatDate(baggage.createdAt)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <CategoryBadge category={baggage.category} />
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        <StatusBadge status={baggage.status} />
      </div>

      {/* Sender info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
            <User className="w-4 h-4 text-slate-500" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Expéditeur</p>
            <p className="text-sm text-slate-800 dark:text-white font-medium truncate">
              {baggage.travelerFirstName || baggage.travelerLastName
                ? `${baggage.travelerFirstName || ''} ${baggage.travelerLastName || ''}`.trim()
                : 'Non assigné'}
            </p>
            {baggage.whatsappOwner && (
              <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
                <Phone className="w-3 h-3" />
                {baggage.whatsappOwner}
              </p>
            )}
          </div>
        </div>

        {/* Receiver info (colis) */}
        {baggage.category === 'parcel' && (
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <ArrowRight className="w-4 h-4 text-orange-500" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Destinataire</p>
              <p className="text-sm text-slate-800 dark:text-white font-medium truncate">
                {baggage.receiverName || '—'}
              </p>
              {baggage.receiverWhatsapp && (
                <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
                  <Phone className="w-3 h-3" />
                  {baggage.receiverWhatsapp}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Route info */}
      {(baggage.departureCity || baggage.destination) && (
        <div className="flex items-center gap-2.5 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl mb-4">
          <TransportIcon mode={baggage.transportMode} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 dark:text-white truncate">
              {baggage.departureCity || '?'} → {baggage.destination || '?'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {baggage.busCompany && `${baggage.busCompany}`}
              {baggage.departureDate && ` · ${formatDate(baggage.departureDate)}`}
              {baggage.departureTime && ` à ${baggage.departureTime}`}
            </p>
          </div>
        </div>
      )}

      {/* Last scan + Action */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <Clock className="w-3.5 h-3.5" />
          <span>Dernier scan: {baggage.lastScanDate ? formatDateTime(baggage.lastScanDate) : 'Jamais'}</span>
          {baggage.lastLocation && (
            <span className="flex items-center gap-1 ml-1">
              <MapPin className="w-3 h-3" />
              {baggage.lastLocation}
            </span>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-medium hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors group/btn"
        >
          <Eye className="w-3.5 h-3.5" />
          Voir détails
          <ChevronRight className="w-3 h-3 opacity-0 -ml-1 group-hover/btn:opacity-100 transition-opacity" />
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  DETAIL MODAL
// ═══════════════════════════════════════════════════════

function DetailModal({
  baggage,
  onClose,
}: {
  baggage: Baggage;
  onClose: () => void;
}) {
  const { label: statusLabel, className: statusClassName, dotColor } = getStatusBadge(baggage.status);
  const cat = getCategoryBadge(baggage.category);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl border border-slate-200 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Détails du colis</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Reference + Status Row */}
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                isInTransit(baggage.status)
                  ? 'bg-orange-100 dark:bg-orange-500/10'
                  : isDelivered(baggage.status)
                    ? 'bg-green-100 dark:bg-green-500/10'
                    : isLost(baggage.status)
                      ? 'bg-rose-100 dark:bg-rose-500/10'
                      : 'bg-emerald-100 dark:bg-emerald-500/10'
              }`}
            >
              <QrCode
                className={`w-6 h-6 ${
                  isInTransit(baggage.status)
                    ? 'text-orange-500'
                    : isDelivered(baggage.status)
                      ? 'text-green-500'
                      : isLost(baggage.status)
                        ? 'text-rose-500'
                        : 'text-emerald-500'
                }`}
              />
            </div>
            <div className="flex-1">
              <p className="text-slate-800 dark:text-white font-mono font-bold text-lg">{baggage.reference}</p>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge status={baggage.status} />
                <CategoryBadge category={baggage.category} />
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-100 dark:border-slate-800" />

          {/* Sender */}
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Expéditeur</p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center">
                <User className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-slate-800 dark:text-white font-medium text-sm">
                  {baggage.travelerFirstName || baggage.travelerLastName
                    ? `${baggage.travelerFirstName || ''} ${baggage.travelerLastName || ''}`.trim()
                    : 'Non assigné'}
                </p>
                {baggage.whatsappOwner && (
                  <a
                    href={`https://wa.me/${baggage.whatsappOwner.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 mt-0.5"
                  >
                    <Send className="w-3 h-3" />
                    {baggage.whatsappOwner}
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Receiver (colis) */}
          {baggage.category === 'parcel' && (
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Destinataire</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-orange-100 dark:bg-orange-500/10 flex items-center justify-center">
                  <User className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-slate-800 dark:text-white font-medium text-sm">
                    {baggage.receiverName || '—'}
                  </p>
                  {baggage.receiverWhatsapp && (
                    <a
                      href={`https://wa.me/${baggage.receiverWhatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 mt-0.5"
                    >
                      <Send className="w-3 h-3" />
                      {baggage.receiverWhatsapp}
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Route */}
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Trajet</p>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center">
                  <TransportIcon mode={baggage.transportMode} />
                </div>
                <div>
                  <p className="text-slate-800 dark:text-white font-medium text-sm">
                    {baggage.departureCity || '?'} → {baggage.destination || '?'}
                  </p>
                  {baggage.busCompany && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">{baggage.busCompany}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Départ</p>
                  <p className="text-slate-800 dark:text-white">
                    {baggage.departureDate ? formatDate(baggage.departureDate) : '—'}
                    {baggage.departureTime ? ` à ${baggage.departureTime}` : ''}
                  </p>
                </div>
                {baggage.deliveryLocation && (
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Lieu de livraison</p>
                    <p className="text-slate-800 dark:text-white flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {baggage.deliveryLocation}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Dates / Scan info */}
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Dates</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Créé le</p>
                <p className="text-sm text-slate-800 dark:text-white">{formatDate(baggage.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Dernier scan</p>
                <p className="text-sm text-slate-800 dark:text-white">{formatDateTime(baggage.lastScanDate)}</p>
                {baggage.lastLocation && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" />
                    {baggage.lastLocation}
                  </p>
                )}
              </div>
              {baggage.deliveredAt && (
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Livré le</p>
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium">{formatDateTime(baggage.deliveredAt)}</p>
                </div>
              )}
              {baggage.foundAt && (
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Retrouvé le</p>
                  <p className="text-sm text-teal-600 dark:text-teal-400 font-medium">{formatDateTime(baggage.foundAt)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Baggage metadata */}
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Informations</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Type de bagage</p>
                <p className="text-sm text-slate-800 dark:text-white capitalize">
                  {baggage.baggageType || '—'} #{baggage.baggageIndex || 0}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Mode de transport</p>
                <p className="text-sm text-slate-800 dark:text-white capitalize">
                  {baggage.transportMode || '—'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  QUICK LINK CARD
// ═══════════════════════════════════════════════════════

function QuickLinkCard({ href, icon, label, description, color }: { href: string; icon: React.ReactNode; label: string; description: string; color: string }) {
  return (
    <Link
      href={href}
      className={`block bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50 transition-all duration-300 group no-underline`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 dark:text-white group-hover:text-amber-500 transition-colors">
            {label}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{description}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-amber-500 transition-colors shrink-0" />
      </div>
    </Link>
  );
}

// ═══════════════════════════════════════════════════════
//  MAIN PAGE
// ═══════════════════════════════════════════════════════

export default function AgencySuiviPage() {
  const { agencyId } = useAgency();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  // Search state
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Baggage[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedBaggage, setSelectedBaggage] = useState<Baggage | null>(null);

  const performSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim() || !agencyId) return;

      setLoading(true);
      setHasSearched(true);

      try {
        const params = new URLSearchParams({
          agencyId,
          search: searchQuery.trim(),
        });
        const res = await fetch(`/api/agency/baggages?${params}`);
        const data = await res.json();
        setResults(data.baggages || []);

        // Save to recent searches
        saveRecentSearch(searchQuery.trim());
        setRecentSearches(getRecentSearches());
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [agencyId]
  );

  // Load recent searches on mount
  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  // Auto-search from URL param
  useEffect(() => {
    const refParam = searchParams.get('ref');
    if (refParam && refParam.trim()) {
      const trimmed = refParam.trim();
      setQuery(trimmed);
      performSearch(trimmed);
    }
  }, [searchParams, performSearch]);

  const handleSearch = () => {
    performSearch(query);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleRecentClick = (term: string) => {
    setQuery(term);
    performSearch(term);
  };

  const handleClearRecent = () => {
    clearRecentSearches();
    setRecentSearches([]);
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* ─── Header ─── */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Suivi</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Rechercher et suivre un colis ou ticket</p>
      </div>

      {/* ─── Search Interface ─── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 lg:p-8 mb-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-stretch gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <ScanSearch className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Entrez une référence QR (ex: HAJJ26-MLQGY7)"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-5 pl-14 pr-4 text-xl text-slate-800 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all outline-none"
            />
          </div>
          {/* Search Button */}
          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="flex items-center justify-center gap-2 px-8 py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-base font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white dark:border-slate-900/30 dark:border-t-slate-900 rounded-full animate-spin" />
            ) : (
              <Search className="w-5 h-5" />
            )}
            <span>Rechercher</span>
          </button>
        </div>
      </div>

      {/* ─── Loading State ─── */}
      {loading && (
        <div className="text-center py-16">
          <div className="flex items-center justify-center gap-3">
            <div className="w-7 h-7 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
            <span className="text-slate-500 dark:text-slate-400">Recherche en cours...</span>
          </div>
        </div>
      )}

      {/* ─── Results ─── */}
      {!loading && hasSearched && results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-200">{results.length}</span> résultat{results.length > 1 ? 's' : ''} pour &ldquo;
              <span className="font-mono font-semibold text-amber-500">{query}</span>&rdquo;
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.map((baggage) => (
              <BaggageCard
                key={baggage.id}
                baggage={baggage}
                onSelect={() => setSelectedBaggage(baggage)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ─── No Results ─── */}
      {!loading && hasSearched && results.length === 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full mb-5">
            <Search className="w-10 h-10 text-slate-300 dark:text-slate-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Aucun résultat</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-1">
            Aucun colis ou ticket ne correspond à votre recherche.
          </p>
          <p className="text-sm text-slate-400 dark:text-slate-500">
            Référence recherchée :{' '}
            <span className="font-mono font-semibold text-rose-500 bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 rounded-md">
              {query}
            </span>
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={() => {
                setQuery('');
                setHasSearched(false);
                setResults([]);
                inputRef.current?.focus();
              }}
              className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Nouvelle recherche
            </button>
            <button
              onClick={() => {
                setQuery('');
                setHasSearched(false);
                setResults([]);
              }}
              className="px-5 py-2.5 text-slate-500 dark:text-slate-400 text-sm font-medium hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              Retour
            </button>
          </div>
        </div>
      )}

      {/* ─── Pre-search Dashboard ─── */}
      {!loading && !hasSearched && (
        <div className="space-y-6">
          {/* Quick Stats Banner */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/5 dark:to-orange-500/5 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center shrink-0">
                <Sparkles className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-800 dark:text-white">
                  Recherche universelle
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Vous pouvez rechercher n&apos;importe quel colis par sa référence QR.
                  Saisissez une référence ci-dessus pour retrouver instantanément un colis, son statut, son trajet et toutes les informations associées.
                </p>
              </div>
            </div>
          </div>

          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-slate-500" />
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
                    Recherches récentes
                  </h3>
                  <span className="text-xs text-slate-400 dark:text-slate-500">({recentSearches.length})</span>
                </div>
                <button
                  onClick={handleClearRecent}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                  title="Effacer l'historique"
                >
                  <Trash2 className="w-4 h-4 text-slate-400 group-hover:text-rose-500" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((term) => (
                  <button
                    key={term}
                    onClick={() => handleRecentClick(term)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    <Search className="w-3.5 h-3.5 text-slate-400" />
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-3">Accès rapide</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <QuickLinkCard
                href="/agence/qr-non-actifs"
                icon={<QrCode className="w-5 h-5 text-amber-500" />}
                label="QR Non Activés"
                description="Codes QR en attente d'activation"
                color="bg-amber-100 dark:bg-amber-500/10"
              />
              <QuickLinkCard
                href="/agence/colis-actifs"
                icon={<Package className="w-5 h-5 text-orange-500" />}
                label="Colis Actifs"
                description="Colis en cours de transport"
                color="bg-orange-100 dark:bg-orange-500/10"
              />
              <QuickLinkCard
                href="/agence/tickets-encours"
                icon={<Ticket className="w-5 h-5 text-sky-500" />}
                label="Tickets"
                description="Tickets de transport en cours"
                color="bg-sky-100 dark:bg-sky-500/10"
              />
              <QuickLinkCard
                href="/agence/perdus"
                icon={<AlertTriangle className="w-5 h-5 text-rose-500" />}
                label="Perdus"
                description="Colis signalés comme perdus"
                color="bg-rose-100 dark:bg-rose-500/10"
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── Detail Modal ─── */}
      {selectedBaggage && (
        <DetailModal
          baggage={selectedBaggage}
          onClose={() => setSelectedBaggage(null)}
        />
      )}
    </div>
  );
}
