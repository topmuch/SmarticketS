'use client';

import { useState, useEffect } from 'react';
import {
  Search,
  Eye,
  X,
  Download,
  RefreshCw,
  QrCode,
  CheckCircle,
  Package,
  MapPin,
  Copy,
} from "lucide-react";

interface Baggage {
  id: string;
  reference: string;
  type: string;
  travelerFirstName: string | null;
  travelerLastName: string | null;
  whatsappOwner: string | null;
  baggageType: string;
  status: string;
  createdAt: string;
  deliveredAt: string | null;
  foundAt: string | null;
  receiverName: string | null;
  receiverWhatsapp: string | null;
  transportMode: string | null;
  founderName: string | null;
  founderPhone: string | null;
  agency: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export default function AdminTrouvaillesPage() {
  const [baggages, setBaggages] = useState<Baggage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedBaggage, setSelectedBaggage] = useState<Baggage | null>(null);

  useEffect(() => {
    fetchBaggages();
  }, [statusFilter]);

  const fetchBaggages = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter === 'delivered') params.set('status', 'delivered');
      else if (statusFilter === 'found') params.set('status', 'found');
      else params.set('status', 'delivered,found');
      if (search) params.set('search', search);

      const response = await fetch(`/api/admin/baggages?${params}`);
      const data = await response.json();
      setBaggages(data.baggages || []);
    } catch (error) {
      console.error('Error fetching baggages:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    const headers = ['Référence', 'Expéditeur', 'Destinataire', 'Agence', 'Date livraison', 'Statut'];
    const rows = baggages.map(b => [
      b.reference,
      `${b.travelerFirstName || ''} ${b.travelerLastName || ''}`.trim() || 'Non renseigné',
      b.receiverName || '-',
      b.agency?.name || '-',
      formatDateTime(b.status === 'delivered' ? b.deliveredAt : b.foundAt),
      b.status === 'delivered' ? 'Livré' : 'Retrouvé',
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `trouvailles-admin-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const formatDateTime = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    if (status === 'delivered') {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
          ✅ Livré
        </span>
      );
    }
    return (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
        🟢 Retrouvé
      </span>
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copié dans le presse-papiers !');
  };

  // Calculate stats
  const stats = {
    total: baggages.length,
    delivered: baggages.filter(b => b.status === 'delivered').length,
    found: baggages.filter(b => b.status === 'found').length,
  };

  const statusButtons = [
    { id: 'all', label: 'Tous' },
    { id: 'delivered', label: 'Livré' },
    { id: 'found', label: 'Retrouvé' },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Colis Livrés & Retrouvés</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Suivi des colis livrés et retrouvés</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setLoading(true); fetchBaggages(); }}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Total</p>
              <p className="text-3xl font-bold text-slate-800 dark:text-white">{stats.total === 0 ? '—' : stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-[#ff7f00]/10 dark:bg-[#ff7f00]/20 rounded-xl flex items-center justify-center">
              <QrCode className="w-6 h-6 text-[#ff7f00]" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Livrés</p>
              <p className="text-3xl font-bold text-slate-800 dark:text-white">{stats.delivered === 0 ? '—' : stats.delivered}</p>
            </div>
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Retrouvés</p>
              <p className="text-3xl font-bold text-slate-800 dark:text-white">{stats.found === 0 ? '—' : stats.found}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Rechercher par référence, expéditeur, destinataire..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchBaggages()}
              className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl py-2.5 px-4 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#ff7f00]"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          </div>
          <div className="flex gap-2">
            {statusButtons.map((btn) => (
              <button
                key={btn.id}
                onClick={() => setStatusFilter(btn.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  statusFilter === btn.id
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-2 border-[#ff7f00]/30 border-t-[#ff7f00] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">Chargement...</p>
        </div>
      ) : baggages.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm py-12 text-center">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-500 dark:text-slate-400">Aucun colis livré ou retrouvé</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                  <th className="text-left px-6 py-4 text-slate-500 dark:text-slate-400 font-medium text-sm">Référence</th>
                  <th className="text-left px-6 py-4 text-slate-500 dark:text-slate-400 font-medium text-sm">Expéditeur</th>
                  <th className="text-left px-6 py-4 text-slate-500 dark:text-slate-400 font-medium text-sm hidden md:table-cell">Destinataire</th>
                  <th className="text-left px-6 py-4 text-slate-500 dark:text-slate-400 font-medium text-sm hidden lg:table-cell">Agence</th>
                  <th className="text-left px-6 py-4 text-slate-500 dark:text-slate-400 font-medium text-sm hidden md:table-cell">Date livraison</th>
                  <th className="text-left px-6 py-4 text-slate-500 dark:text-slate-400 font-medium text-sm">Statut</th>
                  <th className="text-left px-6 py-4 text-slate-500 dark:text-slate-400 font-medium text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {baggages.map((baggage) => (
                  <tr
                    key={baggage.id}
                    className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center">
                          <QrCode className="w-4 h-4 text-emerald-500" />
                        </div>
                        <span className="text-slate-800 dark:text-white font-mono font-medium text-sm">
                          {baggage.reference}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-800 dark:text-white text-sm">
                        {baggage.travelerFirstName || baggage.travelerLastName
                          ? `${baggage.travelerFirstName || ''} ${baggage.travelerLastName || ''}`.trim()
                          : 'Non renseigné'}
                      </span>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <span className="text-slate-600 dark:text-slate-300 text-sm">
                        {baggage.receiverName || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      <span className="text-slate-600 dark:text-slate-300 text-sm">
                        {baggage.agency?.name || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <span className="text-slate-600 dark:text-slate-300 text-sm">
                        {formatDateTime(baggage.status === 'delivered' ? baggage.deliveredAt : baggage.foundAt)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(baggage.status)}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => {
                          setSelectedBaggage(baggage);
                          setShowDetailModal(true);
                        }}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group"
                        title="Voir détails"
                      >
                        <Eye className="w-4 h-4 text-slate-400 group-hover:text-[#ff7f00]" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30">
            <span className="text-slate-500 dark:text-slate-400 text-sm">
              {baggages.length} colis affiché(s)
            </span>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedBaggage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  selectedBaggage.status === 'delivered'
                    ? 'bg-emerald-100 dark:bg-emerald-500/10'
                    : 'bg-blue-100 dark:bg-blue-500/10'
                }`}>
                  {selectedBaggage.status === 'delivered'
                    ? <CheckCircle className="w-5 h-5 text-emerald-500" />
                    : <Package className="w-5 h-5 text-blue-500" />
                  }
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white">Détails du colis</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">{selectedBaggage.reference}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedBaggage(null);
                }}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Status */}
              <div className="flex items-center gap-2">
                {getStatusBadge(selectedBaggage.status)}
                <span className="text-slate-500 dark:text-slate-400 text-sm">
                  {selectedBaggage.status === 'delivered' ? `Livré le ${formatDate(selectedBaggage.deliveredAt)}` : `Retrouvé le ${formatDate(selectedBaggage.foundAt)}`}
                </span>
              </div>

              {/* Sender Info */}
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
                <h3 className="text-slate-800 dark:text-white font-medium text-sm mb-2">Expéditeur</h3>
                <p className="text-slate-600 dark:text-slate-300 text-sm">
                  {selectedBaggage.travelerFirstName || selectedBaggage.travelerLastName
                    ? `${selectedBaggage.travelerFirstName || ''} ${selectedBaggage.travelerLastName || ''}`.trim()
                    : 'Non renseigné'}
                </p>
                {selectedBaggage.whatsappOwner && (
                  <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">WhatsApp: {selectedBaggage.whatsappOwner}</p>
                )}
              </div>

              {/* Receiver Info (for delivered) */}
              {selectedBaggage.status === 'delivered' && (
                <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
                  <h3 className="text-emerald-700 dark:text-emerald-400 font-medium text-sm mb-2 flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Destinataire
                  </h3>
                  <p className="text-slate-800 dark:text-white font-medium">{selectedBaggage.receiverName || 'Non renseigné'}</p>
                  {selectedBaggage.receiverWhatsapp && (
                    <a
                      href={`https://wa.me/${selectedBaggage.receiverWhatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors mt-2"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      Contacter sur WhatsApp
                    </a>
                  )}
                </div>
              )}

              {/* Finder Info */}
              {selectedBaggage.founderName && (
                <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                  <h3 className="text-blue-700 dark:text-blue-400 font-medium text-sm mb-2">Trouvé par</h3>
                  <p className="text-slate-800 dark:text-white font-medium">{selectedBaggage.founderName}</p>
                  {selectedBaggage.founderPhone && (
                    <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">{selectedBaggage.founderPhone}</p>
                  )}
                </div>
              )}

              {/* Agency */}
              {selectedBaggage.agency && (
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
                  <h3 className="text-slate-800 dark:text-white font-medium text-sm mb-1">Agence</h3>
                  <p className="text-slate-600 dark:text-slate-300">{selectedBaggage.agency.name}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    const text = `Colis: ${selectedBaggage.reference}\nExpéditeur: ${selectedBaggage.travelerFirstName || ''} ${selectedBaggage.travelerLastName || ''}\nDestinataire: ${selectedBaggage.receiverName || '-'}\nAgence: ${selectedBaggage.agency?.name || '-'}\nStatut: ${selectedBaggage.status === 'delivered' ? 'Livré' : 'Retrouvé'}`;
                    copyToClipboard(text);
                  }}
                  className="flex-1 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
