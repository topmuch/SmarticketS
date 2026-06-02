"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { Loader2, QrCode, MapPin, Clock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Types ───

interface QrTicket {
  id: string;
  ticketCode: string;
  qrHash: string;
  status: string;
}

interface DepartureOption {
  id: string;
  lineCode: string;
  lineName: string;
  destination: string;
  scheduledTime: string;
  availableSeats: number;
  status: string;
}

// ─── Props ───

interface QrActivationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: QrTicket;
  onSuccess: () => void;
}

// ─── Component ───

export function QrActivationModal({
  open,
  onOpenChange,
  ticket,
  onSuccess,
}: QrActivationModalProps) {
  const user = useAuthStore((s) => s.user);
  const tenantId = user?.tenantId;

  const [departures, setDepartures] = useState<DepartureOption[]>([]);
  const [loadingDepartures, setLoadingDepartures] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [departureId, setDepartureId] = useState("");
  const [passengerName, setPassengerName] = useState("");
  const [passengerAge, setPassengerAge] = useState("25");
  const [passengerPhone, setPassengerPhone] = useState("");
  const [seatNumber, setSeatNumber] = useState("");
  const [luggageCount, setLuggageCount] = useState("1");
  const [isChild, setIsChild] = useState(false);

  // Fetch available departures
  const fetchDepartures = useCallback(async () => {
    if (!tenantId) return;
    setLoadingDepartures(true);
    try {
      const params = new URLSearchParams({
        status: "SCHEDULED",
        limit: "50",
      });
      const data = await apiClient.get<{ departures: DepartureOption[] }>(
        `/api/departures?${params.toString()}`
      );

      // The departures API may return different structure, handle gracefully
      const rawDepartures = Array.isArray(data?.departures)
        ? data.departures
        : Array.isArray(data)
          ? data
          : [];

      setDepartures(
        rawDepartures.map((dep: Record<string, unknown>) => ({
          id: dep.id as string,
          lineCode:
            (dep.line as Record<string, unknown>)?.code as string ?? "—",
          lineName:
            (dep.line as Record<string, unknown>)?.name as string ?? "—",
          destination:
            (dep.line as Record<string, unknown>)?.toStation
              ? `${((dep.line as Record<string, unknown>).toStation as Record<string, unknown>)?.name ?? ""} (${((dep.line as Record<string, unknown>).toStation as Record<string, unknown>)?.city ?? ""})`
              : "—",
          scheduledTime: dep.scheduledTime as string,
          availableSeats: (dep.availableSeats as number) ?? 0,
          status: (dep.status as string) ?? "SCHEDULED",
        }))
      );
    } catch {
      setDepartures([]);
      toast.error("Impossible de charger les départs disponibles.");
    } finally {
      setLoadingDepartures(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (open && tenantId) {
      fetchDepartures();
      // Reset form
      setDepartureId("");
      setPassengerName("");
      setPassengerAge("25");
      setPassengerPhone("");
      setSeatNumber("");
      setLuggageCount("1");
      setIsChild(false);
    }
  }, [open, tenantId, fetchDepartures]);

  // Submit activation
  const handleSubmit = async () => {
    // Validate required fields
    if (!departureId) {
      toast.error("Veuillez sélectionner un trajet.");
      return;
    }
    if (!passengerName.trim()) {
      toast.error("Le nom du passager est requis.");
      return;
    }
    if (!passengerPhone.trim() || passengerPhone.length < 8) {
      toast.error("Le téléphone est requis (min. 8 chiffres).");
      return;
    }

    const age = parseInt(passengerAge, 10);
    if (isNaN(age) || age < 0 || age > 120) {
      toast.error("L'âge doit être entre 0 et 120.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await apiClient.fetch<{
        success: boolean;
        ticketCode: string;
        controlCode: string;
        passengerName: string;
        departureInfo: {
          lineCode: string | null;
          lineName: string | null;
          destination: string | null;
          scheduledTime: string;
        };
      }>("/api/admin/qr/activate", {
        method: "POST",
        body: JSON.stringify({
          ticketCode: ticket.ticketCode,
          departureId,
          passengerName: passengerName.trim(),
          passengerAge: age,
          passengerPhone: passengerPhone.trim(),
          seatNumber: seatNumber.trim() || undefined,
          luggageCount: parseInt(luggageCount, 10) || 1,
          isChild,
        }),
      });

      toast.success(
        `QR ${result.ticketCode} activé avec succès ! Code contrôle : ${result.controlCode}`,
        { duration: 6000 }
      );

      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Échec de l'activation du QR."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const selectedDeparture = departures.find((d) => d.id === departureId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-emerald-600" />
            Activer un QR — {ticket.ticketCode}
          </DialogTitle>
          <DialogDescription>
            Liez ce QR vierge à un trajet et un passager pour le vendre.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* QR Info */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
            <QrCode className="w-5 h-5 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="font-mono font-bold text-sm">{ticket.ticketCode}</p>
              <p className="text-xs text-muted-foreground truncate">
                Hash: {ticket.qrHash.slice(0, 16)}...
              </p>
            </div>
            <Badge variant="secondary" className="ml-auto shrink-0">
              Disponible
            </Badge>
          </div>

          {/* Departure Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-sm font-semibold">
              <MapPin className="w-4 h-4" />
              Trajet *
            </Label>
            {loadingDepartures ? (
              <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Chargement des départs...</span>
              </div>
            ) : departures.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Aucun départ disponible.
              </div>
            ) : (
              <>
                <Select value={departureId} onValueChange={setDepartureId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez un trajet" />
                  </SelectTrigger>
                  <SelectContent>
                    {departures
                      .filter((d) => d.availableSeats > 0)
                      .map((dep) => (
                        <SelectItem key={dep.id} value={dep.id}>
                          <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="font-medium">
                              {new Date(dep.scheduledTime).toLocaleTimeString("fr-FR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            <span className="text-muted-foreground">—</span>
                            <span>
                              {dep.lineCode} → {dep.destination}
                            </span>
                            <Badge
                              variant="secondary"
                              className="ml-auto text-xs shrink-0"
                            >
                              {dep.availableSeats} places
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>

                {selectedDeparture && (
                  <div className="text-xs text-muted-foreground p-2 rounded bg-muted/30">
                    <strong>{selectedDeparture.lineName}</strong>{" "}
                    → {selectedDeparture.destination} |{" "}
                    {new Date(selectedDeparture.scheduledTime).toLocaleDateString("fr-FR")} à{" "}
                    {new Date(selectedDeparture.scheduledTime).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })} |{" "}
                    <span className="text-emerald-600 font-medium">
                      {selectedDeparture.availableSeats} places restantes
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Passenger Info */}
          <div className="space-y-3">
            <Label className="flex items-center gap-1.5 text-sm font-semibold">
              <User className="w-4 h-4" />
              Passager *
            </Label>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="passengerName" className="text-xs">
                  Nom complet *
                </Label>
                <Input
                  id="passengerName"
                  placeholder="Ex: Diallo Mamadou"
                  value={passengerName}
                  onChange={(e) => setPassengerName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="passengerPhone" className="text-xs">
                  Téléphone *
                </Label>
                <Input
                  id="passengerPhone"
                  placeholder="Ex: 221771234567"
                  value={passengerPhone}
                  onChange={(e) => setPassengerPhone(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="passengerAge" className="text-xs">
                  Âge
                </Label>
                <Input
                  id="passengerAge"
                  type="number"
                  min="0"
                  max="120"
                  value={passengerAge}
                  onChange={(e) => setPassengerAge(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="seatNumber" className="text-xs">
                  Siège
                </Label>
                <Input
                  id="seatNumber"
                  placeholder="Ex: 12A"
                  value={seatNumber}
                  onChange={(e) => setSeatNumber(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="luggageCount" className="text-xs">
                  Bagages
                </Label>
                <Input
                  id="luggageCount"
                  type="number"
                  min="0"
                  max="10"
                  value={luggageCount}
                  onChange={(e) => setLuggageCount(e.target.value)}
                />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isChild}
                    onChange={(e) => setIsChild(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span>Mineur (-18 ans)</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !departureId || !passengerName.trim()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Activation...
              </>
            ) : (
              <>
                <QrCode className="w-4 h-4 mr-2" />
                Activer le QR
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
