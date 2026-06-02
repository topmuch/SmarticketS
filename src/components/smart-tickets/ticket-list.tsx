"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  MoreHorizontal,
  Plus,
  Eye,
  ArrowRightLeft,
  CheckCircle2,
  Copy,
  ClipboardList,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { apiClient } from "@/lib/api";
import type { TicketData } from "./reschedule-ticket-dialog";
import { TicketDetailDialog } from "./ticket-detail-dialog";
import { RescheduleTicketDialog } from "./reschedule-ticket-dialog";
import { GenerateBatchDialog } from "./generate-batch-dialog";

// 🛑 Generation Control: hide batch button for non-authorized tenants
function CanGenerateTickets({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (!user) return null;
  if (user.role === "SUPER_ADMIN") return <>{children}</>;
  if (user.role === "ADMIN") {
    return user.tenant?.allowSelfTicketGeneration ? <>{children}</> : null;
  }
  return null;
}

const STATUS_BADGES: Record<string, string> = {
  active:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  used: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  rescheduled:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Actif",
  used: "Utilisé",
  rescheduled: "Reporté",
  cancelled: "Annulé",
};

export function TicketList() {
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Dialogs
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleTicket, setRescheduleTicket] = useState<TicketData | null>(null);
  const [batchOpen, setBatchOpen] = useState(false);

  // Mark as used loading
  const [markingUsedId, setMarkingUsedId] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        ...(search ? { search } : {}),
        ...(statusFilter !== "all" ? { status: statusFilter } : {}),
        ...(dateFrom ? { dateFrom } : {}),
        ...(dateTo ? { dateTo } : {}),
      });
      const data = await apiClient.fetch<{
        data: TicketData[];
        pagination: { totalPages: number; total: number };
      }>(`/api/tickets?${params.toString()}`);
      setTickets(data.data);
      setTotalPages(data.pagination.totalPages);
      setTotalItems(data.pagination.total);
    } catch {
      toast.error("Impossible de charger les billets.");
    } finally {
      setIsLoading(false);
    }
  }, [page, search, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const handleViewDetail = (ticket: TicketData) => {
    setSelectedTicketId(ticket.id);
    setDetailOpen(true);
  };

  const handleReschedule = (ticket: TicketData) => {
    setRescheduleTicket(ticket);
    setRescheduleOpen(true);
  };

  const handleMarkUsed = async (ticket: TicketData) => {
    setMarkingUsedId(ticket.id);
    try {
      await apiClient.fetch<TicketData>(`/api/tickets/${ticket.id}/use`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      toast.success(`Billet ${ticket.ticketCode} marqué comme utilisé.`);
      fetchTickets();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Impossible de valider le billet."
      );
    } finally {
      setMarkingUsedId(null);
    }
  };

  const copyControlCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Code copié !");
    } catch {
      toast.error("Échec de la copie.");
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <CanGenerateTickets>
          <Button
            onClick={() => setBatchOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nouveau batch
          </Button>
        </CanGenerateTickets>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher (nom, code contrôle…)"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>

            {/* Status */}
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full lg:w-[160px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="active">Actif</SelectItem>
                <SelectItem value="used">Utilisé</SelectItem>
                <SelectItem value="rescheduled">Reporté</SelectItem>
                <SelectItem value="cancelled">Annulé</SelectItem>
              </SelectContent>
            </Select>

            {/* Date range */}
            <div className="flex gap-2">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                className="w-full lg:w-auto"
                placeholder="Date début"
              />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                className="w-full lg:w-auto"
                placeholder="Date fin"
              />
            </div>

            {/* Reset */}
            {(search || statusFilter !== "all" || dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                Réinitialiser
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code contrôle</TableHead>
                  <TableHead>Passager</TableHead>
                  <TableHead className="hidden sm:table-cell">Âge</TableHead>
                  <TableHead className="hidden md:table-cell">Siège</TableHead>
                  <TableHead className="hidden lg:table-cell">Bagages</TableHead>
                  <TableHead className="hidden md:table-cell">Prix</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="hidden xl:table-cell">Date</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : tickets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <ClipboardList className="w-8 h-8" />
                        <p className="text-sm">
                          {search || statusFilter !== "all"
                            ? "Aucun billet trouvé."
                            : "Aucun billet enregistré."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  tickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      {/* Control code */}
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <code className="text-xs font-mono font-bold tracking-wider">
                            {ticket.controlCode}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyControlCode(ticket.controlCode)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>

                      {/* Passenger */}
                      <TableCell>
                        <span className="font-medium text-sm">
                          {ticket.passengerName}
                        </span>
                      </TableCell>

                      {/* Age */}
                      <TableCell className="hidden sm:table-cell">
                        <span className="text-sm">
                          {ticket.passengerAge} ans
                          {ticket.passengerAge < 5 && (
                            <Badge
                              variant="secondary"
                              className="ml-1 text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                            >
                              Mineur
                            </Badge>
                          )}
                        </span>
                      </TableCell>

                      {/* Seat */}
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm font-mono">
                          {ticket.seatNumber || "—"}
                        </span>
                      </TableCell>

                      {/* Bagages */}
                      <TableCell className="hidden lg:table-cell">
                        <div className="text-sm space-y-0.5">
                          <span>{ticket.luggageCount || 0} valise(s)</span>
                          <span className="text-muted-foreground block text-xs">
                            {ticket.luggageWeight || 0} kg
                            {ticket.luggageFee > 0 && (
                              <span className="text-amber-600 dark:text-amber-400 ml-1">
                                (+{(ticket.luggageFee ?? 0).toLocaleString("fr-FR")}{" "}
                                FCFA)
                              </span>
                            )}
                          </span>
                        </div>
                      </TableCell>

                      {/* Price */}
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm font-semibold">
                          {(ticket.totalPrice ?? 0).toLocaleString("fr-FR")}{" "}
                          FCFA
                        </span>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`text-xs ${STATUS_BADGES[ticket.status] || STATUS_BADGES.active}`}
                        >
                          {STATUS_LABELS[ticket.status] || ticket.status}
                        </Badge>
                      </TableCell>

                      {/* Date */}
                      <TableCell className="hidden xl:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(ticket.createdAt), "d MMM yyyy", {
                            locale: fr,
                          })}
                        </span>
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleViewDetail(ticket)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Voir détails
                            </DropdownMenuItem>
                            {ticket.status === "active" && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleReschedule(ticket)}
                                >
                                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                                  Reporter
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleMarkUsed(ticket)}
                                  disabled={markingUsedId === ticket.id}
                                >
                                  {markingUsedId === ticket.id ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                  )}
                                  Marquer utilisé
                                </DropdownMenuItem>
                              </>
                            )}
                            {ticket.status === "rescheduled" &&
                              ticket.rescheduleCount < 1 && (
                                <DropdownMenuItem
                                  onClick={() => handleReschedule(ticket)}
                                >
                                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                                  Reporter
                                </DropdownMenuItem>
                              )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination & info */}
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t gap-3">
            <p className="text-xs text-muted-foreground">
              {totalItems} billet(s) au total — Page {page} sur {totalPages}
            </p>
            {totalPages > 1 && (
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className={
                        page <= 1
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>
                  {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
                    const pageNum =
                      totalPages <= 7
                        ? i + 1
                        : page <= 4
                          ? i + 1
                          : page >= totalPages - 3
                            ? totalPages - 6 + i
                            : page - 4 + i;
                    if (pageNum < 1 || pageNum > totalPages) return null;
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          onClick={() => setPage(pageNum)}
                          isActive={page === pageNum}
                          className="cursor-pointer"
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className={
                        page >= totalPages
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <TicketDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        ticketId={selectedTicketId}
        onReschedule={(ticket) => {
          setDetailOpen(false);
          handleReschedule(ticket);
        }}
      />

      <RescheduleTicketDialog
        open={rescheduleOpen}
        onOpenChange={setRescheduleOpen}
        ticket={rescheduleTicket}
        onSuccess={fetchTickets}
      />

      <GenerateBatchDialog
        open={batchOpen}
        onOpenChange={setBatchOpen}
        onSuccess={fetchTickets}
      />
    </div>
  );
}
