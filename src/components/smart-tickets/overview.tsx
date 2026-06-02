"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Building2,
  Users,
  Ticket,
  TrendingUp,
  ScrollText,
  Package,
  Truck,
  CheckCircle2,
  CircleDot,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api";
import { useAuthStore, type AuditLogEntry } from "@/stores/auth-store";
import { BRAND } from "@/lib/constants";

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

interface DashboardStats {
  // SUPER_ADMIN
  totalTenants?: number;
  activeTenants?: number;
  totalUsers?: number;
  usersByRole?: Record<string, number>;
  monthlyTickets?: number;
  monthlyParcels?: number;
  monthlyTicketRevenue?: number;
  monthlyParcelRevenue?: number;
  totalMonthlyRevenue?: number;
  todayDepartures?: number;
  recentActivity?: AuditLogEntry[];
  topRevenueTenants?: Array<{
    tenantId: string;
    tenantName: string;
    revenue: number;
  }>;
  // ADMIN
  todayTicketsActivated?: number;
  todayParcelsActivated?: number;
  monthlyRevenue?: number;
  parcelsInTransit?: number;
  // DRIVER
  todayDeliveries?: number;
  pendingDeliveries?: number;
  // CONTROLLER
  todayTicketsUsed?: number;
}

interface StatsResponse {
  role: string;
  data: DashboardStats;
}

// ────────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────────

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  UPDATE: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  DELETE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  LOGIN: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
};

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function formatRelativeTime(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), {
      addSuffix: true,
      locale: fr,
    });
  } catch {
    return dateStr;
  }
}

function formatCurrency(amount: number): string {
  return `${amount.toLocaleString("fr-FR")} ${BRAND.currency}`;
}

function formatNumber(value: number): string {
  return value.toLocaleString("fr-FR");
}

// ────────────────────────────────────────────────────────────────────────────
// Stat Card Skeleton
// ────────────────────────────────────────────────────────────────────────────

function StatCardSkeleton() {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <Skeleton className="h-4 w-28 mb-2" />
            <Skeleton className="h-8 w-16" />
          </div>
          <Skeleton className="h-10 w-10 rounded-xl" />
        </div>
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Stat Card
// ────────────────────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}

function StatCard({ title, value, icon: Icon, color, bg }: StatCardProps) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {value}
            </p>
          </div>
          <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${bg}`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Chart Skeleton
// ────────────────────────────────────────────────────────────────────────────

function ChartSkeleton() {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-5 w-48" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[260px] w-full rounded-lg" />
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Activity Feed
// ────────────────────────────────────────────────────────────────────────────

function ActivityFeed({ logs, isLoading }: { logs: AuditLogEntry[]; isLoading: boolean }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <ScrollText className="w-4 h-4 text-emerald-600" />
          Activité récente
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : logs.length > 0 ? (
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <Badge
                  variant="secondary"
                  className={`text-[10px] px-1.5 py-0 shrink-0 ${ACTION_COLORS[log.action] || ""}`}
                >
                  {log.action}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-900 dark:text-white truncate">
                    {log.user.firstName} {log.user.lastName}
                    <span className="text-muted-foreground">
                      {" "}
                      — {log.entity}
                      {log.entityId ? ` #${log.entityId.slice(0, 6)}` : ""}
                    </span>
                  </p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatRelativeTime(log.createdAt)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">
            Aucune activité récente
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Revenue Chart (SUPER_ADMIN / ADMIN)
// ────────────────────────────────────────────────────────────────────────────

function RevenueChart({
  stats,
  isLoading,
}: {
  stats: DashboardStats | null;
  isLoading: boolean;
}) {
  if (isLoading) return <ChartSkeleton />;

  const ticketRev = stats?.monthlyTicketRevenue ?? 0;
  const parcelRev = stats?.monthlyParcelRevenue ?? 0;

  const chartData = [
    {
      name: "Billets",
      revenue: ticketRev,
      fill: "#10b981",
    },
    {
      name: "Colis",
      revenue: parcelRev,
      fill: "#f59e0b",
    },
  ];

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          Revenus mensuels
        </CardTitle>
      </CardHeader>
      <CardContent>
        {ticketRev === 0 && parcelRev === 0 ? (
          <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">
            Aucun revenu ce mois
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} barSize={48}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="name"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                fontSize={12}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                tickFormatter={(v: number) =>
                  v >= 1000000
                    ? `${(v / 1000000).toFixed(1)}M`
                    : v >= 1000
                      ? `${(v / 1000).toFixed(0)}k`
                      : String(v)
                }
              />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                }}
              />
              <Bar
                dataKey="revenue"
                radius={[4, 4, 0, 0]}
                fill="#10b981"
              />
            </BarChart>
          </ResponsiveContainer>
        )}
        <div className="flex items-center justify-center gap-6 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
            Billets : {formatCurrency(ticketRev)}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
            Colis : {formatCurrency(parcelRev)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Top Revenue Tenants (SUPER_ADMIN)
// ────────────────────────────────────────────────────────────────────────────

function TopRevenueTenants({
  tenants,
  isLoading,
}: {
  tenants: Array<{ tenantName: string; revenue: number }>;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-5 w-44" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Building2 className="w-4 h-4 text-emerald-600" />
          Top transporteurs (revenus)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {tenants.length === 0 ? (
          <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
            Aucune donnée disponible
          </div>
        ) : (
          <div className="space-y-3">
            {tenants.map((t, i) => (
              <div
                key={t.tenantName}
                className="flex items-center justify-between py-1"
              >
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {t.tenantName}
                  </span>
                </div>
                <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(t.revenue)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Main Overview Component
// ────────────────────────────────────────────────────────────────────────────

export function Overview() {
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const result = await apiClient.fetch<StatsResponse>("/api/dashboard/stats");
      setRole(result.role);
      setStats(result.data);
    } catch {
      toast.error("Impossible de charger les statistiques.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // ── Skeletons while loading ──
  const skeletonCards = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        {skeletonCards}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    );
  }

  if (!stats) return null;

  // ── Build stat cards per role ──
  const cards: StatCardProps[] = [];

  switch (role) {
    case "SUPER_ADMIN":
      cards.push(
        {
          title: "Transporteurs actifs",
          value: formatNumber(stats.activeTenants ?? 0),
          icon: Building2,
          color: "text-emerald-600",
          bg: "bg-emerald-50 dark:bg-emerald-900/20",
        },
        {
          title: "Utilisateurs",
          value: formatNumber(stats.totalUsers ?? 0),
          icon: Users,
          color: "text-amber-600",
          bg: "bg-amber-50 dark:bg-amber-900/20",
        },
        {
          title: "Billets (mois)",
          value: formatNumber(stats.monthlyTickets ?? 0),
          icon: Ticket,
          color: "text-sky-600",
          bg: "bg-sky-50 dark:bg-sky-900/20",
        },
        {
          title: "Revenu (mois)",
          value: formatCurrency(stats.totalMonthlyRevenue ?? 0),
          icon: TrendingUp,
          color: "text-violet-600",
          bg: "bg-violet-50 dark:bg-violet-900/20",
        },
      );
      break;

    case "ADMIN":
      cards.push(
        {
          title: "Billets aujourd'hui",
          value: formatNumber(stats.todayTicketsActivated ?? 0),
          icon: Ticket,
          color: "text-emerald-600",
          bg: "bg-emerald-50 dark:bg-emerald-900/20",
        },
        {
          title: "Colis aujourd'hui",
          value: formatNumber(stats.todayParcelsActivated ?? 0),
          icon: Package,
          color: "text-amber-600",
          bg: "bg-amber-50 dark:bg-amber-900/20",
        },
        {
          title: "Départs",
          value: formatNumber(stats.todayDepartures ?? 0),
          icon: Truck,
          color: "text-sky-600",
          bg: "bg-sky-50 dark:bg-sky-900/20",
        },
        {
          title: "Revenu mensuel",
          value: formatCurrency(stats.monthlyRevenue ?? 0),
          icon: TrendingUp,
          color: "text-violet-600",
          bg: "bg-violet-50 dark:bg-violet-900/20",
        },
      );
      break;

    case "OPERATOR":
      cards.push(
        {
          title: "Billets aujourd'hui",
          value: formatNumber(stats.todayTicketsActivated ?? 0),
          icon: Ticket,
          color: "text-emerald-600",
          bg: "bg-emerald-50 dark:bg-emerald-900/20",
        },
        {
          title: "Colis aujourd'hui",
          value: formatNumber(stats.todayParcelsActivated ?? 0),
          icon: Package,
          color: "text-amber-600",
          bg: "bg-amber-50 dark:bg-amber-900/20",
        },
        {
          title: "Colis en transit",
          value: formatNumber(stats.parcelsInTransit ?? 0),
          icon: CircleDot,
          color: "text-sky-600",
          bg: "bg-sky-50 dark:bg-sky-900/20",
        },
        {
          title: "Départs",
          value: formatNumber(stats.todayDepartures ?? 0),
          icon: Truck,
          color: "text-violet-600",
          bg: "bg-violet-50 dark:bg-violet-900/20",
        },
      );
      break;

    case "DRIVER":
      cards.push(
        {
          title: "Livraisons aujourd'hui",
          value: formatNumber(stats.todayDeliveries ?? 0),
          icon: CheckCircle2,
          color: "text-emerald-600",
          bg: "bg-emerald-50 dark:bg-emerald-900/20",
        },
        {
          title: "Colis en attente",
          value: formatNumber(stats.pendingDeliveries ?? 0),
          icon: Package,
          color: "text-amber-600",
          bg: "bg-amber-50 dark:bg-amber-900/20",
        },
        {
          title: "Colis en transit",
          value: formatNumber(stats.parcelsInTransit ?? 0),
          icon: CircleDot,
          color: "text-sky-600",
          bg: "bg-sky-50 dark:bg-sky-900/20",
        },
      );
      break;

    case "CONTROLLER":
      cards.push(
        {
          title: "Billets validés",
          value: formatNumber(stats.todayTicketsUsed ?? 0),
          icon: CheckCircle2,
          color: "text-emerald-600",
          bg: "bg-emerald-50 dark:bg-emerald-900/20",
        },
        {
          title: "Départs aujourd'hui",
          value: formatNumber(stats.todayDepartures ?? 0),
          icon: Truck,
          color: "text-amber-600",
          bg: "bg-amber-50 dark:bg-amber-900/20",
        },
      );
      break;
  }

  // ── Determine what charts to show ──
  const showRevenueChart = role === "SUPER_ADMIN" || role === "ADMIN";
  const showTopTenants = role === "SUPER_ADMIN";

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </div>

      {/* Charts + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        {showRevenueChart && (
          <RevenueChart stats={stats} isLoading={false} />
        )}

        {/* Top Revenue Tenants (SUPER_ADMIN) */}
        {showTopTenants && (
          <TopRevenueTenants
            tenants={stats.topRevenueTenants ?? []}
            isLoading={false}
          />
        )}

        {/* Recent Activity */}
        <ActivityFeed logs={stats.recentActivity ?? []} isLoading={false} />
      </div>
    </div>
  );
}
