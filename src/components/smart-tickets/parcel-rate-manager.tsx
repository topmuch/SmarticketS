"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  PackageSearch,
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

// ── Types ──────────────────────────────────────────────────────────────
interface Station {
  id: string;
  name: string;
  city: string;
}

interface ParcelRateData {
  id: string;
  fromStation: Station;
  toStation: Station;
  price: number;
  isActive: boolean;
  _count?: { parcels: number };
}

// ── Component ──────────────────────────────────────────────────────────
export function ParcelRateManager() {
  const [rates, setRates] = useState<ParcelRateData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stations, setStations] = useState<Station[]>([]);

  // Dialog states
  const [formOpen, setFormOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<ParcelRateData | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingRate, setDeletingRate] = useState<ParcelRateData | null>(null);

  // Form state
  const [fromStationId, setFromStationId] = useState("");
  const [toStationId, setToStationId] = useState("");
  const [price, setPrice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch rates
  const fetchRates = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.fetch<ParcelRateData[]>("/api/parcels/rates");
      setRates(data);
    } catch {
      toast.error("Impossible de charger les tarifs.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch stations
  useEffect(() => {
    const loadStations = async () => {
      try {
        const data = await apiClient.fetch<Station[]>("/api/stations");
        setStations(data);
      } catch {
        toast.error("Impossible de charger les gares.");
      }
    };
    loadStations();
  }, []);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  // ── Form handling ──────────────────────────────────────────────────
  const openCreateForm = () => {
    setEditingRate(null);
    setFromStationId("");
    setToStationId("");
    setPrice("");
    setFormOpen(true);
  };

  const openEditForm = (rate: ParcelRateData) => {
    setEditingRate(rate);
    setFromStationId(rate.fromStation.id);
    setToStationId(rate.toStation.id);
    setPrice(rate.price.toString());
    setFormOpen(true);
  };

  const resetFormState = () => {
    setFromStationId("");
    setToStationId("");
    setPrice("");
    setEditingRate(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromStationId || !toStationId) {
      toast.error("Les gares sont requises.");
      return;
    }
    if (fromStationId === toStationId) {
      toast.error("Les gares doivent être différentes.");
      return;
    }
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast.error("Le prix doit être un nombre positif.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingRate) {
        // Update
        await apiClient.fetch(`/api/parcels/rates/${editingRate.id}`, {
          method: "PUT",
          body: JSON.stringify({
            fromStationId,
            toStationId,
            price: priceNum,
          }),
        });
        toast.success("Tarif mis à jour avec succès.");
      } else {
        // Create
        await apiClient.fetch("/api/parcels/rates", {
          method: "POST",
          body: JSON.stringify({
            fromStationId,
            toStationId,
            price: priceNum,
          }),
        });
        toast.success("Tarif créé avec succès.");
      }
      setFormOpen(false);
      resetFormState();
      fetchRates();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Impossible de sauvegarder le tarif."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Delete handling ────────────────────────────────────────────────
  const openDeleteDialog = (rate: ParcelRateData) => {
    setDeletingRate(rate);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingRate) return;
    setIsDeleting(true);
    try {
      await apiClient.fetch(`/api/parcels/rates/${deletingRate.id}`, {
        method: "DELETE",
      });
      toast.success("Tarif supprimé avec succès.");
      setDeleteOpen(false);
      setDeletingRate(null);
      fetchRates();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Impossible de supprimer le tarif."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            Gérez les tarifs de messagerie entre les gares.
          </p>
        </div>
        <Button
          onClick={openCreateForm}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="mr-2 h-4 w-4" />
          Ajouter un tarif
        </Button>
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Gare départ</TableHead>
                  <TableHead>Gare arrivée</TableHead>
                  <TableHead>Prix (FCFA)</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : rates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <PackageSearch className="w-8 h-8" />
                        <p className="text-sm">Aucun tarif configuré.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  rates.map((rate) => (
                    <TableRow key={rate.id}>
                      <TableCell>
                        <span className="font-medium text-sm">
                          {rate.fromStation.name}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-sm">
                          {rate.toStation.name}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-semibold">
                          {rate.price.toLocaleString("fr-FR")} FCFA
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={
                            rate.isActive
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                          }
                        >
                          {rate.isActive ? "Actif" : "Inactif"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditForm(rate)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => openDeleteDialog(rate)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

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
              {editingRate ? "✏️ Modifier le tarif" : "➕ Nouveau tarif"}
            </DialogTitle>
            <DialogDescription>
              {editingRate
                ? "Modifiez les informations du tarif."
                : "Configurez un nouveau tarif de messagerie."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rate-from">
                Gare de départ <span className="text-destructive">*</span>
              </Label>
              <Select value={fromStationId} onValueChange={setFromStationId}>
                <SelectTrigger id="rate-from">
                  <SelectValue placeholder="Sélectionner" />
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

            <div className="space-y-2">
              <Label htmlFor="rate-to">
                Gare d&apos;arrivée <span className="text-destructive">*</span>
              </Label>
              <Select value={toStationId} onValueChange={setToStationId}>
                <SelectTrigger id="rate-to">
                  <SelectValue placeholder="Sélectionner" />
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

            <div className="space-y-2">
              <Label htmlFor="rate-price">
                Prix (FCFA) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="rate-price"
                type="number"
                min={0}
                step={100}
                placeholder="5000"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
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
                {editingRate ? "Enregistrer" : "Créer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce tarif ?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingRate && deletingRate._count && deletingRate._count.parcels > 0 ? (
                <>
                  ⚠️ Ce tarif est utilisé par{" "}
                  <strong>{deletingRate._count.parcels} colis</strong>. La
                  suppression peut affecter les colis existants.
                </>
              ) : (
                <>
                  Cette action est irréversible. Le tarif{" "}
                  <strong>
                    {deletingRate?.fromStation.name} → {deletingRate?.toStation.name}
                  </strong>{" "}
                  sera définitivement supprimé.
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
