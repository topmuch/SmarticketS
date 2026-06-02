"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  MapPin,
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
import { apiClient } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

// ── Types ──────────────────────────────────────────────────────────────
interface StationData {
  id: string;
  name: string;
  code: string;
  city: string;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  _count?: {
    parcelRatesFrom: number;
    parcelRatesTo: number;
    linesFrom: number;
    linesTo: number;
  };
}

const ITEMS_PER_PAGE = 20;

// ── Component ──────────────────────────────────────────────────────────
export function StationList() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  const [stations, setStations] = useState<StationData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Dialog states
  const [formOpen, setFormOpen] = useState(false);
  const [editingStation, setEditingStation] = useState<StationData | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingStation, setDeletingStation] = useState<StationData | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formCity, setFormCity] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch stations
  const fetchStations = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.fetch<{ data: StationData[] }>("/api/stations");
      setStations(data.data);
    } catch {
      toast.error("Impossible de charger les gares.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStations();
  }, [fetchStations]);

  // Filter
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return stations;
    return stations.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q)
    );
  }, [stations, search]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const getLineCount = (station: StationData) =>
    (station._count?.linesFrom ?? 0) + (station._count?.linesTo ?? 0);

  // ── Form handling ──────────────────────────────────────────────────
  const openCreateForm = () => {
    setEditingStation(null);
    setFormName("");
    setFormCode("");
    setFormCity("");
    setFormAddress("");
    setFormIsActive(true);
    setFormOpen(true);
  };

  const openEditForm = (station: StationData) => {
    setEditingStation(station);
    setFormName(station.name);
    setFormCode(station.code);
    setFormCity(station.city);
    setFormAddress(station.address || "");
    setFormIsActive(station.isActive);
    setFormOpen(true);
  };

  const resetFormState = () => {
    setFormName("");
    setFormCode("");
    setFormCity("");
    setFormAddress("");
    setFormIsActive(true);
    setEditingStation(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCode.trim() || !formCity.trim()) {
      toast.error("Le nom, le code et la ville sont requis.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingStation) {
        await apiClient.fetch(`/api/stations/${editingStation.id}`, {
          method: "PUT",
          body: JSON.stringify({
            name: formName.trim(),
            code: formCode.trim(),
            city: formCity.trim(),
            address: formAddress.trim() || null,
            isActive: formIsActive,
          }),
        });
        toast.success("Gare mise à jour avec succès.");
      } else {
        await apiClient.fetch("/api/stations", {
          method: "POST",
          body: JSON.stringify({
            name: formName.trim(),
            code: formCode.trim(),
            city: formCity.trim(),
            address: formAddress.trim() || null,
            isActive: formIsActive,
          }),
        });
        toast.success("Gare créée avec succès.");
      }
      setFormOpen(false);
      resetFormState();
      fetchStations();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Impossible de sauvegarder la gare."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Delete handling ────────────────────────────────────────────────
  const openDeleteDialog = (station: StationData) => {
    setDeletingStation(station);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingStation) return;
    setIsDeleting(true);
    try {
      await apiClient.fetch(`/api/stations/${deletingStation.id}`, {
        method: "DELETE",
      });
      toast.success("Gare supprimée avec succès.");
      setDeleteOpen(false);
      setDeletingStation(null);
      fetchStations();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Impossible de supprimer la gare."
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
          Gérez les gares de votre réseau de transport.
        </p>
        {isAdmin && (
          <Button
            onClick={openCreateForm}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Ajouter une gare
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom, code ou ville..."
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
                  <TableHead className="hidden md:table-cell">Ville</TableHead>
                  <TableHead className="hidden lg:table-cell">Adresse</TableHead>
                  <TableHead className="text-center">Lignes</TableHead>
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
                        <MapPin className="w-8 h-8" />
                        <p className="text-sm">
                          {search ? "Aucune gare trouvée." : "Aucune gare configurée."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginated.map((station) => {
                    const lineCount = getLineCount(station);
                    return (
                      <TableRow key={station.id}>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">
                            {station.code}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-sm">{station.name}</span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="text-sm text-muted-foreground">{station.city}</span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
                            {station.address || "—"}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="secondary"
                            className={
                              lineCount > 0
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : ""
                            }
                          >
                            {lineCount}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={
                              station.isActive
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                            }
                          >
                            {station.isActive ? "Actif" : "Inactif"}
                          </Badge>
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEditForm(station)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => openDeleteDialog(station)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
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
            {filtered.length} gare(s) — Page {currentPage} / {totalPages}
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
              {editingStation ? "✏️ Modifier la gare" : "➕ Nouvelle gare"}
            </DialogTitle>
            <DialogDescription>
              {editingStation
                ? "Modifiez les informations de la gare."
                : "Ajoutez une nouvelle gare à votre réseau."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="station-code">
                  Code <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="station-code"
                  placeholder="DKR"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  maxLength={20}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="station-city">
                  Ville <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="station-city"
                  placeholder="Dakar"
                  value={formCity}
                  onChange={(e) => setFormCity(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="station-name">
                Nom <span className="text-destructive">*</span>
              </Label>
              <Input
                id="station-name"
                placeholder="Gare Routière de Dakar"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="station-address">Adresse</Label>
              <Input
                id="station-address"
                placeholder="Adresse de la gare"
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="station-active"
                checked={formIsActive}
                onCheckedChange={setFormIsActive}
              />
              <Label htmlFor="station-active" className="cursor-pointer">
                Gare active
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
                {editingStation ? "Enregistrer" : "Créer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette gare ?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingStation && getLineCount(deletingStation) > 0 ? (
                <>
                  ⚠️ Cette gare est utilisée par{" "}
                  <strong>{getLineCount(deletingStation)} ligne(s)</strong>. Vous
                  devez supprimer les lignes liées avant de supprimer cette gare.
                </>
              ) : (
                <>
                  Cette action est irréversible. La gare{" "}
                  <strong>{deletingStation?.name}</strong> (
                  {deletingStation?.code}) sera définitivement supprimée.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting || (deletingStation ? getLineCount(deletingStation) > 0 : false)}
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
