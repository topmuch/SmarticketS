"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Loader2,
  Send,
  RotateCcw,
  Ticket,
  User,
  Luggage,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiClient } from "@/lib/api";
import { BRAND } from "@/lib/constants";

// ── Zod-like inline validation ──────────────────────────────────────────
interface FormData {
  ticketCode: string;
  lineId: string;
  passengerName: string;
  passengerAge: string;
  passengerPhone: string;
  seatNumber: string;
  idDocumentType: string;
  idDocumentNumber: string;
  isChild: boolean;
  childDocument: string;
  hasParentalAuth: boolean;
  luggageCount: string;
  luggageWeight: string;
}

interface FormErrors {
  [key: string]: string;
}

const INITIAL_FORM: FormData = {
  ticketCode: "",
  lineId: "",
  passengerName: "",
  passengerAge: "",
  passengerPhone: "",
  seatNumber: "",
  idDocumentType: "",
  idDocumentNumber: "",
  isChild: false,
  childDocument: "",
  hasParentalAuth: false,
  luggageCount: "1",
  luggageWeight: "0",
};

const ID_DOCUMENT_TYPES = [
  { value: "CNI", label: "CNI" },
  { value: "PASSPORT", label: "Passeport" },
  { value: "BIRTH_CERTIFICATE", label: "Extrait de naissance" },
];

const EXCESS_WEIGHT_FEE_PER_KG = BRAND.pricing.excessWeightFeePerKg;
const FREE_LUGGAGE_KG = BRAND.pricing.freeLuggageKg;

function validateForm(form: FormData): FormErrors {
  const errors: FormErrors = {};

  if (!form.ticketCode.trim()) {
    errors.ticketCode = "Le code ticket est requis.";
  }

  if (!form.passengerName.trim() || form.passengerName.trim().length < 2) {
    errors.passengerName = "Le nom complet est requis (min. 2 caractères).";
  }

  const age = parseInt(form.passengerAge) || 0;
  if (isNaN(age) || age < 0 || age > 120) {
    errors.passengerAge = "L'âge doit être entre 0 et 120.";
  }

  const phoneRegex = /^[0-9]{9,15}$/;
  if (!phoneRegex.test(form.passengerPhone.trim())) {
    errors.passengerPhone =
      "Numéro WhatsApp invalide (9-15 chiffres).";
  }

  if (form.isChild && !form.childDocument.trim()) {
    errors.childDocument =
      "Le document du mineur est requis pour les enfants.";
  }

  const luggageCount = parseInt(form.luggageCount) || 0;
  if (luggageCount < 0 || luggageCount > 5) {
    errors.luggageCount = "Entre 0 et 5 valises.";
  }

  const luggageWeight = parseFloat(form.luggageWeight) || 0;
  if (luggageWeight < 0 || luggageWeight > 100) {
    errors.luggageWeight = "Poids invalide (0-100 kg).";
  }

  return errors;
}

// ── Activated Ticket Response ────────────────────────────────────────────
interface ActivatedTicket {
  id: string;
  ticketCode: string;
  controlCode: string;
  passengerName: string;
  seatNumber: string;
  passengerAge: number;
  passengerPhone: string;
  luggageCount: number;
  luggageWeight: number;
  luggageFee: number;
  totalPrice: number;
  whatsappLink: string;
  status: string;
  createdAt: string;
}

// ── Component ────────────────────────────────────────────────────────────
export function GuichetActivate() {
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activatedTicket, setActivatedTicket] = useState<ActivatedTicket | null>(null);

  const passengerAge = parseInt(form.passengerAge) || 0;
  const luggageWeight = parseFloat(form.luggageWeight) || 0;

  // Auto-set isChild when age < 5
  useEffect(() => {
    if (passengerAge < 5 && passengerAge > 0 && !form.isChild) {
      setForm((prev) => ({ ...prev, isChild: true }));
    }
  }, [passengerAge]);

  const excessWeight = useMemo(
    () => Math.max(0, luggageWeight - FREE_LUGGAGE_KG),
    [luggageWeight]
  );
  const excessFee = useMemo(
    () => excessWeight * EXCESS_WEIGHT_FEE_PER_KG,
    [excessWeight]
  );

  const updateField = (field: keyof FormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleUppercase = (field: keyof FormData, value: string) => {
    updateField(field, value.toUpperCase());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validateForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast.error("Veuillez corriger les erreurs du formulaire.");
      return;
    }

    setIsSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        ticketCode: form.ticketCode.trim(),
        passengerName: form.passengerName.trim(),
        passengerAge: parseInt(form.passengerAge),
        passengerPhone: form.passengerPhone.trim(),
        seatNumber: form.seatNumber.trim() || undefined,
        luggageCount: parseInt(form.luggageCount),
        luggageWeight: parseFloat(form.luggageWeight),
        idDocumentType: form.idDocumentType || undefined,
        idDocumentNumber: form.idDocumentNumber.trim() || undefined,
        isChild: form.isChild,
        childDocument: form.isChild ? form.childDocument.trim() : undefined,
        hasParentalAuth: form.hasParentalAuth,
      };
      if (form.lineId.trim()) {
        body.lineId = form.lineId.trim();
      }

      const data = await apiClient.fetch<ActivatedTicket & { whatsappLink: string }>(
        "/api/tickets/activate",
        {
          method: "POST",
          body: JSON.stringify(body),
        }
      );

      setActivatedTicket(data);
      toast.success("Billet activé avec succès !");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Impossible d'activer le billet."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewTicket = () => {
    setActivatedTicket(null);
    setForm(INITIAL_FORM);
    setErrors({});
  };

  // ── Success receipt panel ───────────────────────────────────────────
  if (activatedTicket) {
    return (
      <div className="max-w-lg mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key="receipt"
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
              <CardHeader className="bg-emerald-50 dark:bg-emerald-900/20 rounded-t-lg">
                <CardTitle className="text-center text-emerald-800 dark:text-emerald-300">
                  Billet Activé !
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {/* Control code */}
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    Code de contrôle
                  </p>
                  <p className="text-3xl font-mono font-bold tracking-widest text-gray-900 dark:text-white">
                    {activatedTicket.controlCode}
                  </p>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Passager</p>
                    <p className="font-medium">{activatedTicket.passengerName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Siège</p>
                    <p className="font-medium">
                      {activatedTicket.seatNumber || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Bagages</p>
                    <p className="font-medium">
                      {activatedTicket.luggageCount} valise(s) —{" "}
                      {activatedTicket.luggageWeight} kg
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Supplément bagage</p>
                    <p className="font-medium">
                      {activatedTicket.luggageFee.toLocaleString("fr-FR")} FCFA
                    </p>
                  </div>
                </div>

                <div className="border-t pt-3 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    Prix total
                  </p>
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                    {activatedTicket.totalPrice.toLocaleString("fr-FR")} FCFA
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 pt-2">
                  <Button
                    onClick={() => {
                      if (activatedTicket.whatsappLink) {
                        window.open(activatedTicket.whatsappLink, "_blank");
                      }
                    }}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    size="lg"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Envoyer sur WhatsApp
                  </Button>
                  <Button
                    onClick={handleNewTicket}
                    variant="outline"
                    className="w-full"
                    size="lg"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Nouveau billet
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // ── Activation form ─────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column — Form */}
          <div className="space-y-4">
            {/* Section 1: Voyage */}
            <Card className="border-0 shadow-sm bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-blue-800 dark:text-blue-300">
                  <Ticket className="w-4 h-4" />
                  Voyage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ticket-code" className="text-blue-900 dark:text-blue-200">
                    Code ticket <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="ticket-code"
                    placeholder="TKT-0001"
                    value={form.ticketCode}
                    onChange={(e) => handleUppercase("ticketCode", e.target.value)}
                    className="uppercase font-mono"
                  />
                  {errors.ticketCode && (
                    <p className="text-xs text-destructive">{errors.ticketCode}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="line-id" className="text-blue-900 dark:text-blue-200">
                    Ligne (optionnel)
                  </Label>
                  <Input
                    id="line-id"
                    placeholder="ID de la ligne / départ"
                    value={form.lineId}
                    onChange={(e) => updateField("lineId", e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Section 2: Passager */}
            <Card className="border-0 shadow-sm bg-gray-50 dark:bg-gray-900/30 border-gray-100 dark:border-gray-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-gray-800 dark:text-gray-200">
                  <User className="w-4 h-4" />
                  Passager
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="passenger-name">
                    Nom complet <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="passenger-name"
                    placeholder="Jean Dupont"
                    value={form.passengerName}
                    onChange={(e) => updateField("passengerName", e.target.value)}
                  />
                  {errors.passengerName && (
                    <p className="text-xs text-destructive">{errors.passengerName}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="passenger-age">
                      Âge <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="passenger-age"
                      type="number"
                      min={0}
                      max={120}
                      value={form.passengerAge}
                      onChange={(e) => updateField("passengerAge", e.target.value)}
                    />
                    {errors.passengerAge && (
                      <p className="text-xs text-destructive">{errors.passengerAge}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="seat-number">Siège</Label>
                    <Input
                      id="seat-number"
                      placeholder="A1"
                      value={form.seatNumber}
                      onChange={(e) =>
                        handleUppercase("seatNumber", e.target.value)
                      }
                      className="uppercase"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="passenger-phone">
                    WhatsApp <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="passenger-phone"
                    placeholder="771234567"
                    value={form.passengerPhone}
                    onChange={(e) => updateField("passengerPhone", e.target.value)}
                    type="tel"
                  />
                  {errors.passengerPhone && (
                    <p className="text-xs text-destructive">{errors.passengerPhone}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="id-type">Type pièce d&apos;identité</Label>
                    <Select
                      value={form.idDocumentType}
                      onValueChange={(v) => updateField("idDocumentType", v)}
                    >
                      <SelectTrigger id="id-type">
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        {ID_DOCUMENT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="id-number">N° pièce</Label>
                    <Input
                      id="id-number"
                      placeholder="Optionnel"
                      value={form.idDocumentNumber}
                      onChange={(e) => updateField("idDocumentNumber", e.target.value)}
                    />
                  </div>
                </div>

                {/* Mineur checkbox */}
                <div className="flex items-center space-x-2 pt-1">
                  <Checkbox
                    id="is-child"
                    checked={form.isChild}
                    onCheckedChange={(checked) =>
                      updateField("isChild", !!checked)
                    }
                  />
                  <Label htmlFor="is-child" className="text-sm font-normal">
                    Passager mineur
                  </Label>
                </div>

                <AnimatePresence>
                  {form.isChild && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-3 pl-4 border-l-2 border-amber-300 dark:border-amber-700">
                        <div className="space-y-1.5">
                          <Label htmlFor="child-doc">
                            Document du mineur{" "}
                            <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="child-doc"
                            placeholder="Jugement / Attestation"
                            value={form.childDocument}
                            onChange={(e) =>
                              updateField("childDocument", e.target.value)
                            }
                          />
                          {errors.childDocument && (
                            <p className="text-xs text-destructive">
                              {errors.childDocument}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="parental-auth"
                            checked={form.hasParentalAuth}
                            onCheckedChange={(checked) =>
                              updateField("hasParentalAuth", !!checked)
                            }
                          />
                          <Label
                            htmlFor="parental-auth"
                            className="text-sm font-normal"
                          >
                            Autorisation parentale fournie
                          </Label>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>

            {/* Section 3: Bagages */}
            <Card className="border-0 shadow-sm bg-green-50 dark:bg-green-950/30 border-green-100 dark:border-green-900">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-green-800 dark:text-green-300">
                  <Luggage className="w-4 h-4" />
                  🧳 Bagages (1ère valise ≤15kg offerte)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="luggage-count"
                      className="text-green-900 dark:text-green-200"
                    >
                      Nombre de valises
                    </Label>
                    <Input
                      id="luggage-count"
                      type="number"
                      min={0}
                      max={5}
                      value={form.luggageCount}
                      onChange={(e) => updateField("luggageCount", e.target.value)}
                    />
                    {errors.luggageCount && (
                      <p className="text-xs text-destructive">
                        {errors.luggageCount}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="luggage-weight"
                      className="text-green-900 dark:text-green-200"
                    >
                      Poids total (kg)
                    </Label>
                    <Input
                      id="luggage-weight"
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={form.luggageWeight}
                      onChange={(e) => updateField("luggageWeight", e.target.value)}
                    />
                    {errors.luggageWeight && (
                      <p className="text-xs text-destructive">
                        {errors.luggageWeight}
                      </p>
                    )}
                  </div>
                </div>

                {/* Live calculation */}
                {luggageWeight > FREE_LUGGAGE_KG && (
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3 space-y-1 border border-amber-200 dark:border-amber-800">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                      Poids excédentaire : {excessWeight.toFixed(1)} kg
                    </p>
                    <p className="text-lg font-bold text-amber-700 dark:text-amber-400">
                      Supplément bagage :{" "}
                      {excessFee.toLocaleString("fr-FR")} FCFA
                    </p>
                  </div>
                )}
                {luggageWeight <= FREE_LUGGAGE_KG && luggageWeight >= 0 && (
                  <p className="text-sm text-green-600 dark:text-green-400">
                    ✅ Poids dans la franchise ({FREE_LUGGAGE_KG} kg)
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Submit */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-6 text-lg font-semibold shadow-md"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Activation en cours…
                </>
              ) : (
                "ACTIVER LE BILLET"
              )}
            </Button>
          </div>

          {/* Right Column — Info panel (desktop only) */}
          <div className="hidden lg:block">
            <Card className="border-0 shadow-sm sticky top-20">
              <CardContent className="p-6 space-y-4">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 mb-3">
                    <Ticket className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-semibold">Activation au guichet</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Scannez ou saisissez le code ticket pour activer un billet
                    de voyage.
                  </p>
                </div>

                <div className="border-t pt-4 space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Étapes
                  </h4>
                  <ol className="space-y-2 text-sm">
                    <li className="flex gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold shrink-0">
                        1
                      </span>
                      <span>Saisir le code ticket pré-imprimé</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold shrink-0">
                        2
                      </span>
                      <span>Remplir les informations passager</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold shrink-0">
                        3
                      </span>
                      <span>Déclarer les bagages</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold shrink-0">
                        4
                      </span>
                      <span>Activer et envoyer par WhatsApp</span>
                    </li>
                  </ol>
                </div>

                <div className="border-t pt-4">
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                      Tarification bagages
                    </p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>1ère valise (≤15 kg)</span>
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">
                          Gratuit
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Excédent / kg</span>
                        <span className="font-medium">
                          {EXCESS_WEIGHT_FEE_PER_KG.toLocaleString("fr-FR")}{" "}
                          FCFA
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
