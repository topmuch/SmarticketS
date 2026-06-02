// @ts-nocheck
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
import type { Tenant } from "@/stores/auth-store";

const tenantSchema = z.object({
  name: z.string().min(1, "Le nom est obligatoire").max(100),
  slug: z
    .string()
    .min(1, "Le slug est obligatoire")
    .max(50)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug invalide (minuscules et tirets uniquement)"
    ),
  email: z.string().email("Adresse e-mail invalide"),
  phone: z.string().optional(),
  address: z.string().optional(),
  plan: z.enum(["free", "starter", "pro", "enterprise"]).default("free"),
  maxUsers: z.coerce.number().int().min(1).default(10),
  maxStations: z.coerce.number().int().min(1).default(5),
});

type TenantFormData = z.infer<typeof tenantSchema>;

interface TenantFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: Tenant | null;
  onSuccess: () => void;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function TenantFormDialog({
  open,
  onOpenChange,
  tenant,
  onSuccess,
}: TenantFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!tenant;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<TenantFormData>({
    resolver: zodResolver(tenantSchema),
    defaultValues: {
      name: "",
      slug: "",
      email: "",
      phone: "",
      address: "",
      plan: "free",
      maxUsers: 10,
      maxStations: 5,
    },
  });

  const currentName = watch("name");

  // Auto-generate slug from name when creating
  useEffect(() => {
    if (!isEditing && currentName) {
      setValue("slug", generateSlug(currentName));
    }
  }, [currentName, isEditing, setValue]);

  // Populate form when editing
  useEffect(() => {
    if (open) {
      if (tenant) {
        reset({
          name: tenant.name,
          slug: tenant.slug,
          email: tenant.email || "",
          phone: tenant.phone || "",
          address: tenant.address || "",
          plan: tenant.plan as "free" | "starter" | "pro" | "enterprise",
          maxUsers: tenant.maxUsers,
          maxStations: tenant.maxStations,
        });
      } else {
        reset({
          name: "",
          slug: "",
          email: "",
          phone: "",
          address: "",
          plan: "free",
          maxUsers: 10,
          maxStations: 5,
        });
      }
    }
  }, [open, tenant, reset]);

  const onSubmit = async (data: TenantFormData) => {
    setIsSubmitting(true);
    try {
      if (isEditing && tenant) {
        await apiClient.fetch(`/api/tenants/${tenant.id}`, {
          method: "PUT",
          body: JSON.stringify(data),
        });
        toast.success(`${tenant.name} modifié avec succès.`);
      } else {
        await apiClient.fetch("/api/tenants", {
          method: "POST",
          body: JSON.stringify(data),
        });
        toast.success("Transporteur créé avec succès.");
      }
      onSuccess();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Impossible de sauvegarder."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifier le transporteur" : "Nouveau transporteur"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifiez les informations du transporteur."
              : "Remplissez les informations pour créer un nouveau transporteur."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tenant-name">Nom *</Label>
              <Input
                id="tenant-name"
                placeholder="STMB Transport"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tenant-slug">Slug *</Label>
              <Input
                id="tenant-slug"
                placeholder="stmb-transport"
                {...register("slug")}
                disabled={isEditing}
              />
              {errors.slug && (
                <p className="text-xs text-destructive">{errors.slug.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tenant-email">E-mail *</Label>
            <Input
              id="tenant-email"
              type="email"
              placeholder="contact@stmb.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tenant-phone">Téléphone</Label>
              <Input
                id="tenant-phone"
                placeholder="+212 5 00 00 00 00"
                {...register("phone")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tenant-plan">Plan</Label>
              <Select
                value={watch("plan")}
                onValueChange={(val) =>
                  setValue(
                    "plan",
                    val as "free" | "starter" | "pro" | "enterprise"
                  )
                }
              >
                <SelectTrigger id="tenant-plan">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Gratuit</SelectItem>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tenant-address">Adresse</Label>
            <Input
              id="tenant-address"
              placeholder="1 Rue Mohammed V, Casablanca"
              {...register("address")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tenant-maxUsers">Max Utilisateurs</Label>
              <Input
                id="tenant-maxUsers"
                type="number"
                min={1}
                {...register("maxUsers")}
              />
              {errors.maxUsers && (
                <p className="text-xs text-destructive">
                  {errors.maxUsers.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tenant-maxStations">Max Stations</Label>
              <Input
                id="tenant-maxStations"
                type="number"
                min={1}
                {...register("maxStations")}
              />
              {errors.maxStations && (
                <p className="text-xs text-destructive">
                  {errors.maxStations.message}
                </p>
              )}
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
              {isEditing ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
