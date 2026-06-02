"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Settings,
  MessageCircle,
  Mail,
  Calculator,
  Save,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { apiClient } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

// ── Types ────────────────────────────────────────────────────────────────
interface TenantSettings {
  id: string;
  tenantId: string;
  currency: string;
  language: string;
  timezone: string;
  ticketPrefix: string;
  parcelPrefix: string;
  autoWhatsApp: boolean;
  whatsappTemplate: string | null;
  emailNotifications: boolean;
  emailSmtpHost: string | null;
  emailSmtpPort: number | null;
  emailSmtpUser: string | null;
  emailSmtpPass: string | null;
  emailFromName: string | null;
  emailFromAddress: string | null;
  maxLuggageWeight: number;
  luggageFeePerKg: number;
  childDiscountPercent: number;
  receiptFooter: string | null;
}

const DEFAULTS: Omit<TenantSettings, "id" | "tenantId"> = {
  currency: "FCFA",
  language: "fr",
  timezone: "Africa/Dakar",
  ticketPrefix: "TKT",
  parcelPrefix: "COL",
  autoWhatsApp: false,
  whatsappTemplate: null,
  emailNotifications: false,
  emailSmtpHost: null,
  emailSmtpPort: null,
  emailSmtpUser: null,
  emailSmtpPass: null,
  emailFromName: null,
  emailFromAddress: null,
  maxLuggageWeight: 15,
  luggageFeePerKg: 200,
  childDiscountPercent: 50,
  receiptFooter: null,
};

// ── WhatsApp preview helper ──────────────────────────────────────────────
function buildPreview(template: string): string {
  return template
    .replace(/\{\{passager\}\}/g, "Moussa Diallo")
    .replace(/\{\{telephone\}\}/g, "+221 77 123 45 67")
    .replace(/\{\{trajet\}\}/g, "Dakar → Saint-Louis")
    .replace(/\{\{date\}\}/g, "25/01/2025")
    .replace(/\{\{heure\}\}/g, "08:30")
    .replace(/\{\{place\}\}/g, "12")
    .replace(/\{\{prix\}\}/g, "5 000 FCFA")
    .replace(/\{\{numero\}\}/g, "TKT-20250125-0042");
}

// ── Component ────────────────────────────────────────────────────────────
export function AdminSettings() {
  const user = useAuthStore((s) => s.user);
  const [settings, setSettings] = useState<Omit<TenantSettings, "id" | "tenantId"> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.fetch<TenantSettings>("/api/admin/settings");
      const { id: _id, tenantId: _tid, ...rest } = data;
      setSettings({ ...DEFAULTS, ...rest });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Impossible de charger les paramètres."
      );
      setSettings({ ...DEFAULTS });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Field updater
  const update = <K extends keyof Omit<TenantSettings, "id" | "tenantId">>(
    key: K,
    value: Omit<TenantSettings, "id" | "tenantId">[K]
  ) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  // Save handler
  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);
    try {
      await apiClient.fetch<TenantSettings>("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify(settings),
      });
      toast.success("Paramètres sauvegardés avec succès.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Impossible de sauvegarder les paramètres."
      );
    } finally {
      setIsSaving(false);
    }
  };

  // ── Loading skeleton ──────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-10 w-full max-w-lg" />
        <div className="grid gap-6 pt-4">
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    );
  }

  if (!settings) return null;

  // ── Tabs config ───────────────────────────────────────────────────────
  const tenantName =
    user?.tenant?.name ?? user?.tenant?.slug ?? "Transporteur";

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
          <Settings className="h-6 w-6 text-emerald-600" />
          Paramètres
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configuration générale de <span className="font-medium">{tenantName}</span>
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="general" className="gap-1.5 text-xs sm:text-sm">
            <Settings className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Général</span>
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="gap-1.5 text-xs sm:text-sm">
            <MessageCircle className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">WhatsApp</span>
          </TabsTrigger>
          <TabsTrigger value="email" className="gap-1.5 text-xs sm:text-sm">
            <Mail className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Email (SMTP)</span>
          </TabsTrigger>
          <TabsTrigger value="tarification" className="gap-1.5 text-xs sm:text-sm">
            <Calculator className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Tarification</span>
          </TabsTrigger>
        </TabsList>

        {/* ─── Général ─────────────────────────────────────────────── */}
        <TabsContent value="general">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Settings className="h-4 w-4 text-emerald-600" />
                Paramètres généraux
              </CardTitle>
              <CardDescription>
                Devise, langue, fuseau horaire et préfixes de numérotation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Currency */}
                <div className="space-y-2">
                  <Label htmlFor="currency">Devise</Label>
                  <Input
                    id="currency"
                    value={settings.currency}
                    onChange={(e) => update("currency", e.target.value)}
                    placeholder="FCFA"
                  />
                </div>

                {/* Language */}
                <div className="space-y-2">
                  <Label htmlFor="language">Langue</Label>
                  <Select
                    value={settings.language}
                    onValueChange={(v) => update("language", v)}
                  >
                    <SelectTrigger id="language">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fr">🇫🇷 Français</SelectItem>
                      <SelectItem value="en">🇬🇧 English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Timezone */}
                <div className="space-y-2">
                  <Label htmlFor="timezone">Fuseau horaire</Label>
                  <Select
                    value={settings.timezone}
                    onValueChange={(v) => update("timezone", v)}
                  >
                    <SelectTrigger id="timezone">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Africa/Dakar">Africa/Dakar (GMT+0)</SelectItem>
                      <SelectItem value="Africa/Abidjan">Africa/Abidjan (GMT+0)</SelectItem>
                      <SelectItem value="Africa/Bamako">Africa/Bamako (GMT+0)</SelectItem>
                      <SelectItem value="Africa/Ouagadougou">
                        Africa/Ouagadougou (GMT+0)
                      </SelectItem>
                      <SelectItem value="Africa/Niamey">Africa/Niamey (GMT+1)</SelectItem>
                      <SelectItem value="Africa/Lome">Africa/Lomé (GMT+0)</SelectItem>
                      <SelectItem value="Africa/Cotonou">Africa/Cotonou (GMT+1)</SelectItem>
                      <SelectItem value="Africa/Lagos">Africa/Lagos (GMT+1)</SelectItem>
                      <SelectItem value="Europe/Paris">Europe/Paris (GMT+1/+2)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Ticket prefix */}
                <div className="space-y-2">
                  <Label htmlFor="ticketPrefix">Préfixe billets</Label>
                  <Input
                    id="ticketPrefix"
                    value={settings.ticketPrefix}
                    onChange={(e) => update("ticketPrefix", e.target.value)}
                    placeholder="TKT"
                    maxLength={10}
                  />
                </div>

                {/* Parcel prefix */}
                <div className="space-y-2">
                  <Label htmlFor="parcelPrefix">Préfixe colis</Label>
                  <Input
                    id="parcelPrefix"
                    value={settings.parcelPrefix}
                    onChange={(e) => update("parcelPrefix", e.target.value)}
                    placeholder="COL"
                    maxLength={10}
                  />
                </div>
              </div>

              <Separator />

              {/* Receipt footer */}
              <div className="space-y-2">
                <Label htmlFor="receiptFooter">Pied de page des reçus</Label>
                <Textarea
                  id="receiptFooter"
                  value={settings.receiptFooter ?? ""}
                  onChange={(e) => update("receiptFooter", e.target.value || null)}
                  placeholder="Merci de voyager avec nous !"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Ce texte apparaît en bas de chaque reçu imprimé.
                </p>
              </div>

              {/* Save button */}
              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Sauvegarder
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── WhatsApp ─────────────────────────────────────────────── */}
        <TabsContent value="whatsapp">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-emerald-600" />
                Notifications WhatsApp
              </CardTitle>
              <CardDescription>
                Configuration de l&apos;envoi automatique de messages WhatsApp
                après l&apos;achat d&apos;un billet.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Auto WhatsApp toggle */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="autoWhatsApp" className="text-sm font-medium">
                    Envoi automatique WhatsApp
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Envoyer automatiquement un message de confirmation au client
                    après chaque achat de billet.
                  </p>
                </div>
                <Switch
                  id="autoWhatsApp"
                  checked={settings.autoWhatsApp}
                  onCheckedChange={(checked) => update("autoWhatsApp", checked)}
                />
              </div>

              {settings.autoWhatsApp && (
                <>
                  <Separator />

                  {/* WhatsApp template */}
                  <div className="space-y-2">
                    <Label htmlFor="whatsappTemplate">
                      Modèle de message WhatsApp
                    </Label>
                    <Textarea
                      id="whatsappTemplate"
                      value={settings.whatsappTemplate ?? ""}
                      onChange={(e) =>
                        update("whatsappTemplate", e.target.value || null)
                      }
                      placeholder={`Bonjour {{passager}}, votre billet {{numero}} est confirmé.\nTrajet : {{trajet}}\nDate : {{date}} à {{heure}}\nPlace : {{place}}\nPrix : {{prix}}`}
                      rows={6}
                    />
                    <p className="text-xs text-muted-foreground">
                      Variables disponibles :{" "}
                      <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
                        {"{{passager}}"}
                      </code>
                      ,{" "}
                      <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
                        {"{{telephone}}"}
                      </code>
                      ,{" "}
                      <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
                        {"{{trajet}}"}
                      </code>
                      ,{" "}
                      <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
                        {"{{date}}"}
                      </code>
                      ,{" "}
                      <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
                        {"{{heure}}"}
                      </code>
                      ,{" "}
                      <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
                        {"{{place}}"}
                      </code>
                      ,{" "}
                      <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
                        {"{{prix}}"}
                      </code>
                      ,{" "}
                      <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
                        {"{{numero}}"}
                      </code>
                    </p>
                  </div>

                  {/* Preview */}
                  {settings.whatsappTemplate && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-muted-foreground">
                        Aperçu du message
                      </Label>
                      <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-4 text-sm text-gray-800 dark:text-emerald-100 whitespace-pre-wrap">
                        {buildPreview(settings.whatsappTemplate)}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Save button */}
              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Sauvegarder
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Email (SMTP) ─────────────────────────────────────────── */}
        <TabsContent value="email">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Mail className="h-4 w-4 text-emerald-600" />
                Notifications par email (SMTP)
              </CardTitle>
              <CardDescription>
                Configuration de l&apos;envoi de reçus et confirmations par email.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Email notifications toggle */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="emailNotifications" className="text-sm font-medium">
                    Activer les notifications par email
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Envoyer automatiquement un email de confirmation au client
                    après chaque achat.
                  </p>
                </div>
                <Switch
                  id="emailNotifications"
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) =>
                    update("emailNotifications", checked)
                  }
                />
              </div>

              {settings.emailNotifications && (
                <>
                  <Separator />

                  {/* SMTP fields */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      Configuration SMTP
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* SMTP Host */}
                      <div className="space-y-2">
                        <Label htmlFor="emailSmtpHost">Hôte SMTP</Label>
                        <Input
                          id="emailSmtpHost"
                          type="text"
                          value={settings.emailSmtpHost ?? ""}
                          onChange={(e) =>
                            update("emailSmtpHost", e.target.value || null)
                          }
                          placeholder="smtp.example.com"
                        />
                      </div>

                      {/* SMTP Port */}
                      <div className="space-y-2">
                        <Label htmlFor="emailSmtpPort">Port SMTP</Label>
                        <Input
                          id="emailSmtpPort"
                          type="number"
                          min={1}
                          max={65535}
                          value={settings.emailSmtpPort ?? ""}
                          onChange={(e) =>
                            update(
                              "emailSmtpPort",
                              e.target.value ? parseInt(e.target.value, 10) : null
                            )
                          }
                          placeholder="587"
                        />
                      </div>

                      {/* SMTP User */}
                      <div className="space-y-2">
                        <Label htmlFor="emailSmtpUser">Utilisateur SMTP</Label>
                        <Input
                          id="emailSmtpUser"
                          type="text"
                          value={settings.emailSmtpUser ?? ""}
                          onChange={(e) =>
                            update("emailSmtpUser", e.target.value || null)
                          }
                          placeholder="user@example.com"
                        />
                      </div>

                      {/* SMTP Password */}
                      <div className="space-y-2">
                        <Label htmlFor="emailSmtpPass">Mot de passe SMTP</Label>
                        <Input
                          id="emailSmtpPass"
                          type="password"
                          value={settings.emailSmtpPass ?? ""}
                          onChange={(e) =>
                            update("emailSmtpPass", e.target.value || null)
                          }
                          placeholder="••••••••"
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Sender info */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      Expéditeur
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* From Name */}
                      <div className="space-y-2">
                        <Label htmlFor="emailFromName">Nom de l&apos;expéditeur</Label>
                        <Input
                          id="emailFromName"
                          type="text"
                          value={settings.emailFromName ?? ""}
                          onChange={(e) =>
                            update("emailFromName", e.target.value || null)
                          }
                          placeholder="SmartTicketQR"
                        />
                      </div>

                      {/* From Address */}
                      <div className="space-y-2">
                        <Label htmlFor="emailFromAddress">
                          Adresse de l&apos;expéditeur
                        </Label>
                        <Input
                          id="emailFromAddress"
                          type="email"
                          value={settings.emailFromAddress ?? ""}
                          onChange={(e) =>
                            update("emailFromAddress", e.target.value || null)
                          }
                          placeholder="no-reply@example.com"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Save button */}
              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Sauvegarder
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Tarification ─────────────────────────────────────────── */}
        <TabsContent value="tarification">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Calculator className="h-4 w-4 text-emerald-600" />
                Règles de tarification
              </CardTitle>
              <CardDescription>
                Poids maximal des bagages, frais supplémentaires et réductions
                enfants.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {/* Max luggage weight */}
                <div className="space-y-2">
                  <Label htmlFor="maxLuggageWeight">
                    Poids max bagages (kg)
                  </Label>
                  <Input
                    id="maxLuggageWeight"
                    type="number"
                    min={0}
                    step={1}
                    value={settings.maxLuggageWeight}
                    onChange={(e) =>
                      update(
                        "maxLuggageWeight",
                        parseInt(e.target.value, 10) || 0
                      )
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Poids gratuit autorisé par passager.
                  </p>
                </div>

                {/* Luggage fee per kg */}
                <div className="space-y-2">
                  <Label htmlFor="luggageFeePerKg">
                    Frais excédent (FCFA/kg)
                  </Label>
                  <Input
                    id="luggageFeePerKg"
                    type="number"
                    min={0}
                    step={50}
                    value={settings.luggageFeePerKg}
                    onChange={(e) =>
                      update(
                        "luggageFeePerKg",
                        parseInt(e.target.value, 10) || 0
                      )
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Prix au kilogramme au-delà du poids max.
                  </p>
                </div>

                {/* Child discount */}
                <div className="space-y-2">
                  <Label htmlFor="childDiscountPercent">
                    Réduction enfant (%)
                  </Label>
                  <Input
                    id="childDiscountPercent"
                    type="number"
                    min={0}
                    max={100}
                    step={5}
                    value={settings.childDiscountPercent}
                    onChange={(e) =>
                      update(
                        "childDiscountPercent",
                        Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0))
                      )
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Pourcentage de réduction appliqué aux billets enfants.
                  </p>
                </div>
              </div>

              <Separator />

              {/* Summary preview */}
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-4 space-y-2">
                <h4 className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                  Résumé de la tarification
                </h4>
                <ul className="text-sm text-emerald-700 dark:text-emerald-300 space-y-1 list-disc list-inside">
                  <li>
                    Bagages : <strong>{settings.maxLuggageWeight} kg</strong> inclus
                    par passager
                  </li>
                  <li>
                    Excédent :{" "}
                    <strong>
                      {settings.luggageFeePerKg.toLocaleString("fr-FR")} FCFA
                    </strong>{" "}
                    par kg supplémentaire
                  </li>
                  <li>
                    Tarif enfant :{" "}
                    <strong>{settings.childDiscountPercent}%</strong> de réduction
                    sur le prix adulte
                  </li>
                </ul>
              </div>

              {/* Save button */}
              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Sauvegarder
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
