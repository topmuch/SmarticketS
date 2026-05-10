'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Luggage,
  Search,
  Eye,
  Trash2,
  Clock,
  AlertTriangle,
  CheckCircle,
  MapPin,
  QrCode,
  X,
  ShoppingCart,
  Send,
  XCircle,
  TrendingUp,
  ArrowUpRight,
  Users,
  Package,
  Sparkles,
  Lightbulb,
  RefreshCw,
  Plus
} from "lucide-react";
import { useAgency } from '../layout';
import LatestNewsWidget from '@/components/LatestNewsWidget';

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
  expiresAt: string | null;
  lastScanDate: string | null;
  lastLocation: string | null;
  // Founder information
  founderName: string | null;
  founderPhone: string | null;
  founderAt: string | null;
}

interface Stats {
  total: number;
  pending: number;
  active: number;
  scanned: number;
  lost: number;
  found: number;
}

// Modern Stat Card Component
function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  iconBg,
  trend
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ReactNode;
  iconBg: string;
  trend?: { value: number; isUp: boolean };
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50 transition-all duration-300 group">
      <div className="flex items-start justify-between">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBg}`}>
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm font-medium ${trend.isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
            {trend.isUp ? <TrendingUp className="w-4 h-4" aria-hidden="true" /> : <TrendingUp className="w-4 h-4 rotate-180" aria-hidden="true" />}
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-slate-900 dark:text-white">{value === 0 ? '—' : value}</p>
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mt-1">{title}</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{subtitle}</p>
      </div>
    </div>
  );
}

// KPI Card Component - Colored
function KPICard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  colorVariant
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ReactNode;
  colorVariant: 'green' | 'blue' | 'purple' | 'orange' | 'cyan' | 'red' | 'pink' | 'indigo';
}) {
  const chartBars = Array.from({ length: 12 }, (_, i) => ({
    height: 20 + Math.random() * 80,
  }));

  return (
    <div className={`kpi-card kpi-card-${colorVariant} p-6 opacity-0 animate-slide-up`}>
      <div className="flex items-start justify-between relative z-10">
        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
          <span className="text-white">{icon}</span>
        </div>
      </div>
      <div className="mt-4 relative z-10">
        <p className="text-3xl font-bold text-white">{value === 0 ? '—' : value}</p>
        <p className="text-sm font-medium text-white/90 mt-1">{title}</p>
        <p className="text-xs text-white/70 mt-1">{subtitle}</p>
      </div>
      
      <div className="mini-chart-bars mt-4">
        {chartBars.map((bar, i) => (
          <div 
            key={i} 
            className="mini-chart-bar" 
            style={{ height: `${bar.height}%` }}
          />
        ))}
      </div>
    </div>
  );
}

// AI Suggestions Component
function AISuggestions({ agencyId, stats }: { agencyId: string; stats: Stats }) {
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<number>>(new Set());

  const fetchSuggestion = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/ai/suggestions?agencyId=${agencyId}`);
      const data = await response.json();
      if (data.success && data.suggestion) {
        // Handle both object and string formats
        if (typeof data.suggestion === 'object') {
          const s = data.suggestion;
          setSuggestion(`Nous vous recommandons ${s.recommended} QR codes pour votre prochaine campagne. Basé sur: ${s.basedOn}`);
        } else {
          setSuggestion(data.suggestion);
        }
      } else {
        setError('Impossible de charger les suggestions');
      }
    } catch (err) {
      console.error('Error fetching AI suggestion:', err);
      setError('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestion();
  }, [agencyId]);

  const handleDismiss = (index: number) => {
    setDismissedSuggestions(prev => new Set([...prev, index]));
  };

  // Generate contextual suggestions based on stats
  const getContextualSuggestions = (): { icon: string; title: string; text: string; color: string }[] => {
    const suggestions: { icon: string; title: string; text: string; color: string }[] = [];

    if (stats.lost > 0) {
      suggestions.push({
        icon: '⚠️',
        title: 'Bagages perdus',
        text: `Vous avez ${stats.lost} bagage(s) signalé(s) comme perdu(s). Contactez rapidement les voyageurs concernés.`,
        color: 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400'
      });
    }

    if (stats.pending > 5) {
      suggestions.push({
        icon: '⏳',
        title: 'Activation en attente',
        text: `${stats.pending} bagages sont en attente d'activation. Envoyez un rappel aux voyageurs.`,
        color: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400'
      });
    }

    if (stats.scanned > 0) {
      suggestions.push({
        icon: '🔍',
        title: 'Scans récents',
        text: `${stats.scanned} bagage(s) ont été scanné(s) récemment. Vérifiez les localisations.`,
        color: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400'
      });
    }

    if (stats.total > 0 && stats.pending === 0 && stats.lost === 0) {
      suggestions.push({
        icon: '✅',
        title: 'Excellent !',
        text: 'Tous vos bagages sont actifs et bien suivis. Continuez comme ça !',
        color: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
      });
    }

    return suggestions;
  };

  const contextualSuggestions = getContextualSuggestions();

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Suggestions IA</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Recommandations personnalisées</p>
          </div>
        </div>
        <button
          onClick={fetchSuggestion}
          disabled={loading}
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Actualiser"
        >
          <RefreshCw className={`w-4 h-4 text-slate-500 dark:text-slate-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Contextual Suggestions */}
      <div className="space-y-3 mb-4">
        {contextualSuggestions.map((sugg, index) => (
          !dismissedSuggestions.has(index) && (
            <div
              key={index}
              className={`p-4 rounded-xl border ${sugg.color} relative group`}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl">{sugg.icon}</span>
                <div className="flex-1">
                  <p className="font-medium">{sugg.title}</p>
                  <p className="text-sm opacity-80">{sugg.text}</p>
                </div>
                <button
                  onClick={() => handleDismiss(index)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-all"
                  title="Masquer cette notification"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )
        ))}
      </div>

      {/* AI Generated Suggestion */}
      {loading && (
        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl animate-pulse">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
            <span className="text-slate-500 dark:text-slate-400 text-sm">Analyse en cours...</span>
          </div>
        </div>
      )}

      {suggestion && !loading && (
        <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border border-amber-200 dark:border-amber-800 rounded-xl">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-slate-700 dark:text-slate-300 font-medium mb-1">Conseil IA</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">{suggestion}</p>
            </div>
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-800 rounded-xl">
          <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
        </div>
      )}
    </div>
  );
}

// Advertisement Banner Component
function AdBanner() {
  const [ads, setAds] = useState<Array<{
    id: string;
    title: string;
    imageUrl: string;
    linkUrl: string | null;
    targetScope: string;
  }>>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAds = async () => {
      try {
        const res = await fetch('/api/advertisements');
        const data = await res.json();
        if (data.advertisements && data.advertisements.length > 0) {
          setAds(data.advertisements);
        }
      } catch (err) {
        console.error('Error fetching ads:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAds();
  }, []);

  useEffect(() => {
    if (ads.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % ads.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [ads.length]);

  if (loading || ads.length === 0) return null;

  const ad = ads[currentIndex];

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      {ad.imageUrl ? (
        <a
          href={ad.linkUrl || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <img
            src={ad.imageUrl}
            alt={ad.title}
            className="w-full h-40 object-cover"
          />
          {ad.title && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
              <p className="text-white text-sm font-medium">{ad.title}</p>
            </div>
          )}
        </a>
      ) : (
        <a
          href={ad.linkUrl || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="block p-6 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 text-center"
        >
          <p className="text-slate-800 dark:text-white font-semibold">{ad.title}</p>
        </a>
      )}
      {ads.length > 1 && (
        <div className="absolute bottom-2 right-2 flex gap-1">
          {ads.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`w-2 h-2 rounded-full transition-all ${i === currentIndex ? 'bg-white w-4' : 'bg-white/50'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AgencyDashboardPage() {
  const { agencyId, agencyName } = useAgency();
  const [baggages, setBaggages] = useState<Baggage[]>([]);
  const [filteredBaggages, setFilteredBaggages] = useState<Baggage[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    pending: 0,
    active: 0,
    scanned: 0,
    lost: 0,
    found: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedBaggage, setSelectedBaggage] = useState<Baggage | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [baggageToDelete, setBaggageToDelete] = useState<Baggage | null>(null);
  
  // Command Modal State
  const [showCommandModal, setShowCommandModal] = useState(false);
  const [commandForm, setCommandForm] = useState({
    type: 'hajj',
    count: 10,
    notes: ''
  });
  const [commandSubmitting, setCommandSubmitting] = useState(false);
  const [commandSuccess, setCommandSuccess] = useState(false);

  useEffect(() => {
    if (agencyId) fetchBaggages();
  }, [agencyId]);

  // Listen for openCommandModal event from header
  useEffect(() => {
    const handleOpenCommandModal = () => {
      setShowCommandModal(true);
    };
    window.addEventListener('openCommandModal', handleOpenCommandModal);
    return () => window.removeEventListener('openCommandModal', handleOpenCommandModal);
  }, []);

  useEffect(() => {
    filterBaggages();
  }, [baggages, search, statusFilter]);

  const fetchBaggages = async () => {
    try {
      const params = new URLSearchParams({
        agencyId: agencyId,
      });

      const response = await fetch(`/api/agency/baggages?${params}`);
      const data = await response.json();

      setBaggages(data.baggages);
      setStats(data.stats);
    } catch (error) {
      console.error('Error fetching baggages:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterBaggages = () => {
    let filtered = [...baggages];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(b => b.status === statusFilter);
    }

    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(b =>
        b.reference.toLowerCase().includes(searchLower) ||
        `${b.travelerFirstName || ''} ${b.travelerLastName || ''}`.toLowerCase().includes(searchLower)
      );
    }

    setFilteredBaggages(filtered);
  };

  const handleDeleteBaggage = async () => {
    if (!baggageToDelete) return;

    try {
      await fetch(`/api/baggage/${baggageToDelete.id}`, {
        method: 'DELETE',
      });

      setBaggages(baggages.filter(b => b.id !== baggageToDelete.id));
      setShowDeleteModal(false);
      setBaggageToDelete(null);
    } catch (error) {
      console.error('Error deleting baggage:', error);
    }
  };

  const handleCommandSubmit = async () => {
    setCommandSubmitting(true);
    
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'commande_agence',
          agencyId: agencyId,
          senderName: agencyName,
          content: {
            type: commandForm.type,
            count: commandForm.count,
            notes: commandForm.notes,
          },
        }),
      });
      setCommandSuccess(true);
      setTimeout(() => {
        setShowCommandModal(false);
        setCommandSuccess(false);
        setCommandForm({ type: 'hajj', count: 10, notes: '' });
      }, 2000);
    } catch (error) {
      console.error('Error sending command:', error);
    } finally {
      setCommandSubmitting(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Jamais';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString: string | null) => {
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

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      pending_activation: { label: 'En attente', className: 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400' },
      active: { label: 'Actif', className: 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' },
      scanned: { label: 'Scanné', className: 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400' },
      lost: { label: 'Perdu', className: 'bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400' },
      found: { label: 'Retrouvé', className: 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400' },
      blocked: { label: 'Bloqué', className: 'bg-slate-100 dark:bg-slate-500/10 text-slate-600 dark:text-slate-400' },
    };

    const config = statusConfig[status] || { label: status, className: 'bg-slate-100 dark:bg-slate-500/10 text-slate-600 dark:text-slate-400' };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const filterButtons = [
    { id: 'all', label: 'Tous' },
    { id: 'scanned', label: 'Scannés' },
    { id: 'pending_activation', label: 'En attente' },
    { id: 'lost', label: 'Perdus' },
    { id: 'found', label: 'Retrouvés' },
  ];

  // Multicolored KPI Cards
  const kpiCards = [
    {
      title: 'Total bagages',
      value: stats.total,
      subtitle: 'Tous les bagages',
      icon: <Luggage className="w-6 h-6 text-white" />,
      colorVariant: 'purple' as const,
    },
    {
      title: 'Scannés',
      value: stats.scanned + stats.active,
      subtitle: 'Bagages actifs',
      icon: <CheckCircle className="w-6 h-6 text-white" />,
      colorVariant: 'cyan' as const,
    },
    {
      title: 'En attente',
      value: stats.pending,
      subtitle: 'À activer',
      icon: <Clock className="w-6 h-6 text-white" />,
      colorVariant: 'orange' as const,
    },
    {
      title: 'Perdus',
      value: stats.lost,
      subtitle: 'Signalés perdus',
      icon: <AlertTriangle className="w-6 h-6 text-white" />,
      colorVariant: 'red' as const,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
          Bienvenue, <span className="text-amber-500">{agencyName}</span>
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Suivi en temps réel de vos bagages Hajj 2026</p>
      </div>

      {/* Multicolored KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpiCards.map((card, index) => (
          <div key={index} className={`stagger-${index + 1}`}>
            <KPICard {...card} />
          </div>
        ))}
      </div>

      {/* AI Suggestions */}
      <div className="mb-8">
        <AISuggestions agencyId={agencyId} stats={stats} />
      </div>

      {/* Latest News Widget */}
      <div className="mb-8">
        <LatestNewsWidget />
      </div>

      {/* Advertisement Banner */}
      <div className="mb-8">
        <AdBanner />
      </div>

      {/* Search Bar */}
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

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        {filterButtons.map((btn) => (
          <button
            key={btn.id}
            onClick={() => setStatusFilter(btn.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              statusFilter === btn.id
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
            }`}
          >
            {btn.label}
          </button>
        ))}
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
                <th className="text-left px-6 py-4 text-slate-500 dark:text-slate-400 font-medium text-sm hidden lg:table-cell">Trouveur</th>
                <th className="text-left px-6 py-4 text-slate-500 dark:text-slate-400 font-medium text-sm">Statut</th>
                <th className="text-left px-6 py-4 text-slate-500 dark:text-slate-400 font-medium text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                      <span className="text-slate-500">Chargement...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredBaggages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                        <Clock className="w-8 h-8 text-slate-400" />
                      </div>
                      <p className="text-slate-500 dark:text-slate-400">Aucun bagage trouvé</p>
                      <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">
                        {search || statusFilter !== 'all'
                          ? 'Essayez de modifier vos filtres.'
                          : 'Vos bagages apparaîtront ici une fois générés.'
                        }
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBaggages.map((baggage) => (
                  <tr
                    key={baggage.id}
                    className={`border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                      baggage.status === 'lost' ? 'bg-rose-50/50 dark:bg-rose-500/5' : ''
                    }`}
                  >
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
                    <td className="px-6 py-4">
                      <div>
                        {baggage.travelerFirstName || baggage.travelerLastName ? (
                          <>
                            <span className="text-slate-800 dark:text-white font-medium">
                              {baggage.travelerFirstName} {baggage.travelerLastName}
                            </span>
                            {baggage.whatsappOwner && (
                              <p className="text-slate-500 dark:text-slate-400 text-sm">{baggage.whatsappOwner}</p>
                            )}
                          </>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-full text-xs font-medium">
                              À attribuer
                            </span>
                            <button
                              onClick={() => {
                                setSelectedBaggage(baggage);
                                setShowDetailModal(true);
                              }}
                              className="text-xs text-[#ff7f00] hover:text-[#ff9f00]"
                            >
                              Attribuer
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      {baggage.lastScanDate ? (
                        <div>
                          <span className="text-slate-600 dark:text-slate-300">{formatDateTime(baggage.lastScanDate)}</span>
                          {baggage.lastLocation && (
                            <p className="text-slate-400 dark:text-slate-500 text-xs flex items-center gap-1 mt-1">
                              <MapPin className="w-3 h-3" aria-hidden="true" />
                              {baggage.lastLocation}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500">Jamais</span>
                      )}
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      {baggage.founderName ? (
                        <div>
                          <p className="text-slate-800 dark:text-white font-medium text-sm">{baggage.founderName}</p>
                          {baggage.founderPhone && (
                            <a 
                              href={`https://wa.me/${baggage.founderPhone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-500 hover:text-emerald-600 text-xs flex items-center gap-1 mt-0.5"
                            >
                              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                              </svg>
                              {baggage.founderPhone}
                            </a>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(baggage.status)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {(baggage.status === 'active' || baggage.status === 'scanned') && (
                          <button
                            onClick={async () => {
                              if (confirm('Déclarer ce bagage comme perdu ?')) {
                                try {
                                  const res = await fetch(`/api/baggage/${baggage.id}/declare-lost`, { method: 'PUT' });
                                  if (res.ok) fetchBaggages();
                                } catch (error) {
                                  console.error('Error declaring lost:', error);
                                }
                              }
                            }}
                            className="p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors group"
                            title="Déclarer perdu"
                          >
                            <AlertTriangle className="w-4 h-4 text-slate-400 group-hover:text-rose-500" />
                          </button>
                        )}
                        {baggage.status === 'lost' && (
                          <button
                            onClick={async () => {
                              if (confirm('Marquer ce bagage comme retrouvé ?')) {
                                try {
                                  const res = await fetch(`/api/baggage/${baggage.id}/mark-found`, { method: 'PUT' });
                                  if (res.ok) fetchBaggages();
                                } catch (error) {
                                  console.error('Error marking found:', error);
                                }
                              }
                            }}
                            className="p-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors group"
                            title="Marquer comme retrouvé"
                          >
                            <CheckCircle className="w-4 h-4 text-slate-400 group-hover:text-emerald-500" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedBaggage(baggage);
                            setShowDetailModal(true);
                          }}
                          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                          title="Voir détails"
                        >
                          <Eye className="w-4 h-4 text-slate-400 group-hover:text-amber-500" />
                        </button>
                        <button
                          onClick={() => {
                            setBaggageToDelete(baggage);
                            setShowDeleteModal(true);
                          }}
                          className="p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors group"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4 text-slate-400 group-hover:text-rose-500" />
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
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <span className="text-slate-500 dark:text-slate-400 text-sm">
            {filteredBaggages.length} bagage(s) affiché(s) sur {baggages.length}
          </span>
        </div>
      </div>

      {/* Command Modal */}
      {showCommandModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full shadow-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-amber-500" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Commander vos QR codes</h3>
              </div>
              <button
                onClick={() => {
                  setShowCommandModal(false);
                  setCommandSuccess(false);
                }}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <XCircle className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            {commandSuccess ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-emerald-500" />
                </div>
                <h4 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Demande envoyée !</h4>
                <p className="text-slate-500 dark:text-slate-400">Notre équipe vous contactera sous 24h.</p>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Type de QR codes</label>
                  <select
                    value={commandForm.type}
                    onChange={(e) => setCommandForm({ ...commandForm, type: e.target.value })}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  >
                    <option value="hajj">Hajj 2026 (3 QR/pèlerin)</option>
                    <option value="voyageur">Voyageurs Standard (1 ou 3 QR)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                    Nombre de {commandForm.type === 'hajj' ? 'pèlerins' : 'voyageurs'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={commandForm.count}
                    onChange={(e) => setCommandForm({ ...commandForm, count: parseInt(e.target.value) || 1 })}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    placeholder="Ex: 50"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Remarques (optionnel)</label>
                  <textarea
                    rows={3}
                    value={commandForm.notes}
                    onChange={(e) => setCommandForm({ ...commandForm, notes: e.target.value })}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
                    placeholder="Ex: livraison urgente, dates de départ..."
                  />
                </div>
                
                <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                  <p className="text-slate-600 dark:text-slate-300 text-sm">
                    <strong className="text-slate-800 dark:text-white">Estimation :</strong> {' '}
                    {commandForm.type === 'hajj' 
                      ? `${commandForm.count * 3} QR codes (${commandForm.count} pèlerins × 3)`
                      : `${commandForm.count} QR codes voyageur`
                    }
                  </p>
                </div>
                
                <button
                  onClick={handleCommandSubmit}
                  disabled={commandSubmitting}
                  className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-3 rounded-xl font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {commandSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Envoyer la demande
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedBaggage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">Détails du bagage</h2>
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
                <div className="w-12 h-12 bg-amber-100 dark:bg-amber-500/10 rounded-xl flex items-center justify-center">
                  <QrCode className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-slate-800 dark:text-white font-mono font-bold">{selectedBaggage.reference}</p>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">{selectedBaggage.type === 'hajj' ? 'Hajj 2026' : 'Voyageur'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">Pèlerin</p>
                  {selectedBaggage.travelerFirstName || selectedBaggage.travelerLastName ? (
                    <p className="text-slate-800 dark:text-white font-medium">{selectedBaggage.travelerFirstName} {selectedBaggage.travelerLastName}</p>
                  ) : (
                    <span className="px-2 py-1 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-full text-xs font-medium">
                      À attribuer
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">Type</p>
                  <p className="text-slate-800 dark:text-white">{selectedBaggage.baggageType} #{selectedBaggage.baggageIndex}</p>
                </div>
              </div>

              <div>
                <p className="text-slate-500 dark:text-slate-400 text-sm">WhatsApp</p>
                {selectedBaggage.whatsappOwner ? (
                  <p className="text-slate-800 dark:text-white">{selectedBaggage.whatsappOwner}</p>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400 text-sm">Non renseigné</span>
                )}
              </div>

              {/* Edit Form for unassigned baggages */}
              {(!selectedBaggage.travelerFirstName && !selectedBaggage.travelerLastName) && (
                <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-800 rounded-xl">
                  <h4 className="text-amber-700 dark:text-amber-400 font-medium mb-3">Attribuer ce bagage</h4>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Prénom"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-white"
                        onChange={(e) => setSelectedBaggage({ ...selectedBaggage, travelerFirstName: e.target.value })}
                      />
                      <input
                        type="text"
                        placeholder="Nom"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-white"
                        onChange={(e) => setSelectedBaggage({ ...selectedBaggage, travelerLastName: e.target.value })}
                      />
                    </div>
                    <input
                      type="tel"
                      placeholder="WhatsApp (ex: +33612345678)"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-white"
                      onChange={(e) => setSelectedBaggage({ ...selectedBaggage, whatsappOwner: e.target.value })}
                    />
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch(`/api/baggage/${selectedBaggage.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              travelerFirstName: selectedBaggage.travelerFirstName,
                              travelerLastName: selectedBaggage.travelerLastName,
                              whatsappOwner: selectedBaggage.whatsappOwner,
                              status: 'active'
                            }),
                          });
                          if (res.ok) {
                            fetchBaggages();
                            setShowDetailModal(false);
                          }
                        } catch (error) {
                          console.error('Error updating baggage:', error);
                        }
                      }}
                      className="w-full py-2 bg-[#ff7f00] hover:bg-[#ff9f00] text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Enregistrer
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">Statut</p>
                  {getStatusBadge(selectedBaggage.status)}
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">Créé le</p>
                  <p className="text-slate-800 dark:text-white">{formatDate(selectedBaggage.createdAt)}</p>
                </div>
              </div>

              <div>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Dernier scan</p>
                <p className="text-slate-800 dark:text-white">{formatDateTime(selectedBaggage.lastScanDate)}</p>
                {selectedBaggage.lastLocation && (
                  <p className="text-slate-500 dark:text-slate-400 text-sm flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" aria-hidden="true" />
                    {selectedBaggage.lastLocation}
                  </p>
                )}
              </div>

              {/* Founder Information */}
              {selectedBaggage.founderName && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    <p className="text-emerald-700 dark:text-emerald-400 font-medium">Trouvé par</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-800 dark:text-white font-medium">{selectedBaggage.founderName}</span>
                      {selectedBaggage.founderAt && (
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          le {formatDate(selectedBaggage.founderAt)}
                        </span>
                      )}
                    </div>
                    {selectedBaggage.founderPhone && (
                      <div className="flex items-center gap-2">
                        <a 
                          href={`https://wa.me/${selectedBaggage.founderPhone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                          Contacter sur WhatsApp
                        </a>
                        <span className="text-slate-600 dark:text-slate-400 text-sm">{selectedBaggage.founderPhone}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Expire le</p>
                <p className="text-slate-800 dark:text-white">{formatDate(selectedBaggage.expiresAt)}</p>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <Link
                  href={`/scan/${selectedBaggage.reference}`}
                  className="block w-full text-center py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors font-medium"
                >
                  Tester le scan
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && baggageToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full shadow-xl border border-slate-200 dark:border-slate-800">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-rose-100 dark:bg-rose-500/10 rounded-xl flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-rose-500" />
                </div>
                <div>
                  <h3 className="text-slate-800 dark:text-white font-bold">Supprimer ce bagage ?</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">{baggageToDelete.reference}</p>
                </div>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                Cette action est irréversible. Le bagage de <strong className="text-slate-700 dark:text-slate-300">{baggageToDelete.travelerFirstName || 'Non renseigné'} {baggageToDelete.travelerLastName || ''}</strong> sera définitivement supprimé.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setBaggageToDelete(null);
                  }}
                  className="flex-1 py-2 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDeleteBaggage}
                  className="flex-1 py-2 px-4 bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition-colors font-medium"
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
