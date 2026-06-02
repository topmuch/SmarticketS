'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  QrCode,
  RefreshCw,
  CheckCircle,
  User,
  Building2,
  Package,
  AlertCircle,
  Shield,
  Layers,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

// Types
interface Agency {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  active: boolean;
  createdAt: string;
}

type GenerationContext = 'individual' | 'agency' | 'bulk';

export default function GenererQRPage() {
  const router = useRouter();
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(false);
  const [qrGenerating, setQrGenerating] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [generatedSetId, setGeneratedSetId] = useState<string | null>(null);

  // Context selection
  const [context, setContext] = useState<GenerationContext>('bulk');

  // Individual form
  const [individualForm, setIndividualForm] = useState({
    firstName: '',
    lastName: '',
    whatsapp: '',
    duration: '7d' as '7d' | '1y',
    baggageCount: 1 as 1 | 3,
  });

  // Agency form
  const [agencyForm, setAgencyForm] = useState({
    type: 'voyageur' as string,
    agencyId: '',
    travelerCount: 1,
    baggagePerTraveler: 3 as 1 | 3,
  });

  // Bulk form
  const [bulkForm, setBulkForm] = useState({
    type: 'voyageur' as string,
    agencyId: 'none',
    totalQrCount: 200,
  });

  useEffect(() => {
    fetchAgencies();
  }, []);

  const fetchAgencies = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/agencies');
      const data = await res.json();
      setAgencies(data.agencies || []);
    } catch (error) {
      console.error('Error fetching agencies:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate QR count for display
  const getQrCount = () => {
    if (context === 'individual') {
      return individualForm.baggageCount;
    }
    if (context === 'agency') {
      return agencyForm.travelerCount * agencyForm.baggagePerTraveler;
    }
    return bulkForm.totalQrCount;
  };

  // Validate individual form
  const validateIndividualForm = (): boolean => {
    if (!individualForm.firstName.trim()) {
      setErrorMessage('Le prénom est requis');
      return false;
    }
    if (!individualForm.lastName.trim()) {
      setErrorMessage('Le nom est requis');
      return false;
    }
    if (!individualForm.whatsapp.trim()) {
      setErrorMessage('Le numéro WhatsApp est requis');
      return false;
    }
    // Basic WhatsApp format validation
    const phoneRegex = /^\+?[1-9]\d{6,14}$/;
    if (!phoneRegex.test(individualForm.whatsapp.replace(/\s/g, ''))) {
      setErrorMessage('Format WhatsApp invalide (ex: +33612345678)');
      return false;
    }
    return true;
  };

  // Validate agency form
  const validateAgencyForm = (): boolean => {
    if (!agencyForm.agencyId) {
      setErrorMessage('Veuillez sélectionner une agence');
      return false;
    }
    return true;
  };

  // Validate bulk form
  const validateBulkForm = (): boolean => {
    if (bulkForm.totalQrCount < 1 || bulkForm.totalQrCount > 2000) {
      setErrorMessage('Le nombre de QR codes doit être entre 1 et 2000');
      return false;
    }
    return true;
  };

  const handleGenerateQR = async () => {
    setErrorMessage('');
    setGeneratedSetId(null);

    // Validate based on context
    if (context === 'individual' && !validateIndividualForm()) return;
    if (context === 'agency' && !validateAgencyForm()) return;
    if (context === 'bulk' && !validateBulkForm()) return;

    setQrGenerating(true);

    try {
      let payload: Record<string, unknown>;

      if (context === 'individual') {
        payload = {
          context: 'individual',
          type: 'voyageur' as const,
          firstName: individualForm.firstName.trim(),
          lastName: individualForm.lastName.trim(),
          whatsapp: individualForm.whatsapp.trim(),
          duration: individualForm.duration,
          baggageCount: individualForm.baggageCount,
        };
      } else if (context === 'agency') {
        payload = {
          context: 'agency',
          type: agencyForm.type,
          agencyId: agencyForm.agencyId,
          travelerCount: agencyForm.travelerCount,
          count: agencyForm.baggagePerTraveler,
        };
      } else {
        payload = {
          context: 'bulk',
          type: bulkForm.type,
          agencyId: bulkForm.agencyId !== 'none' ? bulkForm.agencyId : undefined,
          totalQrCount: bulkForm.totalQrCount,
        };
      }

      const response = await fetch('/api/admin/baggages/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage(`✅ ${data.generated} codes QR générés avec succès !`);
        if (data.setId) setGeneratedSetId(data.setId);
        // Reset forms
        if (context === 'individual') {
          setIndividualForm({ firstName: '', lastName: '', whatsapp: '', duration: '7d', baggageCount: 1 });
        }
        if (context === 'bulk') {
          setBulkForm(prev => ({ ...prev, totalQrCount: 200 }));
        }
        setTimeout(() => setSuccessMessage(''), 8000);
      } else {
        setErrorMessage(data.details ? `${data.error}: ${data.details}` : (data.error || 'Erreur lors de la génération'));
      }
    } catch (error) {
      console.error('Error generating QR codes:', error);
      setErrorMessage('Erreur lors de la génération des QR codes');
    } finally {
      setQrGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Génération de QR Codes</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Créez des QR codes anti-fraude pour vos colis et voyageurs</p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 px-4 py-3 rounded-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          {generatedSetId && (
            <Button
              variant="outline"
              size="sm"
              className="border-emerald-300 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
              onClick={() => router.push('/admin/etiquettes')}
            >
              <Package className="w-4 h-4 mr-1" />
              Voir & Télécharger
            </Button>
          )}
        </div>
      )}

      {/* Context Selector — 3 modes */}
      <div className="mb-6">
        <Label className="text-slate-700 dark:text-slate-300 mb-3">Mode de génération</Label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
          {/* Bulk mode (default) */}
          <button
            onClick={() => { setContext('bulk'); setErrorMessage(''); }}
            className={cn(
              "flex items-center gap-3 p-4 rounded-xl border transition-all text-left",
              context === 'bulk'
                ? "bg-emerald-600 border-emerald-600 text-white"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300"
            )}
          >
            <Layers className={cn("w-5 h-5 flex-shrink-0", context === 'bulk' ? 'text-white' : 'text-emerald-600')} />
            <div>
              <p className="font-medium">Génération en masse</p>
              <p className="text-xs opacity-80">Jusqu'à 2000 QR en un clic</p>
            </div>
          </button>

          {/* Individual mode */}
          <button
            onClick={() => { setContext('individual'); setErrorMessage(''); }}
            className={cn(
              "flex items-center gap-3 p-4 rounded-xl border transition-all text-left",
              context === 'individual'
                ? "bg-[#ff7f00] border-[#ff7f00] text-white"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300"
            )}
          >
            <User className={cn("w-5 h-5 flex-shrink-0", context === 'individual' ? 'text-white' : 'text-orange-500')} />
            <div>
              <p className="font-medium">Voyageur individuel</p>
              <p className="text-xs opacity-80">1 voyageur, sans agence</p>
            </div>
          </button>

          {/* Agency mode */}
          <button
            onClick={() => { setContext('agency'); setErrorMessage(''); }}
            className={cn(
              "flex items-center gap-3 p-4 rounded-xl border transition-all text-left",
              context === 'agency'
                ? "bg-[#ff7f00] border-[#ff7f00] text-white"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300"
            )}
          >
            <Building2 className={cn("w-5 h-5 flex-shrink-0", context === 'agency' ? 'text-white' : 'text-orange-500')} />
            <div>
              <p className="font-medium">Agence (par voyageur)</p>
              <p className="text-xs opacity-80">Voyageurs × colis</p>
            </div>
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Main Form Card */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="text-slate-800 dark:text-white flex items-center gap-2">
              <QrCode className="w-5 h-5 text-emerald-500" />
              {context === 'bulk' ? 'Génération en masse' : context === 'individual' ? 'Voyageur individuel' : 'Génération agence'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* ─── BULK FORM ─── */}
            {context === 'bulk' && (
              <>
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">Agence (optionnel)</Label>
                  <Select
                    value={bulkForm.agencyId}
                    onValueChange={(v) => setBulkForm({ ...bulkForm, agencyId: v })}
                  >
                    <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white">
                      <SelectValue placeholder="Sans agence" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                      <SelectItem value="none">Sans agence</SelectItem>
                      {agencies.filter(a => a.active).map((agency) => (
                        <SelectItem key={agency.id} value={agency.id}>
                          {agency.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">
                    Nombre total de QR codes *
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={2000}
                    value={bulkForm.totalQrCount}
                    onChange={(e) => setBulkForm({ ...bulkForm, totalQrCount: Math.min(2000, Math.max(1, parseInt(e.target.value) || 1)) })}
                    className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white text-lg font-bold h-14"
                  />
                  <p className="text-xs text-slate-400">Min: 1 • Max: 2000 • Tous dans un seul set</p>
                </div>

                {/* Quick select buttons */}
                <div className="grid grid-cols-4 gap-2">
                  {[10, 50, 100, 200, 500, 1000, 1500, 2000].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setBulkForm({ ...bulkForm, totalQrCount: n })}
                      className={cn(
                        "py-2 rounded-lg text-sm font-medium transition-all border",
                        bulkForm.totalQrCount === n
                          ? "bg-emerald-600 border-emerald-600 text-white"
                          : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                      )}
                    >
                      {n >= 1000 ? `${n / 1000}k` : n}
                    </button>
                  ))}
                </div>

                <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 text-sm text-emerald-700 dark:text-emerald-400">
                  <div className="flex items-center gap-2 font-medium mb-1">
                    <Zap className="w-4 h-4" />
                    Mode rapide
                  </div>
                  <p>Les <strong>{bulkForm.totalQrCount}</strong> QR codes seront générés dans un seul set. Vous pourrez les télécharger en ZIP depuis la page Étiquettes.</p>
                </div>
              </>
            )}

            {/* ─── INDIVIDUAL FORM ─── */}
            {context === 'individual' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">Prénom *</Label>
                    <Input
                      value={individualForm.firstName}
                      onChange={(e) => setIndividualForm({ ...individualForm, firstName: e.target.value })}
                      placeholder="Ahmed"
                      className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">Nom *</Label>
                    <Input
                      value={individualForm.lastName}
                      onChange={(e) => setIndividualForm({ ...individualForm, lastName: e.target.value })}
                      placeholder="Diop"
                      className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">WhatsApp *</Label>
                  <Input
                    value={individualForm.whatsapp}
                    onChange={(e) => setIndividualForm({ ...individualForm, whatsapp: e.target.value })}
                    placeholder="+33612345678"
                    className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">Durée</Label>
                    <Select
                      value={individualForm.duration}
                      onValueChange={(v) => setIndividualForm({ ...individualForm, duration: v as '7d' | '1y' })}
                    >
                      <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                        <SelectItem value="7d">7 jours</SelectItem>
                        <SelectItem value="1y">1 an</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">Colis</Label>
                    <Select
                      value={String(individualForm.baggageCount)}
                      onValueChange={(v) => setIndividualForm({ ...individualForm, baggageCount: parseInt(v) as 1 | 3 })}
                    >
                      <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                        <SelectItem value="1">1 colis</SelectItem>
                        <SelectItem value="3">3 colis</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-sm text-amber-700 dark:text-amber-400">
                  <p className="font-medium">ℹ️ Le QR sera actif immédiatement avec les informations du voyageur.</p>
                </div>
              </>
            )}

            {/* ─── AGENCY FORM ─── */}
            {context === 'agency' && (
              <>
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">Agence partenaire *</Label>
                  <Select
                    value={agencyForm.agencyId}
                    onValueChange={(v) => setAgencyForm({ ...agencyForm, agencyId: v })}
                  >
                    <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white">
                      <SelectValue placeholder="Sélectionner une agence" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                      {agencies.filter(a => a.active).map((agency) => (
                        <SelectItem key={agency.id} value={agency.id}>
                          {agency.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">
                      Nombre de voyageurs
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      max={1000}
                      value={agencyForm.travelerCount}
                      onChange={(e) => setAgencyForm({ ...agencyForm, travelerCount: parseInt(e.target.value) || 1 })}
                      className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">Colis par voyageur</Label>
                    <Select
                      value={String(agencyForm.baggagePerTraveler)}
                      onValueChange={(v) => setAgencyForm({ ...agencyForm, baggagePerTraveler: parseInt(v) as 1 | 3 })}
                    >
                      <SelectTrigger className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                        <SelectItem value="1">1 colis</SelectItem>
                        <SelectItem value="3">3 colis</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}

            {errorMessage && (
              <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {errorMessage}
              </div>
            )}

            <Button
              className={cn(
                "w-full rounded-xl text-white font-bold h-14 text-base",
                context === 'bulk'
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-[#ff7f00] hover:bg-[#e57200]"
              )}
              onClick={handleGenerateQR}
              disabled={qrGenerating}
            >
              <RefreshCw className={cn("w-5 h-5 mr-2", qrGenerating ? 'animate-spin' : '')} />
              {qrGenerating
                ? 'Génération en cours...'
                : `Générer ${getQrCount()} codes QR`
              }
            </Button>
          </CardContent>
        </Card>

        {/* Preview Card */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="text-slate-800 dark:text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-slate-600" />
              Récapitulatif
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Big QR count */}
            <div className={cn(
              "rounded-xl p-6 text-center",
              context === 'bulk'
                ? "bg-gradient-to-br from-emerald-500 to-emerald-600"
                : "bg-gradient-to-br from-orange-500 to-orange-600"
            )}>
              <p className="text-5xl font-black text-white">{getQrCount()}</p>
              <p className="text-sm text-white/80 mt-1">QR codes à générer</p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-sm text-slate-600 dark:text-slate-300 space-y-2">
              <div className="flex items-center justify-between">
                <span>Mode</span>
                <span className="font-medium text-slate-800 dark:text-white">
                  {context === 'bulk' ? 'En masse' : context === 'individual' ? 'Individuel' : 'Agence'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Type</span>
                <span className="font-medium text-slate-800 dark:text-white">
                  {context === 'bulk' ? 'Voyageur' : context === 'individual' ? 'Voyageur' : (agencyForm.type === 'hajj' ? 'Hajj' : 'Voyageur')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Agence</span>
                <span className="font-medium text-slate-800 dark:text-white">
                  {context === 'bulk'
                    ? (agencies.find(a => a.id === bulkForm.agencyId)?.name || 'Aucune')
                    : context === 'individual'
                      ? 'Aucune'
                      : (agencies.find(a => a.id === agencyForm.agencyId)?.name || 'Non sélectionnée')
                  }
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Statut</span>
                <span className="font-medium text-slate-800 dark:text-white">
                  {context === 'individual' ? 'Actif immédiat' : 'En attente'}
                </span>
              </div>
            </div>

            {context === 'bulk' && (
              <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 text-sm text-emerald-700 dark:text-emerald-400 space-y-2">
                <p className="font-medium">Après génération :</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Allez sur la page <strong>Étiquettes</strong></li>
                  <li>Trouvez votre set de {bulkForm.totalQrCount} QR codes</li>
                  <li>Cliquez sur <strong>📦 Télécharger tout en ZIP</strong></li>
                  <li>Obtenez {bulkForm.totalQrCount} fichiers PNG individuels</li>
                </ol>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info Cards */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-3">
            <QrCode className="w-8 h-8" />
            <div>
              <p className="text-2xl font-bold">{getQrCount()}</p>
              <p className="text-sm text-white/80">QR à générer</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-3">
            <Building2 className="w-8 h-8" />
            <div>
              <p className="text-2xl font-bold">{agencies.filter(a => a.active).length}</p>
              <p className="text-sm text-white/80">Agences actives</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8" />
            <div>
              <p className="text-lg font-bold">Anti-fraude</p>
              <p className="text-sm text-white/80">Codes uniques</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
