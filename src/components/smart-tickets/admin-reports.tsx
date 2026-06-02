"use client";

import { useState, useCallback } from "react";
import {
  BarChart3,
  TrendingUp,
  Package,
  Ticket,
  Clock,
  Download,
  Calendar,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
} from "date-fns";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiClient } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import type { TenantReportData } from "@/lib/reports";
import { usePdfExport } from "@/hooks/use-pdf-export";

type DatePreset = "month" | "quarter" | "year" | "custom";

function applyPreset(preset: DatePreset): { start: string; end: string } {
  const now = new Date();
  switch (preset) {
    case "month":
      return {
        start: format(startOfMonth(now), "yyyy-MM-dd"),
        end: format(endOfMonth(now), "yyyy-MM-dd"),
      };
    case "quarter":
      return {
        start: format(startOfQuarter(now), "yyyy-MM-dd"),
        end: format(endOfQuarter(now), "yyyy-MM-dd"),
      };
    case "year":
      return {
        start: format(startOfYear(now), "yyyy-MM-dd"),
        end: format(endOfYear(now), "yyyy-MM-dd"),
      };
    default:
      return {
        start: format(startOfMonth(now), "yyyy-MM-dd"),
        end: format(endOfMonth(now), "yyyy-MM-dd"),
      };
  }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value) + " FCFA";
}

function formatShortCurrency(value: number): string {
  if (value >= 1_000_000) {
    return (value / 1_000_000).toFixed(1).replace(".0", "") + "M";
  }
  if (value >= 1_000) {
    return (value / 1_000).toFixed(0) + "k";
  }
  return String(value);
}

export function AdminReports() {
  const user = useAuthStore((s) => s.user);

  const [preset, setPreset] = useState<DatePreset>("month");
  const [startDate, setStartDate] = useState(() =>
    format(startOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(() =>
    format(endOfMonth(new Date()), "yyyy-MM-dd")
  );

  const [report, setReport] = useState<TenantReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { exportSalesReport, isExporting: isPdfExporting } = usePdfExport();

  const handlePresetChange = useCallback((value: string) => {
    const p = value as DatePreset;
    setPreset(p);
    if (p !== "custom") {
      const range = applyPreset(p);
      setStartDate(range.start);
      setEndDate(range.end);
    }
  }, []);

  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
      });
      if (user?.role === "SUPER_ADMIN" && user.tenantId) {
        params.set("tenantId", user.tenantId);
      }
      const data = await apiClient.fetch<TenantReportData>(
        `/api/admin/reports?${params.toString()}`
      );
      setReport(data);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Impossible de charger le rapport."
      );
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, user?.role, user?.tenantId]);

  const handleExportPDF = useCallback(() => {
    if (!report) return;
    exportSalesReport(report, {
      tenantName: user?.tenant?.name,
      period: `${report.period.start} → ${report.period.end}`,
      filename: `rapport-ventes-${report.period.start}_${report.period.end}.pdf`,
    });
  }, [report, user?.tenant?.name, exportSalesReport]);

  const handleExportCSV = useCallback(async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
      });
      if (user?.role === "SUPER_ADMIN" && user.tenantId) {
        params.set("tenantId", user.tenantId);
      }

      // Blob download: use raw fetch because apiClient always parses JSON
      const accessToken = localStorage.getItem("st_access_token");
      const response = await fetch(`/api/admin/reports/export?${params.toString()}`, {
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error("Échec de l'export CSV.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rapport_${startDate}_${endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("Export CSV téléchargé avec succès.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Impossible d'exporter le rapport."
      );
    } finally {
      setIsExporting(false);
    }
  }, [startDate, endDate, user?.role, user?.tenantId]);

  const kpiCards = [
    {
      title: "Total Tickets",
      value: report?.tickets.total ?? 0,
      icon: Ticket,
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      format: "number" as const,
    },
    {
      title: "Revenus Tickets",
      value: report?.tickets.revenue ?? 0,
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      format: "currency" as const,
    },
    {
      title: "Total Colis",
      value: report?.parcels.total ?? 0,
      icon: Package,
      color: "text-amber-600",
      bg: "bg-amber-50 dark:bg-amber-900/20",
      format: "number" as const,
    },
    {
      title: "Revenus Colis",
      value: report?.parcels.revenue ?? 0,
      icon: TrendingUp,
      color: "text-amber-600",
      bg: "bg-amber-50 dark:bg-amber-900/20",
      format: "currency" as const,
    },
    {
      title: "Total Départs",
      value: report?.departures.total ?? 0,
      icon: BarChart3,
      color: "text-sky-600",
      bg: "bg-sky-50 dark:bg-sky-900/20",
      format: "number" as const,
    },
    {
      title: "Retards",
      value: report?.departures.delayed ?? 0,
      icon: Clock,
      color: "text-red-600",
      bg: "bg-red-50 dark:bg-red-900/20",
      format: "number" as const,
    },
  ];

  const topLinesData = report?.topLines.slice(0, 5).map((line) => ({
    name:
      line.lineName.length > 15
        ? line.lineName.slice(0, 15) + "…"
        : line.lineName,
    revenus: line.revenue,
    tickets: line.tickets,
  }));

  const delayRate =
    report && report.departures.total > 0
      ? Math.round(
          (report.departures.delayed / report.departures.total) * 100
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* ── Date Range Filter ── */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
            <div className="flex flex-col gap-2 flex-1 w-full sm:w-auto">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Période
              </label>
              <Select
                value={preset}
                onValueChange={handlePresetChange}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Choisir une période" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Ce mois</SelectItem>
                  <SelectItem value="quarter">Ce trimestre</SelectItem>
                  <SelectItem value="year">Cette année</SelectItem>
                  <SelectItem value="custom">Personnalisé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">
                Date début
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPreset("custom");
                }}
                className="w-full sm:w-[160px]"
                disabled={isLoading}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">
                Date fin
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPreset("custom");
                }}
                className="w-full sm:w-[160px]"
                disabled={isLoading}
              />
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                onClick={fetchReport}
                disabled={isLoading || !startDate || !endDate}
                className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Chargement…
                  </span>
                ) : (
                  <>
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Générer
                  </>
                )}
              </Button>

              {report && (
                <>
                  <Button
                    variant="outline"
                    onClick={handleExportPDF}
                    disabled={isPdfExporting}
                    className="w-full sm:w-auto"
                  >
                    {isPdfExporting ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <FileText className="mr-2 h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">Exporter PDF</span>
                    <span className="sm:hidden">PDF</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleExportCSV}
                    disabled={isExporting}
                    className="w-full sm:w-auto"
                  >
                  {isExporting ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                    <span className="hidden sm:inline">Exporter CSV</span>
                    <span className="sm:hidden">CSV</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {kpiCards.map((card) => (
          <Card key={card.title} className="border-0 shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">
                    {card.title}
                  </p>
                  {isLoading ? (
                    <Skeleton className="h-7 w-16 mt-1.5" />
                  ) : (
                    <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {card.format === "currency"
                        ? formatCurrency(card.value)
                        : card.value.toLocaleString("fr-FR")}
                    </p>
                  )}
                </div>
                <div
                  className={`flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl shrink-0 ${card.bg}`}
                >
                  <card.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Revenue Line Chart */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Revenus quotidiens
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : report && report.dailyStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={report.dailyStats}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis
                    dataKey="date"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: string) => {
                      try {
                        return format(new Date(v + "T00:00:00"), "dd/MM");
                      } catch {
                        return v;
                      }
                    }}
                  />
                  <YAxis
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => formatShortCurrency(v)}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid var(--border)",
                      boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                      fontSize: "13px",
                    }}
                    labelFormatter={(label: string) => {
                      try {
                        return format(
                          new Date(label + "T00:00:00"),
                          "EEEE dd MMMM yyyy"
                        );
                      } catch {
                        return label;
                      }
                    }}
                    formatter={(value: number, name: string) => {
                      if (name === "revenus") return [formatCurrency(value), "Revenus"];
                      return [value, name];
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="revenus"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={report.dailyStats.length < 15}
                    activeDot={{ r: 5, fill: "#10b981" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
                {report ? "Aucune donnée pour cette période" : "Générez un rapport pour voir les données"}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Lines Bar Chart */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              Top 5 lignes par revenus
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : topLinesData && topLinesData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={topLinesData} layout="vertical">
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => formatShortCurrency(v)}
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
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid var(--border)",
                      boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                      fontSize: "13px",
                    }}
                    formatter={(value: number, name: string) => {
                      if (name === "revenus")
                        return [formatCurrency(value), "Revenus"];
                      if (name === "tickets")
                        return [value.toLocaleString("fr-FR"), "Tickets"];
                      return [value, name];
                    }}
                  />
                  <Bar
                    dataKey="revenus"
                    fill="#10b981"
                    radius={[0, 4, 4, 0]}
                    maxBarSize={28}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
                {report ? "Aucune donnée pour cette période" : "Générez un rapport pour voir les données"}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Delay Rate Badge ── */}
      {report && (
        <div className="flex items-center gap-3 flex-wrap">
          <Badge
            variant="secondary"
            className={
              delayRate > 15
                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                : delayRate > 5
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
            }
          >
            <Clock className="mr-1 h-3 w-3" />
            Taux de retard : {delayRate}%
          </Badge>
          {report.period.start && (
            <span className="text-xs text-muted-foreground">
              Période : {report.period.start} → {report.period.end}
            </span>
          )}
        </div>
      )}

      {/* ── Daily Stats Table ── */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-600" />
            Statistiques quotidiennes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : report && report.dailyStats.length > 0 ? (
            <div className="overflow-x-auto -mx-5 px-5 sm:mx-0 sm:px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs font-semibold">Date</TableHead>
                    <TableHead className="text-xs font-semibold text-right">
                      <span className="flex items-center justify-end gap-1">
                        <Ticket className="w-3 h-3" /> Tickets
                      </span>
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-right">
                      <span className="flex items-center justify-end gap-1">
                        <Package className="w-3 h-3" /> Colis
                      </span>
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-right">
                      <span className="flex items-center justify-end gap-1">
                        <TrendingUp className="w-3 h-3" /> Revenus
                      </span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...report.dailyStats].reverse().map((row, i) => (
                    <TableRow key={row.date + i} className="text-sm">
                      <TableCell className="font-medium">
                        {(() => {
                          try {
                            return format(
                              new Date(row.date + "T00:00:00"),
                              "dd MMM yyyy"
                            );
                          } catch {
                            return row.date;
                          }
                        })()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.tickets.toLocaleString("fr-FR")}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.parcels.toLocaleString("fr-FR")}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium text-emerald-700 dark:text-emerald-400">
                        {formatCurrency(row.revenue)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Totals Row */}
                  <TableRow className="font-bold bg-muted/50">
                    <TableCell>Totaux</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {report.tickets.total.toLocaleString("fr-FR")}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {report.parcels.total.toLocaleString("fr-FR")}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-700 dark:text-emerald-400">
                      {formatCurrency(
                        report.tickets.revenue + report.parcels.revenue
                      )}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
              {report ? "Aucune donnée pour cette période" : "Générez un rapport pour voir les données"}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
