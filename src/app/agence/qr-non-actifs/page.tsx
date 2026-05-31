'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  QrCode,
  Search,
  Copy,
  ExternalLink,
  Trash2,
  Clock,
  CheckCircle,
  X,
  Luggage,
} from 'lucide-react';
import { useAgency } from '../layout';

interface Baggage {
  id: string;
  reference: string;
  type: string;
  category: string;
  baggageType: string;
  baggageIndex: number;
  createdAt: string;
  status: string;
  travelerFirstName: string | null;
  travelerLastName: string | null;
}

export default function QrNonActifsPage() {
  const { agencyId } = useAgency();
  const [baggages, setBaggages] = useState<Baggage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchBaggages = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        agencyId: agencyId,
        status: 'pending_activation',
      });

      const response = await fetch(`/api/agency/baggages?${params}`);
      const data = await response.json();
      setBaggages(data.baggages || []);
    } catch (error) {
      console.error('Error fetching baggages:', error);
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => {
    fetchBaggages();
  }, [fetchBaggages]);

  const filteredBaggages = baggages.filter(b =>
    b.reference.toLowerCase().includes(search.toLowerCase()) ||
    `${b.travelerFirstName || ''} ${b.travelerLastName || ''}`.toLowerCase().includes(search.toLowerCase()) ||
    b.category.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }) + ' \u00e0 ' + date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleCopyLink = async (reference: string) => {
    try {
      await navigator.clipboard.writeText(
        window.location.origin + '/activate/' + reference
      );
      setCopiedRef(reference);
      setTimeout(() => setCopiedRef(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDelete = async (baggageId: string, reference: string) => {
    if (!confirm(`\u26a0\ufe0f \u00cates-vous s\u00fbr de vouloir supprimer le QR ${reference} ?\n\nCette action est irr\u00e9versible.`)) return;

    setActionLoading(baggageId);
    try {
      const response = await fetch(`/api/baggage/${baggageId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setBaggages(prev => prev.filter(b => b.id !== baggageId));
      } else {
        const data = await response.json();
        alert(data.error || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Erreur lors de la suppression');
    } finally {
      setActionLoading(null);
    }
  };

  const getCategoryLabel = (category: string) => {
    if (category === 'parcel') return 'Colis';
    if (category === 'ticket') return 'Ticket';
    return 'Hajj';
  };

  const getCategoryBadgeClass = (category: string) => {
    if (category === 'parcel') return 'bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400';
    if (category === 'ticket') return 'bg-violet-100 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400';
    return 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400';
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
          QR Non Activ&eacute;s
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          QR codes en attente d&apos;activation par le propri&eacute;taire
        </p>
      </div>

      {/* KPI Card - Orange */}
      <div className="kpi-card kpi-card-orange p-6 mb-8 max-w-xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
            <QrCode className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-3xl font-bold text-white">{baggages.length}</p>
            <p className="text-sm text-white/80">QR en attente</p>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      {baggages.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 mb-6 flex items-center gap-3">
          <Clock className="w-5 h-5 text-amber-500 shrink-0" />
          <div>
            <p className="text-amber-700 dark:text-amber-400 font-medium">
              En attente d&apos;activation
            </p>
            <p className="text-amber-600 dark:text-amber-300 text-sm">
              Ces QR codes ont &eacute;t&eacute; g&eacute;n&eacute;r&eacute;s mais ne sont pas encore activ&eacute;s. Partagez le lien d&apos;activation avec le propri&eacute;taire.
            </p>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par r&eacute;f&eacute;rence, nom ou cat&eacute;gorie..."
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
                <th className="text-left px-6 py-4 text-slate-500 dark:text-slate-400 font-medium text-sm">
                  R&eacute;f&eacute;rence
                </th>
                <th className="text-left px-6 py-4 text-slate-500 dark:text-slate-400 font-medium text-sm hidden md:table-cell">
                  Type
                </th>
                <th className="text-left px-6 py-4 text-slate-500 dark:text-slate-400 font-medium text-sm hidden md:table-cell">
                  Cat&eacute;gorie
                </th>
                <th className="text-left px-6 py-4 text-slate-500 dark:text-slate-400 font-medium text-sm hidden lg:table-cell">
                  Cr&eacute;&eacute; le
                </th>
                <th className="text-left px-6 py-4 text-slate-500 dark:text-slate-400 font-medium text-sm">
                  Actions
                </th>
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
                  <td colSpan={5} className="text-center py-16">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-amber-100 dark:bg-amber-500/10 rounded-full flex items-center justify-center mb-4">
                        <QrCode className="w-8 h-8 text-amber-500" />
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 font-medium">
                        Aucun QR en attente d&apos;activation
                      </p>
                      <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                        Tous vos QR codes ont &eacute;t&eacute; activ&eacute;s
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBaggages.map((baggage) => (
                  <tr
                    key={baggage.id}
                    className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors bg-amber-50/30 dark:bg-amber-500/5"
                  >
                    {/* R\u00e9f\u00e9rence */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center">
                          <QrCode className="w-4 h-4 text-amber-500" />
                        </div>
                        <span className="text-slate-800 dark:text-white font-mono font-medium">
                          {baggage.reference}
                        </span>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="px-6 py-4 hidden md:table-cell">
                      <span className="text-slate-600 dark:text-slate-300 text-sm capitalize">
                        {baggage.baggageType === 'cabine' ? 'Cabine' : 'Soute'}
                      </span>
                    </td>

                    {/* Cat\u00e9gorie */}
                    <td className="px-6 py-4 hidden md:table-cell">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${getCategoryBadgeClass(
                          baggage.category
                        )}`}
                      >
                        {getCategoryLabel(baggage.category)}
                      </span>
                    </td>

                    {/* Cr\u00e9\u00e9 le */}
                    <td className="px-6 py-4 hidden lg:table-cell">
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span className="text-sm">{formatDate(baggage.createdAt)}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        {/* Copy activation link */}
                        <button
                          onClick={() => handleCopyLink(baggage.reference)}
                          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                          title="Copier le lien d'activation"
                        >
                          {copiedRef === baggage.reference ? (
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Copy className="w-4 h-4 text-slate-400 group-hover:text-amber-500" />
                          )}
                        </button>

                        {/* Test activation */}
                        <Link
                          href={`/activate/${baggage.reference}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                          title="Tester l'activation"
                        >
                          <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-500" />
                        </Link>

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(baggage.id, baggage.reference)}
                          disabled={actionLoading === baggage.id}
                          className="p-2 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-500/10 transition-colors group"
                          title="Supprimer"
                        >
                          {actionLoading === baggage.id ? (
                            <div className="w-4 h-4 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4 text-slate-400 group-hover:text-rose-500" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {!loading && filteredBaggages.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
            <span className="text-slate-500 dark:text-slate-400 text-sm">
              {filteredBaggages.length} QR en attente d&apos;activation
            </span>
          </div>
        )}
      </div>

      {/* Copied Toast */}
      {copiedRef && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom duration-300">
          <div className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl px-4 py-3 shadow-lg flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 dark:text-emerald-500" />
            <span className="text-sm font-medium">Copi&eacute; !</span>
          </div>
        </div>
      )}
    </div>
  );
}
