'use client';

import { useState, useEffect } from 'react';
import {
  CheckCircle,
  CheckCircle2,
  Search,
  Eye,
  X,
  QrCode,
  Phone,
  MapPin,
  Clock,
} from 'lucide-react';
import { useAgency } from '../layout';

// ─── Types ───────────────────────────────────────────────────────────────────
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
  receiverName: string | null;
  receiverWhatsapp: string | null;
  deliveredAt: string | null;
  foundAt: string | null;
  founderName: string | null;
  founderPhone: string | null;
  lastLocation: string | null;
  createdAt: string;
}

type FilterKey = 'all' | 'delivered' | 'found';

// ─── Helpers ───────────────────────────────────────────────────────────────
const formatDate = (dateString: string | null): string => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return (
    date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }) +
    ' à ' +
    date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  );
};

const categoryBadge = (category: string) => {
  switch (category) {
    case 'parcel':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400">
          Colis
        </span>
      );
    case 'ticket':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-pink-100 dark:bg-pink-500/20 text-pink-700 dark:text-pink-400">
          Ticket
        </span>
      );
    case 'hajj':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400">
          Hajj
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-500/20 text-slate-700 dark:text-slate-400">
          {category || 'N/A'}
        </span>
      );
  }
};

const statusBadge = (status: string) => {
  if (status === 'delivered') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
        Livré
      </span>
    );
  }
  if (status === 'found') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400">
        Retrouvé
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-500/20 text-slate-700 dark:text-slate-400">
      {status}
    </span>
  );
};

// ─── Filter Buttons ─────────────────────────────────────────────────────────
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'delivered', label: 'Livrés' },
  { key: 'found', label: 'Trouvés' },
];

// ─── Component ──────────────────────────────────────────────────────────────
export default function TerminesPage() {
  const { agencyId } = useAgency();

  const [baggages, setBaggages] = useState<Baggage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [selectedBaggage, setSelectedBaggage] = useState<Baggage | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // ── Data fetching ────────────────────────────────────────────────────────
  useEffect(() => {
    fetchBaggages();
  }, [agencyId]);

  const fetchBaggages = async () => {
    try {
      const params = new URLSearchParams({ agencyId });
      const response = await fetch(`/api/agency/baggages?${params}`);
      const data = await response.json();
      setBaggages(
        (data.baggages || []).filter(
          (b: Baggage) => b.status === 'delivered' || b.status === 'found'
        )
      );
    } catch (error) {
      console.error('Error fetching baggages:', error);
    } finally {
      setLoading(false);
    }
  };

  // ── Derived data ─────────────────────────────────────────────────────────
  const totalTermines = baggages.length;
  const totalDelivered = baggages.filter((b) => b.status === 'delivered').length;
  const totalFound = baggages.filter((b) => b.status === 'found').length;

  const filteredBaggages = baggages
    .filter((b) => {
      if (activeFilter === 'all') return true;
      return b.status === activeFilter;
    })
    .filter(
      (b) =>
        b.reference.toLowerCase().includes(search.toLowerCase()) ||
        `${b.travelerFirstName || ''} ${b.travelerLastName || ''}`
          .toLowerCase()
          .includes(search.toLowerCase())
    );

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
          Terminés
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Colis et tickets livrés ou retrouvés
        </p>
      </div>

      {/* ── KPI Cards Row ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {/* Total terminés */}
        <div className="kpi-card kpi-card-green p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-3xl font-bold text-white">{totalTermines}</p>
              <p className="text-sm text-white/80">Total terminés</p>
            </div>
          </div>
        </div>

        {/* Livrés */}
        <div className="kpi-card kpi-card-green p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-3xl font-bold text-white">{totalDelivered}</p>
              <p className="text-sm text-white/80">Livrés</p>
            </div>
          </div>
        </div>

        {/* Trouvés */}
        <div className="kpi-card kpi-card-blue p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <Search className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-3xl font-bold text-white">{totalFound}</p>
              <p className="text-sm text-white/80">Trouvés</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Search Bar ───────────────────────────────────────────────────── */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par référence, nom..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-12 pr-4 text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>
      </div>

      {/* ── Filter Buttons ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-6">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeFilter === f.key
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {f.label}
            {f.key === 'all' && (
              <span className="ml-1.5 text-xs opacity-70">({totalTermines})</span>
            )}
            {f.key === 'delivered' && (
              <span className="ml-1.5 text-xs opacity-70">({totalDelivered})</span>
            )}
            {f.key === 'found' && (
              <span className="ml-1.5 text-xs opacity-70">({totalFound})</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <th className="text-left px-6 py-4 text-slate-500 dark:text-slate-400 font-medium text-sm">
                  Référence
                </th>
                <th className="text-left px-6 py-4 text-slate-500 dark:text-slate-400 font-medium text-sm">
                  Expéditeur
                </th>
                <th className="text-left px-6 py-4 text-slate-500 dark:text-slate-400 font-medium text-sm hidden md:table-cell">
                  Catégorie
                </th>
                <th className="text-left px-6 py-4 text-slate-500 dark:text-slate-400 font-medium text-sm">
                  Statut
                </th>
                <th className="text-left px-6 py-4 text-slate-500 dark:text-slate-400 font-medium text-sm hidden lg:table-cell">
                  Date
                </th>
                <th className="text-left px-6 py-4 text-slate-500 dark:text-slate-400 font-medium text-sm">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                      <span className="text-slate-500">Chargement...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredBaggages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle className="w-8 h-8 text-emerald-500" />
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 font-medium">
                        Aucun colis terminé
                      </p>
                      <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                        Les colis et tickets livrés ou retrouvés apparaîtront ici
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBaggages.map((baggage) => (
                  <tr
                    key={baggage.id}
                    className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    {/* Référence */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center">
                          <QrCode className="w-4 h-4 text-emerald-500" />
                        </div>
                        <span className="text-slate-800 dark:text-white font-mono font-medium">
                          {baggage.reference}
                        </span>
                      </div>
                    </td>

                    {/* Expéditeur */}
                    <td className="px-6 py-4">
                      {baggage.travelerFirstName || baggage.travelerLastName ? (
                        <span className="text-slate-800 dark:text-white font-medium">
                          {baggage.travelerFirstName} {baggage.travelerLastName}
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 text-sm italic">
                          Non assigné
                        </span>
                      )}
                      {baggage.whatsappOwner && (
                        <p className="text-slate-500 dark:text-slate-400 text-sm flex items-center gap-1 mt-1">
                          <Phone className="w-3 h-3" />
                          {baggage.whatsappOwner}
                        </p>
                      )}
                    </td>

                    {/* Catégorie */}
                    <td className="px-6 py-4 hidden md:table-cell">
                      {categoryBadge(baggage.category)}
                    </td>

                    {/* Statut */}
                    <td className="px-6 py-4">{statusBadge(baggage.status)}</td>

                    {/* Date */}
                    <td className="px-6 py-4 hidden lg:table-cell">
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <Clock className="w-4 h-4 text-slate-400" />
                        {formatDate(
                          baggage.status === 'delivered'
                            ? baggage.deliveredAt
                            : baggage.foundAt
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      <button
                        onClick={() => {
                          setSelectedBaggage(baggage);
                          setShowDetailModal(true);
                        }}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                        title="Voir détails"
                      >
                        <Eye className="w-4 h-4 text-slate-400 group-hover:text-emerald-500" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Detail Modal ─────────────────────────────────────────────────── */}
      {showDetailModal && selectedBaggage && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
          onClick={() => {
            setShowDetailModal(false);
            setSelectedBaggage(null);
          }}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full shadow-xl border border-slate-200 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                Détails
              </h2>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedBaggage(null);
                }}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-6 space-y-4">
              {/* Top row: icon + reference + status */}
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    selectedBaggage.status === 'delivered'
                      ? 'bg-emerald-100 dark:bg-emerald-500/10'
                      : 'bg-blue-100 dark:bg-blue-500/10'
                  }`}
                >
                  {selectedBaggage.status === 'delivered' ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  ) : (
                    <Search className="w-6 h-6 text-blue-500" />
                  )}
                </div>
                <div>
                  <p className="text-slate-800 dark:text-white font-mono font-bold">
                    {selectedBaggage.reference}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {statusBadge(selectedBaggage.status)}
                    {categoryBadge(selectedBaggage.category)}
                  </div>
                </div>
              </div>

              {/* Sender */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">
                    Expéditeur
                  </p>
                  <p className="text-slate-800 dark:text-white font-medium">
                    {selectedBaggage.travelerFirstName || ''}{' '}
                    {selectedBaggage.travelerLastName || ''}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">Type</p>
                  <p className="text-slate-800 dark:text-white">
                    {selectedBaggage.baggageType} #{selectedBaggage.baggageIndex}
                  </p>
                </div>
              </div>

              {/* WhatsApp */}
              {selectedBaggage.whatsappOwner && (
                <div>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">
                    WhatsApp expéditeur
                  </p>
                  <p className="text-slate-800 dark:text-white">
                    {selectedBaggage.whatsappOwner}
                  </p>
                </div>
              )}

              {/* Status-specific date */}
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  {selectedBaggage.status === 'delivered'
                    ? 'Date de livraison'
                    : 'Date de trouvaille'}
                </p>
                <p className="text-slate-800 dark:text-white">
                  {formatDate(
                    selectedBaggage.status === 'delivered'
                      ? selectedBaggage.deliveredAt
                      : selectedBaggage.foundAt
                  )}
                </p>
                {selectedBaggage.lastLocation && (
                  <p className="text-slate-500 dark:text-slate-400 text-sm flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" />
                    {selectedBaggage.lastLocation}
                  </p>
                )}
              </div>

              {/* Créé le */}
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  Créé le
                </p>
                <p className="text-slate-800 dark:text-white">
                  {formatDate(selectedBaggage.createdAt)}
                </p>
              </div>

              {/* Receiver info — delivered only */}
              {selectedBaggage.status === 'delivered' &&
                selectedBaggage.receiverName && (
                  <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
                    <p className="text-emerald-700 dark:text-emerald-400 font-medium text-sm mb-2 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Informations livraison
                    </p>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <p className="text-slate-500 dark:text-slate-400 text-sm">
                          Destinataire
                        </p>
                        <p className="text-slate-800 dark:text-white font-medium">
                          {selectedBaggage.receiverName}
                        </p>
                      </div>
                      {selectedBaggage.receiverWhatsapp && (
                        <div className="flex justify-between">
                          <p className="text-slate-500 dark:text-slate-400 text-sm">
                            WhatsApp
                          </p>
                          <a
                            href={`https://wa.me/${selectedBaggage.receiverWhatsapp.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
                          >
                            <svg
                              className="w-4 h-4"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                            </svg>
                            {selectedBaggage.receiverWhatsapp}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              {/* Founder info — found only */}
              {selectedBaggage.status === 'found' &&
                selectedBaggage.founderName && (
                  <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                    <p className="text-blue-700 dark:text-blue-400 font-medium text-sm mb-2 flex items-center gap-2">
                      <Search className="w-4 h-4" />
                      Trouvé par
                    </p>
                    <div className="space-y-1">
                      <p className="text-slate-800 dark:text-white font-medium">
                        {selectedBaggage.founderName}
                      </p>
                      {selectedBaggage.founderPhone && (
                        <a
                          href={`https://wa.me/${selectedBaggage.founderPhone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors mt-2"
                        >
                          <svg
                            className="w-4 h-4"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                          </svg>
                          Contacter sur WhatsApp
                        </a>
                      )}
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
