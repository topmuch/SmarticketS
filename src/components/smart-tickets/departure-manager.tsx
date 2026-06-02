"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Clock,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface StationOption {
  id: string;
  name: string;
}

interface LineOption {
  id: string;
  code: string;
  name: string;
  fromStation: { id: string; name: string; city: string };
  toStation: { id: string; name: string; city: string };
}

interface DepartureItem {
  id: string;
  lineId: string;
  lineNumber: string;
  lineName: string;
  destination: string;
  stationId: string;
  stationName: string;
  scheduledTime: string;
  platform: string | null;
  status: string;
  delayMinutes: number;
  totalSeats: number;
  availableSeats: number;
  notes: string | null;
}

interface DepartureFormData {
  lineId: string;
  stationId: string;
  scheduledTime: string;
  platform: string;
  totalSeats: number;
  notes: string;
  status: string;
}

const EMPTY_FORM: DepartureFormData = {
  lineId: "",
  stationId: "",
  scheduledTime: "",
  platform: "",
  totalSeats: 40,
  notes: "",
  status: "SCHEDULED",
};

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STATUS_BADGES: Record<string, string> = {
  SCHEDULED:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  BOARDING:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  DELAYED:
    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  DEPARTED:
    "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  CANCELLED:
    "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
};

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Programmé",
  BOARDING: "Embarquement",
  DELAYED: "Retardé",
  DEPARTED: "Parti",
  CANCELLED: "Annulé",
};

const STATUS_OPTIONS = [
  { value: "SCHEDULED", label: "Programmé" },
  { value: "BOARDING", label: "Embarquement" },
  { value: "DELAYED", label: "Retardé" },
  { value: "DEPARTED", label: "Parti" },
  { value: "CANCELLED", label: "Annulé" },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function DepartureManager() {
  // Data
  const [departures, setDepartures] = useState<DepartureItem[]>([]);
  const [stations, setStations] = useState<StationOption[]>([]);
  const [lines, setLines] = useState<LineOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [stationFilter, setStationFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 20;

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<DepartureFormData>(EMPTY_FORM);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Status update
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  // --- Fetch stations & lines ---
  useEffect(() => {
    (async () => {
      try {
        const [s, l] = await Promise.all([
          apiClient.fetch<{ data: StationOption[] }>("/api/stations"),
          apiClient.fetch<{ data: LineOption[] }>("/api/lines"),
        ]);
        setStations(s.data);
        setLines(l.data);
      } catch {
        /* handled silently */
      }
    })();
  }, []);

  // --- Fetch departures ---
  const fetchDepartures = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(stationFilter !== "all" ? { stationId: stationFilter } : {}),
        ...(statusFilter !== "all" ? { status: statusFilter } : {}),
        ...(dateFilter ? { date: dateFilter } : {}),
      });
      const data = await apiClient.fetch<{
        data: Array<{
          id: string;
          lineId: string;
          stationId: string;
          scheduledTime: string;
          platform: string | null;
          status: string;
          delayMinutes: number;
          totalSeats: number;
          availableSeats: number;
          notes: string | null;
          line: { code: string; name: string; toStation: { name: string } };
          station: { name: string };
        }>;
        pagination: { totalPages: number; total: number };
      }>(`/api/departures?${params.toString()}`);
      const mapped: DepartureItem[] = data.data.map((d) => ({
        ...d,
        lineNumber: d.line.code,
        lineName: d.line.name,
        destination: d.line.toStation.name,
        stationName: d.station.name,
      }));
      setDepartures(mapped);
      setTotalPages(data.pagination.totalPages);
      setTotalItems(data.pagination.total);
    } catch {
      toast.error("Impossible de charger les départs.");
    } finally {
      setIsLoading(false);
    }
  }, [page, stationFilter, statusFilter, dateFilter]);

  useEffect(() => {
    fetchDepartures();
  }, [fetchDepartures]);

  // --- Reset filters ---
  const resetFilters = () => {
    setStationFilter("all");
    setStatusFilter("all");
    setDateFilter("");
    setPage(1);
  };

  // --- Open create dialog ---
  const openCreate = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setFormOpen(true);
  };

  // --- Open edit dialog ---
  const openEdit = (dep: DepartureItem) => {
    setEditingId(dep.id);
    setFormData({
      lineId: dep.lineId || "",
      stationId: dep.stationId || "",
      scheduledTime: dep.scheduledTime
        ? new Date(dep.scheduledTime).toISOString().slice(0, 16)
        : "",
      platform: dep.platform ?? "",
      totalSeats: dep.totalSeats,
      notes: dep.notes ?? "",
      status: dep.status,
    });
    setFormOpen(true);
  };

  // --- Submit form ---
  const handleSubmit = async () => {
    if (!formData.stationId || !formData.scheduledTime) {
      toast.error("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    setFormSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        stationId: formData.stationId,
        scheduledTime: new Date(formData.scheduledTime).toISOString(),
        platform: formData.platform || null,
        totalSeats: formData.totalSeats || 40,
        notes: formData.notes || null,
        status: formData.status,
      };
      if (formData.lineId) body.lineId = formData.lineId;

      if (editingId) {
        await apiClient.fetch(`/api/departures/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
        toast.success("Départ mis à jour avec succès.");
      } else {
        await apiClient.fetch("/api/departures", {
          method: "POST",
          body: JSON.stringify(body),
        });
        toast.success("Départ créé avec succès.");
      }
      setFormOpen(false);
      fetchDepartures();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Impossible d'enregistrer le départ."
      );
    } finally {
      setFormSubmitting(false);
    }
  };

  // --- Delete ---
  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await apiClient.fetch(`/api/departures/${deleteId}`, { method: "DELETE" });
      toast.success("Départ supprimé.");
      setDeleteId(null);
      fetchDepartures();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Impossible de supprimer le départ."
      );
    } finally {
      setDeleting(false);
    }
  };

  // --- Update status ---
  const handleUpdateStatus = async (id: string, newStatus: string) => {
    setUpdatingStatus(id);
    try {
      await apiClient.fetch(`/api/departures/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });
      toast.success(`Statut mis à jour : ${STATUS_LABELS[newStatus] ?? newStatus}`);
      fetchDepartures();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Impossible de mettre à jour le statut."
      );
    } finally {
      setUpdatingStatus(null);
    }
  };

  // --- Page range helper ---
  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisible = 7;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (page <= 4) {
      for (let i = 1; i <= maxVisible; i++) pages.push(i);
    } else if (page >= totalPages - 3) {
      for (let i = totalPages - maxVisible + 1; i <= totalPages; i++)
        pages.push(i);
    } else {
      for (let i = page - 3; i <= page + 3; i++) pages.push(i);
    }
    return pages;
  };

  const stationName = (id: string) =>
    stations.find((s) => s.id === id)?.name ?? id;

  return (
    <div className="space-y-4">
      {/* ---- Header ---- */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Button
          onClick={openCreate}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nouveau Départ
        </Button>
      </div>

      {/* ---- Filters ---- */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Station */}
            <Select
              value={stationFilter}
              onValueChange={(v) => {
                setStationFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full lg:w-[200px]">
                <SelectValue placeholder="Gare" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les gares</SelectItem>
                {stations.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status */}
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full lg:w-[180px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date */}
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setPage(1);
              }}
              className="w-full lg:w-auto"
            />

            {/* Reset */}
            {(stationFilter !== "all" || statusFilter !== "all" || dateFilter) && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <RotateCcw className="mr-2 h-3 w-3" />
                Réinitialiser
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ---- Table ---- */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ligne</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead className="hidden md:table-cell">Gare</TableHead>
                  <TableHead>Heure</TableHead>
                  <TableHead className="hidden sm:table-cell">Quai</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="hidden lg:table-cell">Places</TableHead>
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
                ) : departures.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Clock className="w-8 h-8" />
                        <p className="text-sm">Aucun départ trouvé.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  departures.map((dep) => (
                    <TableRow key={dep.id}>
                      {/* Ligne */}
                      <TableCell>
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-slate-800 text-white text-xs font-bold">
                          {dep.lineNumber}
                        </span>
                      </TableCell>

                      {/* Destination */}
                      <TableCell>
                        <span className="font-medium text-sm">
                          {dep.destination}
                        </span>
                      </TableCell>

                      {/* Gare */}
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm text-muted-foreground">
                          {dep.stationName}
                        </span>
                      </TableCell>

                      {/* Heure */}
                      <TableCell>
                        <span className="text-sm font-mono font-semibold">
                          {dep.scheduledTime
                            ? new Date(dep.scheduledTime).toLocaleTimeString(
                                "fr-FR",
                                { hour: "2-digit", minute: "2-digit" }
                              )
                            : "—"}
                        </span>
                      </TableCell>

                      {/* Quai */}
                      <TableCell className="hidden sm:table-cell">
                        <span className="text-sm">{dep.platform ?? "—"}</span>
                      </TableCell>

                      {/* Statut */}
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`text-xs ${
                            STATUS_BADGES[dep.status] ?? STATUS_BADGES.SCHEDULED
                          }`}
                        >
                          {STATUS_LABELS[dep.status] ?? dep.status}
                          {dep.status === "DELAYED" && dep.delayMinutes > 0 && (
                            <span className="ml-1">
                              +{dep.delayMinutes}min
                            </span>
                          )}
                        </Badge>
                      </TableCell>

                      {/* Places */}
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-sm">
                          {dep.availableSeats}/{dep.totalSeats}
                        </span>
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              {updatingStatus === dep.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreHorizontal className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(dep)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger>
                                <Clock className="mr-2 h-4 w-4" />
                                Changer le statut
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent>
                                {STATUS_OPTIONS.filter(
                                  (s) => s.value !== dep.status
                                ).map((s) => (
                                  <DropdownMenuItem
                                    key={s.value}
                                    onClick={() =>
                                      handleUpdateStatus(dep.id, s.value)
                                    }
                                  >
                                    {s.label}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600 dark:text-red-400"
                              onClick={() => setDeleteId(dep.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Supprimer
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

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t gap-3">
            <p className="text-xs text-muted-foreground">
              {totalItems} départ(s) au total — Page {page} sur {totalPages}
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
                  {getPageNumbers().map((pageNum) => (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        onClick={() => setPage(pageNum)}
                        isActive={page === pageNum}
                        className="cursor-pointer"
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
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

      {/* ---- Create / Edit Dialog ---- */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <AnimatePresence>
            {formOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
              >
                <DialogHeader>
                  <DialogTitle>
                    {editingId ? "Modifier le départ" : "Nouveau Départ"}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  {/* Line */}
                  <div className="space-y-2">
                    <Label>Ligne</Label>
                    <Select
                      value={formData.lineId}
                      onValueChange={(v) =>
                        setFormData((f) => ({ ...f, lineId: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une ligne" />
                      </SelectTrigger>
                      <SelectContent>
                        {lines.map((l) => (
                          <SelectItem key={l.id} value={l.id}>
                            {l.code} — {l.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Station */}
                  <div className="space-y-2">
                    <Label>Gare *</Label>
                    <Select
                      value={formData.stationId}
                      onValueChange={(v) =>
                        setFormData((f) => ({ ...f, stationId: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une gare" />
                      </SelectTrigger>
                      <SelectContent>
                        {stations.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Scheduled time */}
                  <div className="space-y-2">
                    <Label>Heure prévue *</Label>
                    <Input
                      type="datetime-local"
                      value={formData.scheduledTime}
                      onChange={(e) =>
                        setFormData((f) => ({
                          ...f,
                          scheduledTime: e.target.value,
                        }))
                      }
                    />
                  </div>

                  {/* Platform + Seats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Quai</Label>
                      <Input
                        placeholder="Ex: A3"
                        value={formData.platform}
                        onChange={(e) =>
                          setFormData((f) => ({ ...f, platform: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Places totales</Label>
                      <Input
                        type="number"
                        min={1}
                        value={formData.totalSeats}
                        onChange={(e) =>
                          setFormData((f) => ({
                            ...f,
                            totalSeats: parseInt(e.target.value) || 40,
                          }))
                        }
                      />
                    </div>
                  </div>

                  {/* Status */}
                  <div className="space-y-2">
                    <Label>Statut</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(v) =>
                        setFormData((f) => ({ ...f, status: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      placeholder="Notes internes (optionnel)"
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData((f) => ({ ...f, notes: e.target.value }))
                      }
                      rows={3}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setFormOpen(false)}>
                    Annuler
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={formSubmitting}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {formSubmitting && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {editingId ? "Mettre à jour" : "Créer"}
                  </Button>
                </DialogFooter>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>

      {/* ---- Delete Confirmation ---- */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce départ ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le départ et toutes les données associées
              seront supprimés définitivement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
