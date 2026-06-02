"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Building2,
  Users,
  Ticket,
  TrendingUp,
  Package,
  Clock,
  Bell,
  Settings,
  Shield,
  Download,
  Calendar,
  Activity,
  Loader2,
  Lock,
  Unlock,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { apiClient } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

// ─── Types ───

interface DashboardSummary {
  totalTenants: number;
  activeTenants: number;
  totalUsers: number;
  usersByRole: Record<string, number>;
  monthlyTickets: number;
  monthlyTicketRevenue: number;
  monthlyParcels: number;
  monthlyParcelRevenue: number;
  totalMonthlyRevenue: number;
  todayDepartures: number;
  notificationsByStatus: Record<string, number>;
}

interface RecentActivityItem {
  id: string;
  action: string;
  entity: string;
  createdAt: string;
  user: { firstName: string; lastName: string; email: string };
  tenant: { name: string } | null;
}

interface TopRevenueTenant {
  tenantId: string;
  tenantName: string;
  ticketRevenue: number;
  parcelRevenue: number;
  totalRevenue: number;
}

interface DashboardData {
  summary: DashboardSummary;
  recentActivity: RecentActivityItem[];
  topRevenueTenants: TopRevenueTenant[];
}

interface PlatformSetting {
  id: string;
  key: string;
  value: string;
  description: string | null;
  type: string;
}

interface PlatformSettingsData {
  settings: PlatformSetting[];
  settingsMap: Record<string, string>;
}

interface PlatformReportData {
  tenants: { total: number; active: number; inactive: number };
  users: { total: number; byRole: Record<string, number> };
  revenue: {
    total: number;
    byTenant: Array<{ tenantId: string; tenantName: string; revenue: number }>;
    byMonth: Array<{ month: string; revenue: number }>;
  };
  topTenants: Array<{
    tenantId: string;
    tenantName: string;
    tickets: number;
    parcels: number;
    revenue: number;
  }>;
}

// ─── Helpers ───

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

function formatCurrency(value: number): string {
  return value.toLocaleString("fr-FR") + " FCFA";
}

function formatNumber(value: number): string {
  return value.toLocaleString("fr-FR");
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  UPDATE: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  DELETE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  LOGIN: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
};

const REVENUE_BAR_COLORS = ["#10b981", "#34d399", "#6ee7b7", "#a7f3d0", "#d1fae5"];

// ─── KPI Card Skeleton ───

function KpiCardSkeleton() {
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

// ─── KPI Cards Grid ───

function KpiCards({ data, isLoading }: { data: DashboardSummary | null; isLoading: boolean }) {
  const cards = [
    {
      title: "Transporteurs Actifs",
      value: data?.activeTenants ?? 0,
      subtitle: `${data?.totalTenants ?? 0} total`,
      icon: Building2,
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      format: formatNumber,
    },
    {
      title: "Utilisateurs",
      value: data?.totalUsers ?? 0,
      subtitle: data?.usersByRole ? Object.entries(data.usersByRole).map(([role, count]) => `${role}: ${count}`).join(" · ") : "",
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-900/20",
      format: formatNumber,
    },
    {
      title: "Tickets du mois",
      value: data?.monthlyTickets ?? 0,
      subtitle: `Revenus: ${formatCurrency(data?.monthlyTicketRevenue ?? 0)}`,
      icon: Ticket,
      color: "text-amber-600",
      bg: "bg-amber-50 dark:bg-amber-900/20",
      format: formatNumber,
    },
    {
      title: "Revenus Mensuels",
      value: data?.totalMonthlyRevenue ?? 0,
      subtitle: "Tickets + Colis",
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      format: formatCurrency,
    },
    {
      title: "Colis du mois",
      value: data?.monthlyParcels ?? 0,
      subtitle: `Revenus: ${formatCurrency(data?.monthlyParcelRevenue ?? 0)}`,
      icon: Package,
      color: "text-violet-600",
      bg: "bg-violet-50 dark:bg-violet-900/20",
      format: formatNumber,
    },
    {
      title: "Revenus Colis",
      value: data?.monthlyParcelRevenue ?? 0,
      subtitle: `${formatNumber(data?.monthlyParcels ?? 0)} colis`,
      icon: Package,
      color: "text-violet-600",
      bg: "bg-violet-50 dark:bg-violet-900/20",
      format: formatCurrency,
    },
    {
      title: "Départs Aujourd'hui",
      value: data?.todayDepartures ?? 0,
      subtitle: "Programmés",
      icon: Clock,
      color: "text-sky-600",
      bg: "bg-sky-50 dark:bg-sky-900/20",
      format: formatNumber,
    },
    {
      title: "Notifications",
      value: data?.notificationsByStatus ? Object.values(data.notificationsByStatus).reduce((a, b) => a + b, 0) : 0,
      subtitle: data?.notificationsByStatus ? Object.entries(data.notificationsByStatus).map(([s, c]) => `${s}: ${c}`).join(" · ") : "",
      icon: Bell,
      color: "text-amber-600",
      bg: "bg-amber-50 dark:bg-amber-900/20",
      format: formatNumber,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {isLoading
        ? Array.from({ length: 8 }).map((_, i) => <KpiCardSkeleton key={i} />)
        : cards.map((card) => (
            <Card key={card.title} className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-muted-foreground">{card.title}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {card.format(card.value as number)}
                    </p>
                    {card.subtitle && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {card.subtitle}
                      </p>
                    )}
                  </div>
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-xl shrink-0 ml-3 ${card.bg}`}
                  >
                    <card.icon className={`w-5 h-5 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
    </div>
  );
}

// ─── Top Revenue Chart ───

function TopRevenueChart({
  data,
  isLoading,
}: {
  data: TopRevenueTenant[];
  isLoading: boolean;
}) {
  const chartData = data
    .slice(0, 5)
    .map((t) => ({
      name:
        t.tenantName.length > 18
          ? t.tenantName.slice(0, 18) + "…"
          : t.tenantName,
      revenue: t.totalRevenue,
      ticketRevenue: t.ticketRevenue,
      parcelRevenue: t.parcelRevenue,
    }));

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          Top Transporteurs par Revenus
        </CardTitle>
        <CardDescription>
          Les 5 transporteurs les plus performants ce mois
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[280px] w-full" />
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 0, right: 30, left: 10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis
                type="number"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
              />
              <YAxis
                type="category"
                dataKey="name"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={100}
              />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), "Revenus"]}
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="revenue" radius={[0, 4, 4, 0]} maxBarSize={28}>
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={REVENUE_BAR_COLORS[index % REVENUE_BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
            Aucune donnée disponible
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Recent Activity Timeline ───

function RecentActivityTimeline({
  data,
  isLoading,
}: {
  data: RecentActivityItem[];
  isLoading: boolean;
}) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-600" />
          Activité Récente
        </CardTitle>
        <CardDescription>
          Les 10 dernières actions enregistrées
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-3 w-20 shrink-0" />
              </div>
            ))}
          </div>
        ) : data.length > 0 ? (
          <div className="space-y-1">
            {data.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 py-3 px-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <Badge
                  variant="secondary"
                  className={`text-[10px] px-1.5 py-0 shrink-0 mt-0.5 ${
                    ACTION_COLORS[item.action] || ""
                  }`}
                >
                  {item.action}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-900 dark:text-white">
                    <span className="font-medium">
                      {item.user.firstName} {item.user.lastName}
                    </span>
                    <span className="text-muted-foreground">
                      {" "}&mdash; {item.entity}
                    </span>
                  </p>
                  {item.tenant && (
                    <p className="text-xs text-muted-foreground">
                      {item.tenant.name}
                    </p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">
                  {formatRelativeTime(item.createdAt)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
            Aucune activité récente
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Dashboard Tab ───

function DashboardTab() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await apiClient.fetch<DashboardData>(
        "/api/superadmin/dashboard"
      );
      setData(result);
    } catch {
      toast.error("Impossible de charger les données du tableau de bord.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return (
    <div className="space-y-6">
      <KpiCards data={data?.summary ?? null} isLoading={isLoading} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopRevenueChart
          data={data?.topRevenueTenants ?? []}
          isLoading={isLoading}
        />
        <RecentActivityTimeline
          data={data?.recentActivity ?? []}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}

// ─── Platform Settings Tab ───

function PlatformSettingsTab() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [originalMap, setOriginalMap] = useState<Record<string, string>>({});
  const [form, setForm] = useState<Record<string, string>>({
    platform_name: "SmartTicketQR",
    platform_url: "",
    default_currency: "FCFA",
    default_language: "fr",
    whatsapp_api_url: "",
    whatsapp_api_token: "",
    email_from_default: "",
    maintenance_mode: "false",
    max_tenants_free_plan: "5",
    session_timeout_minutes: "60",
  });

  const settingsMeta: Array<{
    key: string;
    label: string;
    type: "text" | "email" | "password" | "number" | "select" | "switch";
    description: string;
    options?: Array<{ value: string; label: string }>;
  }> = [
    {
      key: "platform_name",
      label: "Nom de la plateforme",
      type: "text",
      description: "Nom affiché sur l'interface et les emails",
    },
    {
      key: "platform_url",
      label: "URL de la plateforme",
      type: "text",
      description: "URL de base de l'application (ex: https://app.smarttickets.com)",
    },
    {
      key: "default_currency",
      label: "Devise par défaut",
      type: "text",
      description: "Code de la devise utilisée par défaut (ex: FCFA, XOF)",
    },
    {
      key: "default_language",
      label: "Langue par défaut",
      type: "select",
      description: "Langue de l'interface pour les nouveaux transporteurs",
      options: [
        { value: "fr", label: "Français" },
        { value: "en", label: "English" },
      ],
    },
    {
      key: "whatsapp_api_url",
      label: "URL API WhatsApp",
      type: "text",
      description: "URL de l'API WhatsApp Business pour l'envoi de notifications",
    },
    {
      key: "whatsapp_api_token",
      label: "Token API WhatsApp",
      type: "password",
      description: "Jeton d'authentification pour l'API WhatsApp Business",
    },
    {
      key: "email_from_default",
      label: "Email expediteur par défaut",
      type: "email",
      description: "Adresse email utilisée pour les notifications par email",
    },
    {
      key: "maintenance_mode",
      label: "Mode maintenance",
      type: "switch",
      description: "Activer le mode maintenance pour empêcher l'accès public",
    },
    {
      key: "max_tenants_free_plan",
      label: "Max transporteurs (plan gratuit)",
      type: "number",
      description: "Nombre maximum de transporteurs autorisés sur le plan gratuit",
    },
    {
      key: "session_timeout_minutes",
      label: "Délai d'expiration de session (min)",
      type: "number",
      description: "Durée de vie de la session en minutes",
    },
  ];

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await apiClient.fetch<PlatformSettingsData>(
        "/api/superadmin/platform-settings"
      );
      setOriginalMap(result.settingsMap);
      setForm((prev) => ({
        ...prev,
        ...result.settingsMap,
      }));
    } catch {
      toast.error("Impossible de charger les paramètres de la plateforme.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    try {
      setIsSaving(true);

      const settingsPayload = settingsMeta.map((meta) => ({
        key: meta.key,
        value: form[meta.key] ?? "",
        description: meta.description,
        type: meta.type === "switch" ? "boolean" : meta.type,
      }));

      await apiClient.fetch("/api/superadmin/platform-settings", {
        method: "PUT",
        body: JSON.stringify({ settings: settingsPayload }),
      });

      toast.success("Paramètres sauvegardés avec succès !");
    } catch {
      toast.error("Impossible de sauvegarder les paramètres.");
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const isDirty = Object.keys(form).some(
    (key) => form[key] !== (originalMap[key] ?? form[key])
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-600" />
            Paramètres Plateforme
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Configurer les paramètres globaux de la plateforme
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving || !isDirty}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sauvegarde…
            </>
          ) : (
            <>
              <Shield className="mr-2 h-4 w-4" />
              Sauvegarder
            </>
          )}
        </Button>
      </div>

      <Separator />

      {isLoading ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6 space-y-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-10 flex-1" />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6 space-y-6">
            {settingsMeta.map((meta) => (
              <div key={meta.key} className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-2 md:gap-6 items-start">
                <div className="space-y-1">
                  <Label htmlFor={meta.key} className="text-sm font-medium">
                    {meta.label}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {meta.description}
                  </p>
                </div>
                <div>
                  {meta.type === "switch" ? (
                    <div className="flex items-center gap-3">
                      <Switch
                        id={meta.key}
                        checked={form[meta.key] === "true"}
                        onCheckedChange={(checked) =>
                          updateField(meta.key, checked ? "true" : "false")
                        }
                      />
                      <span className="text-sm text-muted-foreground">
                        {form[meta.key] === "true" ? "Activé" : "Désactivé"}
                      </span>
                    </div>
                  ) : meta.type === "select" ? (
                    <Select
                      value={form[meta.key] ?? ""}
                      onValueChange={(value) => updateField(meta.key, value)}
                    >
                      <SelectTrigger id={meta.key} className="w-full">
                        <SelectValue placeholder="Sélectionner…" />
                      </SelectTrigger>
                      <SelectContent>
                        {meta.options?.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id={meta.key}
                      type={meta.type}
                      value={form[meta.key] ?? ""}
                      onChange={(e) => updateField(meta.key, e.target.value)}
                      className="max-w-md"
                    />
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Global Reports Tab ───

function GlobalReportsTab() {
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<PlatformReportData | null>(null);
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return format(new Date(now.getFullYear(), now.getMonth(), 1), "yyyy-MM-dd");
  });
  const [endDate, setEndDate] = useState(() =>
    format(new Date(), "yyyy-MM-dd")
  );

  const fetchReport = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      const result = await apiClient.fetch<PlatformReportData>(
        `/api/superadmin/reports?${params.toString()}`
      );
      setReport(result);
    } catch {
      toast.error("Impossible de charger le rapport global.");
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleExportCSV = () => {
    if (!report) return;

    try {
      const headers = ["Transporteur", "Revenus (FCFA)"];
      const rows = report.revenue.byTenant.map((t) => [
        t.tenantName,
        String(t.revenue),
      ]);
      const csvContent =
        [headers.join(","), ...rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `rapport-global-${startDate}-${endDate}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Rapport CSV exporté avec succès !");
    } catch {
      toast.error("Impossible d'exporter le rapport CSV.");
    }
  };

  const monthlyChartData = (report?.revenue.byMonth ?? [])
    .slice()
    .reverse()
    .map((m) => ({
      month: m.month,
      revenue: m.revenue,
    }));

  const tenantChartData = (report?.revenue.byTenant ?? [])
    .slice(0, 10)
    .map((t) => ({
      name:
        t.tenantName.length > 18
          ? t.tenantName.slice(0, 18) + "…"
          : t.tenantName,
      revenue: t.revenue,
    }));

  return (
    <div className="space-y-6">
      {/* Date Range Picker */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Calendar className="w-4 h-4" />
              Période :
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="space-y-1">
                <Label htmlFor="report-start" className="text-xs">
                  Début
                </Label>
                <Input
                  id="report-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-auto"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="report-end" className="text-xs">
                  Fin
                </Label>
                <Input
                  id="report-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-auto"
                />
              </div>
              <Button
                onClick={fetchReport}
                disabled={isLoading}
                variant="outline"
                className="mt-5"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Calendar className="mr-2 h-4 w-4" />
                )}
                Actualiser
              </Button>
              <Button
                onClick={handleExportCSV}
                disabled={!report || isLoading}
                variant="outline"
                className="mt-5"
              >
                <Download className="mr-2 h-4 w-4" />
                Exporter CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <KpiCardSkeleton key={i} />
          ))}
        </div>
      ) : report ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Total Transporteurs</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {formatNumber(report.tenants.total)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatNumber(report.tenants.active)} actifs ·{" "}
                {formatNumber(report.tenants.inactive)} inactifs
              </p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Total Utilisateurs</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {formatNumber(report.users.total)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {Object.entries(report.users.byRole)
                  .map(([role, count]) => `${role}: ${count}`)
                  .join(" · ")}
              </p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Revenus Totaux</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                {formatCurrency(report.revenue.total)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Sur la période sélectionnée
              </p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Top Transporteur</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {report.topTenants.length > 0
                  ? report.topTenants[0].tenantName.length > 16
                    ? report.topTenants[0].tenantName.slice(0, 16) + "…"
                    : report.topTenants[0].tenantName
                  : "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {report.topTenants.length > 0
                  ? formatCurrency(report.topTenants[0].revenue)
                  : "Aucune donnée"}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Users by Role Table */}
      {isLoading ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <Skeleton className="h-4 w-48 mb-4" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      ) : report ? (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              Utilisateurs par rôle
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rôle</TableHead>
                  <TableHead className="text-right">Nombre</TableHead>
                  <TableHead className="text-right">Pourcentage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(report.users.byRole).map(([role, count]) => (
                  <TableRow key={role}>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatNumber(count)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {report.users.total > 0
                        ? ((count / report.users.total) * 100).toFixed(1)
                        : 0}
                      %
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      {/* Revenue by Month Chart */}
      {isLoading ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <Skeleton className="h-4 w-48 mb-4" />
            <Skeleton className="h-[280px] w-full" />
          </CardContent>
        </Card>
      ) : report ? (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Revenus par mois
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="month"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: number) => [
                      formatCurrency(value),
                      "Revenus",
                    ]}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid var(--border)",
                      boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                      fontSize: "12px",
                    }}
                  />
                  <Bar
                    dataKey="revenue"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={48}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
                Aucune donnée de revenus mensuels
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* Revenue by Tenant Chart */}
      {isLoading ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <Skeleton className="h-4 w-48 mb-4" />
            <Skeleton className="h-[320px] w-full" />
          </CardContent>
        </Card>
      ) : report ? (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-600" />
              Revenus par transporteur
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tenantChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(200, tenantChartData.length * 40)}>
                <BarChart
                  data={tenantChartData}
                  layout="vertical"
                  margin={{ top: 0, right: 30, left: 10, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) =>
                      `${(v / 1000).toFixed(0)}k`
                    }
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    width={100}
                  />
                  <Tooltip
                    formatter={(value: number) => [
                      formatCurrency(value),
                      "Revenus",
                    ]}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid var(--border)",
                      boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="revenue" radius={[0, 4, 4, 0]} maxBarSize={24}>
                    {tenantChartData.map((_, index) => (
                      <Cell
                        key={`tenant-cell-${index}`}
                        fill={
                          REVENUE_BAR_COLORS[index % REVENUE_BAR_COLORS.length]
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[320px] text-muted-foreground text-sm">
                Aucune donnée de revenus par transporteur
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

// ─── Generation Control Tab ───

interface TenantGenerationRow {
  id: string;
  name: string;
  slug: string;
  plan: string;
  isActive: boolean;
  allowSelfTicketGeneration: boolean;
  allowSelfParcelGeneration: boolean;
  _count: { users: number };
}

function GenerationControlTab() {
  const [tenants, setTenants] = useState<TenantGenerationRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [toggleField, setToggleField] = useState<string | null>(null);

  const fetchTenants = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await apiClient.fetch<{
        data: TenantGenerationRow[];
      }>("/api/tenants?limit=100");
      setTenants(result.data);
    } catch {
      toast.error(
        "Impossible de charger la liste des transporteurs."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const handleToggle = async (
    tenantId: string,
    field:
      | "allowSelfTicketGeneration"
      | "allowSelfParcelGeneration",
    currentValue: boolean
  ) => {
    setTogglingId(tenantId);
    setToggleField(field);
    try {
      await apiClient.fetch(
        `/api/superadmin/tenants/${tenantId}/generation`,
        {
          method: "PATCH",
          body: JSON.stringify({ [field]: !currentValue }),
        }
      );
      // Optimistic update
      setTenants((prev) =>
        prev.map((t) =>
          t.id === tenantId ? { ...t, [field]: !currentValue } : t
        )
      );
      toast.success(
        `${field === "allowSelfTicketGeneration" ? "Génération de tickets" : "Génération de colis"} ${!currentValue ? "activée" : "désactivée"} avec succès.`
      );
    } catch {
      toast.error("Impossible de modifier le paramètre.");
    } finally {
      setTogglingId(null);
      setToggleField(null);
    }
  };

  const enabledTicketCount = tenants.filter(
    (t) => t.allowSelfTicketGeneration
  ).length;
  const enabledParcelCount = tenants.filter(
    (t) => t.allowSelfParcelGeneration
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-600" />
            Contrôle de Génération
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Gérer les autorisations de génération par transporteur.
            Par défaut, seul le Superadmin peut générer.
          </p>
        </div>
        <Button
          onClick={fetchTenants}
          disabled={isLoading}
          variant="outline"
          size="sm"
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
          />
          Actualiser
        </Button>
      </div>

      {/* Info Banner */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 p-4">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-800 dark:text-amber-300">
              Règle métier par défaut
            </p>
            <p className="text-amber-700 dark:text-amber-400 mt-1">
              Seul le <strong>Superadmin</strong> peut générer des lots de tickets/colis
              pré-imprimés. Le Transporteur Admin ne fait qu&apos;<strong>activer</strong> les
              tickets au guichet. Activez les toggles ci-dessous pour autoriser un
              transporteur à générer ses propres lots.
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800">
                <Building2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {tenants.length}
                </p>
                <p className="text-xs text-muted-foreground">
                  Transporteurs
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
                <Ticket className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {enabledTicketCount}
                </p>
                <p className="text-xs text-muted-foreground">
                  Auto-tickets activés
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-900/20">
                <Package className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {enabledParcelCount}
                </p>
                <p className="text-xs text-muted-foreground">
                  Auto-colis activés
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-600" />
            Autorisations par Transporteur
          </CardTitle>
          <CardDescription>
            Activez/désactivez la génération autonome pour chaque transporteur
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4"
                >
                  <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-12" />
                  <Skeleton className="h-6 w-12" />
                </div>
              ))}
            </div>
          ) : tenants.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
              Aucun transporteur enregistré.
            </div>
          ) : (
            <div className="space-y-1">
              {/* Table Header */}
              <div className="grid grid-cols-[1fr_80px_80px] sm:grid-cols-[1fr_100px_100px] gap-4 px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b">
                <span>Transporteur</span>
                <span className="text-center">Tickets</span>
                <span className="text-center">Colis</span>
              </div>

              {/* Tenant Rows */}
              {tenants.map((tenant) => {
                const isTogglingThis =
                  togglingId === tenant.id;
                return (
                  <div
                    key={tenant.id}
                    className="grid grid-cols-[1fr_80px_80px] sm:grid-cols-[1fr_100px_100px] gap-4 items-center px-3 py-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    {/* Tenant Info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex items-center justify-center w-9 h-9 rounded-lg shrink-0 ${
                          tenant.isActive
                            ? "bg-emerald-100 dark:bg-emerald-900/30"
                            : "bg-gray-100 dark:bg-gray-800"
                        }`}
                      >
                        {tenant.allowSelfTicketGeneration ||
                        tenant.allowSelfParcelGeneration ? (
                          <Unlock className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Lock className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {tenant.name}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className={`text-[10px] px-1.5 py-0 ${
                              tenant.isActive
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                            }`}
                          >
                            {tenant.plan}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {tenant._count.users} utilisateur(s)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Ticket Toggle */}
                    <div className="flex justify-center">
                      <div className="flex items-center gap-1.5">
                        <Switch
                          checked={tenant.allowSelfTicketGeneration}
                          disabled={isTogglingThis}
                          onCheckedChange={() =>
                            handleToggle(
                              tenant.id,
                              "allowSelfTicketGeneration",
                              tenant.allowSelfTicketGeneration
                            )
                          }
                          className="data-[state=checked]:bg-emerald-600"
                        />
                        {isTogglingThis &&
                          toggleField ===
                            "allowSelfTicketGeneration" && (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                          )}
                      </div>
                    </div>

                    {/* Parcel Toggle */}
                    <div className="flex justify-center">
                      <div className="flex items-center gap-1.5">
                        <Switch
                          checked={tenant.allowSelfParcelGeneration}
                          disabled={isTogglingThis}
                          onCheckedChange={() =>
                            handleToggle(
                              tenant.id,
                              "allowSelfParcelGeneration",
                              tenant.allowSelfParcelGeneration
                            )
                          }
                          className="data-[state=checked]:bg-violet-600"
                        />
                        {isTogglingThis &&
                          toggleField ===
                            "allowSelfParcelGeneration" && (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                          )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Workflow Diagram */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">
            Flux de Génération
          </CardTitle>
          <CardDescription>
            Comment fonctionne le contrôle de génération dans SmartTicketS
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Toggle OFF (Default) */}
            <div className="rounded-lg border-2 border-amber-200 dark:border-amber-800 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-600" />
                <Badge
                  variant="secondary"
                  className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs"
                >
                  Toggle OFF (Par défaut)
                </Badge>
              </div>
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-amber-600 min-w-[20px]">1.</span>
                  <span>Superadmin génère le lot de tickets/colis</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-amber-600 min-w-[20px]">2.</span>
                  <span>Superadmin exporte le PDF des QR codes</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-amber-600 min-w-[20px]">3.</span>
                  <span>Superadmin livre les tickets au Transporteur</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-amber-600 min-w-[20px]">4.</span>
                  <span>Transporteur active les tickets au guichet</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-amber-600 min-w-[20px]">5.</span>
                  <span>Envoi WhatsApp au passager</span>
                </li>
              </ol>
            </div>

            {/* Toggle ON */}
            <div className="rounded-lg border-2 border-emerald-200 dark:border-emerald-800 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Unlock className="w-4 h-4 text-emerald-600" />
                <Badge
                  variant="secondary"
                  className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs"
                >
                  Toggle ON (Activé)
                </Badge>
              </div>
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-emerald-600 min-w-[20px]">1.</span>
                  <span>Admin Transporteur génère directement ses lots</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-emerald-600 min-w-[20px]">2.</span>
                  <span>Admin exporte le PDF des QR codes</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-emerald-600 min-w-[20px]">3.</span>
                  <span>Opérateurs activent les tickets au guichet</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-emerald-600 min-w-[20px]">4.</span>
                  <span>Envoi WhatsApp au passager</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-emerald-600 min-w-[20px]">5.</span>
                  <span>Superadmin conserve le contrôle qualité</span>
                </li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Component ───

export function SuperadminDashboard() {
  const user = useAuthStore((s) => s.user);

  if (!user || user.role !== "SUPER_ADMIN") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto" />
          <h2 className="text-lg font-semibold">Accès restreint</h2>
          <p className="text-sm text-muted-foreground">
            Cette section est réservée aux super-administrateurs.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Shield className="w-6 h-6 text-emerald-600" />
          Superadmin Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Vue d&apos;ensemble de la plateforme SmartTicketS
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-1 h-auto">
          <TabsTrigger
            value="dashboard"
            className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white rounded-md px-4 py-2 text-sm"
          >
            <Activity className="w-4 h-4 mr-2" />
            Tableau de bord
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white rounded-md px-4 py-2 text-sm"
          >
            <Settings className="w-4 h-4 mr-2" />
            Paramètres Plateforme
          </TabsTrigger>
          <TabsTrigger
            value="generation"
            className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white rounded-md px-4 py-2 text-sm"
          >
            <Shield className="w-4 h-4 mr-2" />
            Contrôle Génération
          </TabsTrigger>
          <TabsTrigger
            value="reports"
            className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white rounded-md px-4 py-2 text-sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Rapports Globaux
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <DashboardTab />
        </TabsContent>
        <TabsContent value="settings">
          <PlatformSettingsTab />
        </TabsContent>
        <TabsContent value="generation">
          <GenerationControlTab />
        </TabsContent>
        <TabsContent value="reports">
          <GlobalReportsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
