'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Ticket,
  DollarSign,
  Bus,
  PackageCheck,
  TrendingUp,
  TrendingDown,
  Clock,
  RefreshCw,
  AlertTriangle,
  Users,
  ArrowUpRight,
  BarChart3,
  Activity,
  Route,
  CalendarDays,
} from 'lucide-react';
import { useAgency } from '../layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
  ResponsiveContainer,
} from 'recharts';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface AnalyticsData {
  period: string;
  dateRange: { from: string; to: string };
  summary: {
    totalSales: number;
    totalRevenue: number;
    avgOccupancy: number;
    totalActiveNow: number;
    totalDelivered: number;
    avgDeliveryTime: string;
    recurrenceRate: number;
    totalPassengers: number;
    recurringPassengers: number;
  };
  charts: {
    salesOverTime: Array<{
      date: string;
      parcel: number;
      ticket: number;
      hajj: number;
      total: number;
    }>;
    topDestinations: Array<{
      name: string;
      fullName: string;
      count: number;
      rank: number;
    }>;
    occupancyByRoute: Array<{
      lineNumber: string;
      destination: string;
      totalSeats: number;
      soldSeats: number;
      availableSeats: number;
      occupancyRate: number;
      status: string;
      ticketCount: number;
    }>;
    topRoutes: Array<{
      rank: number;
      route: string;
      count: number;
    }>;
  };
}

type Period = 'day' | 'week' | 'month';

// ─── Chart Configs ────────────────────────────────────────────────────────────

const salesChartConfig = {
  parcel: { label: 'Colis', color: '#f97316' },
  ticket: { label: 'Tickets', color: '#3b82f6' },
  hajj: { label: 'Hajj', color: '#a855f7' },
} satisfies ChartConfig;

const destinationsChartConfig = {
  count: { label: 'Expeditions', color: '#10b981' },
} satisfies ChartConfig;

// ─── Helper: Format Currency ───────────────────────────────────────────────────

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('fr-FR').format(value);
}

// ─── Helper: Occupancy Color ──────────────────────────────────────────────────

function getOccupancyColor(rate: number): string {
  if (rate >= 80) return 'bg-emerald-500';
  if (rate >= 50) return 'bg-amber-500';
  return 'bg-rose-500';
}

function getOccupancyBadgeClass(rate: number): string {
  if (rate >= 80) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
  if (rate >= 50) return 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-800';
  return 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200 dark:border-rose-800';
}

function getOccupancyLabel(rate: number): string {
  if (rate >= 80) return 'Complet';
  if (rate >= 50) return 'Moyen';
  return 'Faible';
}

// ─── Helper: Status Badge ─────────────────────────────────────────────────────

function getStatusBadge(status: string) {
  const config: Record<string, { label: string; className: string }> = {
    SCHEDULED: { label: 'Programme', className: 'bg-slate-100 text-slate-700 dark:bg-slate-500/10 dark:text-slate-400 border-slate-200 dark:border-slate-700' },
    BOARDING: { label: 'Embarquement', className: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
    IN_TRANSIT: { label: 'En route', className: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800' },
    ARRIVED: { label: 'Arrive', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
    COMPLETED: { label: 'Termine', className: 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 border-purple-200 dark:border-purple-800' },
    CANCELLED: { label: 'Annule', className: 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200 dark:border-rose-800' },
  };
  const found = config[status] || { label: status, className: 'bg-slate-100 text-slate-700 dark:bg-slate-500/10 dark:text-slate-400 border-slate-200 dark:border-slate-700' };
  return (
    <Badge variant="outline" className={found.className}>
      {found.label}
    </Badge>
  );
}

// ─── Bar Gradient Colors ──────────────────────────────────────────────────────

const DESTINATION_COLORS = [
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6',
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
];

// ─── KPI Card Component ────────────────────────────────────────────────────────

function KPICard({
  label,
  value,
  icon,
  iconBg,
  accentColor,
  trend,
  loading,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
  accentColor: string;
  trend?: { value: number; isUp: boolean };
  loading?: boolean;
}) {
  return (
    <Card className="relative overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <div
        className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-5 -translate-y-8 translate-x-8"
        style={{ backgroundColor: accentColor }}
      />
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBg}`}>
            {icon}
          </div>
          {trend && (
            <div
              className={`flex items-center gap-1 text-sm font-semibold px-2 py-1 rounded-lg ${
                trend.isUp
                  ? 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10'
                  : 'text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-500/10'
              }`}
            >
              {trend.isUp ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              {Math.abs(trend.value)}%
            </div>
          )}
        </div>
        <div className="mt-4">
          {loading ? (
            <>
              <Skeleton className="h-8 w-24 mb-1.5" />
              <Skeleton className="h-4 w-20" />
            </>
          ) : (
            <>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">{label}</p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Metric Mini Card ──────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  icon,
  iconBg,
  loading,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
  loading?: boolean;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            {loading ? (
              <>
                <Skeleton className="h-5 w-16 mb-1" />
                <Skeleton className="h-3 w-24" />
              </>
            ) : (
              <>
                <p className="text-lg font-bold text-slate-900 dark:text-white truncate">{value}</p>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">{label}</p>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Loading Skeleton Grid ────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <Skeleton className="w-12 h-12 rounded-xl" />
              </div>
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-4 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full rounded-lg" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>
      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
              <Skeleton className="w-8 h-8 rounded" />
              <Skeleton className="h-4 w-32 flex-1" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </CardContent>
      </Card>
      {/* Metrics row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Error State ──────────────────────────────────────────────────────────────

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-500/10 flex items-center justify-center mb-4">
        <AlertTriangle className="w-8 h-8 text-rose-500" />
      </div>
      <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">
        Erreur de chargement
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-md mb-6">
        {message}
      </p>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 px-5 py-2.5 bg-[#FF1D8D] text-white rounded-xl font-medium hover:bg-[#FF1D8D]/90 transition-colors shadow-lg shadow-[#FF1D8D]/20"
      >
        <RefreshCw className="w-4 h-4" />
        Reessayer
      </button>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
        <BarChart3 className="w-8 h-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">
        Aucune donnee disponible
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-md">
        Les donnees analytiques apparaîtront ici une fois que vous aurez des ventes et des depart enregistres.
      </p>
    </div>
  );
}

// ─── Main Analytics Page ──────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { agencyId } = useAgency();
  const [period, setPeriod] = useState<Period>('day');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    if (!agencyId) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        period,
        agencyId,
      });
      const res = await fetch(`/api/agency/analytics?${params}`);

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || `Erreur ${res.status}`);
      }

      const json = await res.json();
      setData(json);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des donnees');
    } finally {
      setLoading(false);
    }
  }, [agencyId, period]);

  // Fetch data on mount and when period changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
    }, 300000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Period label map
  const periodLabels: Record<Period, string> = {
    day: "Aujourd'hui",
    week: 'Cette semaine',
    month: 'Ce mois',
  };

  const periodIcons: Record<Period, React.ReactNode> = {
    day: <CalendarDays className="w-4 h-4" />,
    week: <CalendarDays className="w-4 h-4" />,
    month: <CalendarDays className="w-4 h-4" />,
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* ─── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-[#FF1D8D]/10 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-[#FF1D8D]" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Analytics
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 ml-[52px]">
            Vue d&apos;ensemble de votre activite
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Period Selector */}
          <Select
            value={period}
            onValueChange={(v) => setPeriod(v as Period)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">
                <span className="flex items-center gap-2">
                  <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                  Aujourd&apos;hui
                </span>
              </SelectItem>
              <SelectItem value="week">
                <span className="flex items-center gap-2">
                  <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                  Cette semaine
                </span>
              </SelectItem>
              <SelectItem value="month">
                <span className="flex items-center gap-2">
                  <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                  Ce mois
                </span>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Refresh Button */}
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            title="Actualiser"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 dark:text-slate-400 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Last updated */}
          {lastUpdated && !loading && (
            <span className="text-xs text-slate-400 dark:text-slate-500 hidden sm:inline-flex items-center gap-1.5">
              <Activity className="w-3 h-3" />
              {lastUpdated.toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
        </div>
      </div>

      {/* ─── Content ────────────────────────────────────────────────── */}
      {error && !data ? (
        <ErrorState message={error} onRetry={fetchData} />
      ) : loading && !data ? (
        <LoadingSkeleton />
      ) : data && data.summary.totalSales === 0 && data.summary.totalRevenue === 0 && data.summary.totalDelivered === 0 ? (
        <EmptyState />
      ) : (
        data && (
          <div className="space-y-6">
            {/* ─── KPI Cards ─────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                label="Total Ventes"
                value={formatNumber(data.summary.totalSales)}
                icon={<Ticket className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />}
                iconBg="bg-emerald-100 dark:bg-emerald-500/10"
                accentColor="#10b981"
                trend={{ value: 12, isUp: true }}
                loading={loading}
              />
              <KPICard
                label="Revenus"
                value={formatCurrency(data.summary.totalRevenue)}
                icon={<DollarSign className="w-6 h-6 text-amber-600 dark:text-amber-400" />}
                iconBg="bg-amber-100 dark:bg-amber-500/10"
                accentColor="#f59e0b"
                trend={{ value: 8, isUp: true }}
                loading={loading}
              />
              <KPICard
                label="Occupation moy."
                value={`${data.summary.avgOccupancy}%`}
                icon={<Bus className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />}
                iconBg="bg-cyan-100 dark:bg-cyan-500/10"
                accentColor="#06b6d4"
                trend={{ value: 3, isUp: false }}
                loading={loading}
              />
              <KPICard
                label="Colis livres"
                value={formatNumber(data.summary.totalDelivered)}
                icon={<PackageCheck className="w-6 h-6 text-rose-600 dark:text-rose-400" />}
                iconBg="bg-rose-100 dark:bg-rose-500/10"
                accentColor="#f43f5e"
                trend={{ value: 15, isUp: true }}
                loading={loading}
              />
            </div>

            {/* ─── Charts Row ────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sales Over Time */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold">Ventes dans le temps</CardTitle>
                      <CardDescription>
                        {periodLabels[period]} - {data.charts.salesOverTime.length} point(s)
                      </CardDescription>
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-[#FF1D8D]/10 flex items-center justify-center">
                      <ArrowUpRight className="w-4 h-4 text-[#FF1D8D]" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {data.charts.salesOverTime.length === 0 ? (
                    <div className="flex items-center justify-center h-[280px] text-slate-400 dark:text-slate-500 text-sm">
                      Aucune donnee pour cette periode
                    </div>
                  ) : (
                    <ChartContainer config={salesChartConfig} className="h-[300px] w-full">
                      <LineChart
                        data={data.charts.salesOverTime}
                        margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                        <XAxis
                          dataKey="date"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 12 }}
                          className="text-muted-foreground"
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 12 }}
                          className="text-muted-foreground"
                          allowDecimals={false}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <ChartLegend content={<ChartLegendContent />} />
                        <Line
                          type="monotone"
                          dataKey="parcel"
                          stroke="var(--color-parcel)"
                          strokeWidth={2.5}
                          dot={false}
                          activeDot={{ r: 5, strokeWidth: 2, fill: 'var(--color-parcel)' }}
                        />
                        <Line
                          type="monotone"
                          dataKey="ticket"
                          stroke="var(--color-ticket)"
                          strokeWidth={2.5}
                          dot={false}
                          activeDot={{ r: 5, strokeWidth: 2, fill: 'var(--color-ticket)' }}
                        />
                        <Line
                          type="monotone"
                          dataKey="hajj"
                          stroke="var(--color-hajj)"
                          strokeWidth={2.5}
                          dot={false}
                          activeDot={{ r: 5, strokeWidth: 2, fill: 'var(--color-hajj)' }}
                        />
                      </LineChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>

              {/* Top Destinations */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold">Top Destinations</CardTitle>
                      <CardDescription>
                        Les plus frequentes - {periodLabels[period]}
                      </CardDescription>
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center">
                      <Route className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {data.charts.topDestinations.length === 0 ? (
                    <div className="flex items-center justify-center h-[280px] text-slate-400 dark:text-slate-500 text-sm">
                      Aucune destination pour cette periode
                    </div>
                  ) : (
                    <ChartContainer config={destinationsChartConfig} className="h-[300px] w-full">
                      <BarChart
                        data={data.charts.topDestinations}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" horizontal={false} />
                        <XAxis
                          type="number"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 12 }}
                          className="text-muted-foreground"
                          allowDecimals={false}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 12 }}
                          className="text-muted-foreground"
                          width={100}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={28}>
                          {data.charts.topDestinations.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={DESTINATION_COLORS[index % DESTINATION_COLORS.length]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ─── Occupancy Table ───────────────────────────────────── */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">Occupation par trajet</CardTitle>
                    <CardDescription>
                      Taux de remplissage des depart - {data.charts.occupancyByRoute.length} trajet(s)
                    </CardDescription>
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-cyan-100 dark:bg-cyan-500/10 flex items-center justify-center">
                    <Bus className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {data.charts.occupancyByRoute.length === 0 ? (
                  <div className="flex items-center justify-center py-16 text-slate-400 dark:text-slate-500 text-sm">
                    Aucun trajet pour cette periode
                  </div>
                ) : (
                  <div className="max-h-[420px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50/80 dark:bg-slate-800/50 hover:bg-transparent">
                          <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Trajet
                          </TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Ligne
                          </TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center">
                            Places
                          </TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 min-w-[160px]">
                            Taux d&apos;occupation
                          </TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center">
                            Statut
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.charts.occupancyByRoute.map((route, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                  <Route className="w-3.5 h-3.5 text-slate-500" />
                                </div>
                                <span className="font-medium text-slate-800 dark:text-slate-200 text-sm">
                                  {route.destination}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-slate-600 dark:text-slate-300 font-mono">
                                {route.lineNumber}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-sm text-slate-600 dark:text-slate-300">
                                <span className="font-semibold text-slate-900 dark:text-white">
                                  {route.soldSeats}
                                </span>
                                {' / '}
                                {route.totalSeats}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                                    {route.occupancyRate}%
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] px-1.5 py-0 ${getOccupancyBadgeClass(route.occupancyRate)}`}
                                  >
                                    {getOccupancyLabel(route.occupancyRate)}
                                  </Badge>
                                </div>
                                <Progress
                                  value={route.occupancyRate}
                                  className={`h-2 [&>[data-slot=progress-indicator]]:${getOccupancyColor(route.occupancyRate)} [&>[data-slot=progress-indicator]]:transition-all`}
                                />
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              {getStatusBadge(route.status)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ─── Additional Metrics Row ───────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                label="Temps de livraison moy."
                value={data.summary.avgDeliveryTime}
                icon={<Clock className="w-5 h-5 text-violet-600 dark:text-violet-400" />}
                iconBg="bg-violet-100 dark:bg-violet-500/10"
                loading={loading}
              />
              <MetricCard
                label="Taux de recurrence"
                value={`${data.summary.recurrenceRate}%`}
                icon={<Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
                iconBg="bg-emerald-100 dark:bg-emerald-500/10"
                loading={loading}
              />
              <MetricCard
                label="Actifs maintenant"
                value={formatNumber(data.summary.totalActiveNow)}
                icon={<Activity className="w-5 h-5 text-sky-600 dark:text-sky-400" />}
                iconBg="bg-sky-100 dark:bg-sky-500/10"
                loading={loading}
              />
              <MetricCard
                label="Total passagers"
                value={formatNumber(data.summary.totalPassengers)}
                icon={<Users className="w-5 h-5 text-orange-600 dark:text-orange-400" />}
                iconBg="bg-orange-100 dark:bg-orange-500/10"
                loading={loading}
              />
            </div>

            {/* ─── Top Routes ────────────────────────────────────────── */}
            {data.charts.topRoutes.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold">Top Trajets</CardTitle>
                      <CardDescription>
                        Les routes les plus empruntees - {periodLabels[period]}
                      </CardDescription>
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-[#FF1D8D]/10 flex items-center justify-center">
                      <Route className="w-4 h-4 text-[#FF1D8D]" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data.charts.topRoutes.map((route) => {
                      const maxCount = data.charts.topRoutes[0]?.count || 1;
                      const pct = Math.round((route.count / maxCount) * 100);
                      return (
                        <div key={route.rank} className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0">
                            {route.rank}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                                {route.route}
                              </span>
                              <span className="text-sm font-semibold text-slate-600 dark:text-slate-300 ml-2 shrink-0">
                                {formatNumber(route.count)}
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-[#FF1D8D] to-[#FF5DA0] transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )
      )}
    </div>
  );
}
