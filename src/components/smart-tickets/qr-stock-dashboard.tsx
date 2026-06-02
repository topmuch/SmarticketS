"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import {
  Ticket,
  Clock,
  CheckCircle,
  Archive,
  XCircle,
  Search,
  QrCode,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { QrActivationModal } from "./qr-activation-modal";

// ─── Types ───

interface QrStats {
  total: number;
  inactive: number;
  active: number;
  used: number;
  cancelled: number;
}

interface QrTicket {
  id: string;
  ticketCode: string;
  qrHash: string;
  status: string;
  type: string;
  activatedAt: string | null;
  validatedAt: string | null;
  createdAt: string;
  departure: {
    lineNumber: string | null;
    lineName: string | null;
    scheduledTime: string;
    destination: string | null;
  } | null;
  printBatch: {
    startNumber: string;
    endNumber: string;
  } | null;
}

interface PrintBatch {
  id: string;
  quantity: number;
  startNumber: string;
  endNumber: string;
  createdAt: string;
  generatedBy: string;
}

interface StockResponse {
  stats: QrStats;
  tickets: QrTicket[];
  pagination: {
    page: number;
    take: number;
    total: number;
    totalPages: number;
  };
  printBatches: PrintBatch[];
}

// ─── Status Config ───

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className: string }> = {
  inactive: {
    label: "Disponible",
    variant: "secondary",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
  },
  active: {
    label: "Activé",
    variant: "outline",
    className: "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100",
  },
  used: {
    label: "Utilisé",
    variant: "default",
    className: "bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100",
  },
  cancelled: {
    label: "Annulé",
    variant: "destructive",
    className: "bg-red-100 text-red-700 border-red-200 hover:bg-red-100",
  },
};

// ─── KPI Card ───

function KpiCard({
  icon,
  label,
  value,
  colorClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  colorClass: string;
}) {
  return (
    <Card className={`${colorClass} border-0`}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/70 shrink-0">
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium opacity-80">{label}</p>
          <p className="text-2xl font-bold">{value.toLocaleString("fr-FR")}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───

export function QrStockDashboard() {
  const user = useAuthStore((s) => s.user);

  const [stats, setStats] = useState<QrStats>({
    total: 0,
    inactive: 0,
    active: 0,
    used: 0,
    cancelled: 0,
  });
  const [tickets, setTickets] = useState<QrTicket[]>([]);
  const [printBatches, setPrintBatches] = useState<PrintBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [batchFilter, setBatchFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalFiltered, setTotalFiltered] = useState(0);

  // Activation modal state
  const [activateModalOpen, setActivateModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<QrTicket | null>(null);

  // Fetch stock data
  const fetchStock = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (batchFilter !== "all") params.set("printBatchId", batchFilter);
      if (search.trim()) params.set("search", search.trim());
      params.set("page", page.toString());

      const data = await apiClient.fetch<StockResponse>(
        `/api/admin/qr/stock?${params.toString()}`
      );

      setStats(data.stats);
      setTickets(data.tickets);
      setPrintBatches(data.printBatches);
      setTotalPages(data.pagination.totalPages);
      setTotalFiltered(data.pagination.total);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Échec du chargement du stock QR."
      );
    } finally {
      setLoading(false);
    }
  }, [statusFilter, batchFilter, search, page]);

  useEffect(() => {
    fetchStock();
  }, [fetchStock]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, batchFilter, search]);

  // Handle activate button click
  const handleActivate = (ticket: QrTicket) => {
    if (ticket.status !== "inactive") {
      toast.error("Seuls les QR disponibles peuvent être activés.");
      return;
    }
    setSelectedTicket(ticket);
    setActivateModalOpen(true);
  };

  // After activation success
  const handleActivationSuccess = useCallback(() => {
    setActivateModalOpen(false);
    setSelectedTicket(null);
    fetchStock();
  }, [fetchStock]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Stock QR Codes
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {user?.tenant?.name || "Mon transporteur"} — Gestion des QR pré-imprimés
          </p>
        </div>
        <Badge variant="secondary" className="w-fit text-xs">
          QR Vierge → Ticket Actif
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard
          icon={<Ticket className="w-5 h-5 text-blue-600" />}
          label="Total Imprimés"
          value={stats.total}
          colorClass="bg-blue-50 dark:bg-blue-950/30"
        />
        <KpiCard
          icon={<Clock className="w-5 h-5 text-emerald-600" />}
          label="Disponibles"
          value={stats.inactive}
          colorClass="bg-emerald-50 dark:bg-emerald-950/30"
        />
        <KpiCard
          icon={<CheckCircle className="w-5 h-5 text-blue-600" />}
          label="Activés (Vendus)"
          value={stats.active}
          colorClass="bg-sky-50 dark:bg-sky-950/30"
        />
        <KpiCard
          icon={<Archive className="w-5 h-5 text-purple-600" />}
          label="Utilisés / Scannés"
          value={stats.used}
          colorClass="bg-purple-50 dark:bg-purple-950/30"
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher TKT-XXXX..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Status filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="inactive">Disponibles</SelectItem>
                <SelectItem value="active">Activés</SelectItem>
                <SelectItem value="used">Utilisés</SelectItem>
                <SelectItem value="cancelled">Annulés</SelectItem>
              </SelectContent>
            </Select>

            {/* Batch filter */}
            <Select value={batchFilter} onValueChange={setBatchFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Lot" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les lots</SelectItem>
                {printBatches.map((batch) => (
                  <SelectItem key={batch.id} value={batch.id}>
                    {batch.startNumber} → {batch.endNumber} ({batch.quantity})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Ticket Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="p-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  N° QR
                </th>
                <th className="p-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Statut
                </th>
                <th className="p-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">
                  Trajet Lié
                </th>
                <th className="p-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">
                  Date Activation
                </th>
                <th className="p-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden xl:table-cell">
                  Lot
                </th>
                <th className="p-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                      <p className="text-sm text-muted-foreground">
                        Chargement du stock...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <QrCode className="w-10 h-10 text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">
                        Aucun QR trouvé pour ces critères
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => {
                  const config = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.inactive;
                  return (
                    <tr
                      key={ticket.id}
                      className="border-b hover:bg-muted/30 transition-colors"
                    >
                      <td className="p-3">
                        <span className="font-mono font-bold text-sm">
                          {ticket.ticketCode}
                        </span>
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={config.variant}
                          className={config.className}
                        >
                          {config.label}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm hidden lg:table-cell">
                        {ticket.departure ? (
                          <div>
                            <span className="font-medium">
                              {ticket.departure.lineName || ticket.departure.lineNumber || "—"}
                            </span>
                            <span className="text-muted-foreground">
                              {" → "}
                              {ticket.departure.destination || "—"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-3 text-sm text-muted-foreground hidden md:table-cell">
                        {ticket.activatedAt
                          ? new Date(ticket.activatedAt).toLocaleDateString("fr-FR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground hidden xl:table-cell">
                        {ticket.printBatch
                          ? `${ticket.printBatch.startNumber} → ${ticket.printBatch.endNumber}`
                          : "—"}
                      </td>
                      <td className="p-3 text-right">
                        {ticket.status === "inactive" ? (
                          <Button
                            size="sm"
                            onClick={() => handleActivate(ticket)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                            Activer
                          </Button>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-muted-foreground"
                          >
                            —
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <p className="text-sm text-muted-foreground">
              {totalFiltered} résultat{totalFiltered > 1 ? "s" : ""} — Page {page} / {totalPages}
            </p>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Activation Modal */}
      {selectedTicket && (
        <QrActivationModal
          open={activateModalOpen}
          onOpenChange={setActivateModalOpen}
          ticket={selectedTicket}
          onSuccess={handleActivationSuccess}
        />
      )}
    </div>
  );
}
