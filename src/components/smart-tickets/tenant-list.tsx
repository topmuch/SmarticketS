"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Pencil,
  Ban,
  Building2,
  ShieldCheck,
  ShieldX,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useAuthStore, type Tenant } from "@/stores/auth-store";
import { TenantFormDialog } from "./tenant-form-dialog";

const PLAN_COLORS: Record<string, string> = {
  free: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  starter: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  pro: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  enterprise: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
};

export function TenantList() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editTenant, setEditTenant] = useState<Tenant | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [togglingGeneration, setTogglingGeneration] = useState<string | null>(null);

  const setCurrentView = useAuthStore((s) => s.setCurrentView);
  const setSelectedTenantId = useAuthStore((s) => s.setSelectedTenantId);

  const fetchTenants = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        ...(search ? { search } : {}),
      });
      const data = await apiClient.fetch<{
        data: Tenant[];
        pagination: { totalPages: number };
      }>(`/api/tenants?${params.toString()}`);
      setTenants(data.data);
      setTotalPages(data.pagination.totalPages);
    } catch (err) {
      toast.error("Impossible de charger les transporteurs.");
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const handleCreate = () => {
    setEditTenant(null);
    setFormOpen(true);
  };

  const handleEdit = (tenant: Tenant) => {
    setEditTenant(tenant);
    setFormOpen(true);
  };

  const handleToggleActive = async (tenant: Tenant) => {
    try {
      await apiClient.fetch<{ tenant: Tenant }>(`/api/tenants/${tenant.id}`, {
        method: "PUT",
        body: JSON.stringify({ isActive: !tenant.isActive }),
      });
      toast.success(
        tenant.isActive
          ? `${tenant.name} désactivé.`
          : `${tenant.name} activé.`
      );
      fetchTenants();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Impossible de modifier le transporteur."
      );
    }
  };

  const handleViewUsers = (tenant: Tenant) => {
    setSelectedTenantId(tenant.id, tenant.name);
    setCurrentView("tenant-users");
  };

  const handleToggleGeneration = async (
    tenant: Tenant,
    field: "allowSelfTicketGeneration" | "allowSelfParcelGeneration"
  ) => {
    setTogglingGeneration(tenant.id);
    try {
      await apiClient.fetch(`/api/superadmin/tenants/${tenant.id}/generation`, {
        method: "PATCH",
        body: JSON.stringify({ [field]: !tenant[field] }),
      });
      const label =
        field === "allowSelfTicketGeneration"
          ? "Génération de tickets"
          : "Génération de colis";
      toast.success(
        `${label} ${!tenant[field] ? "activée" : "désactivée"} pour ${tenant.name}.`
      );
      fetchTenants();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Impossible de modifier les permissions."
      );
    } finally {
      setTogglingGeneration(null);
    }
  };

  const handleFormSuccess = () => {
    setFormOpen(false);
    setEditTenant(null);
    fetchTenants();
  };

  const getPlanBadge = (plan: string) => {
    const colorClass = PLAN_COLORS[plan] || PLAN_COLORS.free;
    return (
      <Badge variant="secondary" className={`text-xs ${colorClass}`}>
        {plan.toUpperCase()}
      </Badge>
    );
  };

  const getGenerationBadge = (allowed: boolean) => {
    if (allowed) {
      return (
        <Badge
          variant="secondary"
          className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
        >
          <ShieldCheck className="mr-1 h-3 w-3" />
          Autorisé
        </Badge>
      );
    }
    return (
      <Badge
        variant="secondary"
        className="text-xs bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
      >
        <ShieldX className="mr-1 h-3 w-3" />
        Bloqué
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un transporteur..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Button
          onClick={handleCreate}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nouveau Transporteur
        </Button>
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead className="hidden md:table-cell">Slug</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Utilisateurs
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Tickets
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Colis
                  </TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : tenants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Building2 className="w-8 h-8" />
                        <p className="text-sm">
                          {search
                            ? "Aucun transporteur trouvé."
                            : "Aucun transporteur enregistré."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  tenants.map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {tenant.name}
                          </p>
                          <p className="text-xs text-muted-foreground md:hidden">
                            {tenant.slug}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {tenant.slug}
                        </code>
                      </TableCell>
                      <TableCell>{getPlanBadge(tenant.plan)}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {tenant._count?.users ?? 0}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <button
                          onClick={() =>
                            handleToggleGeneration(
                              tenant,
                              "allowSelfTicketGeneration"
                            )
                          }
                          disabled={togglingGeneration === tenant.id}
                          className="cursor-pointer hover:opacity-80 disabled:opacity-50 transition-opacity"
                          title="Cliquer pour basculer"
                        >
                          {getGenerationBadge(
                            tenant.allowSelfTicketGeneration
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <button
                          onClick={() =>
                            handleToggleGeneration(
                              tenant,
                              "allowSelfParcelGeneration"
                            )
                          }
                          disabled={togglingGeneration === tenant.id}
                          className="cursor-pointer hover:opacity-80 disabled:opacity-50 transition-opacity"
                          title="Cliquer pour basculer"
                        >
                          {getGenerationBadge(
                            tenant.allowSelfParcelGeneration
                          )}
                        </button>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={
                            tenant.isActive
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          }
                        >
                          {tenant.isActive ? "Actif" : "Inactif"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewUsers(tenant)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Voir utilisateurs
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(tenant)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() =>
                                handleToggleGeneration(
                                  tenant,
                                  "allowSelfTicketGeneration"
                                )
                              }
                              disabled={togglingGeneration === tenant.id}
                            >
                              <ShieldCheck className="mr-2 h-4 w-4" />
                              {tenant.allowSelfTicketGeneration
                                ? "Bloquer tickets"
                                : "Autoriser tickets"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleToggleGeneration(
                                  tenant,
                                  "allowSelfParcelGeneration"
                                )
                              }
                              disabled={togglingGeneration === tenant.id}
                            >
                              <ShieldCheck className="mr-2 h-4 w-4" />
                              {tenant.allowSelfParcelGeneration
                                ? "Bloquer colis"
                                : "Autoriser colis"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleToggleActive(tenant)}
                              className="text-destructive"
                            >
                              <Ban className="mr-2 h-4 w-4" />
                              {tenant.isActive ? "Désactiver" : "Activer"}
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
          {totalPages > 1 && (
            <div className="flex items-center justify-center p-4 border-t">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className={
                        page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"
                      }
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <PaginationItem key={i}>
                      <PaginationLink
                        onClick={() => setPage(i + 1)}
                        isActive={page === i + 1}
                        className="cursor-pointer"
                      >
                        {i + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      className={
                        page >= totalPages
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      <TenantFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        tenant={editTenant}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}
