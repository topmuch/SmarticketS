// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import {
  Copy,
  ExternalLink,
  Calendar,
  Clock,
  User,
  Phone,
  Hash,
  CheckCircle2,
  ArrowRightLeft,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiClient } from "@/lib/api";
import type { TicketData } from "./reschedule-ticket-dialog";

interface TicketDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketId: string | null;
  onReschedule?: (ticket: TicketData) => void;
}

const STATUS_BADGES: Record<string, string> = {
  active:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  used: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  rescheduled:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Actif",
  used: "Utilisé",
  rescheduled: "Reporté",
  cancelled: "Annulé",
};

export function TicketDetailDialog({
  open,
  onOpenChange,
  ticketId,
  onReschedule,
}: TicketDetailDialogProps) {
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!ticketId || !open) {
      setTicket(null);
      setFullData(null);
      return;
    }

    const fetchTicket = async () => {
      setIsLoading(true);
      try {
        const data = await apiClient.fetch<TicketData>(
          `/api/tickets/${ticketId}`
        );
        setTicket(data);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Impossible de charger le billet."
        );
        onOpenChange(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTicket();
  }, [ticketId, open]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copié dans le presse-papier.");
    } catch {
      toast.error("Échec de la copie.");
    }
  };

  const statusBadge = ticket ? (
    <Badge
      variant="secondary"
      className={STATUS_BADGES[ticket.status] || STATUS_BADGES.active}
    >
      {STATUS_LABELS[ticket.status] || ticket.status}
    </Badge>
  ) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Détails du billet</span>
            {statusBadge}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        ) : ticket ? (
          <div className="space-y-5">
            {/* Control Code */}
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Code de contrôle
              </p>
              <div className="flex items-center justify-center gap-2">
                <p className="text-2xl font-mono font-bold tracking-widest">
                  {ticket.controlCode}
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => copyToClipboard(ticket.controlCode)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Passenger Info */}
            <section>
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                Informations passager
              </h4>
              <div className="rounded-lg border p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nom complet</span>
                  <span className="font-medium">{ticket.passengerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Âge</span>
                  <span className="font-medium">
                    {ticket.passengerAge} ans
                    {ticket.passengerAge < 5 && (
                      <Badge
                        variant="secondary"
                        className="ml-1.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px]"
                      >
                        Mineur
                      </Badge>
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">WhatsApp</span>
                  <span className="font-mono font-medium flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {ticket.passengerPhone}
                  </span>
                </div>
                {ticket.seatNumber && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Siège</span>
                    <span className="font-medium">{ticket.seatNumber}</span>
                  </div>
                )}
              </div>
            </section>

            {/* Baggage Info */}
            <section>
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                🧳 Bagages
              </h4>
              <div className="rounded-lg border p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nombre de valises</span>
                  <span className="font-medium">
                    {ticket.luggageCount ?? "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Poids total</span>
                  <span className="font-medium">
                    {ticket.luggageWeight ?? "—"} kg
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between font-medium">
                  <span>Supplément bagage</span>
                  <span className="text-amber-600 dark:text-amber-400">
                    {(ticket.luggageFee ?? 0).toLocaleString("fr-FR")} FCFA
                  </span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Prix total</span>
                  <span className="text-emerald-700 dark:text-emerald-400 text-base">
                    {ticket.totalPrice.toLocaleString("fr-FR")} FCFA
                  </span>
                </div>
              </div>
            </section>

            {/* WhatsApp Link */}
            {ticket.whatsappLink && (
              <section>
                <Button
                  variant="outline"
                  className="w-full border-green-300 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-900/20"
                  onClick={() =>
                    window.open(ticket.whatsappLink, "_blank")
                  }
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Ouvrir sur WhatsApp
                </Button>
              </section>
            )}

            {/* Timeline */}
            <section>
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Historique
              </h4>
              <div className="space-y-3">
                <div className="flex gap-3 items-start">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 mt-1" />
                    <div className="w-0.5 h-8 bg-border" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Activation</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(ticket.createdAt), "d MMM yyyy à HH:mm", {
                        locale: fr,
                      })}
                    </p>
                  </div>
                </div>

                {ticket.status === "rescheduled" && (
                  <div className="flex gap-3 items-start">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full bg-amber-500 mt-1" />
                      <div className="w-0.5 h-8 bg-border" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Report</p>
                      {ticket.departureTime && (
                        <p className="text-xs text-muted-foreground">
                          Nouveau départ :{" "}
                          {format(
                            new Date(ticket.departureTime),
                            "d MMM yyyy à HH:mm",
                            { locale: fr }
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {ticket.status === "used" && (
                  <div className="flex gap-3 items-start">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full bg-gray-400 mt-1" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Utilisé</p>
                      <p className="text-xs text-muted-foreground">
                        Contrôlé et validé
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Ticket code */}
            <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
              <span className="flex items-center gap-1">
                <Hash className="w-3 h-3" />
                {ticket.ticketCode}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                ID: {ticket.id.slice(0, 8)}…
              </span>
            </div>

            {/* Reschedule button */}
            {(ticket.status === "active" ||
              (ticket.status === "rescheduled" && ticket.rescheduleCount === 0)) && (
              <Button
                className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                onClick={() => onReschedule?.(ticket)}
              >
                <ArrowRightLeft className="mr-2 h-4 w-4" />
                Reporter ce billet
              </Button>
            )}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            Aucune donnée disponible.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
