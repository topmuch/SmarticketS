"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiClient } from "@/lib/api";

interface GenerateBatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function GenerateBatchDialog({
  open,
  onOpenChange,
  onSuccess,
}: GenerateBatchDialogProps) {
  const [count, setCount] = useState<number>(10);
  const [lineId, setLineId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (count < 1 || count > 500) {
      toast.error("Le nombre de tickets doit être entre 1 et 500.");
      return;
    }

    setIsSubmitting(true);
    try {
      const body: { count: number; lineId?: string } = { count };
      if (lineId.trim()) {
        body.lineId = lineId.trim();
      }
      const data = await apiClient.fetch<{
        batchId: string;
        count: number;
        tickets: Array<{ id: string; ticketCode: string; qrHash: string }>;
      }>("/api/tickets/generate-batch", {
        method: "POST",
        body: JSON.stringify(body),
      });

      toast.success(
        `Batch ${data.batchId} créé avec ${data.count} ticket(s) pré-imprimé(s).`
      );
      onOpenChange(false);
      onSuccess?.();
      setCount(10);
      setLineId("");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Impossible de générer le batch."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>🪪 Générer un batch de tickets</DialogTitle>
          <DialogDescription>
            Créez un lot de tickets pré-imprimés prêts à l&apos;activation au
            guichet.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="batch-count">
              Nombre de tickets <span className="text-destructive">*</span>
            </Label>
            <Input
              id="batch-count"
              type="number"
              min={1}
              max={500}
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value) || 0)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Entre 1 et 500 tickets par batch
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="batch-line">Ligne (optionnel)</Label>
            <Input
              id="batch-line"
              placeholder="ID de la ligne"
              value={lineId}
              onChange={(e) => setLineId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Laissez vide pour des tickets non assignés
            </p>
          </div>

          {/* Preview */}
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 p-3 border border-emerald-200 dark:border-emerald-800">
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
              📋 {count} ticket(s) seront générés
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
              Codes : TKT-{String(1).padStart(4, "0")} à TKT-
              {String(count).padStart(4, "0")}
            </p>
          </div>

          <DialogFooter>
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
              disabled={isSubmitting || count < 1 || count > 500}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Générer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
