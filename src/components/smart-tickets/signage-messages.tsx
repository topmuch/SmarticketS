"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Megaphone,
  Power,
  PowerOff,
  Loader2,
  RotateCcw,
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

interface MessageItem {
  id: string;
  content: string;
  priority: string;
  stationName: string | null;
  stationId: string | null;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  createdAt: string;
}

interface MessageFormData {
  content: string;
  priority: string;
  startDate: string;
  endDate: string;
  stationId: string;
  isActive: boolean;
}

const EMPTY_FORM: MessageFormData = {
  content: "",
  priority: "NORMAL",
  startDate: "",
  endDate: "",
  stationId: "global",
  isActive: true,
};

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PRIORITY_BADGES: Record<string, string> = {
  URGENT:
    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  INFO: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  NORMAL:
    "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

const PRIORITY_LABELS: Record<string, string> = {
  URGENT: "Urgent",
  INFO: "Information",
  NORMAL: "Normal",
};

const PRIORITY_OPTIONS = [
  { value: "URGENT", label: "Urgent" },
  { value: "INFO", label: "Information" },
  { value: "NORMAL", label: "Normal" },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function SignageMessages() {
  // Data
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [stations, setStations] = useState<StationOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");
  const [stationFilter, setStationFilter] = useState("all");

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 20;

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<MessageFormData>(EMPTY_FORM);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toggle loading
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // --- Fetch stations ---
  useEffect(() => {
    (async () => {
      try {
        const s = await apiClient.fetch<{ data: StationOption[] }>("/api/stations");
        setStations(s.data);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  // --- Fetch messages ---
  const fetchMessages = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(priorityFilter !== "all" ? { priority: priorityFilter } : {}),
        ...(activeFilter !== "all"
          ? { isActive: activeFilter }
          : {}),
        ...(stationFilter !== "all" ? { stationId: stationFilter } : {}),
      });
      const data = await apiClient.fetch<{
        data: MessageItem[];
        pagination: { totalPages: number; total: number };
      }>(`/api/signage/messages?${params.toString()}`);
      setMessages(data.data);
      setTotalPages(data.pagination.totalPages);
      setTotalItems(data.pagination.total);
    } catch {
      toast.error("Impossible de charger les messages.");
    } finally {
      setIsLoading(false);
    }
  }, [page, priorityFilter, activeFilter, stationFilter]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // --- Reset filters ---
  const resetFilters = () => {
    setPriorityFilter("all");
    setActiveFilter("all");
    setStationFilter("all");
    setPage(1);
  };

  // --- Open create dialog ---
  const openCreate = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setFormOpen(true);
  };

  // --- Open edit dialog ---
  const openEdit = (msg: MessageItem) => {
    setEditingId(msg.id);
    setFormData({
      content: msg.content,
      priority: msg.priority,
      startDate: msg.startDate ? msg.startDate.slice(0, 10) : "",
      endDate: msg.endDate ? msg.endDate.slice(0, 10) : "",
      stationId: msg.stationId ?? "global",
      isActive: msg.isActive,
    });
    setFormOpen(true);
  };

  // --- Submit form ---
  const handleSubmit = async () => {
    if (!formData.content.trim() || !formData.startDate) {
      toast.error("Veuillez remplir le contenu et la date de début.");
      return;
    }
    setFormSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        content: formData.content.trim(),
        priority: formData.priority,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: formData.endDate
          ? new Date(formData.endDate).toISOString()
          : null,
        stationId:
          formData.stationId === "global" ? null : formData.stationId,
        isActive: formData.isActive,
      };

      if (editingId) {
        await apiClient.fetch(`/api/signage/messages/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
        toast.success("Message mis à jour avec succès.");
      } else {
        await apiClient.fetch("/api/signage/messages", {
          method: "POST",
          body: JSON.stringify(body),
        });
        toast.success("Message créé avec succès.");
      }
      setFormOpen(false);
      fetchMessages();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Impossible d'enregistrer le message."
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
      await apiClient.fetch(`/api/signage/messages/${deleteId}`, {
        method: "DELETE",
      });
      toast.success("Message supprimé.");
      setDeleteId(null);
      fetchMessages();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Impossible de supprimer le message."
      );
    } finally {
      setDeleting(false);
    }
  };

  // --- Toggle active ---
  const handleToggleActive = async (msg: MessageItem) => {
    setTogglingId(msg.id);
    try {
      await apiClient.fetch(`/api/signage/messages/${msg.id}`, {
        method: "PUT",
        body: JSON.stringify({ isActive: !msg.isActive }),
      });
      toast.success(
        msg.isActive
          ? "Message désactivé."
          : "Message activé."
      );
      fetchMessages();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Impossible de modifier le statut."
      );
    } finally {
      setTogglingId(null);
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

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      {/* ---- Header ---- */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Button
          onClick={openCreate}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nouveau Message
        </Button>
      </div>

      {/* ---- Filters ---- */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Priority */}
            <Select
              value={priorityFilter}
              onValueChange={(v) => {
                setPriorityFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full lg:w-[180px]">
                <SelectValue placeholder="Priorité" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                {PRIORITY_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Active */}
            <Select
              value={activeFilter}
              onValueChange={(v) => {
                setActiveFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full lg:w-[160px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="true">Actif</SelectItem>
                <SelectItem value="false">Inactif</SelectItem>
              </SelectContent>
            </Select>

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
                <SelectItem value="all">Toutes</SelectItem>
                {stations.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Reset */}
            {(priorityFilter !== "all" ||
              activeFilter !== "all" ||
              stationFilter !== "all") && (
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
                  <TableHead>Contenu</TableHead>
                  <TableHead>Priorité</TableHead>
                  <TableHead className="hidden md:table-cell">Gare</TableHead>
                  <TableHead className="hidden sm:table-cell">Période</TableHead>
                  <TableHead>Actif</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : messages.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Megaphone className="w-8 h-8" />
                        <p className="text-sm">Aucun message trouvé.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  messages.map((msg) => (
                    <TableRow
                      key={msg.id}
                      className={!msg.isActive ? "opacity-50" : ""}
                    >
                      {/* Content */}
                      <TableCell>
                        <p className="text-sm font-medium max-w-xs truncate">
                          {msg.content}
                        </p>
                      </TableCell>

                      {/* Priority */}
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`text-xs ${
                            PRIORITY_BADGES[msg.priority] ??
                            PRIORITY_BADGES.NORMAL
                          }`}
                        >
                          {PRIORITY_LABELS[msg.priority] ?? msg.priority}
                        </Badge>
                      </TableCell>

                      {/* Station */}
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm text-muted-foreground">
                          {msg.stationName ?? (
                            <Badge variant="secondary" className="text-xs">
                              Global
                            </Badge>
                          )}
                        </span>
                      </TableCell>

                      {/* Period */}
                      <TableCell className="hidden sm:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(msg.startDate)}
                          {msg.endDate && (
                            <>
                              <span className="mx-1">→</span>
                              {formatDate(msg.endDate)}
                            </>
                          )}
                        </span>
                      </TableCell>

                      {/* Active */}
                      <TableCell>
                        {togglingId === msg.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : (
                          <button
                            onClick={() => handleToggleActive(msg)}
                            className="focus:outline-none"
                            aria-label={
                              msg.isActive
                                ? "Désactiver le message"
                                : "Activer le message"
                            }
                          >
                            {msg.isActive ? (
                              <Power className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <PowerOff className="w-4 h-4 text-muted-foreground" />
                            )}
                          </button>
                        )}
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
                            <DropdownMenuItem onClick={() => openEdit(msg)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleToggleActive(msg)}
                              disabled={togglingId === msg.id}
                            >
                              {msg.isActive ? (
                                <>
                                  <PowerOff className="mr-2 h-4 w-4" />
                                  Désactiver
                                </>
                              ) : (
                                <>
                                  <Power className="mr-2 h-4 w-4" />
                                  Activer
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600 dark:text-red-400"
                              onClick={() => setDeleteId(msg.id)}
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
              {totalItems} message(s) au total — Page {page} sur {totalPages}
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
                    {editingId
                      ? "Modifier le message"
                      : "Nouveau Message"}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  {/* Content */}
                  <div className="space-y-2">
                    <Label>Contenu *</Label>
                    <Textarea
                      placeholder="Texte du message d'affichage"
                      value={formData.content}
                      onChange={(e) =>
                        setFormData((f) => ({ ...f, content: e.target.value }))
                      }
                      rows={3}
                    />
                  </div>

                  {/* Priority */}
                  <div className="space-y-2">
                    <Label>Priorité</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(v) =>
                        setFormData((f) => ({ ...f, priority: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITY_OPTIONS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date range */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Date de début *</Label>
                      <Input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) =>
                          setFormData((f) => ({
                            ...f,
                            startDate: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Date de fin</Label>
                      <Input
                        type="date"
                        value={formData.endDate}
                        onChange={(e) =>
                          setFormData((f) => ({
                            ...f,
                            endDate: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  {/* Station */}
                  <div className="space-y-2">
                    <Label>Gare</Label>
                    <Select
                      value={formData.stationId}
                      onValueChange={(v) =>
                        setFormData((f) => ({ ...f, stationId: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Gare" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="global">Global</SelectItem>
                        {stations.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Active switch */}
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={formData.isActive}
                      onCheckedChange={(checked) =>
                        setFormData((f) => ({ ...f, isActive: checked }))
                      }
                    />
                    <Label>Message actif</Label>
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
            <AlertDialogTitle>Supprimer ce message ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le message sera supprimé
              définitivement de l&apos;affichage.
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
