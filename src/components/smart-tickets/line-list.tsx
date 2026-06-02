"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Route,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiClient } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

// ── Types ──────────────────────────────────────────────────────────────
interface StationOption {
  id: string;
  name: string;
  city: string;
}

interface LineData {
  id: string;
  name: string;
  code: string;
  fromStationId: string;
  toStationId: string;
  fromStation: { id: string; name: string; city: string };
  toStation: { id: string; name: string; city: string };
  basePrice: number;
  isActive: boolean;
  createdAt: string;
}

function formatPrice(price: number): string {
  return `${price.toLocaleString("fr-FR")} FCFA`;
}

const ITEMS_PER_PAGE = 20;

// ── Component ──────────────────────────────────────────────────────────
export function LineList() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  const [lines, setLines] = useState<LineData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stations, setStations] = useState<StationOption[]>([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Dialog states
  const [formOpen, setFormOpen] = useState(false);
  const [editingLine, setEditingLine] = useState<LineData | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingLine, setDeletingLine] = useState<LineData | null>(null);
  const [lineDetail, setLineDetail] = useState<LineData & { _count?: Record<string, number> } | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Form state
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formFromStationId, setFormFromStationId] = useState("");
  const [formToStationId, setFormToStationId] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch stations
  const fetchStations = useCallback(async () => {
    try {
      const data = await apiClient.fetch<{ data: StationOption[] }>("/api/stations");
      setStations(data.data);
    } catch {
      // silent — stations might not be needed for OPERATOR view-only
    }
  }, []);

  // Fetch lines
  const fetchLines = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.fetch<{ data: LineData[] }>("/api/lines");
      setLines(data.data);
    } catch {
      toast.error("Impossible de charger les lignes.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStations();
  }, [fetchStations]);

  useEffect(() => {
    fetchLines();
  }, [fetchLines]);

  // Filter
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return lines;
    return lines.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q) ||
        l.fromStation.name.toLowerCase().includes(q) ||
        l.toStation.name.toLowerCase().includes(q)
    );
  }, [lines, search]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  // ── Detail ───────────────────────────────────────────────────────
  const openDetail = async (line: LineData) => {
    setLineDetail(line);
    setDetailOpen(true);
    setIsLoadingDetail(true);
    try {
      const data = await apiClient.fetch<{
        data: LineData & { _count?: Record<string, number> };
      }>(`/api/lines/${line.id}`);
      setLineDetail(data.data);
    } catch {
      toast.error("Impossible de charger le détail de la ligne.");
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // ── Form handling ──────────────────────────────────────────────────
  const openCreateForm = () => {
    setEditingLine(null);
    setFormCode("");
    setFormName("");
    setFormFromStationId("");
    setFormToStationId("");
    setFormPrice("");
    setFormIsActive(true);
    setFormOpen(true);
  };

  const openEditForm = (line: LineData) => {
    setEditingLine(line);
    setFormCode(line.code);
    setFormName(line.name);
    setFormFromStationId(line.fromStationId);
    setFormToStationId(line.toStationId);
    setFormPrice(line.basePrice.toString());
    setFormIsActive(line.isActive);
    setFormOpen(true);
  };

  const resetFormState = () => {
    setFormCode("");
    setFormName("");
    setFormFromStationId("");
    setFormToStationId("");
    setFormPrice("");
    setFormIsActive(true);
    setEditingLine(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCode.trim() || !formName.trim() || !formFromStationId || !formToStationId) {
      toast.error("Le code, le nom et les gares sont requis.");
      return;
    }
    if (formFromStationId === formToStationId) {
      toast.error("Les gares de départ et d'arrivée doivent être différentes.");
      return;
    }
    const priceNum = parseFloat(formPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      toast.error("Le prix doit être un nombre positif.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingLine) {
        await apiClient.fetch(`/api/lines/${editingLine.id}`, {
          method: "PUT",
          body: JSON.stringify({
            code: formCode.trim(),
            name: formName.trim(),
            fromStationId: formFromStationId,
            toStationId: formToStationId,
            basePrice: Math.round(priceNum),
            isActive: formIsActive,
          }),
        });
        toast.success("Ligne mise à jour avec succès.");
      } else {
        await apiClient.fetch("/api/lines", {
          method: "POST",
          body: JSON.stringify({
            code: formCode.trim(),
            name: formName.trim(),
            fromStationId: formFromStationId,
            toStationId: formToStationId,
            basePrice: Math.round(priceNum),
            isActive: formIsActive,
          }),
        });
        toast.success("Ligne créée avec succès.");
      }
      setFormOpen(false);
      resetFormState();
      fetchLines();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Impossible de sauvegarder la ligne."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Delete handling ────────────────────────────────────────────────
  const openDeleteDialog = (line: LineData) => {
    setDeletingLine(line);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingLine) return;
    setIsDeleting(true);
    try {
      await apiClient.fetch(`/api/lines/${deletingLine.id}`, {
        method: "DELETE",
      });
      toast.success("Ligne supprimée avec succès.");
      setDeleteOpen(false);
      setDeletingLine(null);
      fetchLines();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Impossible de supprimer la ligne."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Gérez les lignes de transport de votre réseau.
        </p>
        {isAdmin && (
          <Button
            onClick={openCreateForm}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Ajouter une ligne
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom, code ou gare..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead className="hidden sm:table-cell">Départ</TableHead>
                  <TableHead className="hidden sm:table-cell">Arrivée</TableHead>
                  <TableHead>Prix</TableHead>
                  <TableHead>Statut</TableHead>
                  {isAdmin && <TableHead className="w-20" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: isAdmin ? 7 : 6 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : paginated.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 7 : 6} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Route className="w-8 h-8" />
                        <p className="text-sm">
                          {search ? "Aucune ligne trouvée." : "Aucune ligne configurée."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginated.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {line.code}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          className="font-medium text-sm text-left hover:underline"
                          onClick={() => openDetail(line)}
                        >
                          {line.name}
                        </button>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className="text-sm">{line.fromStation.name}</span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className="text-sm">{line.toStation.name}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-semibold">
                          {formatPrice(line.basePrice)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={
                            line.isActive
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                          }
                        >
                          {line.isActive ? "Actif" : "Inactif"}
                        </Badge>
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEditForm(line)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => openDeleteDialog(line)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {!isLoading && filtered.length > ITEMS_PER_PAGE && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {filtered.length} ligne(s) — Page {currentPage} / {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Détail de la ligne</DialogTitle>
          </DialogHeader>
          {lineDetail && (
            <div className="space-y-4">
              {isLoadingDetail ? (
                <div className="space-y-3 animate-pulse">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-6 w-full" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Code</p>
                      <p className="font-mono font-medium">{lineDetail.code}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Nom</p>
                      <p className="font-medium">{lineDetail.name}</p>
                    </div>
                  </div>
                  <div className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      <span className="text-sm font-medium">{lineDetail.fromStation.name}</span>
                      <span className="text-xs text-muted-foreground">({lineDetail.fromStation.city})</span>
                    </div>
                    <div className="border-l-2 border-dashed border-gray-300 dark:border-gray-600 ml-1.5 h-4" />
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <span className="text-sm font-medium">{lineDetail.toStation.name}</span>
                      <span className="text-xs text-muted-foreground">({lineDetail.toStation.city})</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Prix de base</p>
                      <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                        {formatPrice(lineDetail.basePrice)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Statut</p>
                      <Badge
                        variant="secondary"
                        className={
                          lineDetail.isActive
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                        }
                      >
                        {lineDetail.isActive ? "Actif" : "Inactif"}
                      </Badge>
                    </div>
                  </div>
                  {lineDetail._count && (
                    <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-3">
                      <p className="text-xs text-muted-foreground mb-2">Utilisation</p>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-lg font-bold">{lineDetail._count.departures ?? 0}</p>
                          <p className="text-xs text-muted-foreground">Départs</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold">{lineDetail._count.passengerTickets ?? 0}</p>
                          <p className="text-xs text-muted-foreground">Tickets</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold">{lineDetail._count.preprintedTickets ?? 0}</p>
                          <p className="text-xs text-muted-foreground">Imprimés</p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create / Edit Dialog */}
      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          if (!open) resetFormState();
          setFormOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingLine ? "✏️ Modifier la ligne" : "➕ Nouvelle ligne"}
            </DialogTitle>
            <DialogDescription>
              {editingLine
                ? "Modifiez les informations de la ligne."
                : "Configurez une nouvelle ligne de transport."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="line-code">
                  Code <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="line-code"
                  placeholder="DKR-STL"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  maxLength={20}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="line-name">
                  Nom <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="line-name"
                  placeholder="Dakar — Saint-Louis"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="line-from">
                Gare de départ <span className="text-destructive">*</span>
              </Label>
              <Select value={formFromStationId} onValueChange={setFormFromStationId}>
                <SelectTrigger id="line-from">
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {stations.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.city})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="line-to">
                Gare d&apos;arrivée <span className="text-destructive">*</span>
              </Label>
              <Select value={formToStationId} onValueChange={setFormToStationId}>
                <SelectTrigger id="line-to">
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {stations
                    .filter((s) => s.id !== formFromStationId)
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({s.city})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="line-price">
                Prix (FCFA) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="line-price"
                type="number"
                min={0}
                step={500}
                placeholder="15000"
                value={formPrice}
                onChange={(e) => setFormPrice(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="line-active"
                checked={formIsActive}
                onCheckedChange={setFormIsActive}
              />
              <Label htmlFor="line-active" className="cursor-pointer">
                Ligne active
              </Label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFormOpen(false);
                  resetFormState();
                }}
                disabled={isSubmitting}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingLine ? "Enregistrer" : "Créer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette ligne ?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingLine && lineDetail?._count && (
                (lineDetail._count.departures ?? 0) +
                  (lineDetail._count.passengerTickets ?? 0) +
                  (lineDetail._count.preprintedTickets ?? 0) >
                0
              ) ? (
                <>
                  ⚠️ Cette ligne a des{" "}
                  <strong>
                    départs ou tickets liés
                  </strong>
                  . La suppression peut affecter les données existantes.
                </>
              ) : (
                <>
                  Cette action est irréversible. La ligne{" "}
                  <strong>{deletingLine?.name}</strong> ({deletingLine?.code})
                  sera définitivement supprimée.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
