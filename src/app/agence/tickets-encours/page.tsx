'use client';

import { useState, useEffect } from 'react';
import {
  Ticket,
  Search,
  Eye,
  Bus,
  CheckCircle,
  MapPin,
  X,
  Clock,
  QrCode,
  Calendar,
  Phone,
  User,
} from 'lucide-react';
import { useAgency } from '../layout';
import { isInTransit, isActive, isScanned } from '@/lib/status';

interface TicketBaggage {
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
  createdAt: string;
  lastScanDate: string | null;
  lastLocation: string | null;
}

export default function TicketsEnCoursPage() {
  const { agencyId } = useAgency();
  const [tickets, setTickets] = useState<TicketBaggage[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<TicketBaggage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState<TicketBaggage | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, [agencyId]);

  useEffect(() => {
    filterTickets();
  }, [tickets, search, statusFilter]);

  const fetchTickets = async () => {
    try {
      const params = new URLSearchParams({
        agencyId: agencyId,
        category: 'ticket',
      });

      const response = await fetch(`/api/agency/baggages?${params}`);
      const data = await response.json();

      // Client-side filter: keep only active tickets (in_transit OR active)
      const allBaggages: TicketBaggage[] = data.baggages || [];
      const activeTickets = allBaggages.filter(
        (b) => isInTransit(b.status) || isActive(b.status)
      );
      setTickets(activeTickets);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTickets = () => {
    let filtered = [...tickets];

    if (statusFilter === 'in_transit') {
      filtered = filtered.filter((t) => isInTransit(t.status));
    } else if (statusFilter === 'active') {
      filtered = filtered.filter((t) => isActive(t.status));
    }

    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.reference.toLowerCase().includes(searchLower) ||
          `${t.travelerFirstName || ''} ${t.travelerLastName || ''}`
            .toLowerCase()
            .includes(searchLower) ||
          (t.departureCity || '').toLowerCase().includes(searchLower) ||
          (t.destination || '').toLowerCase().includes(searchLower)
      );
    }

    setFilteredTickets(filtered);
  };

  // KPI counts
  const totalTickets = tickets.length;
  const enCoursTickets = tickets.filter((t) => isInTransit(t.status)).length;
  const validesTickets = tickets.filter((t) => isActive(t.status)).length;

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
    if (isActive(status)) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
          Actif
        </span>
      );
    }
    if (isScanned(status)) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400">
          Scanné
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-500/10 text-slate-600 dark:text-slate-400">
        {status}
      </span>
    );
  };

  const filterButtons = [
    { id: 'all', label: 'Tous' },
    { id: 'in_transit', label: 'En transit' },
    { id: 'active', label: 'Actifs' },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
          Tickets en Cours
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Billets de transport actifs
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {/* Total Tickets — Pink gradient */}
        <div className="bg-gradient-to-br from-fuchsia-500 to-pink-600 rounded-2xl p-5 shadow-lg">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-3">
            <Ticket className="w-5 h-5 text-white" />
          </div>
          <p className="text-2xl font-bold text-white">{totalTickets}</p>
          <p className="text-sm text-white/80">Total tickets</p>
        </div>

        {/* En cours — Orange gradient */}
        <div className="bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl p-5 shadow-lg">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-3">
            <Bus className="w-5 h-5 text-white" />
          </div>
          <p className="text-2xl font-bold text-white">{enCoursTickets}</p>
          <p className="text-sm text-white/80">En cours</p>
        </div>

        {/* Validés — Green gradient */}
        <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-5 shadow-lg">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-3">
            <CheckCircle className="w-5 h-5 text-white" />
          </div>
          <p className="text-2xl font-bold text-white">{validesTickets}</p>
          <p className="text-sm text-white/80">Validés</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par référence, passager ou trajet..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-12 pr-4 text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all"
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
                ? 'bg-pink-500 text-white shadow-lg'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="text-center py-12">
            <div className="flex items-center justify-center gap-3">
              <div className="w-6 h-6 border-2 border-pink-500/30 border-t-pink-500 rounded-full animate-spin" />
              <span className="text-slate-500">Chargement des tickets...</span>
            </div>
          </div>
        </div>
      ) : filteredTickets.length === 0 ? (
        /* Empty State */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="text-center py-12">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <Ticket className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-500 dark:text-slate-400 font-medium">
                Aucun ticket en cours
              </p>
              <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">
                Les tickets actifs apparaîtront ici
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Tickets Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-pink-50/50 dark:bg-pink-500/5">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-pink-500" />
                <h2 className="text-sm font-semibold text-slate-800 dark:text-white">
                  Tickets actifs ({filteredTickets.length})
                </h2>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <th className="text-left px-6 py-4 text-slate-500 dark:text-slate-400 font-medium text-sm">
                      Référence
                    </th>
                    <th className="text-left px-6 py-4 text-slate-500 dark:text-slate-400 font-medium text-sm">
                      Passager
                    </th>
                    <th className="text-left px-6 py-4 text-slate-500 dark:text-slate-400 font-medium text-sm hidden md:table-cell">
                      Trajet
                    </th>
                    <th className="text-left px-6 py-4 text-slate-500 dark:text-slate-400 font-medium text-sm hidden lg:table-cell">
                      Départ
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
                  {filteredTickets.map((ticket) => (
                    <tr
                      key={ticket.id}
                      className={`border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                        isInTransit(ticket.status)
                          ? 'bg-orange-50/50 dark:bg-orange-500/5'
                          : ''
                      }`}
                    >
                      {/* Référence */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              isInTransit(ticket.status)
                                ? 'bg-orange-100 dark:bg-orange-500/10'
                                : 'bg-pink-100 dark:bg-pink-500/10'
                            }`}
                          >
                            <Ticket
                              className={`w-4 h-4 ${
                                isInTransit(ticket.status)
                                  ? 'text-orange-500'
                                  : 'text-pink-500'
                              }`}
                            />
                          </div>
                          <span className="text-slate-800 dark:text-white font-mono font-medium">
                            {ticket.reference}
                          </span>
                        </div>
                      </td>

                      {/* Passager */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                            <User className="w-4 h-4 text-slate-400" />
                          </div>
                          <div>
                            <span className="text-slate-800 dark:text-white font-medium text-sm">
                              {ticket.travelerFirstName || '—'}
                            </span>
                            {(ticket.travelerFirstName || ticket.travelerLastName) && (
                              <p className="text-slate-400 dark:text-slate-500 text-xs">
                                {ticket.travelerLastName || ''}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Trajet */}
                      <td className="px-6 py-4 hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="text-slate-600 dark:text-slate-300 text-sm">
                            {ticket.departureCity || '—'} →{' '}
                            {ticket.destination || '—'}
                          </span>
                        </div>
                      </td>

                      {/* Départ */}
                      <td className="px-6 py-4 hidden lg:table-cell">
                        <div className="space-y-0.5">
                          <span className="text-slate-600 dark:text-slate-300 text-sm block">
                            {ticket.departureDate
                              ? formatDate(ticket.departureDate)
                              : '—'}
                          </span>
                          {ticket.departureTime && (
                            <span className="text-slate-400 dark:text-slate-500 text-xs flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {ticket.departureTime}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Statut */}
                      <td className="px-6 py-4">{getStatusBadge(ticket.status)}</td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <button
                          onClick={() => {
                            setSelectedTicket(ticket);
                            setShowDetailModal(true);
                          }}
                          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                          title="Voir détails"
                        >
                          <Eye className="w-4 h-4 text-slate-400 group-hover:text-pink-500" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <span className="text-slate-500 dark:text-slate-400 text-sm">
                {filteredTickets.length} ticket(s) affiché(s) sur {totalTickets}
              </span>
            </div>
          </div>
        </>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedTicket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-xl border border-slate-200 dark:border-slate-800">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                Détails du ticket
              </h2>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedTicket(null);
                }}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Reference & Type */}
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    isInTransit(selectedTicket.status)
                      ? 'bg-orange-100 dark:bg-orange-500/10'
                      : 'bg-pink-100 dark:bg-pink-500/10'
                  }`}
                >
                  <Ticket
                    className={`w-6 h-6 ${
                      isInTransit(selectedTicket.status)
                        ? 'text-orange-500'
                        : 'text-pink-500'
                    }`}
                  />
                </div>
                <div>
                  <p className="text-slate-800 dark:text-white font-mono font-bold">
                    {selectedTicket.reference}
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">
                    Ticket de transport
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2">
                {getStatusBadge(selectedTicket.status)}
              </div>

              {/* Passenger Info */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-white uppercase tracking-wide">
                  Informations passager
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mb-1">
                      Passager
                    </p>
                    <p className="text-slate-800 dark:text-white font-medium text-sm">
                      {selectedTicket.travelerFirstName}{' '}
                      {selectedTicket.travelerLastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mb-1">
                      WhatsApp
                    </p>
                    <p className="text-slate-800 dark:text-white font-medium text-sm">
                      {selectedTicket.whatsappOwner || '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Trip Info */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-white uppercase tracking-wide">
                  Trajet
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mb-1">
                      Départ
                    </p>
                    <p className="text-slate-800 dark:text-white font-medium text-sm flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-pink-500" />
                      {selectedTicket.departureCity || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mb-1">
                      Destination
                    </p>
                    <p className="text-slate-800 dark:text-white font-medium text-sm flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-pink-500" />
                      {selectedTicket.destination || '—'}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mb-1">
                      Compagnie
                    </p>
                    <p className="text-slate-800 dark:text-white font-medium text-sm">
                      {selectedTicket.busCompany || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mb-1">
                      Mode de transport
                    </p>
                    <p className="text-slate-800 dark:text-white font-medium text-sm capitalize">
                      {selectedTicket.transportMode || '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Schedule Info */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-white uppercase tracking-wide">
                  Horaire
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mb-1">
                      Date de départ
                    </p>
                    <p className="text-slate-800 dark:text-white font-medium text-sm flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-pink-500" />
                      {selectedTicket.departureDate
                        ? formatDate(selectedTicket.departureDate)
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mb-1">
                      Heure de départ
                    </p>
                    <p className="text-slate-800 dark:text-white font-medium text-sm flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-pink-500" />
                      {selectedTicket.departureTime || '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Last Scan */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-white uppercase tracking-wide">
                  Dernière activité
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mb-1">
                      Dernier scan
                    </p>
                    <p className="text-slate-800 dark:text-white text-sm">
                      {formatDateTime(selectedTicket.lastScanDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mb-1">
                      Dernière localisation
                    </p>
                    <p className="text-slate-800 dark:text-white text-sm flex items-center gap-1">
                      {selectedTicket.lastLocation ? (
                        <>
                          <MapPin className="w-3.5 h-3.5 text-pink-500" />
                          {selectedTicket.lastLocation}
                        </>
                      ) : (
                        '—'
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Created At */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mb-1">
                      Créé le
                    </p>
                    <p className="text-slate-600 dark:text-slate-400 text-sm">
                      {formatDateTime(selectedTicket.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
