'use client';

import { useState, useEffect } from 'react';
import {
  Package,
  MapPin,
  CheckCircle,
  Search,
  Eye,
  X,
  Clock,
  Truck,
  User,
  Phone,
} from 'lucide-react';
import { useAgency } from '../layout';
import { isInTransit, isDelivered } from '@/lib/status';

interface Baggage {
  id: string;
  reference: string;
  type: string;
  category: string;
  travelerFirstName: string | null;
  travelerLastName: string | null;
  whatsappOwner: string | null;
  receiverName: string | null;
  receiverWhatsapp: string | null;
  baggageType: string;
  baggageIndex: number;
  status: string;
  transportMode: string;
  busCompany: string | null;
  airlineName: string | null;
  departureCity: string | null;
  destination: string | null;
  departureDate: string | null;
  departureTime: string | null;
  deliveryLocation: string | null;
  arrivedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  lastScanDate: string | null;
  lastLocation: string | null;
}

export default function ColisActifsPage() {
  const { agencyId } = useAgency();
  const [baggages, setBaggages] = useState<Baggage[]>([]);
  const [filteredBaggages, setFilteredBaggages] = useState<Baggage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_transit' | 'delivered'>('all');
  const [selectedBaggage, setSelectedBaggage] = useState<Baggage | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchBaggages();
  }, [agencyId]);

  useEffect(() => {
    filterBaggages();
  }, [baggages, search, statusFilter]);

  const fetchBaggages = async () => {
    try {
      const response = await fetch(
        `/api/agency/baggages?agencyId=${agencyId}&category=parcel`
      );
      const data = await response.json();
      // Client-side filter: keep only in_transit and delivered
      const parcels = (data.baggages || []).filter(
        (b: Baggage) => isInTransit(b.status) || isDelivered(b.status)
      );
      setBaggages(parcels);
    } catch (error) {
      console.error('Error fetching parcels:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterBaggages = () => {
    let filtered = [...baggages];

    if (statusFilter !== 'all') {
      if (statusFilter === 'in_transit') {
        filtered = filtered.filter((b) => isInTransit(b.status));
      } else if (statusFilter === 'delivered') {
        filtered = filtered.filter((b) => isDelivered(b.status));
      }
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.reference.toLowerCase().includes(q) ||
          (b.travelerFirstName || '').toLowerCase().includes(q) ||
          (b.travelerLastName || '').toLowerCase().includes(q) ||
          (b.receiverName || '').toLowerCase().includes(q) ||
          (b.departureCity || '').toLowerCase().includes(q) ||
          (b.destination || '').toLowerCase().includes(q) ||
          (b.busCompany || '').toLowerCase().includes(q) ||
          (b.airlineName || '').toLowerCase().includes(q)
      );
    }

    setFilteredBaggages(filtered);
  };

  // KPI calculations
  const totalActifs = baggages.length;
  const totalInTransit = baggages.filter((b) => isInTransit(b.status)).length;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deliveredToday = baggages.filter((b) => {
    if (!isDelivered(b.status) || !b.deliveredAt) return false;
    const deliveredDate = new Date(b.deliveredAt);
    return deliveredDate >= today;
  }).length;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '—';
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

  const getStatusBadge = (status: string) => {
    if (isInTransit(status)) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400">
          En transit
        </span>
      );
    }
    if (isDelivered(status)) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400">
          Livré
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-500/10 text-slate-600 dark:text-slate-400">
        {status}
      </span>
    );
  };

  const filterButtons: { id: 'all' | 'in_transit' | 'delivered'; label: string }[] = [
    { id: 'all', label: 'Tous' },
    { id: 'in_transit', label: 'En transit' },
    { id: 'delivered', label: 'Livrés' },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
          Colis Actifs
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Suivi des colis en transit et livrés
        </p>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {/* Total colis actifs */}
        <div className="kpi-card kpi-card-orange p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/80 font-medium">Total colis actifs</p>
              <p className="text-3xl font-bold text-white mt-1">{totalActifs}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* En transit */}
        <div className="kpi-card kpi-card-blue p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/80 font-medium">En transit</p>
              <p className="text-3xl font-bold text-white mt-1">{totalInTransit}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <MapPin className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Livrés aujourd'hui */}
        <div className="kpi-card kpi-card-green p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/80 font-medium">Livrés aujourd&apos;hui</p>
              <p className="text-3xl font-bold text-white mt-1">{deliveredToday}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par référence, expéditeur, destinataire, trajet..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-12 pr-4 text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
          />
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        {filterButtons.map((btn) => (
          <button
            key={btn.id}
            onClick={() => setStatusFilter(btn.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              statusFilter === btn.id
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="text-center py-12">
            <div className="flex items-center justify-center gap-3">
              <div className="w-6 h-6 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
              <span className="text-slate-500">Chargement des colis...</span>
            </div>
          </div>
        </div>
      ) : filteredBaggages.length === 0 ? (
        /* Empty State */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="text-center py-16">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <Package className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-600 dark:text-slate-400 font-medium text-lg">
                Aucun colis actif
              </p>
              <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">
                {search
                  ? 'Aucun résultat pour cette recherche'
                  : 'Tous les colis ont été livrés ou aucun colis n\'est en transit'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Table */
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
                  <th className="text-left px-6 py-4 text-slate-500 dark:text-slate-400 font-medium text-sm hidden lg:table-cell">
                    Destinataire
                  </th>
                  <th className="text-left px-6 py-4 text-slate-500 dark:text-slate-400 font-medium text-sm hidden md:table-cell">
                    Trajet
                  </th>
                  <th className="text-left px-6 py-4 text-slate-500 dark:text-slate-400 font-medium text-sm hidden xl:table-cell">
                    Compagnie
                  </th>
                  <th className="text-left px-6 py-4 text-slate-500 dark:text-slate-400 font-medium text-sm">
                    Statut
                  </th>
                  <th className="text-left px-6 py-4 text-slate-500 dark:text-slate-400 font-medium text-sm">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredBaggages.map((baggage) => (
                  <tr
                    key={baggage.id}
                    className={`border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                      isDelivered(baggage.status)
                        ? 'bg-green-50/30 dark:bg-green-500/5'
                        : ''
                    }`}
                  >
                    {/* Référence */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                            isDelivered(baggage.status)
                              ? 'bg-green-100 dark:bg-green-500/10'
                              : 'bg-orange-100 dark:bg-orange-500/10'
                          }`}
                        >
                          <Package
                            className={`w-4 h-4 ${
                              isDelivered(baggage.status)
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-orange-600 dark:text-orange-400'
                            }`}
                          />
                        </div>
                        <div>
                          <span className="text-slate-800 dark:text-white font-mono font-medium text-sm">
                            {baggage.reference}
                          </span>
                          <p className="text-slate-400 dark:text-slate-500 text-xs capitalize">
                            {baggage.baggageType}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Expéditeur */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-slate-800 dark:text-white font-medium text-sm">
                          {baggage.travelerFirstName || '—'}
                        </span>
                      </div>
                    </td>

                    {/* Destinataire */}
                    <td className="px-6 py-4 hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-slate-700 dark:text-slate-200 text-sm">
                          {baggage.receiverName || '—'}
                        </span>
                      </div>
                    </td>

                    {/* Trajet */}
                    <td className="px-6 py-4 hidden md:table-cell">
                      <div className="flex items-center gap-1.5 text-sm">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-slate-600 dark:text-slate-300">
                          {baggage.departureCity || '—'}
                        </span>
                        <span className="text-slate-400 mx-0.5">→</span>
                        <span className="text-slate-600 dark:text-slate-300 font-medium">
                          {baggage.destination || '—'}
                        </span>
                      </div>
                    </td>

                    {/* Compagnie */}
                    <td className="px-6 py-4 hidden xl:table-cell">
                      <div className="flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-slate-600 dark:text-slate-300 text-sm">
                          {baggage.busCompany || baggage.airlineName || '—'}
                        </span>
                      </div>
                    </td>

                    {/* Statut */}
                    <td className="px-6 py-4">
                      {getStatusBadge(baggage.status)}
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
                        <Eye className="w-4 h-4 text-slate-400 group-hover:text-orange-500 transition-colors" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
            <span className="text-slate-500 dark:text-slate-400 text-sm">
              {filteredBaggages.length} colis affiché(s) sur {baggages.length}
            </span>
            <span className="text-slate-400 dark:text-slate-500 text-xs">
              {totalInTransit} en transit · {baggages.filter((b) => isDelivered(b.status)).length} livrés
            </span>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedBaggage && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
          onClick={() => {
            setShowDetailModal(false);
            setSelectedBaggage(null);
          }}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl border border-slate-200 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                    isDelivered(selectedBaggage.status)
                      ? 'bg-green-100 dark:bg-green-500/10'
                      : 'bg-orange-100 dark:bg-orange-500/10'
                  }`}
                >
                  <Package
                    className={`w-5 h-5 ${
                      isDelivered(selectedBaggage.status)
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-orange-600 dark:text-orange-400'
                    }`}
                  />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                    Détails du colis
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-mono">
                    {selectedBaggage.reference}
                  </p>
                </div>
              </div>
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

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Status */}
              <div className="flex items-center gap-2">
                {getStatusBadge(selectedBaggage.status)}
              </div>

              {/* Expéditeur & Destinataire */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-500/10 flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-orange-500" />
                    </div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Expéditeur
                    </p>
                  </div>
                  <p className="text-slate-800 dark:text-white font-medium">
                    {selectedBaggage.travelerFirstName || '—'}{' '}
                    {selectedBaggage.travelerLastName || ''}
                  </p>
                  {selectedBaggage.whatsappOwner && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span className="text-slate-500 dark:text-slate-400 text-xs">
                        {selectedBaggage.whatsappOwner}
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg bg-green-100 dark:bg-green-500/10 flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-green-500" />
                    </div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Destinataire
                    </p>
                  </div>
                  <p className="text-slate-800 dark:text-white font-medium">
                    {selectedBaggage.receiverName || '—'}
                  </p>
                  {selectedBaggage.receiverWhatsapp && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span className="text-slate-500 dark:text-slate-400 text-xs">
                        {selectedBaggage.receiverWhatsapp}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Trajet & Compagnie */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Trajet
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-800 dark:text-white font-medium">
                      {selectedBaggage.departureCity || '—'}
                    </span>
                    <span className="text-slate-400">→</span>
                    <span className="text-slate-800 dark:text-white font-medium">
                      {selectedBaggage.destination || '—'}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Truck className="w-3.5 h-3.5 text-slate-400" />
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Compagnie
                    </p>
                  </div>
                  <p className="text-slate-800 dark:text-white font-medium">
                    {selectedBaggage.busCompany ||
                      selectedBaggage.airlineName ||
                      '—'}
                  </p>
                </div>
              </div>

              {/* Départ & Livraison */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Départ
                    </p>
                  </div>
                  <p className="text-slate-800 dark:text-white font-medium text-sm">
                    {selectedBaggage.departureDate
                      ? formatDate(selectedBaggage.departureDate)
                      : '—'}
                  </p>
                  {selectedBaggage.departureTime && (
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
                      à {selectedBaggage.departureTime}
                    </p>
                  )}
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Lieu de livraison
                    </p>
                  </div>
                  <p className="text-slate-800 dark:text-white font-medium text-sm">
                    {selectedBaggage.deliveryLocation || '—'}
                  </p>
                </div>
              </div>

              {/* Delivered info */}
              {isDelivered(selectedBaggage.status) && (
                <div className="p-4 bg-green-50 dark:bg-green-500/5 border border-green-200 dark:border-green-800 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <p className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wider">
                      Livré le
                    </p>
                  </div>
                  <p className="text-green-700 dark:text-green-300 font-medium">
                    {formatDateTime(
                      selectedBaggage.deliveredAt ||
                        selectedBaggage.arrivedAt
                    )}
                  </p>
                </div>
              )}

              {/* In transit — last scan */}
              {isInTransit(selectedBaggage.status) && (
                <div className="p-4 bg-orange-50 dark:bg-orange-500/5 border border-orange-200 dark:border-orange-800 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-orange-500" />
                    <p className="text-xs font-medium text-orange-600 dark:text-orange-400 uppercase tracking-wider">
                      Dernière activité
                    </p>
                  </div>
                  <p className="text-orange-700 dark:text-orange-300 font-medium">
                    {formatDateTime(selectedBaggage.lastScanDate)}
                  </p>
                  {selectedBaggage.lastLocation && (
                    <p className="text-orange-600 dark:text-orange-400 text-sm mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {selectedBaggage.lastLocation}
                    </p>
                  )}
                </div>
              )}

              {/* Type info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mb-1">
                    Type de colis
                  </p>
                  <p className="text-slate-800 dark:text-white text-sm font-medium capitalize">
                    {selectedBaggage.baggageType || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mb-1">
                    Mode de transport
                  </p>
                  <p className="text-slate-800 dark:text-white text-sm font-medium capitalize">
                    {selectedBaggage.transportMode || '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
