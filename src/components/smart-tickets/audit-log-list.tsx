"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  ChevronDown,
  ChevronUp,
  ScrollText,
  Globe,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { apiClient } from "@/lib/api";
import { useAuthStore, type AuditLogEntry, type Tenant } from "@/stores/auth-store";

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  UPDATE: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  DELETE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  LOGIN: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
};

function formatRelativeTime(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), {
      addSuffix: true,
      locale: fr,
    });
  } catch {
    return dateStr;
  }
}

function DetailsCell({ details }: { details: Record<string, unknown> | null }) {
  const [expanded, setExpanded] = useState(false);

  if (!details) return <span className="text-muted-foreground">—</span>;

  const detailStr = JSON.stringify(details, null, 2);

  return (
    <div className="max-w-xs">
      {expanded ? (
        <div className="relative">
          <pre className="text-xs bg-muted p-2 rounded overflow-x-auto whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
            {detailStr}
          </pre>
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-0 right-0 h-6 px-2"
            onClick={() => setExpanded(false)}
          >
            <ChevronUp className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="text-xs h-6 px-2"
          onClick={() => setExpanded(true)}
        >
          <span className="truncate max-w-[120px] block">{detailStr.slice(0, 50)}…</span>
          <ChevronDown className="h-3 w-3 ml-1 shrink-0" />
        </Button>
      )}
    </div>
  );
}

export function AuditLogList() {
  const user = useAuthStore((s) => s.user);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("");
  const [tenantFilter, setTenantFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const fetchTenants = useCallback(async () => {
    if (!isSuperAdmin) return;
    try {
      const data = await apiClient.fetch<{ data: Tenant[] }>(
        "/api/tenants?limit=100"
      );
      setTenants(data.data);
    } catch {
      // Silently ignore
    }
  }, [isSuperAdmin]);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        ...(actionFilter ? { action: actionFilter } : {}),
        ...(tenantFilter ? { tenantId: tenantFilter } : {}),
      });
      const data = await apiClient.fetch<{
        data: AuditLogEntry[];
        pagination: { totalPages: number };
      }>(`/api/audit-logs?${params.toString()}`);
      setLogs(data.data);
      setTotalPages(data.pagination.totalPages);
    } catch (err) {
      toast.error("Impossible de charger les journaux d'audit.");
    } finally {
      setIsLoading(false);
    }
  }, [page, actionFilter, tenantFilter]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {isSuperAdmin && tenants.length > 0 && (
            <Select
              value={tenantFilter}
              onValueChange={(val) => {
                setTenantFilter(val === "all" ? "" : val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Transporteur" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {tenants.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select
            value={actionFilter}
            onValueChange={(val) => {
              setActionFilter(val === "all" ? "" : val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              <SelectItem value="CREATE">Création</SelectItem>
              <SelectItem value="UPDATE">Modification</SelectItem>
              <SelectItem value="DELETE">Suppression</SelectItem>
              <SelectItem value="LOGIN">Connexion</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Transporteur
                  </TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead className="hidden lg:table-cell">Entité</TableHead>
                  <TableHead className="hidden xl:table-cell">Détails</TableHead>
                  <TableHead className="hidden lg:table-cell">IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <ScrollText className="w-8 h-8" />
                        <p className="text-sm">Aucun journal d&apos;audit trouvé.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="min-w-[100px]">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {formatRelativeTime(log.createdAt)}
                          </p>
                          <p className="text-xs text-muted-foreground hidden sm:block">
                            {new Date(log.createdAt).toLocaleString("fr-FR")}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {log.user.firstName} {log.user.lastName}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm text-muted-foreground">
                          {log.tenant?.name || "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`text-xs ${
                            ACTION_COLORS[log.action] || ""
                          }`}
                        >
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-sm text-muted-foreground">
                          {log.entity}
                          {log.entityId
                            ? ` #${log.entityId.slice(0, 6)}`
                            : ""}
                        </span>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        <DetailsCell details={log.details} />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex items-center gap-1">
                          <Globe className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {log.ipAddress || "—"}
                          </span>
                        </div>
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
                        page <= 1
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>
                  {Array.from({ length: Math.min(totalPages, 10) }).map((_, i) => {
                    // Show pages around current page
                    const pageNum = Math.max(
                      1,
                      Math.min(i + 1, totalPages)
                    );
                    if (i + 1 > totalPages) return null;
                    return (
                      <PaginationItem key={i}>
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
    </div>
  );
}
