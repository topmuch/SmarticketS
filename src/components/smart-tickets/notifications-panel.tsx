"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Send,
  MessageCircle,
  Mail,
  History,
  Eye,
  Filter,
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { apiClient } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Notification {
  id: string;
  type: string;
  channel: string;
  recipient: string;
  recipientName: string | null;
  subject: string | null;
  content: string;
  status: "pending" | "sent" | "failed";
  errorMessage: string | null;
  sentAt: string | null;
  createdAt: string;
  tenantId: string | null;
}

interface NotificationPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<
  string,
  { className: string; icon: typeof Clock; label: string }
> = {
  pending: {
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    icon: Clock,
    label: "En attente",
  },
  sent: {
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    icon: CheckCircle,
    label: "Envoyé",
  },
  failed: {
    className:
      "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    icon: AlertCircle,
    label: "Échoué",
  },
};

const CHANNEL_BADGE: Record<string, string> = {
  whatsapp:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  email: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  sms: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
};

const TYPE_LABELS: Record<string, string> = {
  ticket_confirmation: "Confirmation billet",
  parcel_tracking: "Suivi colis",
  departure_alert: "Alerte départ",
  custom: "Personnalisé",
};

const TYPE_TEMPLATES: Record<string, string> = {
  ticket_confirmation:
    "Bonjour {name},\n\nVotre billet a été confirmé. Détails de votre voyage :\n- Trajet : {route}\n- Date : {date}\n- Place : {seat}\n\nMerci de voyager avec nous !",
  parcel_tracking:
    "Bonjour {name},\n\nVotre colis {trackingNumber} a été mis à jour.\nStatut actuel : {status}\n\nSuivez votre colis en temps réel.",
  departure_alert:
    "Bonjour {name},\n\nRappel : votre départ est prévu à {time} depuis {station}.\nNuméro de guichet : {counter}\n\nBonne route !",
  custom: "",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), "dd MMM yyyy HH:mm", { locale: fr });
  } catch {
    return dateStr;
  }
}

function formatRelative(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), {
      addSuffix: true,
      locale: fr,
    });
  } catch {
    return dateStr;
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export function NotificationsPanel() {
  const user = useAuthStore((s) => s.user);

  // ── Shared state ──
  const [activeTab, setActiveTab] = useState("send");

  // ── History state ──
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [channelFilter, setChannelFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // ── Detail dialog ──
  const [selectedNotification, setSelectedNotification] =
    useState<Notification | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // ── Send form state ──
  const [channel, setChannel] = useState("whatsapp");
  const [recipient, setRecipient] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [notifType, setNotifType] = useState("custom");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);

  // ── Fetch notifications ──
  const fetchNotifications = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "50",
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(channelFilter ? { channel: channelFilter } : {}),
      });
      const data = await apiClient.fetch<{
        notifications: Notification[];
        pagination: NotificationPagination;
      }>(`/api/admin/notifications?${params.toString()}`);
      setNotifications(data.notifications);
      setTotalPages(data.pagination.pages);
      setTotalItems(data.pagination.total);
    } catch {
      toast.error("Impossible de charger les notifications.");
    } finally {
      setIsLoadingHistory(false);
    }
  }, [page, statusFilter, channelFilter]);

  useEffect(() => {
    if (activeTab === "history") {
      fetchNotifications();
    }
  }, [activeTab, fetchNotifications]);

  // ── Template auto-fill on type change ──
  const handleTypeChange = (type: string) => {
    setNotifType(type);
    if (type !== "custom" && !content.trim()) {
      setContent(TYPE_TEMPLATES[type] || "");
    }
  };

  // ── Channel change resets recipient ──
  const handleChannelChange = (value: string) => {
    setChannel(value);
    setRecipient("");
  };

  // ── Send notification ──
  const handleSend = async () => {
    if (!recipient.trim()) {
      toast.error(
        channel === "whatsapp"
          ? "Veuillez entrer un numéro de téléphone."
          : "Veuillez entrer une adresse e-mail."
      );
      return;
    }
    if (!content.trim()) {
      toast.error("Veuillez entrer le contenu du message.");
      return;
    }
    if (channel === "email" && !subject.trim()) {
      toast.error("Veuillez entrer un objet pour l'e-mail.");
      return;
    }

    setIsSending(true);
    try {
      await apiClient.fetch("/api/admin/notifications", {
        method: "POST",
        body: JSON.stringify({
          channel,
          recipient: recipient.trim(),
          ...(recipientName.trim() ? { recipientName: recipientName.trim() } : {}),
          type: notifType,
          ...(subject.trim() ? { subject: subject.trim() } : {}),
          content: content.trim(),
        }),
      });

      toast.success("Notification envoyée avec succès !");

      // Reset form
      setRecipient("");
      setRecipientName("");
      setSubject("");
      setContent("");
      setNotifType("custom");

      // Switch to history tab
      setActiveTab("history");
      setPage(1);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Impossible d'envoyer la notification."
      );
    } finally {
      setIsSending(false);
    }
  };

  // ── Open detail dialog ──
  const handleViewDetail = (notif: Notification) => {
    setSelectedNotification(notif);
    setDetailOpen(true);
  };

  // ── Filter helpers ──
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value === "all" ? "" : value);
    setPage(1);
  };

  const handleChannelFilterChange = (value: string) => {
    setChannelFilter(value === "all" ? "" : value);
    setPage(1);
  };

  // ── Pagination range ──
  const getPaginationRange = () => {
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="send" className="gap-2">
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Envoyer</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Historique</span>
          </TabsTrigger>
        </TabsList>

        {/* ─── Send Tab ─── */}
        <TabsContent value="send">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Send className="h-5 w-5 text-emerald-600" />
                Nouvelle notification
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-5">
                {/* Channel & Type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="notif-channel">Canal</Label>
                    <Select value={channel} onValueChange={handleChannelChange}>
                      <SelectTrigger id="notif-channel">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="whatsapp">
                          <span className="flex items-center gap-2">
                            <MessageCircle className="h-4 w-4 text-green-600" />
                            WhatsApp
                          </span>
                        </SelectItem>
                        <SelectItem value="email">
                          <span className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-blue-600" />
                            E-mail
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notif-type">Type</Label>
                    <Select value={notifType} onValueChange={handleTypeChange}>
                      <SelectTrigger id="notif-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ticket_confirmation">
                          Confirmation billet
                        </SelectItem>
                        <SelectItem value="parcel_tracking">
                          Suivi colis
                        </SelectItem>
                        <SelectItem value="departure_alert">
                          Alerte départ
                        </SelectItem>
                        <SelectItem value="custom">Personnalisé</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Recipient */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="notif-recipient">
                      Destinataire{" "}
                      <span className="text-muted-foreground text-xs">
                        ({channel === "whatsapp" ? "téléphone" : "e-mail"})
                      </span>
                    </Label>
                    <div className="relative">
                      {channel === "whatsapp" ? (
                        <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      )}
                      <Input
                        id="notif-recipient"
                        placeholder={
                          channel === "whatsapp"
                            ? "+243 8XX XXX XXX"
                            : "exemple@email.com"
                        }
                        value={recipient}
                        onChange={(e) => setRecipient(e.target.value)}
                        type={channel === "email" ? "email" : "tel"}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notif-recipient-name">
                      Nom du destinataire{" "}
                      <span className="text-muted-foreground text-xs">
                        (optionnel)
                      </span>
                    </Label>
                    <Input
                      id="notif-recipient-name"
                      placeholder="Jean Dupont"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                    />
                  </div>
                </div>

                {/* Subject (email only) */}
                {channel === "email" && (
                  <div className="space-y-2">
                    <Label htmlFor="notif-subject">Objet</Label>
                    <Input
                      id="notif-subject"
                      placeholder="Objet de l'e-mail"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    />
                  </div>
                )}

                {/* Content */}
                <div className="space-y-2">
                  <Label htmlFor="notif-content">Contenu</Label>
                  <Textarea
                    id="notif-content"
                    placeholder="Saisissez le contenu du message..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={6}
                    className="resize-y"
                  />
                  {notifType !== "custom" && (
                    <p className="text-xs text-muted-foreground">
                      Modèle pré-rempli pour{" "}
                      {TYPE_LABELS[notifType] || notifType}. Modifiez les
                      variables entre accolades selon le contexte.
                    </p>
                  )}
                </div>

                {/* Submit */}
                <div className="flex justify-end">
                  <Button
                    onClick={handleSend}
                    disabled={isSending}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[140px]"
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Envoi en cours...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Envoyer
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── History Tab ─── */}
        <TabsContent value="history">
          <div className="space-y-4">
            {/* Filter Bar */}
            <Card className="border-0 shadow-sm">
              <CardContent className="py-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />

                  {/* Status filter badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={statusFilter === "" ? "default" : "secondary"}
                      className={`cursor-pointer transition-colors text-xs ${
                        statusFilter === ""
                          ? "bg-emerald-600 text-white hover:bg-emerald-700"
                          : "hover:bg-muted"
                      }`}
                      onClick={() => handleStatusFilterChange("all")}
                    >
                      Tous
                    </Badge>
                    <Badge
                      variant={
                        statusFilter === "pending" ? "default" : "secondary"
                      }
                      className={`cursor-pointer transition-colors text-xs ${
                        statusFilter === "pending"
                          ? "bg-amber-600 text-white hover:bg-amber-700"
                          : "hover:bg-muted"
                      }`}
                      onClick={() => handleStatusFilterChange("pending")}
                    >
                      <Clock className="mr-1 h-3 w-3" />
                      En attente
                    </Badge>
                    <Badge
                      variant={
                        statusFilter === "sent" ? "default" : "secondary"
                      }
                      className={`cursor-pointer transition-colors text-xs ${
                        statusFilter === "sent"
                          ? "bg-emerald-600 text-white hover:bg-emerald-700"
                          : "hover:bg-muted"
                      }`}
                      onClick={() => handleStatusFilterChange("sent")}
                    >
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Envoyés
                    </Badge>
                    <Badge
                      variant={
                        statusFilter === "failed" ? "default" : "secondary"
                      }
                      className={`cursor-pointer transition-colors text-xs ${
                        statusFilter === "failed"
                          ? "bg-red-600 text-white hover:bg-red-700"
                          : "hover:bg-muted"
                      }`}
                      onClick={() => handleStatusFilterChange("failed")}
                    >
                      <AlertCircle className="mr-1 h-3 w-3" />
                      Échoués
                    </Badge>
                  </div>

                  {/* Channel filter */}
                  <div className="sm:ml-auto">
                    <Select
                      value={channelFilter || "all"}
                      onValueChange={handleChannelFilterChange}
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Canal" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les canaux</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="email">E-mail</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Result count */}
                {!isLoadingHistory && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {totalItems} notification{totalItems > 1 ? "s" : ""} trouvée
                    {totalItems > 1 ? "s" : ""}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Table */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Canal</TableHead>
                        <TableHead>Destinataire</TableHead>
                        <TableHead className="hidden md:table-cell">
                          Type
                        </TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="w-10">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingHistory ? (
                        Array.from({ length: 6 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell>
                              <Skeleton className="h-5 w-24" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-5 w-20" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-5 w-32" />
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <Skeleton className="h-5 w-24" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-5 w-20" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-5 w-8" />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : notifications.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-32 text-center">
                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                              <History className="w-8 h-8" />
                              <p className="text-sm">
                                Aucune notification trouvée.
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        notifications.map((notif) => {
                          const statusConfig = STATUS_BADGE[notif.status];
                          const StatusIcon = statusConfig?.icon || Clock;

                          return (
                            <TableRow
                              key={notif.id}
                              className="cursor-pointer"
                              onClick={() => handleViewDetail(notif)}
                            >
                              <TableCell>
                                <div className="min-w-[110px]">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {formatRelative(notif.createdAt)}
                                  </p>
                                  <p className="text-xs text-muted-foreground hidden sm:block">
                                    {formatDate(notif.createdAt)}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="secondary"
                                  className={`text-xs capitalize ${
                                    CHANNEL_BADGE[notif.channel] || ""
                                  }`}
                                >
                                  {notif.channel === "whatsapp" ? (
                                    <MessageCircle className="mr-1 h-3 w-3" />
                                  ) : notif.channel === "email" ? (
                                    <Mail className="mr-1 h-3 w-3" />
                                  ) : null}
                                  {notif.channel}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="text-sm text-gray-900 dark:text-white">
                                    {notif.recipientName || notif.recipient}
                                  </p>
                                  {notif.recipientName && (
                                    <p className="text-xs text-muted-foreground">
                                      {notif.recipient}
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                <span className="text-sm text-muted-foreground">
                                  {TYPE_LABELS[notif.type] || notif.type}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="secondary"
                                  className={`text-xs ${
                                    statusConfig?.className || ""
                                  }`}
                                >
                                  <StatusIcon className="mr-1 h-3 w-3" />
                                  {statusConfig?.label || notif.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewDetail(notif);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
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
                        {getPaginationRange().map((pageNum) => (
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
        </TabsContent>
      </Tabs>

      {/* ─── Detail Dialog ─── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedNotification &&
              STATUS_BADGE[selectedNotification.status] ? (
                (() => {
                  const cfg =
                    STATUS_BADGE[selectedNotification.status];
                  const Icon = cfg.icon;
                  return (
                    <Badge
                      variant="secondary"
                      className={`text-xs ${cfg.className}`}
                    >
                      <Icon className="mr-1 h-3 w-3" />
                      {cfg.label}
                    </Badge>
                  );
                })()
              ) : null}
              Détails de la notification
            </DialogTitle>
          </DialogHeader>

          {selectedNotification && (
            <div className="space-y-4 text-sm">
              {/* Meta info grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">
                    Canal
                  </p>
                  <Badge
                    variant="secondary"
                    className={`text-xs capitalize ${
                      CHANNEL_BADGE[selectedNotification.channel] || ""
                    }`}
                  >
                    {selectedNotification.channel === "whatsapp" ? (
                      <MessageCircle className="mr-1 h-3 w-3" />
                    ) : selectedNotification.channel === "email" ? (
                      <Mail className="mr-1 h-3 w-3" />
                    ) : null}
                    {selectedNotification.channel}
                  </Badge>
                </div>

                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">
                    Type
                  </p>
                  <p className="font-medium">
                    {TYPE_LABELS[selectedNotification.type] ||
                      selectedNotification.type}
                  </p>
                </div>

                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">
                    Destinataire
                  </p>
                  <p className="font-medium">
                    {selectedNotification.recipientName ||
                      selectedNotification.recipient}
                  </p>
                  {selectedNotification.recipientName && (
                    <p className="text-xs text-muted-foreground">
                      {selectedNotification.recipient}
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">
                    Date
                  </p>
                  <p className="font-medium">
                    {formatDate(selectedNotification.createdAt)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatRelative(selectedNotification.createdAt)}
                  </p>
                </div>

                {selectedNotification.sentAt && (
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">
                      Envoyée le
                    </p>
                    <p className="font-medium">
                      {formatDate(selectedNotification.sentAt)}
                    </p>
                  </div>
                )}
              </div>

              {/* Subject (email) */}
              {selectedNotification.subject && (
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">
                    Objet
                  </p>
                  <p className="font-medium">{selectedNotification.subject}</p>
                </div>
              )}

              {/* Content */}
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">
                  Contenu
                </p>
                <div className="bg-muted p-3 rounded-md text-sm whitespace-pre-wrap break-words max-h-60 overflow-y-auto">
                  {selectedNotification.content}
                </div>
              </div>

              {/* Error message */}
              {selectedNotification.errorMessage && (
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">
                    Erreur
                  </p>
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 p-3 rounded-md text-sm text-red-700 dark:text-red-400">
                    {selectedNotification.errorMessage}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
