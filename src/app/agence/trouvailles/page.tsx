'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CheckCircle,
  QrCode,
  MapPin,
  Clock,
  Eye,
  X,
  Search,
  Bell,
  XCircle
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
  founderName: string | null;
  founderPhone: string | null;
  foundAt: string | null;
}

export default function TrouvaillesPage() {
  const { agencyId } = useAgency();
  const [baggages, setBaggages] = useState<Baggage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedBaggage, setSelectedBaggage] = useState<Baggage | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [previousCount, setPreviousCount] = useState(0);

  useEffect(() => {
    // Load previous count from localStorage
    const savedCount = localStorage.getItem(`trouvailles-count-${agencyId}`);
    if (savedCount) {
      setPreviousCount(parseInt(savedCount, 10));
    }
    fetchBaggages();
  }, [agencyId]);

  const fetchBaggages = async () => {
    try {
      const params = new URLSearchParams({
        agencyId: agencyId,
      });

      const response = await fetch(`/api/agency/baggages?${params}`);
      const data = await response.json();
      // Filter only found baggages
      const foundBaggages = (data.baggages || []).filter((b: Baggage) => b.status === 'found');
      setBaggages(foundBaggages);

      // Check if there are new found baggages
      const savedCount = localStorage.getItem(`trouvailles-count-${agencyId}`);
      const prevCount = savedCount ? parseInt(savedCount, 10) : 0;
      
      if (foundBaggages.length > prevCount && prevCount > 0) {
        setShowNotification(true);
      }

      // Save current count
      localStorage.setItem(`trouvailles-count-${agencyId}`, foundBaggages.length.toString());

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

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Bagages retrouvés</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Liste des bagages qui ont été marqués comme retrouvés</p>
      </div>

      {/* Success Notification */}
      {showNotification && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right duration-300">
          <div className="bg-emerald-500 text-white rounded-xl p-4 shadow-lg flex items-center gap-3 max-w-sm">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm">Nouveau bagage retrouvé !</p>
              <p className="text-emerald-100 text-xs">Un bagage a été marqué comme retrouvé.</p>
            </div>
            <button
              onClick={() => setShowNotification(false)}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Stats Card */}
      <div className="kpi-card kpi-card-green p-6 mb-8 max-w-xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-3xl font-bold text-white">{baggages.length}</p>
            <p className="text-sm text-white/80">Bagages retrouvés</p>
          </div>
        </div>
      </div>

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
                <th className="text-left px-6 py-4 text-slate-500 dark:text-slate-400 font-medium text-sm hidden md:table-cell">Retrouvé le</th>
                <th className="text-left px-6 py-4 text-slate-500 dark:text-slate-400 font-medium text-sm hidden lg:table-cell">Localisation</th>
                <th className="text-left px-6 py-4 text-slate-500 dark:text-slate-400 font-medium text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
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
                      <p className="text-slate-500 dark:text-slate-400">Aucun bagage retrouvé</p>
                      <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Les bagages retrouvés apparaîtront ici</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBaggages.map((baggage) => (
                  <tr
                    key={baggage.id}
                    className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors bg-emerald-50/30 dark:bg-emerald-500/5"
                  >
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
                    <td className="px-6 py-4">
                      {/* AGENCY-FIX: Fallback "Non assigné" when both names are null */}
                      {baggage.travelerFirstName || baggage.travelerLastName ? (
                        <span className="text-slate-800 dark:text-white font-medium">
                          {baggage.travelerFirstName} {baggage.travelerLastName}
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 text-sm italic">Non assigné</span>
                      )}
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
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-500/10 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                  <p className="text-slate-800 dark:text-white font-mono font-bold">{selectedBaggage.reference}</p>
                  <p className="text-emerald-500 text-sm font-medium">Bagage retrouvé</p>
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
                <p className="text-slate-500 dark:text-slate-400 text-sm">Retrouvé le</p>
                <p className="text-slate-800 dark:text-white">{formatDate(selectedBaggage.lastScanDate)}</p>
                {selectedBaggage.lastLocation && (
                  <p className="text-slate-500 dark:text-slate-400 text-sm flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" />
                    {selectedBaggage.lastLocation}
                  </p>
                )}
              </div>

              {/* Founder Information */}
              {selectedBaggage.founderName && (
                <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
                  <p className="text-emerald-700 dark:text-emerald-400 font-medium text-sm mb-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Trouvé par
                  </p>
                  <div className="space-y-1">
                    <p className="text-slate-800 dark:text-white font-medium">{selectedBaggage.founderName}</p>
                    {selectedBaggage.founderPhone && (
                      <a 
                        href={`https://wa.me/${selectedBaggage.founderPhone.replace(/\D/g, '')}`}
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
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
