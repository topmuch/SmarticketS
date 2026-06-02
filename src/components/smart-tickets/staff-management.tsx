// @ts-nocheck
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Plus,
  Pencil,
  UserX,
  UserCheck,
  Shield,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
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

// ── Types ──────────────────────────────────────────────────────────────────

interface StaffUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: "ADMIN" | "OPERATOR" | "CONTROLLER" | "DRIVER";
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
}

type StaffFormData = {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  pin: string; // 4-6 digits for terrain roles
  phone: string;
  role: StaffUser["role"];
  generatedPin?: string; // Returned from API after creation
};

const EMPTY_FORM: StaffFormData = {
  email: "",
  firstName: "",
  lastName: "",
  password: "",
  pin: "",
  phone: "",
  role: "OPERATOR",
};

// ── Helpers ───────────────────────────────────────────────────────────

const isFieldRole = (role: string) => role === "DRIVER" || role === "CONTROLLER";

// ── Constants ────────────────────────────────────────────────────────────────

const ROLE_BADGE_COLORS: Record<string, string> = {
  ADMIN: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  OPERATOR:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  CONTROLLER: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  DRIVER: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  OPERATOR: "Opérateur",
  CONTROLLER: "Contrôleur",
  DRIVER: "Chauffeur",
};

const ROLES = [
  { value: "ADMIN", label: "Admin" },
  { value: "OPERATOR", label: "Opérateur" },
  { value: "CONTROLLER", label: "Contrôleur" },
  { value: "DRIVER", label: "Chauffeur" },
] as const;

// ── Component ──────────────────────────────────────────────────────────────

export function StaffManagement() {
  const user = useAuthStore((s) => s.user);

  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingStaff, setDeletingStaff] = useState<StaffUser | null>(null);

  // Forms
  const [createForm, setCreateForm] = useState<StaffFormData>(EMPTY_FORM);
  const [editForm, setEditForm] = useState<StaffFormData>(EMPTY_FORM);

  // ── Fetch ───────────────────────────────────────────────────────────────

  const fetchStaff = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.fetch<StaffUser[]>("/api/admin/staff");
      setStaff(data);
    } catch {
      toast.error("Impossible de charger les membres du personnel.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  // ── Create ────────────────────────────────────────────────────────────

  const handleCreateOpen = () => {
    setCreateForm(EMPTY_FORM);
    setCreateOpen(true);
  };

  const handleCreateSubmit = async () => {
    const isField = isFieldRole(createForm.role);
    
    if (!createForm.firstName || !createForm.lastName) {
      toast.error("Veuillez remplir le prénom et le nom.");
      return;
    }
    if (!isField && (!createForm.email || !createForm.password)) {
      toast.error("Email et mot de passe requis pour les opérateurs/admins.");
      return;
    }
    if (isField && (!createForm.phone || !createForm.pin)) {
      toast.error("Téléphone et code PIN requis pour les agents de terrain.");
      return;
    }
    if (isField && createForm.pin.length < 4) {
      toast.error("Le code PIN doit contenir au moins 4 chiffres.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        firstName: createForm.firstName,
        lastName: createForm.lastName,
        role: createForm.role,
        ...(user?.tenantId ? { tenantId: user.tenantId } : {}),
      };

      if (isField) {
        body.phone = createForm.phone;
        body.pin = createForm.pin;
        // Auto-generate placeholder email/password for field roles
        body.email = `driver_${createForm.phone}@field.local`;
        body.password = "AutoGeneratedFieldPass16!";
      } else {
        body.email = createForm.email;
        body.password = createForm.password;
        body.phone = createForm.phone || null;
      }

      const result = await apiClient.fetch<{ generatedPin?: string }>("/api/admin/staff", {
        method: "POST",
        body: JSON.stringify(body),
      });

      toast.success(
        isField && result.generatedPin
          ? `Membre ajouté ! PIN : ${result.generatedPin}`
          : "Membre ajouté avec succès."
      );
      setCreateOpen(false);
      setCreateForm(EMPTY_FORM);
      fetchStaff();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Impossible d'ajouter le membre."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Edit ──────────────────────────────────────────────────────────────

  const handleEditOpen = (s: StaffUser) => {
    setEditingStaff(s);
    setEditForm({
      email: s.email,
      firstName: s.firstName,
      lastName: s.lastName,
      password: "",
      phone: s.phone || "",
      role: s.role,
    });
    setEditOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!editingStaff) return;
    if (!editForm.firstName || !editForm.lastName || !editForm.email) {
      toast.error("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    setIsSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        email: editForm.email,
        phone: editForm.phone || null,
        role: editForm.role,
      };
      if (editForm.password) {
        body.password = editForm.password;
      }
      await apiClient.fetch(`/api/admin/staff/${editingStaff.id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      toast.success("Membre modifié avec succès.");
      setEditOpen(false);
      setEditingStaff(null);
      fetchStaff();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Impossible de modifier le membre."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Toggle Active ─────────────────────────────────────────────────────

  const handleToggleActive = async (s: StaffUser) => {
    try {
      await apiClient.fetch(`/api/admin/staff/${s.id}`, {
        method: "PUT",
        body: JSON.stringify({ isActive: !s.isActive }),
      });
      toast.success(
        s.isActive
          ? `${s.firstName} ${s.lastName} désactivé.`
          : `${s.firstName} ${s.lastName} réactivé.`
      );
      fetchStaff();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Impossible de modifier le statut."
      );
    }
  };

  // ── Delete (Deactivate) ───────────────────────────────────────────────

  const handleDeleteOpen = (s: StaffUser) => {
    setDeletingStaff(s);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingStaff) return;
    setIsSubmitting(true);
    try {
      await apiClient.fetch(`/api/admin/staff/${deletingStaff.id}`, {
        method: "DELETE",
      });
      toast.success(`${deletingStaff.firstName} ${deletingStaff.lastName} désactivé.`);
      setDeleteOpen(false);
      setDeletingStaff(null);
      fetchStaff();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Impossible de désactiver le membre."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ── Skeleton rows ─────────────────────────────────────────────────────

  const skeletonRows = Array.from({ length: 5 });

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <CardTitle className="text-xl text-gray-900 dark:text-white">
                  Gestion du Personnel
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {staff.length} membre{staff.length > 1 ? "s" : ""} du
                  personnel
                </p>
              </div>
            </div>

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={handleCreateOpen}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter un membre
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-emerald-600" />
                    Nouveau membre du personnel
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 pt-2">
                  {/* Role selector — first, to drive conditional fields */}
                  <div className="space-y-2">
                    <Label>Rôle *</Label>
                    <Select
                      value={createForm.role}
                      onValueChange={(val) =>
                        setCreateForm((f) => ({
                          ...f,
                          role: val as StaffUser["role"],
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isFieldRole(createForm.role) && (
                      <p className="text-xs text-violet-600 dark:text-violet-400 flex items-center gap-1">
                        📱 Agent terrain — Téléphone + Code PIN
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="create-firstName">Prénom *</Label>
                      <Input
                        id="create-firstName"
                        placeholder="Prénom"
                        value={createForm.firstName}
                        onChange={(e) =>
                          setCreateForm((f) => ({
                            ...f,
                            firstName: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="create-lastName">Nom *</Label>
                      <Input
                        id="create-lastName"
                        placeholder="Nom"
                        value={createForm.lastName}
                        onChange={(e) =>
                          setCreateForm((f) => ({
                            ...f,
                            lastName: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  {/* ── Web fields (ADMIN/OPERATOR) ── */}
                  {!isFieldRole(createForm.role) && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="create-email">E-mail *</Label>
                        <Input
                          id="create-email"
                          type="email"
                          placeholder="user@stmb.com"
                          value={createForm.email}
                          onChange={(e) =>
                            setCreateForm((f) => ({ ...f, email: e.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="create-password">Mot de passe *</Label>
                        <Input
                          id="create-password"
                          type="password"
                          placeholder="••••••••"
                          value={createForm.password}
                          onChange={(e) =>
                            setCreateForm((f) => ({ ...f, password: e.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="create-phone-web">Téléphone (optionnel)</Label>
                        <Input
                          id="create-phone-web"
                          placeholder="+221 77 123 45 67"
                          value={createForm.phone}
                          onChange={(e) =>
                            setCreateForm((f) => ({ ...f, phone: e.target.value }))
                          }
                        />
                      </div>
                    </>
                  )}

                  {/* ── Field fields (CONTROLLER/DRIVER) ── */}
                  {isFieldRole(createForm.role) && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="create-phone-field">Téléphone *</Label>
                        <Input
                          id="create-phone-field"
                          type="tel"
                          placeholder="77 123 45 67"
                          value={createForm.phone}
                          onChange={(e) =>
                            setCreateForm((f) => ({ ...f, phone: e.target.value }))
                          }
                          inputMode="numeric"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="create-pin">Code PIN * (4-6 chiffres)</Label>
                        <Input
                          id="create-pin"
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]{4,6}"
                          maxLength={6}
                          placeholder="1234"
                          value={createForm.pin}
                          onChange={(e) =>
                            setCreateForm((f) => ({
                              ...f,
                              pin: e.target.value.replace(/\D/g, "").slice(0, 6),
                            }))
                          }
                          className="font-mono text-lg tracking-widest"
                        />
                        <p className="text-xs text-muted-foreground">
                          Ce PIN sera envoyé à l&apos;agent via WhatsApp et devra être
                          changé lors de la première connexion.
                        </p>
                      </div>
                    </>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCreateOpen(false)}
                      disabled={isSubmitting}
                    >
                      Annuler
                    </Button>
                    <Button
                      type="button"
                      onClick={handleCreateSubmit}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      disabled={isSubmitting}
                    >
                      {isSubmitting && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Créer
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Staff Table — Desktop */}
      <Card className="border-0 shadow-sm hidden md:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Dernière connexion</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                skeletonRows.map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : staff.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Users className="w-8 h-8" />
                      <p className="text-sm">
                        Aucun membre du personnel enregistré.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                staff.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {s.firstName} {s.lastName}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {s.email}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={`text-xs ${
                          ROLE_BADGE_COLORS[s.role] || ROLE_BADGE_COLORS.OPERATOR
                        }`}
                      >
                        {ROLE_LABELS[s.role] || s.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          s.isActive
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }
                      >
                        {s.isActive ? "Actif" : "Inactif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(s.lastLogin)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEditOpen(s)}
                          title="Modifier"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-8 w-8 ${
                            s.isActive
                              ? "text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                              : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                          }`}
                          onClick={() => handleToggleActive(s)}
                          title={s.isActive ? "Désactiver" : "Réactiver"}
                        >
                          {s.isActive ? (
                            <UserX className="h-4 w-4" />
                          ) : (
                            <UserCheck className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Staff Cards — Mobile */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          skeletonRows.map((_, i) => (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : staff.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-8 text-center">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Users className="w-8 h-8" />
                <p className="text-sm">
                  Aucun membre du personnel enregistré.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          staff.map((s) => (
            <Card key={s.id} className="border-0 shadow-sm">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                      <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                        {s.firstName.charAt(0)}
                        {s.lastName.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {s.firstName} {s.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {s.email}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className={
                      s.isActive
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    }
                  >
                    {s.isActive ? "Actif" : "Inactif"}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant="secondary"
                    className={`text-xs ${
                      ROLE_BADGE_COLORS[s.role] || ROLE_BADGE_COLORS.OPERATOR
                    }`}
                  >
                    {ROLE_LABELS[s.role] || s.role}
                  </Badge>
                  {s.phone && (
                    <span className="text-xs text-muted-foreground">
                      {s.phone}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1 border-t">
                  <span className="text-xs text-muted-foreground">
                    Dernière connexion : {formatDate(s.lastLogin)}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEditOpen(s)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-8 w-8 ${
                        s.isActive
                          ? "text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                          : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                      }`}
                      onClick={() => handleToggleActive(s)}
                    >
                      {s.isActive ? (
                        <UserX className="h-4 w-4" />
                      ) : (
                        <UserCheck className="h-4 w-4" />
                      )}
                    </Button>
                    {s.isActive && (
                      <AlertDialog
                        open={deleteOpen && deletingStaff?.id === s.id}
                        onOpenChange={(open) => {
                          setDeleteOpen(open);
                          if (!open) setDeletingStaff(null);
                        }}
                      >
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={() => handleDeleteOpen(s)}
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Désactiver {s.firstName} {s.lastName} ?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Cette action désactivera le compte de{" "}
                              <strong>
                                {s.firstName} {s.lastName}
                              </strong>
                              . La personne ne pourra plus se connecter.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel
                              onClick={() => {
                                setDeleteOpen(false);
                                setDeletingStaff(null);
                              }}
                            >
                              Annuler
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleDeleteConfirm}
                              className="bg-red-600 hover:bg-red-700 text-white"
                              disabled={isSubmitting}
                            >
                              {isSubmitting && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              )}
                              Désactiver
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* ── Edit Dialog ────────────────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-emerald-600" />
              Modifier le membre
            </DialogTitle>
          </DialogHeader>

          {editingStaff && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-firstName">Prénom *</Label>
                  <Input
                    id="edit-firstName"
                    value={editForm.firstName}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        firstName: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-lastName">Nom *</Label>
                  <Input
                    id="edit-lastName"
                    value={editForm.lastName}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        lastName: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-email">E-mail *</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, email: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-password">
                  Nouveau mot de passe{" "}
                  <span className="text-muted-foreground">(optionnel)</span>
                </Label>
                <Input
                  id="edit-password"
                  type="password"
                  placeholder="Laisser vide pour ne pas modifier"
                  value={editForm.password}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, password: e.target.value }))
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Téléphone</Label>
                  <Input
                    id="edit-phone"
                    value={editForm.phone}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, phone: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rôle *</Label>
                  <Select
                    value={editForm.role}
                    onValueChange={(val) =>
                      setEditForm((f) => ({
                        ...f,
                        role: val as StaffUser["role"],
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditOpen(false);
                    setEditingStaff(null);
                  }}
                  disabled={isSubmitting}
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  onClick={handleEditSubmit}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={isSubmitting}
                >
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Enregistrer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation (Desktop) ──────────────────────────────── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Désactiver {deletingStaff?.firstName} {deletingStaff?.lastName} ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Cette action désactivera le compte de{" "}
              {deletingStaff && (
                <strong>
                  {deletingStaff.firstName} {deletingStaff.lastName}
                </strong>
              )}
              . La personne ne pourra plus se connecter. Vous pourrez la
              réactiver ultérieurement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeleteOpen(false);
                setDeletingStaff(null);
              }}
            >
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Désactiver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
