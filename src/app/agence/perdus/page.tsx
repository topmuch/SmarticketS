'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  QrCode,
  MapPin,
  Clock,
  Eye,
  X,
  Search,
  CheckCircle,
  Phone
} from "lucide-react";
import { useAgency } from '../layout';

interface Baggage {
  id: string;
  reference: string;
  type: string;
  travelerFirstName: string | null;
  travelerLastName: string | null;
  whatsappOwner: string | null;
  baggageIndex: number;
  baggageType: string;
  status: string;
  createdAt: string;
  lastScanDate: string | null;
  lastLocation: string | null;
}

export default function PerdusPage() {
  const { agencyId } = useAgency();
  const [baggages, setBaggages] = useState<Baggage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedBaggage, setSelectedBaggage] = useState<Baggage | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchBaggages();
  }, [agencyId]);

  const fetchBaggages = async () => {
    try {
      const params = new URLSearchParams({
        agencyId: agencyId,
      });

      const response = await fetch(`/api/agency/baggages?${params}`);
      const data = await response.json();
      // Filter only lost baggages
      setBaggages((data.baggages || []).filter((b: Baggage) => b.status === 'lost'));
    } catch (error) {
      console.error('Error fetching baggages:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBaggages = baggages.filter(b =>
    b.reference.toLowerCase().includes(search.toLowerCase()) ||
    `${b.travelerFirstName || ''} ${b.travelerLastName || ''}`.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }) + ' à ' + date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleMarkFound = async (baggageId: string) => {
    if (!confirm('Marquer ce bagage comme retrouvé ?')) return;
    
    try {
      const res = await fetch(`/api/baggage/${baggageId}/mark-found`, { method: 'PUT' });
      if (res.ok) {
        fetchBaggages();
      }
    } catch (error) {
      console.error('Error marking found:', error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Bagages perdus</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Liste des bagages déclarés perdus - Priorité haute</p>
      </div>

      {/* Stats Card */}
      <div className="kpi-card kpi-card-red p-6 mb-8 max-w-xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-3xl font-bold text-white">{baggages.length}</p>
            <p className="text-sm text-white/80">Bagages perdus</p>
          </div>
        </div>
      </div>

      {/* Alert Banner */}
      {baggages.length > 0 && (
        <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-800 rounded-2xl p-4 mb-6 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
          <div>
            <p className="text-rose-700 dark:text-rose-400 font-medium">Attention !</p>
            <p className="text-rose-600 dark:text-rose-300 text-sm">Vous avez {baggages.length} bagage(s) signalé(s) comme perdu(s). Contactez rapidement les voyageurs concernés.</p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par nom ou référence..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-12 pr-4 text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <th className="text-left px-6 py-4 text-slate-500 dark:text-slate-400 font-medium text-sm">Référence</th>
                <th className="text-left px-6 py-4 text-slate-500 dark:text-slate-400 font-medium text-sm">Pèlerin</th>
                <th className="text-left px-6 py-4 text-slate-500 dark:text-slate-400 font-medium text-sm hidden md:table-cell">Dernier scan</th>
                <th className="text-left px-6 py-4 text-slate-500 dark:text-slate-400 font-medium text-sm hidden lg:table-cell">Localisation</th>
                <th className="text-left px-6 py-4 text-slate-500 dark:text-slate-400 font-medium text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-6 h-6 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
                      <span className="text-slate-500">Chargement...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredBaggages.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle className="w-8 h-8 text-emerald-500" />
                      </div>
                      <p className="text-slate-500 dark:text-slate-400">Aucun bagage perdu</p>
                      <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Excellent ! Tous vos bagages sont bien suivis.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBaggages.map((baggage) => (
                  <tr
                    key={baggage.id}
                    className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors bg-rose-50/50 dark:bg-rose-500/5"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-500/10 flex items-center justify-center">
                          <QrCode className="w-4 h-4 text-rose-500" />
                        </div>
                        <span className="text-slate-800 dark:text-white font-mono font-medium">
                          {baggage.reference}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        {/* AGENCY-FIX: Fallback "Non assigné" when both names are null */}
                        {baggage.travelerFirstName || baggage.travelerLastName ? (
                          <span className="text-slate-800 dark:text-white font-medium">
                            {baggage.travelerFirstName} {baggage.travelerLastName}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 text-sm italic">Non assigné</span>
                        )}
                        {baggage.whatsappOwner && (
                          <p className="text-slate-500 dark:text-slate-400 text-sm flex items-center gap-1 mt-1">
                            <Phone className="w-3 h-3" />
                            {baggage.whatsappOwner}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <Clock className="w-4 h-4 text-slate-400" />
                        {formatDate(baggage.lastScanDate)}
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      {baggage.lastLocation ? (
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                          <MapPin className="w-4 h-4 text-slate-400" />
                          {baggage.lastLocation}
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleMarkFound(baggage.id)}
                          className="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg text-sm font-medium hover:bg-emerald-200 dark:hover:bg-emerald-500/20 transition-colors flex items-center gap-1"
                          title="Marquer comme retrouvé"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Retrouvé
                        </button>
                        <button
                          onClick={() => {
                            setSelectedBaggage(baggage);
                            setShowDetailModal(true);
                          }}
                          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                          title="Voir détails"
                        >
                          <Eye className="w-4 h-4 text-slate-400 group-hover:text-rose-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedBaggage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full shadow-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">Détails</h2>
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
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-rose-100 dark:bg-rose-500/10 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-rose-500" />
                </div>
                <div>
                  <p className="text-slate-800 dark:text-white font-mono font-bold">{selectedBaggage.reference}</p>
                  <p className="text-rose-500 text-sm font-medium">Bagage perdu</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">Pèlerin</p>
                  <p className="text-slate-800 dark:text-white font-medium">{selectedBaggage.travelerFirstName} {selectedBaggage.travelerLastName}</p>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">Type</p>
                  <p className="text-slate-800 dark:text-white">{selectedBaggage.baggageType} #{selectedBaggage.baggageIndex}</p>
                </div>
              </div>

              <div>
                <p className="text-slate-500 dark:text-slate-400 text-sm">WhatsApp</p>
                <p className="text-slate-800 dark:text-white">{selectedBaggage.whatsappOwner || 'Non renseigné'}</p>
              </div>

              <div>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Dernier scan</p>
                <p className="text-slate-800 dark:text-white">{formatDate(selectedBaggage.lastScanDate)}</p>
                {selectedBaggage.lastLocation && (
                  <p className="text-slate-500 dark:text-slate-400 text-sm flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" />
                    {selectedBaggage.lastLocation}
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => {
                    handleMarkFound(selectedBaggage.id);
                    setShowDetailModal(false);
                    setSelectedBaggage(null);
                  }}
                  className="w-full bg-emerald-500 text-white py-3 rounded-xl font-medium hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Marquer comme retrouvé
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
