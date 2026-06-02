"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiClient } from "@/lib/api";
import type { TenantUser } from "@/stores/auth-store";

const createUserSchema = z.object({
  email: z.string().email("Adresse e-mail invalide"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  firstName: z.string().min(1, "Le prénom est obligatoire").max(50),
  lastName: z.string().min(1, "Le nom est obligatoire").max(50),
  phone: z.string().optional(),
  role: z.enum(["ADMIN", "OPERATOR", "CONTROLLER", "DRIVER"]).default("OPERATOR"),
});

const editUserSchema = z.object({
  firstName: z.string().min(1, "Le prénom est obligatoire").max(50),
  lastName: z.string().min(1, "Le nom est obligatoire").max(50),
  phone: z.string().optional(),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "OPERATOR", "CONTROLLER", "DRIVER"]).optional(),
  isActive: z.boolean().optional(),
});

type CreateUserData = z.infer<typeof createUserSchema>;
type EditUserData = z.infer<typeof editUserSchema>;

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: TenantUser | null;
  tenantId: string;
  onSuccess: () => void;
}

export function UserFormDialog({
  open,
  onOpenChange,
  user,
  tenantId,
  onSuccess,
}: UserFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!user;

  const createForm = useForm<CreateUserData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      phone: "",
      role: "OPERATOR",
    },
  });

  const editForm = useForm<EditUserData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      role: "OPERATOR",
      isActive: true,
    },
  });

  // Reset forms on open/close
  useEffect(() => {
    if (open) {
      if (user) {
        editForm.reset({
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone || "",
          role: user.role as EditUserData["role"],
          isActive: user.isActive,
        });
      } else {
        createForm.reset({
          email: "",
          password: "",
          firstName: "",
          lastName: "",
          phone: "",
          role: "OPERATOR",
        });
      }
    }
  }, [open, user, createForm, editForm]);

  const handleCreateSubmit = async (data: CreateUserData) => {
    setIsSubmitting(true);
    try {
      await apiClient.fetch(`/api/tenants/${tenantId}/users`, {
        method: "POST",
        body: JSON.stringify(data),
      });
      toast.success("Utilisateur créé avec succès.");
      onSuccess();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Impossible de créer l'utilisateur."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (data: EditUserData) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      await apiClient.fetch(`/api/users/${user.id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      toast.success("Utilisateur modifié avec succès.");
      onSuccess();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Impossible de modifier l'utilisateur."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const ROLES = [
    { value: "ADMIN", label: "Admin" },
    { value: "OPERATOR", label: "Opérateur" },
    { value: "CONTROLLER", label: "Contrôleur" },
    { value: "DRIVER", label: "Chauffeur" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifier l'utilisateur" : "Nouvel utilisateur"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifiez les informations de l'utilisateur."
              : "Remplissez les informations pour créer un nouvel utilisateur."}
          </DialogDescription>
        </DialogHeader>

        {isEditing ? (
          <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-firstName">Prénom *</Label>
                <Input id="edit-firstName" {...editForm.register("firstName")} />
                {editForm.formState.errors.firstName && (
                  <p className="text-xs text-destructive">
                    {editForm.formState.errors.firstName.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-lastName">Nom *</Label>
                <Input id="edit-lastName" {...editForm.register("lastName")} />
                {editForm.formState.errors.lastName && (
                  <p className="text-xs text-destructive">
                    {editForm.formState.errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Téléphone</Label>
                <Input id="edit-phone" {...editForm.register("phone")} />
              </div>
              <div className="space-y-2">
                <Label>Rôle</Label>
                <Select
                  value={editForm.watch("role") || ""}
                  onValueChange={(val) =>
                    editForm.setValue("role", val as EditUserData["role"])
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

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-email">E-mail *</Label>
              <Input
                id="create-email"
                type="email"
                placeholder="user@stmb.com"
                {...createForm.register("email")}
              />
              {createForm.formState.errors.email && (
                <p className="text-xs text-destructive">
                  {createForm.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-password">Mot de passe *</Label>
              <Input
                id="create-password"
                type="password"
                placeholder="••••••••"
                {...createForm.register("password")}
              />
              {createForm.formState.errors.password && (
                <p className="text-xs text-destructive">
                  {createForm.formState.errors.password.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-firstName">Prénom *</Label>
                <Input
                  id="create-firstName"
                  placeholder="Ahmed"
                  {...createForm.register("firstName")}
                />
                {createForm.formState.errors.firstName && (
                  <p className="text-xs text-destructive">
                    {createForm.formState.errors.firstName.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-lastName">Nom *</Label>
                <Input
                  id="create-lastName"
                  placeholder="Benali"
                  {...createForm.register("lastName")}
                />
                {createForm.formState.errors.lastName && (
                  <p className="text-xs text-destructive">
                    {createForm.formState.errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-phone">Téléphone</Label>
                <Input
                  id="create-phone"
                  placeholder="+212 6 00 00 00 00"
                  {...createForm.register("phone")}
                />
              </div>
              <div className="space-y-2">
                <Label>Rôle</Label>
                <Select
                  value={createForm.watch("role")}
                  onValueChange={(val) =>
                    createForm.setValue("role", val as CreateUserData["role"])
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

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Créer
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
