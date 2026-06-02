"use client";

import { useState, useMemo } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiClient } from "@/lib/api";

export interface TicketData {
  id: string;
  ticketCode: string;
  controlCode: string;
  passengerName: string;
  passengerAge: number;
  passengerPhone: string;
  seatNumber?: string;
  status: string;
  departureId?: string;
  departureTime?: string;
  rescheduleCount: number;
  totalPrice: number;
  luggageFee: number;
  luggageCount?: number;
  luggageWeight?: number;
  whatsappLink?: string;
  createdAt: string;
}

interface RescheduleTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: TicketData | null;
  onSuccess?: () => void;
}

export function RescheduleTicketDialog({
  open,
  onOpenChange,
  ticket,
  onSuccess,
}: RescheduleTicketDialogProps) {
  const [departureId, setDepartureId] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const minDateTime = useMemo(() => {
    const min = new Date();
    min.setHours(min.getHours() + 24);
    return min.toISOString().slice(0, 16);
  }, []);

  const isValidTime = useMemo(() => {
    if (!departureTime) return false;
    return new Date(departureTime) >= new Date(minDateTime);
  }, [departureTime, minDateTime]);

  const resetForm = () => {
    setDepartureId("");
    setDepartureTime("");
  };

  const handleOpenChange = (value: boolean) => {
    if (!value) resetForm();
    onOpenChange(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket || !isValidTime) return;

    setIsSubmitting(true);
    try {
      await apiClient.fetch<TicketData>(`/api/tickets/${ticket.id}/reschedule`, {
        method: "POST",
        body: JSON.stringify({
          departureId: departureId.trim() || undefined,
          departureTime: new Date(departureTime).toISOString(),
        }),
      });

      toast.success("Billet reporté avec succès.");
      handleOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Impossible de reporter le billet."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAlreadyRescheduled = (ticket?.rescheduleCount ?? 0) >= 1;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>📅 Reporter le billet</DialogTitle>
          <DialogDescription>
            Modifiez le départ de ce billet pour un nouveau voyage.
          </DialogDescription>
        </DialogHeader>

        {ticket && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Warning */}
            {isAlreadyRescheduled ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Ce billet a déjà été reporté. Il ne peut être reporté
                  qu&apos;une seule fois.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <AlertDescription className="text-amber-800 dark:text-amber-300">
                  Ce billet ne peut être reporté qu&apos;une seule fois.
                </AlertDescription>
              </Alert>
            )}

            {/* Current departure info */}
            <div className="rounded-lg bg-muted/50 p-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Départ actuel
              </p>
              <p className="text-sm font-medium">
                {ticket.departureTime
                  ? new Date(ticket.departureTime).toLocaleString("fr-FR", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })
                  : "Non défini"}
              </p>
              <p className="text-xs text-muted-foreground">
                Passager : {ticket.passengerName} — {ticket.ticketCode}
              </p>
            </div>

            {/* New departure */}
            <div className="space-y-2">
              <Label htmlFor="reschedule-departure">Nouveau départ (optionnel)</Label>
              <Input
                id="reschedule-departure"
                placeholder="ID du nouveau départ"
                value={departureId}
                onChange={(e) => setDepartureId(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reschedule-time">
                Nouvelle heure de départ <span className="text-destructive">*</span>
              </Label>
              <Input
                id="reschedule-time"
                type="datetime-local"
                min={minDateTime}
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Minimum 24h à partir de maintenant
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !isValidTime || isAlreadyRescheduled}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmer le report
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
