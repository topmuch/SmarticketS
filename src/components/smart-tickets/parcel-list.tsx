"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  MoreHorizontal,
  Eye,
  Copy,
  PackageSearch,
  Send,
  CheckCircle2,
  Loader2,
  Phone,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useAuthStore } from "@/stores/auth-store";
import { apiClient } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────
interface ParcelData {
  id: string;
  controlCode: string;
  pinCode: string;
  senderName: string;
  senderPhone: string;
  recipientName: string;
  recipientPhone: string;
  recipientLocation: string;
  ticketCode: string;
  fromStation: { id: string; name: string } | null;
  toStation: { id: string; name: string } | null;
  price: number;
  luggageCount: number;
  status: string;
  deliveredAt?: string;
  confirmedAt?: string;
  createdAt: string;
  whatsappSenderLink?: string;
  whatsappRecipientLink?: string;
}

// ── Constants ──────────────────────────────────────────────────────────
const STATUS_BADGES: Record<string, string> = {
  IN_TRANSIT: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  DELIVERED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  CONFIRMED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const STATUS_LABELS: Record<string, string> = {
  IN_TRANSIT: "En transit",
  DELIVERED: "Livré",
  CONFIRMED: "Confirmé",
  CANCELLED: "Annulé",
};

// ── Component ──────────────────────────────────────────────────────────
export function ParcelList() {
  const user = useAuthStore((s) => s.user);
  const [parcels, setParcels] = useState<ParcelData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Detail sheet
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedParcel, setSelectedParcel] = useState<ParcelData | null>(null);
  const [pinRevealed, setPinRevealed] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const fetchParcels = useCallback(async () => {
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
        data: ParcelData[];
        pagination: { totalPages: number; total: number };
      }>(`/api/parcels?${params.toString()}`);
      setParcels(data.data);
      setTotalPages(data.pagination.totalPages);
      setTotalItems(data.pagination.total);
    } catch {
      toast.error("Impossible de charger les colis.");
    } finally {
      setIsLoading(false);
    }
  }, [page, search, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchParcels();
  }, [fetchParcels]);

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const handleViewDetail = (parcel: ParcelData) => {
    setSelectedParcel(parcel);
    setPinRevealed(false);
    setDetailOpen(true);
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copié !`);
    } catch {
      toast.error("Échec de la copie.");
    }
  };

  const handleConfirm = async () => {
    if (!selectedParcel) return;
    setIsConfirming(true);
    try {
      await apiClient.fetch(`/api/parcels/${selectedParcel.id}/confirm`, {
        method: "POST",
      });
      toast.success("Colis confirmé avec succès.");
      setDetailOpen(false);
      fetchParcels();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Impossible de confirmer le colis."
      );
    } finally {
      setIsConfirming(false);
    }
  };

  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher (code suivi, expéditeur, destinataire…)"
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
                <SelectItem value="IN_TRANSIT">En transit</SelectItem>
                <SelectItem value="DELIVERED">Livré</SelectItem>
                <SelectItem value="CONFIRMED">Confirmé</SelectItem>
                <SelectItem value="CANCELLED">Annulé</SelectItem>
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
                  <TableHead>Code suivi</TableHead>
                  <TableHead>Expéditeur</TableHead>
                  <TableHead className="hidden md:table-cell">Destinataire</TableHead>
                  <TableHead className="hidden lg:table-cell">Itinéraire</TableHead>
                  <TableHead className="hidden md:table-cell">Montant</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="hidden xl:table-cell">Date</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : parcels.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <PackageSearch className="w-8 h-8" />
                        <p className="text-sm">
                          {search || statusFilter !== "all"
                            ? "Aucun colis trouvé."
                            : "Aucun colis enregistré."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  parcels.map((parcel) => (
                    <TableRow key={parcel.id}>
                      {/* Control code */}
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <code className="text-xs font-mono font-bold tracking-wider">
                            {parcel.controlCode}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() =>
                              copyToClipboard(parcel.controlCode, "Code de suivi")
                            }
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>

                      {/* Sender */}
                      <TableCell>
                        <span className="font-medium text-sm">
                          {parcel.senderName}
                        </span>
                      </TableCell>

                      {/* Recipient */}
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm">{parcel.recipientName}</span>
                      </TableCell>

                      {/* Route */}
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-sm">
                          {parcel.fromStation?.name || "—"} → {parcel.toStation?.name || "—"}
                        </span>
                      </TableCell>

                      {/* Price */}
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm font-semibold">
                          {(parcel.price ?? 0).toLocaleString("fr-FR")} FCFA
                        </span>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`text-xs ${STATUS_BADGES[parcel.status] || STATUS_BADGES.IN_TRANSIT}`}
                        >
                          {STATUS_LABELS[parcel.status] || parcel.status}
                        </Badge>
                      </TableCell>

                      {/* Date */}
                      <TableCell className="hidden xl:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(parcel.createdAt), "d MMM yyyy HH:mm", {
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
                              onClick={() => handleViewDetail(parcel)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Voir détails
                            </DropdownMenuItem>
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
              {totalItems} colis au total — Page {page} sur {totalPages}
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

      {/* Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Détails du colis</SheetTitle>
          </SheetHeader>
          {selectedParcel && (
            <div className="mt-6 space-y-6">
              {/* Control Code */}
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Code de suivi
                </p>
                <div className="flex items-center justify-center gap-2">
                  <p className="text-3xl font-mono font-bold tracking-widest">
                    {selectedParcel.controlCode}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() =>
                      copyToClipboard(selectedParcel.controlCode, "Code de suivi")
                    }
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* PIN */}
              <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-xs text-amber-700 dark:text-amber-400 uppercase tracking-wide font-medium mb-1">
                  ⚠️ Code PIN
                </p>
                <div className="flex items-center justify-center gap-2">
                  <p className="text-2xl font-mono font-bold tracking-[0.3em]">
                    {pinRevealed ? selectedParcel.pinCode : "••••"}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-amber-700"
                    onClick={() => setPinRevealed(!pinRevealed)}
                  >
                    {pinRevealed ? "Masquer" : "Afficher"}
                  </Button>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-center">
                <Badge
                  variant="secondary"
                  className={`text-sm px-3 py-1 ${STATUS_BADGES[selectedParcel.status] || ""}`}
                >
                  {STATUS_LABELS[selectedParcel.status] || selectedParcel.status}
                </Badge>
              </div>

              {/* Sender Info */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Expéditeur
                </h4>
                <Card className="border-0 shadow-sm bg-orange-50 dark:bg-orange-950/20">
                  <CardContent className="p-4 space-y-1">
                    <p className="font-medium">{selectedParcel.senderName}</p>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{selectedParcel.senderPhone}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recipient Info */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Destinataire
                </h4>
                <Card className="border-0 shadow-sm bg-blue-50 dark:bg-blue-950/20">
                  <CardContent className="p-4 space-y-1">
                    <p className="font-medium">{selectedParcel.recipientName}</p>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{selectedParcel.recipientPhone}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{selectedParcel.recipientLocation}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Route & Price */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Itinéraire & Prix
                </h4>
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Trajet</span>
                      <span className="font-medium">
                        {selectedParcel.fromStation?.name || "—"} → {selectedParcel.toStation?.name || "—"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Montant</span>
                      <span className="font-semibold">
                        {(selectedParcel.price ?? 0).toLocaleString("fr-FR")} FCFA
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Code ticket</span>
                      <span className="font-mono text-xs">{selectedParcel.ticketCode}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Status Timeline */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Historique
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-muted-foreground">Créé le</span>
                    <span className="font-medium ml-auto">
                      {format(new Date(selectedParcel.createdAt), "d MMM yyyy HH:mm", {
                        locale: fr,
                      })}
                    </span>
                  </div>
                  {selectedParcel.deliveredAt && (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-muted-foreground">Livré le</span>
                      <span className="font-medium ml-auto">
                        {format(new Date(selectedParcel.deliveredAt), "d MMM yyyy HH:mm", {
                          locale: fr,
                        })}
                      </span>
                    </div>
                  )}
                  {selectedParcel.confirmedAt && (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-muted-foreground">Confirmé le</span>
                      <span className="font-medium ml-auto">
                        {format(new Date(selectedParcel.confirmedAt), "d MMM yyyy HH:mm", {
                          locale: fr,
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* WhatsApp buttons */}
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => {
                    if (selectedParcel.whatsappSenderLink) {
                      window.open(selectedParcel.whatsappSenderLink, "_blank");
                    }
                  }}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  <Send className="mr-2 h-4 w-4" />
                  Notifier Expéditeur
                </Button>
                <Button
                  onClick={() => {
                    if (selectedParcel.whatsappRecipientLink) {
                      window.open(selectedParcel.whatsappRecipientLink, "_blank");
                    }
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Send className="mr-2 h-4 w-4" />
                  Notifier Destinataire
                </Button>
              </div>

              {/* Confirm button */}
              {isAdmin && selectedParcel.status === "DELIVERED" && (
                <Button
                  onClick={handleConfirm}
                  disabled={isConfirming}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  size="lg"
                >
                  {isConfirming ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Confirmation…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Confirmer la réception
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
