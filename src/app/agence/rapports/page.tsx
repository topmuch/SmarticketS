'use client';

import { useState, useEffect } from 'react';
import {
  Download,
  Luggage,
  CheckCircle,
  AlertTriangle,
  Clock,
  TrendingUp,
  QrCode,
  Plane,
  Calendar,
  Share2
} from 'lucide-react';
import { useAgency } from '../layout';

interface Stats {
  total: number;
  pending_activation: number;
  active: number;
  scanned: number;
  lost: number;
  found: number;
  blocked: number;
  hajj: number;
  voyageur: number;
}

interface DailyStat {
  date: string;
  count: number;
  label: string;
}

interface WeeklyStat {
  week: number;
  count: number;
  label: string;
}

interface ReportData {
  stats: Stats;
  recoveryRate: number;
  dailyStats: DailyStat[];
  weeklyStats: WeeklyStat[];
  scanLogsCount: number;
  period: string;
}

export default function AgencyReportsPage() {
  const { agencyId, agencyName, agencyData } = useAgency();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('week');

  useEffect(() => {
    fetchReports();
  }, [period, agencyId]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?period=${period}&agencyId=${agencyId}`);
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    window.open(`/api/reports/export?agencyId=${agencyId}&period=${period}`, '_blank');
  };

  const handleSharePublicPage = () => {
    const slug = agencyData?.slug || 'agency';
    const url = `${window.location.origin}/agency/${slug}`;
    navigator.clipboard.writeText(url);
    alert(`Lien copié ! ${url}`);
  };

  // Calculate max for chart
  const maxDaily = data?.dailyStats ? Math.max(...data.dailyStats.map(d => d.count), 1) : 1;
  const maxWeekly = data?.weeklyStats ? Math.max(...data.weeklyStats.map(d => d.count), 1) : 1;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Rapports</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Statistiques de {agencyName}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Period Selector */}
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-700 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff7f00]"
          >
            <option value="week">7 derniers jours</option>
            <option value="month">Ce mois</option>
            <option value="year">Cette année</option>
          </select>
          
          {/* Share Public Page */}
          <button
            onClick={handleSharePublicPage}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Share2 className="w-4 h-4" />
            Partager
          </button>
          
          {/* Export Button */}
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            Exporter CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#ff7f00]/30 border-t-[#ff7f00] rounded-full animate-spin" />
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Main Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="kpi-card kpi-card-green p-5">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-3">
                <Luggage className="w-5 h-5 text-white" />
              </div>
              <p className="text-3xl font-bold text-white">{data.stats.total}</p>
              <p className="text-sm text-white/80">Total bagages</p>
            </div>
            
            <div className="kpi-card kpi-card-blue p-5">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-3">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <p className="text-3xl font-bold text-white">{data.stats.active}</p>
              <p className="text-sm text-white/80">Actifs</p>
            </div>
            
            <div className="kpi-card kpi-card-orange p-5">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-3">
                <QrCode className="w-5 h-5 text-white" />
              </div>
              <p className="text-3xl font-bold text-white">{data.stats.scanned}</p>
              <p className="text-sm text-white/80">Scannés</p>
            </div>
            
            <div className="kpi-card kpi-card-red p-5">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-3">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <p className="text-3xl font-bold text-white">{data.stats.lost}</p>
              <p className="text-sm text-white/80">Perdus</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Daily Evolution Chart */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#ff7f00]" />
                Évolution quotidienne
              </h3>
              <div className="space-y-3">
                {data.dailyStats.map((day, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <span className="text-sm text-slate-500 dark:text-slate-400 w-20">{day.label}</span>
                    <div className="flex-1 h-6 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-[#ff7f00] to-[#ff9f00] rounded-full transition-all duration-500"
                        style={{ width: `${(day.count / maxDaily) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-slate-800 dark:text-white w-8 text-right">{day.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Weekly Evolution Chart */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#ff7f00]" />
                Évolution hebdomadaire
              </h3>
              <div className="space-y-3">
                {data.weeklyStats.map((week, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <span className="text-sm text-slate-500 dark:text-slate-400 w-24">{week.label}</span>
                    <div className="flex-1 h-6 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${(week.count / maxWeekly) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-slate-800 dark:text-white w-8 text-right">{week.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Status Distribution */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Répartition par statut</h3>
              <div className="space-y-3">
                <StatusRow label="En attente" count={data.stats.pending_activation} total={data.stats.total} color="amber" />
                <StatusRow label="Actifs" count={data.stats.active} total={data.stats.total} color="emerald" />
                <StatusRow label="Scannés" count={data.stats.scanned} total={data.stats.total} color="blue" />
                <StatusRow label="Perdus" count={data.stats.lost} total={data.stats.total} color="rose" />
                <StatusRow label="Retrouvés" count={data.stats.found} total={data.stats.total} color="green" />
              </div>
            </div>

            {/* Type Distribution */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Par type</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl">
                  <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                    <Plane className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Hajj</p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-white">{data.stats.hajj}</p>
                  </div>
                  <span className="text-sm text-emerald-500 font-medium">
                    {data.stats.total > 0 ? Math.round((data.stats.hajj / data.stats.total) * 100) : 0}%
                  </span>
                </div>
                <div className="flex items-center gap-4 p-4 bg-amber-50 dark:bg-amber-500/10 rounded-xl">
                  <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
                    <Luggage className="w-6 h-6 text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Voyageur</p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-white">{data.stats.voyageur}</p>
                  </div>
                  <span className="text-sm text-amber-500 font-medium">
                    {data.stats.total > 0 ? Math.round((data.stats.voyageur / data.stats.total) * 100) : 0}%
                  </span>
                </div>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Indicateurs clés</h3>
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-500 dark:text-slate-400 text-sm">Taux de récupération</span>
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                  </div>
                  <p className="text-3xl font-bold text-emerald-500">{data.recoveryRate}%</p>
                  <p className="text-xs text-slate-400 mt-1">Bagages retrouvés / perdus</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-500 dark:text-slate-400 text-sm">Scans enregistrés</span>
                    <QrCode className="w-4 h-4 text-[#ff7f00]" />
                  </div>
                  <p className="text-3xl font-bold text-[#ff7f00]">{data.scanLogsCount}</p>
                  <p className="text-xs text-slate-400 mt-1">Total sur la période</p>
                </div>
              </div>
            </div>
          </div>

          {/* Public Page Info */}
          <div className="bg-gradient-to-r from-[#ff7f00]/10 to-[#ff9f00]/10 rounded-2xl p-6 border border-[#ff7f00]/20">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-[#ff7f00]/20 rounded-xl flex items-center justify-center">
                <Share2 className="w-6 h-6 text-[#ff7f00]" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">
                  Page publique de votre agence
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-3">
                  Partagez ce lien avec vos clients pour leur montrer les bagages que vous protégez :
                </p>
                <code className="bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg text-sm text-[#ff7f00] border border-slate-200 dark:border-slate-700">
                  {typeof window !== 'undefined' ? window.location.origin : ''}/agency/{agencyData?.slug || 'agency'}
                </code>
              </div>
              <button
                onClick={handleSharePublicPage}
                className="px-4 py-2 bg-[#ff7f00] hover:bg-[#ff9f00] text-white rounded-xl text-sm font-medium transition-colors"
              >
                Copier le lien
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-20 text-slate-500">
          Aucune donnée disponible
        </div>
      )}
    </div>
  );
}

// Status Row Component
function StatusRow({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  const colorClasses: Record<string, string> = {
    amber: 'bg-amber-500',
    emerald: 'bg-emerald-500',
    blue: 'bg-blue-500',
    rose: 'bg-rose-500',
    green: 'bg-green-500',
    slate: 'bg-slate-400',
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-slate-500 dark:text-slate-400 w-24">{label}</span>
      <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div 
          className={`h-full ${colorClasses[color]} rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-sm font-medium text-slate-800 dark:text-white w-8 text-right">{count}</span>
    </div>
  );
}
