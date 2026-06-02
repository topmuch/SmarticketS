"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Loader2,
  Send,
  RotateCcw,
  Package,
  User,
  MapPin,
  Route,
  Settings2,
  Copy,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiClient } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────
interface Station {
  id: string;
  name: string;
  city: string;
}

interface ParcelRate {
  id: string;
  price: number;
  fromStation: { id: string; name: string };
  toStation: { id: string; name: string };
}

interface FormData {
  senderName: string;
  senderPhone: string;
  recipientName: string;
  recipientPhone: string;
  recipientLocation: string;
  ticketCode: string;
  fromStationId: string;
  toStationId: string;
  estimatedArrival: string;
  luggageCount: string;
}

interface FormErrors {
  [key: string]: string;
}

interface ActivatedParcel {
  id: string;
  controlCode: string;
  pinCode: string;
  senderName: string;
  senderPhone: string;
  recipientName: string;
  recipientPhone: string;
  recipientLocation: string;
  ticketCode: string;
  fromStation: Station | null;
  toStation: Station | null;
  price: number;
  luggageCount: number;
  status: string;
  createdAt: string;
  whatsappSenderLink: string;
  whatsappRecipientLink: string;
}

// ── Constants ──────────────────────────────────────────────────────────
const INITIAL_FORM: FormData = {
  senderName: "",
  senderPhone: "",
  recipientName: "",
  recipientPhone: "",
  recipientLocation: "",
  ticketCode: "",
  fromStationId: "",
  toStationId: "",
  estimatedArrival: "",
  luggageCount: "1",
};

function validateForm(form: FormData): FormErrors {
  const errors: FormErrors = {};

  if (!form.senderName.trim() || form.senderName.trim().length < 2) {
    errors.senderName = "Le nom de l'expéditeur est requis (min. 2 caractères).";
  }
  const phoneRegex = /^[0-9]{9,15}$/;
  if (!phoneRegex.test(form.senderPhone.trim())) {
    errors.senderPhone = "Numéro invalide (9-15 chiffres).";
  }
  if (!form.recipientName.trim() || form.recipientName.trim().length < 2) {
    errors.recipientName = "Le nom du destinataire est requis (min. 2 caractères).";
  }
  if (!phoneRegex.test(form.recipientPhone.trim())) {
    errors.recipientPhone = "Numéro invalide (9-15 chiffres).";
  }
  if (!form.recipientLocation.trim()) {
    errors.recipientLocation = "La localisation du destinataire est requise.";
  }
  if (!form.ticketCode.trim()) {
    errors.ticketCode = "Le code ticket est requis.";
  }
  if (!form.fromStationId) {
    errors.fromStationId = "La gare de départ est requise.";
  }
  if (!form.toStationId) {
    errors.toStationId = "La gare d'arrivée est requise.";
  }
  if (form.fromStationId && form.toStationId && form.fromStationId === form.toStationId) {
    errors.toStationId = "Les gares doivent être différentes.";
  }

  return errors;
}

// ── Component ──────────────────────────────────────────────────────────
export function ParcelActivate() {
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activatedParcel, setActivatedParcel] = useState<ActivatedParcel | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [currentRate, setCurrentRate] = useState<ParcelRate | null>(null);
  const [isLoadingRate, setIsLoadingRate] = useState(false);
  const [pinRevealed, setPinRevealed] = useState(false);

  // Load stations
  useEffect(() => {
    const loadStations = async () => {
      try {
        const data = await apiClient.fetch<Station[]>("/api/stations");
        setStations(data);
      } catch {
        toast.error("Impossible de charger les gares.");
      }
    };
    loadStations();
  }, []);

  // Fetch rate when stations change
  const fetchRate = useCallback(async () => {
    if (!form.fromStationId || !form.toStationId) {
      setCurrentRate(null);
      return;
    }
    setIsLoadingRate(true);
    try {
      const data = await apiClient.fetch<ParcelRate>(
        `/api/parcels/rates?fromStationId=${form.fromStationId}&toStationId=${form.toStationId}`
      );
      setCurrentRate(data);
    } catch {
      setCurrentRate(null);
    } finally {
      setIsLoadingRate(false);
    }
  }, [form.fromStationId, form.toStationId]);

  useEffect(() => {
    fetchRate();
  }, [fetchRate]);

  const updateField = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
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
        senderName: form.senderName.trim(),
        senderPhone: form.senderPhone.trim(),
        recipientName: form.recipientName.trim(),
        recipientPhone: form.recipientPhone.trim(),
        recipientLocation: form.recipientLocation.trim(),
        ticketCode: form.ticketCode.trim(),
        fromStationId: form.fromStationId,
        toStationId: form.toStationId,
        luggageCount: parseInt(form.luggageCount) || 1,
      };
      if (form.estimatedArrival) {
        body.estimatedArrival = new Date(form.estimatedArrival).toISOString();
      }

      const data = await apiClient.fetch<ActivatedParcel>("/api/parcels/activate", {
        method: "POST",
        body: JSON.stringify(body),
      });

      setActivatedParcel(data);
      toast.success("Colis enregistré avec succès !");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Impossible d'enregistrer le colis."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewParcel = () => {
    setActivatedParcel(null);
    setForm(INITIAL_FORM);
    setErrors({});
    setCurrentRate(null);
    setPinRevealed(false);
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copié !`);
    } catch {
      toast.error("Échec de la copie.");
    }
  };

  // ── Success receipt panel ──────────────────────────────────────────
  if (activatedParcel) {
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
                  Colis Enregistré avec Succès !
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {/* Control code */}
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    Code de suivi
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <p className="text-3xl font-mono font-bold tracking-widest text-gray-900 dark:text-white">
                      {activatedParcel.controlCode}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => copyToClipboard(activatedParcel.controlCode, "Code de suivi")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* PIN Code — Secret */}
                <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <p className="text-xs text-amber-700 dark:text-amber-400 uppercase tracking-wide font-medium">
                      Code secret PIN
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <p className="text-2xl font-mono font-bold tracking-[0.3em] text-gray-900 dark:text-white">
                      {pinRevealed ? activatedParcel.pinCode : "••••"}
                    </p>
                    {!pinRevealed && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-amber-700 hover:text-amber-800"
                        onClick={() => setPinRevealed(true)}
                      >
                        Afficher
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    À communiquer uniquement au destinataire
                  </p>
                </div>

                {/* Sender / Recipient details */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Expéditeur</p>
                    <p className="font-medium">{activatedParcel.senderName}</p>
                    <p className="text-xs text-muted-foreground">{activatedParcel.senderPhone}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Destinataire</p>
                    <p className="font-medium">{activatedParcel.recipientName}</p>
                    <p className="text-xs text-muted-foreground">{activatedParcel.recipientLocation}</p>
                  </div>
                </div>

                {/* Route */}
                {activatedParcel.fromStation && activatedParcel.toStation && (
                  <div className="text-sm text-center">
                    <p className="text-muted-foreground">Itinéraire</p>
                    <p className="font-medium">
                      {activatedParcel.fromStation.name} → {activatedParcel.toStation.name}
                    </p>
                  </div>
                )}

                <div className="border-t pt-3 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    Montant
                  </p>
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                    {(activatedParcel.price ?? 0).toLocaleString("fr-FR")} FCFA
                  </p>
                </div>

                {/* WhatsApp buttons */}
                <div className="flex flex-col gap-2 pt-2">
                  <Button
                    onClick={() => {
                      if (activatedParcel.whatsappSenderLink) {
                        window.open(activatedParcel.whatsappSenderLink, "_blank");
                      }
                    }}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    size="lg"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Notifier Expéditeur
                  </Button>
                  <Button
                    onClick={() => {
                      if (activatedParcel.whatsappRecipientLink) {
                        window.open(activatedParcel.whatsappRecipientLink, "_blank");
                      }
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    size="lg"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Notifier Destinataire
                  </Button>
                  <Button
                    onClick={handleNewParcel}
                    variant="outline"
                    className="w-full"
                    size="lg"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Nouveau Colis
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // ── Activation form ────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column — Form */}
          <div className="space-y-4">
            {/* Section 1: Expéditeur */}
            <Card className="border-0 shadow-sm bg-orange-50 dark:bg-orange-950/20 border-orange-100 dark:border-orange-900">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-orange-800 dark:text-orange-300">
                  <User className="w-4 h-4" />
                  Expéditeur
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="sender-name" className="text-orange-900 dark:text-orange-200">
                    Nom complet <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="sender-name"
                    placeholder="Nom de l'expéditeur"
                    value={form.senderName}
                    onChange={(e) => updateField("senderName", e.target.value)}
                  />
                  {errors.senderName && (
                    <p className="text-xs text-destructive">{errors.senderName}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sender-phone" className="text-orange-900 dark:text-orange-200">
                    Téléphone <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="sender-phone"
                    placeholder="771234567"
                    value={form.senderPhone}
                    onChange={(e) => updateField("senderPhone", e.target.value)}
                    type="tel"
                  />
                  {errors.senderPhone && (
                    <p className="text-xs text-destructive">{errors.senderPhone}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Section 2: Destinataire */}
            <Card className="border-0 shadow-sm bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-blue-800 dark:text-blue-300">
                  <MapPin className="w-4 h-4" />
                  Destinataire
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="recipient-name" className="text-blue-900 dark:text-blue-200">
                    Nom complet <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="recipient-name"
                    placeholder="Nom du destinataire"
                    value={form.recipientName}
                    onChange={(e) => updateField("recipientName", e.target.value)}
                  />
                  {errors.recipientName && (
                    <p className="text-xs text-destructive">{errors.recipientName}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="recipient-phone" className="text-blue-900 dark:text-blue-200">
                    Téléphone <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="recipient-phone"
                    placeholder="771234567"
                    value={form.recipientPhone}
                    onChange={(e) => updateField("recipientPhone", e.target.value)}
                    type="tel"
                  />
                  {errors.recipientPhone && (
                    <p className="text-xs text-destructive">{errors.recipientPhone}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="recipient-location" className="text-blue-900 dark:text-blue-200">
                    Localisation <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="recipient-location"
                    placeholder="Quartier, ville…"
                    value={form.recipientLocation}
                    onChange={(e) => updateField("recipientLocation", e.target.value)}
                  />
                  {errors.recipientLocation && (
                    <p className="text-xs text-destructive">{errors.recipientLocation}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Section 3: Itinéraire */}
            <Card className="border-0 shadow-sm bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                  <Route className="w-4 h-4" />
                  Itinéraire
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ticket-code" className="text-emerald-900 dark:text-emerald-200">
                    Code ticket (CPS-XXXX) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="ticket-code"
                    placeholder="CPS-0001"
                    value={form.ticketCode}
                    onChange={(e) => updateField("ticketCode", e.target.value.toUpperCase())}
                    className="uppercase font-mono"
                  />
                  {errors.ticketCode && (
                    <p className="text-xs text-destructive">{errors.ticketCode}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="from-station" className="text-emerald-900 dark:text-emerald-200">
                      Gare départ <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={form.fromStationId}
                      onValueChange={(v) => updateField("fromStationId", v)}
                    >
                      <SelectTrigger id="from-station">
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        {stations.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.fromStationId && (
                      <p className="text-xs text-destructive">{errors.fromStationId}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="to-station" className="text-emerald-900 dark:text-emerald-200">
                      Gare arrivée <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={form.toStationId}
                      onValueChange={(v) => updateField("toStationId", v)}
                    >
                      <SelectTrigger id="to-station">
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        {stations.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.toStationId && (
                      <p className="text-xs text-destructive">{errors.toStationId}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="estimated-arrival" className="text-emerald-900 dark:text-emerald-200">
                    Arrivée estimée (optionnel)
                  </Label>
                  <Input
                    id="estimated-arrival"
                    type="datetime-local"
                    value={form.estimatedArrival}
                    onChange={(e) => updateField("estimatedArrival", e.target.value)}
                  />
                </div>

                {/* Rate display */}
                {form.fromStationId && form.toStationId && form.fromStationId !== form.toStationId && (
                  <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-3 border border-green-200 dark:border-green-800">
                    {isLoadingRate ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Recherche du tarif…
                      </div>
                    ) : currentRate ? (
                      <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                        💰 Tarif appliqué : {currentRate.price.toLocaleString("fr-FR")} FCFA
                      </p>
                    ) : (
                      <p className="text-sm text-amber-600 dark:text-amber-400">
                        ⚠️ Aucun tarif configuré pour cet itinéraire.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Section 4: Détails */}
            <Card className="border-0 shadow-sm bg-gray-50 dark:bg-gray-900/30 border-gray-100 dark:border-gray-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-gray-800 dark:text-gray-200">
                  <Settings2 className="w-4 h-4" />
                  Détails
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="luggage-count" className="text-gray-900 dark:text-gray-200">
                    Nombre de colis
                  </Label>
                  <Input
                    id="luggage-count"
                    type="number"
                    min={1}
                    max={20}
                    value={form.luggageCount}
                    onChange={(e) => updateField("luggageCount", e.target.value)}
                  />
                </div>
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
                  Enregistrement en cours…
                </>
              ) : (
                "📦 ENREGISTRER LE COLIS"
              )}
            </Button>
          </div>

          {/* Right Column — Info panel (desktop only) */}
          <div className="hidden lg:block">
            <Card className="border-0 shadow-sm sticky top-20">
              <CardContent className="p-6 space-y-4">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 mb-3">
                    <Package className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-semibold">Enregistrement de colis</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Enregistrez un colis au guichet pour la messagerie inter-gares.
                  </p>
                </div>

                <div className="border-t pt-4 space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Étapes
                  </h4>
                  <ol className="space-y-2 text-sm">
                    <li className="flex gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs font-bold shrink-0">
                        1
                      </span>
                      <span>Informations de l&apos;expéditeur</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold shrink-0">
                        2
                      </span>
                      <span>Informations du destinataire</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold shrink-0">
                        3
                      </span>
                      <span>Choisir l&apos;itinéraire et le tarif</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 text-xs font-bold shrink-0">
                        4
                      </span>
                      <span>Enregistrer et notifier par WhatsApp</span>
                    </li>
                  </ol>
                </div>

                <div className="border-t pt-4">
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                      Important
                    </p>
                    <div className="space-y-1 text-sm">
                      <p className="flex items-start gap-1.5">
                        <span className="text-amber-500 shrink-0">⚠️</span>
                        <span>Le code PIN est secret : ne le communiquez qu&apos;au destinataire.</span>
                      </p>
                      <p className="flex items-start gap-1.5">
                        <span className="text-green-500 shrink-0">✅</span>
                        <span>Le destinataire doit présenter le code PIN pour récupérer le colis.</span>
                      </p>
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
