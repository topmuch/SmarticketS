"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Loader2,
  Send,
  RotateCcw,
  Truck,
  AlertTriangle,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiClient } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────
interface DeliveredParcel {
  id: string;
  controlCode: string;
  recipientName: string;
  recipientLocation: string;
  deliveredAt: string;
  whatsappSenderLink: string;
  whatsappRecipientLink: string;
}

// ── Component ──────────────────────────────────────────────────────────
export function DriverDelivery() {
  const [controlCode, setControlCode] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [deliveredParcel, setDeliveredParcel] = useState<DeliveredParcel | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!controlCode.trim()) {
      setErrorMessage("Le code de suivi est requis.");
      return;
    }
    if (!pinCode.trim() || pinCode.length !== 4) {
      setErrorMessage("Le code PIN doit comporter 4 chiffres.");
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await apiClient.fetch<DeliveredParcel>("/api/parcels/deliver", {
        method: "POST",
        body: JSON.stringify({
          controlCode: controlCode.trim(),
          pinCode: pinCode.trim(),
        }),
      });

      setDeliveredParcel(data);
      toast.success("Colis livré avec succès !");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Impossible de livrer le colis.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewDelivery = () => {
    setDeliveredParcel(null);
    setControlCode("");
    setPinCode("");
    setErrorMessage("");
  };

  // ── Success panel ──────────────────────────────────────────────────
  if (deliveredParcel) {
    return (
      <div className="max-w-md mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            {/* Success icon */}
            <div className="text-center mb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30"
              >
                <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
              </motion.div>
            </div>

            <Card className="border-emerald-200 dark:border-emerald-800 shadow-lg">
              <CardContent className="pt-6 space-y-4">
                <h2 className="text-center text-xl font-bold text-emerald-800 dark:text-emerald-300">
                  Colis Livré !
                </h2>

                {/* Receipt */}
                <div className="space-y-3 p-4 bg-muted rounded-lg">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                      Code de suivi
                    </p>
                    <p className="text-2xl font-mono font-bold tracking-widest">
                      {deliveredParcel.controlCode}
                    </p>
                  </div>

                  <div className="border-t pt-3 space-y-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Destinataire</p>
                      <p className="font-medium">{deliveredParcel.recipientName}</p>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-muted-foreground">Localisation</p>
                        <p className="font-medium">{deliveredParcel.recipientLocation}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Livré le</p>
                      <p className="font-medium">
                        {format(
                          new Date(deliveredParcel.deliveredAt),
                          "d MMM yyyy à HH:mm",
                          { locale: fr }
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* WhatsApp buttons */}
                <div className="flex flex-col gap-2 pt-2">
                  <Button
                    onClick={() => {
                      if (deliveredParcel.whatsappRecipientLink) {
                        window.open(deliveredParcel.whatsappRecipientLink, "_blank");
                      }
                    }}
                    className="w-full bg-green-600 hover:bg-green-700 text-white min-h-[44px] text-base"
                    size="lg"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Notifier Destinataire
                  </Button>
                  <Button
                    onClick={() => {
                      if (deliveredParcel.whatsappSenderLink) {
                        window.open(deliveredParcel.whatsappSenderLink, "_blank");
                      }
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white min-h-[44px] text-base"
                    size="lg"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Notifier Expéditeur
                  </Button>
                  <Button
                    onClick={handleNewDelivery}
                    variant="outline"
                    className="w-full min-h-[44px] text-base"
                    size="lg"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Nouvelle Livraison
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // ── Delivery form ──────────────────────────────────────────────────
  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/30 mb-4">
          <Truck className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Livraison Colis</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Saisissez le code de suivi et le PIN pour confirmer la livraison.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Error display */}
        {errorMessage && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="control-code" className="text-base font-medium">
            Code de suivi
          </Label>
          <Input
            id="control-code"
            placeholder="12345678"
            value={controlCode}
            onChange={(e) => {
              setControlCode(e.target.value);
              setErrorMessage("");
            }}
            inputMode="numeric"
            className="h-14 text-lg text-center font-mono tracking-widest"
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pin-code" className="text-base font-medium">
            Code PIN (secret)
          </Label>
          <Input
            id="pin-code"
            type="password"
            placeholder="••••"
            value={pinCode}
            onChange={(e) => {
              setPinCode(e.target.value);
              setErrorMessage("");
            }}
            inputMode="numeric"
            maxLength={4}
            className="h-14 text-lg text-center font-mono tracking-[0.5em]"
          />
        </div>

        <Button
          type="submit"
          disabled={isSubmitting || !controlCode.trim() || pinCode.length !== 4}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white min-h-[56px] text-lg font-semibold shadow-md"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Vérification en cours…
            </>
          ) : (
            "✅ CONFIRMER LIVRAISON"
          )}
        </Button>
      </form>
    </div>
  );
}
