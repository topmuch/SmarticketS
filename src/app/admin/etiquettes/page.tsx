'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import {
  Search,
  Eye,
  Download,
  Share2,
  Trash2,
  Plane,
  QrCode,
  X,
  AlertTriangle,
  RefreshCw,
  FileText,
  Building2,
  ChevronDown,
  ChevronRight,
  Archive,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";

interface QRSet {
  id: string;
  setId: string;
  type: string;
  agencyId: string | null;
  agencyName: string | null;
  createdAt: Date;
  qrCount: number;
  references: string[];
  status: string;
  travelerName: string | null;
  activationStatus: 'new' | 'partial' | 'activated';
  baggageIds: string[];
}

interface AgencyGroup {
  agencyId: string | null;
  agencyName: string;
  sets: QRSet[];
  totalQr: number;
  isExpanded: boolean;
}

interface Stats {
  totalSets: number;
  totalQr: number;
  hajjSets: number;
  voyageurSets: number;
}

export default function EtiquettesPage() {
  const qrRef = useRef<HTMLDivElement>(null);

  const [sets, setSets] = useState<QRSet[]>([]);
  const [agencyGroups, setAgencyGroups] = useState<AgencyGroup[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalSets: 0,
    totalQr: 0,
    hajjSets: 0,
    voyageurSets: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab] = useState<'voyageur'>('voyageur');

  // Modals
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedSet, setSelectedSet] = useState<QRSet | null>(null);

  // Download states
  const [downloadingSet, setDownloadingSet] = useState<string | null>(null);
  const [downloadingSingle, setDownloadingSingle] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<string>('');

  useEffect(() => {
    fetchSets();
  }, [activeTab, search]);

  const fetchSets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('type', activeTab);
      if (search) params.set('search', search);

      const response = await fetch(`/api/qrcodes?${params}`);
      const data = await response.json();

      // Calculate activation status for each set
      const setsWithStatus = data.sets.map((set: QRSet) => ({
        ...set,
        activationStatus: getActivationStatus(set.status)
      }));

      // Filter to only show sets matching the active tab type
      const filteredSets = setsWithStatus.filter((set: QRSet) => set.type === activeTab);

      setSets(filteredSets);
      setStats(data.stats);

      // Group by agency
      const groupedByAgency = groupByAgency(filteredSets);
      setAgencyGroups(groupedByAgency);
    } catch (error) {
      console.error('Error fetching QR sets:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupByAgency = (sets: QRSet[]): AgencyGroup[] => {
    const groups = new Map<string | null, AgencyGroup>();

    sets.forEach(set => {
      const key = set.agencyId || 'no-agency';
      const agencyName = set.agencyName || 'Sans agence';

      if (!groups.has(key)) {
        groups.set(key, {
          agencyId: set.agencyId,
          agencyName,
          sets: [],
          totalQr: 0,
          isExpanded: true,
        });
      }

      const group = groups.get(key)!;
      group.sets.push(set);
      group.totalQr += set.qrCount;
    });

    return Array.from(groups.values()).sort((a, b) => {
      if (a.agencyId === null) return 1;
      if (b.agencyId === null) return -1;
      return a.agencyName.localeCompare(b.agencyName);
    });
  };

  const getActivationStatus = (status: string): 'new' | 'partial' | 'activated' => {
    if (status === 'active' || status === 'scanned') return 'activated';
    if (status === 'partial') return 'partial';
    return 'new';
  };

  const toggleAgencyGroup = (agencyId: string | null) => {
    setAgencyGroups(prev =>
      prev.map(group =>
        group.agencyId === agencyId
          ? { ...group, isExpanded: !group.isExpanded }
          : group
      )
    );
  };

  const handleDeleteSet = async () => {
    if (!selectedSet) return;

    try {
      const params = new URLSearchParams({ setId: selectedSet.setId });
      const response = await fetch(`/api/qrcodes?${params}`, { method: 'DELETE' });
      const data = await response.json();

      if (response.ok && data.success) {
        fetchSets();
        setShowDeleteModal(false);
        setSelectedSet(null);
      } else {
        alert(`Erreur: ${data.error || 'Erreur lors de la suppression'}`);
      }
    } catch (error) {
      console.error('Error deleting set:', error);
      alert('Erreur lors de la suppression');
    }
  };

  // ─── Bulk Download (ZIP) ───
  const handleBulkDownload = async (set: QRSet) => {
    setDownloadingSet(set.setId);
    setDownloadProgress(`Génération de ${set.qrCount} QR codes...`);

    try {
      const response = await fetch('/api/qrcodes/download-set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setId: set.setId, format: 'png' }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Erreur lors du téléchargement');
      }

      setDownloadProgress('Création du fichier ZIP...');

      // Download the ZIP file
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `QRTrans-${set.setId}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Bulk download error:', error);
      alert(error instanceof Error ? error.message : 'Erreur lors du téléchargement');
    } finally {
      setDownloadingSet(null);
      setDownloadProgress('');
    }
  };

  // ─── Single QR Download (PNG) ───
  const handleSingleDownload = async (reference: string) => {
    setDownloadingSingle(reference);

    try {
      const response = await fetch('/api/qrcodes/download-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference, format: 'png', size: 600 }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Erreur lors du téléchargement');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reference}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Single download error:', error);
      alert(error instanceof Error ? error.message : 'Erreur lors du téléchargement');
    } finally {
      setDownloadingSingle(null);
    }
  };

  const handleShareSet = async (set: QRSet) => {
    const shareUrl = `${window.location.origin}/scan/${set.references[0]}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `QRTrans - ${set.setId}`,
          text: `${set.qrCount} QR codes pour ${set.agencyName || 'agence'}`,
          url: shareUrl,
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert('Lien copié !');
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Étiquettes QR</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {stats.totalSets} sets • {stats.totalQr} QR codes
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <button
            onClick={() => fetchSets()}
            className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <Link
            href="/admin/generer"
            className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-colors"
          >
            <QrCode className="w-4 h-4" />
            Générer QR
          </Link>
        </div>
      </div>

      {/* Tabs - Voyageur only */}
      <div className="flex gap-2 mb-6">
        <button
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all bg-amber-500 text-white shadow-lg shadow-amber-500/30`}
        >
          <Plane className="w-5 h-5" />
          Colis
          <span className="px-2 py-0.5 rounded-full text-xs bg-white/20 text-white">
            {stats.voyageurSets}
          </span>
        </button>
      </div>

      {/* Download progress bar */}
      {downloadProgress && (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
          <p className="text-sm font-medium text-emerald-700">{downloadProgress}</p>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-slate-200 border-t-green-500 rounded-full" />
        </div>
      ) : agencyGroups.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
          <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-amber-100 dark:bg-amber-500/20`}>
            <Plane className="w-8 h-8 text-amber-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">
            Aucun QR code Colis
          </h3>
          <p className="text-slate-500 dark:text-slate-400 mb-4">
            {search ? 'Aucun résultat pour votre recherche' : 'Commencez par générer des QR codes'}
          </p>
          {!search && (
            <Link
              href="/admin/generer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-colors"
            >
              <QrCode className="w-4 h-4" />
              Générer des QR codes
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {agencyGroups.map((group) => (
            <div
              key={group.agencyId || 'no-agency'}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
            >
              {/* Agency Header */}
              <button
                onClick={() => toggleAgencyGroup(group.agencyId)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-amber-100 dark:bg-amber-500/20`}>
                    <Building2 className={`w-5 h-5 text-amber-600`} />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-slate-800 dark:text-white">
                      {group.agencyName}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {group.sets.length} set{group.sets.length > 1 ? 's' : ''} • {group.totalQr} QR codes
                    </p>
                  </div>
                </div>
                <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${
                  group.isExpanded ? 'rotate-180' : ''
                }`} />
              </button>

              {/* Sets in this agency */}
              {group.isExpanded && (
                <div className="border-t border-slate-200 dark:border-slate-700">
                  <div className="divide-y divide-slate-100 dark:divide-slate-700">
                    {group.sets.map((set) => (
                      <div
                        key={set.id}
                        className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          {/* QR Icon */}
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-amber-100 dark:bg-amber-500/20`}>
                            <QrCode className={`w-6 h-6 text-amber-600`} />
                          </div>

                          {/* Info */}
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-slate-800 dark:text-white">
                                {set.setId}
                              </h4>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                set.activationStatus === 'activated'
                                  ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
                                  : set.activationStatus === 'partial'
                                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                              }`}>
                                {set.activationStatus === 'activated' ? 'Activé' : set.activationStatus === 'partial' ? 'Partiel' : 'Nouveau'}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-sm text-slate-500 dark:text-slate-400">
                              <span>{set.qrCount} QR</span>
                              {set.travelerName && (
                                <span>• {set.travelerName}</span>
                              )}
                              <span>• {formatDate(set.createdAt)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedSet(set);
                              setShowDetailModal(true);
                            }}
                            className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                            title="Voir les QR codes"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {/* Bulk download (ZIP) */}
                          <button
                            onClick={() => handleBulkDownload(set)}
                            disabled={downloadingSet === set.setId}
                            className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Télécharger tout en ZIP"
                          >
                            {downloadingSet === set.setId ? (
                              <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                            ) : (
                              <Archive className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleShareSet(set)}
                            className="p-2 text-slate-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-500/10 rounded-lg transition-colors"
                            title="Partager"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedSet(set);
                              setShowDeleteModal(true);
                            }}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedSet && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700">
              <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">{selectedSet.setId}</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  {selectedSet.type === 'hajj' ? 'Hajj 2026' : 'Voyageur'} • {selectedSet.qrCount} QR codes
                  {selectedSet.agencyName && ` • ${selectedSet.agencyName}`}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedSet(null);
                }}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* ─── Bulk Download Section ─── */}
              <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Archive className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-emerald-800 text-sm uppercase tracking-wider">
                    Téléchargement en lot
                  </h3>
                </div>
                <p className="text-sm text-emerald-700">
                  Téléchargez les <strong>{selectedSet.qrCount}</strong> QR codes en un seul fichier ZIP.
                  Chaque QR code est un fichier PNG individuel (400×400px, haute qualité).
                </p>
                <button
                  onClick={() => handleBulkDownload(selectedSet)}
                  disabled={downloadingSet === selectedSet.setId}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl font-bold transition-colors disabled:cursor-not-allowed"
                >
                  {downloadingSet === selectedSet.setId ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Génération en cours...
                    </>
                  ) : (
                    <>
                      <Archive className="w-5 h-5" />
                      Télécharger tout ({selectedSet.qrCount} QR) en ZIP
                    </>
                  )}
                </button>
              </div>

              {/* ─── QR Codes Grid (with individual download) ─── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-slate-500" />
                    <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider">
                      QR codes individuels
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400">Cliquez sur un QR pour le télécharger</p>
                </div>

                <div
                  ref={qrRef}
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
                >
                  {selectedSet.references.map((ref, index) => (
                    <button
                      key={ref}
                      onClick={() => handleSingleDownload(ref)}
                      disabled={downloadingSingle === ref}
                      className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 text-center hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:border-emerald-300 border-2 border-transparent transition-all group disabled:opacity-50"
                      title={`Télécharger ${ref}`}
                    >
                      <div className="relative inline-block">
                        <QRCodeSVG
                          value={`${typeof window !== 'undefined' ? window.location.origin : ''}/scan/${ref}`}
                          size={90}
                          level="H"
                          includeMargin={true}
                          bgColor="#f8fafc"
                          fgColor={selectedSet.type === 'hajj' ? '#059669' : '#f59e0b'}
                        />
                        {/* Download overlay on hover */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                          <Download className="w-6 h-6 text-white" />
                        </div>
                      </div>
                      <p className="text-slate-800 dark:text-white font-mono font-bold mt-2 text-xs truncate">
                        {ref}
                      </p>
                      <p className="text-slate-500 dark:text-slate-400 text-[10px]">
                        {selectedSet.type === 'hajj'
                          ? (index === 0 ? 'Cabine' : `Soute #${index}`)
                          : `Colis #${index + 1}`
                        }
                      </p>
                      {downloadingSingle === ref && (
                        <Loader2 className="w-4 h-4 text-emerald-500 animate-spin mx-auto mt-1" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
                  <p className="text-slate-500 dark:text-slate-400 text-sm">Créé le</p>
                  <p className="text-slate-800 dark:text-white font-medium">{formatDate(selectedSet.createdAt)}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
                  <p className="text-slate-500 dark:text-slate-400 text-sm">Statut</p>
                  <p className="text-slate-800 dark:text-white font-medium capitalize">
                    {selectedSet.activationStatus === 'activated' ? 'Activé' :
                     selectedSet.activationStatus === 'partial' ? 'Partiel' : 'Nouveau'}
                  </p>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => handleBulkDownload(selectedSet)}
                  disabled={downloadingSet === selectedSet.setId}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl transition-colors flex items-center justify-center gap-2 font-bold disabled:cursor-not-allowed"
                >
                  {downloadingSet === selectedSet.setId ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Génération...
                    </>
                  ) : (
                    <>
                      <Archive className="w-4 h-4" />
                      Télécharger ZIP ({selectedSet.qrCount})
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleShareSet(selectedSet)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl transition-colors flex items-center justify-center gap-2 font-medium"
                >
                  <Share2 className="w-4 h-4" />
                  Partager
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedSet && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-sm w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-slate-800 dark:text-white font-bold">Supprimer ce set ?</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">{selectedSet.setId}</p>
                </div>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                Cette action supprimera définitivement les {selectedSet.qrCount} QR codes de ce set.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedSet(null);
                  }}
                  className="flex-1 py-2 px-4 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDeleteSet}
                  className="flex-1 py-2 px-4 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
