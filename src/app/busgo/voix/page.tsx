'use client';

/**
 * BusGo Voix & Annonces — Configuration complète.
 *
 * 2 sections distinctes:
 *   A) Notifications CLIENT (PWA Passager) — 5 types avec texte + TTS + toggle
 *   B) Alertes AGENT (PWA Agent) — ding-dong + VocalSettingsPanel
 *
 * Section A: Templates client avec variables + preview TTS + bouton écouter
 * Section B: Upload MP3 + sliders volume/vitesse + toggles par type d'alerte
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Volume2, Save, Loader2, Upload, Music, Bell, Eye, Smartphone,
  Bus, AlertTriangle, Clock, CheckCircle2, ShoppingBag, Play,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { VocalSettingsPanel } from '@/components/busgo/vocal-settings-panel';

// ─── Types ─────────────────────────────────────────────────
interface ClientTemplate {
  id: string;
  notificationType: string;
  textTemplate: string;
  ttsTemplate: string;
  isActive: boolean;
}

const TYPE_INFO: Record<string, { label: string; icon: typeof Bell; color: string; delay: string; recipient: string }> = {
  purchase_confirm: { label: 'Confirmation achat', icon: ShoppingBag, color: 'text-emerald-600', delay: 'Immédiat', recipient: 'Passager' },
  reminder_1h:      { label: 'Rappel H-1h', icon: Clock, color: 'text-blue-600', delay: 'H-1h00', recipient: 'Passager' },
  bags_45min:       { label: 'Alerte bagages', icon: AlertTriangle, color: 'text-amber-600', delay: 'H-0h45', recipient: 'Passager' },
  boarding_30min:   { label: 'Dernier appel', icon: Bell, color: 'text-orange-600', delay: 'H-0h30', recipient: 'Passager' },
  departure_5min:   { label: 'Départ imminent', icon: Bus, color: 'text-rose-600', delay: 'H-0h05', recipient: 'Passager' },
};

const VARIABLES = '{passenger_name} {company_name} {departure_city} {arrival_city} {date} {time} {platform} {ticket_number}';

// ─── Component ─────────────────────────────────────────────
export default function BusGoVoixPage() {
  const [clientTemplates, setClientTemplates] = useState<ClientTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ text: string; tts: string; type: string } | null>(null);

  // Agent voice config
  const [agentConfig, setAgentConfig] = useState({
    dingDongUrl: '' as string | null,
    messageH130Text: 'Embarquement pour {destination} à {heure}. Contact agent: {agentPhone}.',
    messageH5Text: 'Embarquement imminent pour {destination}. Quai {platform}.',
    messageDepartText: 'Le bus pour {destination} part maintenant. Bon voyage.',
    messageAbsentText: 'Le bus pour {destination} va partir. Présentez-vous au quai {platform}.',
  });
  const [savingAgent, setSavingAgent] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  const fetchClientTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/busgo/notification-templates', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      setClientTemplates(data.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAgentConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/busgo/voix', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      if (data.data) {
        setAgentConfig({
          dingDongUrl: data.data.dingDongUrl || null,
          messageH130Text: data.data.messageH130Text || agentConfig.messageH130Text,
          messageH5Text: data.data.messageH5Text || agentConfig.messageH5Text,
          messageDepartText: data.data.messageDepartText || agentConfig.messageDepartText,
          messageAbsentText: data.data.messageAbsentText || agentConfig.messageAbsentText,
        });
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchClientTemplates();
    fetchAgentConfig();
  }, [fetchClientTemplates, fetchAgentConfig]);

  // ─── Client template handlers ────────────────────────────
  const handleSaveClient = async (template: ClientTemplate) => {
    setSaving(template.id);
    try {
      await fetch('/api/busgo/notification-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: template.id,
          textTemplate: template.textTemplate,
          ttsTemplate: template.ttsTemplate,
          isActive: template.isActive,
        }),
      });
      toast.success('Template client enregistré !');
    } catch {
      toast.error('Erreur');
    } finally {
      setSaving(null);
    }
  };

  const handleToggleClient = (template: ClientTemplate) => {
    const updated = { ...template, isActive: !template.isActive };
    setClientTemplates(clientTemplates.map(t => t.id === template.id ? updated : t));
    handleSaveClient(updated);
  };

  const handlePreviewClient = (template: ClientTemplate) => {
    const sampleVars: Record<string, string> = {
      '{passenger_name}': 'Mamadou Diallo',
      '{company_name}': 'Dakar Express',
      '{departure_city}': 'Dakar',
      '{arrival_city}': 'Saint-Louis',
      '{date}': '25/06/2026',
      '{time}': '08:00',
      '{platform}': 'A1',
      '{ticket_number}': '12365',
    };
    let text = template.textTemplate;
    let tts = template.ttsTemplate;
    for (const [key, val] of Object.entries(sampleVars)) {
      text = text.replaceAll(key, val);
      tts = tts.replaceAll(key, val);
    }
    setPreview({ text, tts, type: template.notificationType });
  };

  const playTTS = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'fr-FR';
      u.rate = 0.9;
      window.speechSynthesis.speak(u);
      toast.success('Lecture TTS...');
    } else {
      toast.error('TTS non disponible');
    }
  };

  // ─── Agent config handlers ───────────────────────────────
  const handleSaveAgent = async () => {
    setSavingAgent(true);
    try {
      await fetch('/api/busgo/voix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(agentConfig),
      });
      toast.success('Configuration agent enregistrée !');
    } catch {
      toast.error('Erreur');
    } finally {
      setSavingAgent(false);
    }
  };

  const handleUpload = async (field: string, file: File) => {
    setUploading(field);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/busgo/upload', { method: 'POST', body: formData, credentials: 'include' });
      if (!res.ok) throw new Error('Erreur upload');
      const data = await res.json();
      setAgentConfig({ ...agentConfig, [field]: data.url });
      toast.success(`${file.name} uploadé !`);
    } catch {
      toast.error('Erreur upload');
    } finally {
      setUploading(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-amber-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Voix & Annonces</h1>
        <p className="text-muted-foreground">Configurez les notifications envoyées aux passagers et les alertes agent.</p>
      </div>

      {/* Variables info */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 rounded-lg p-3 text-sm">
        <p className="font-medium text-amber-800 dark:text-amber-300 mb-1">Variables disponibles :</p>
        <code className="text-xs text-amber-700 dark:text-amber-400">{VARIABLES}</code>
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* SECTION A: NOTIFICATIONS CLIENT (PWA Passager)        */}
      {/* ═══════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Smartphone className="h-5 w-5 text-amber-600" />
          <h2 className="text-lg font-bold">📱 Notifications Client (PWA Passager)</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Ces messages sont envoyés automatiquement au passager selon la timeline.
          Chaque type peut être activé/désactivé et personnalisé.
        </p>

        {/* Timeline summary */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mb-4">
          <div className="grid grid-cols-5 gap-2 text-center text-xs">
            <div><Badge variant="outline" className="text-emerald-600">Achat</Badge></div>
            <div><Badge variant="outline" className="text-blue-600">H-1h</Badge></div>
            <div><Badge variant="outline" className="text-amber-600">H-45min</Badge></div>
            <div><Badge variant="outline" className="text-orange-600">H-30min</Badge></div>
            <div><Badge variant="outline" className="text-rose-600">H-5min</Badge></div>
          </div>
        </div>

        {/* Templates */}
        <div className="space-y-3">
          {clientTemplates.map((template) => {
            const info = TYPE_INFO[template.notificationType] || { label: template.notificationType, icon: Bell, color: 'text-gray-600', delay: '—', recipient: 'Passager' };
            const Icon = info.icon;
            return (
              <Card key={template.id} className={!template.isActive ? 'opacity-60' : ''}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${info.color}`} />
                      {info.label}
                      <Badge variant="outline" className="text-xs ml-2">{info.delay}</Badge>
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handlePreviewClient(template)}>
                        <Eye className="h-3 w-3 mr-1" /> Aperçu
                      </Button>
                      <Switch checked={template.isActive} onCheckedChange={() => handleToggleClient(template)} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">📩 Texte affiché (notification push)</Label>
                    <Textarea
                      value={template.textTemplate}
                      onChange={(e) => setClientTemplates(clientTemplates.map(t => t.id === template.id ? { ...t, textTemplate: e.target.value } : t))}
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">🔊 Message vocal (TTS — si écran déverrouillé)</Label>
                    <Textarea
                      value={template.ttsTemplate}
                      onChange={(e) => setClientTemplates(clientTemplates.map(t => t.id === template.id ? { ...t, ttsTemplate: e.target.value } : t))}
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => playTTS(template.ttsTemplate)}>
                      <Volume2 className="h-3 w-3 mr-1" /> Écouter TTS
                    </Button>
                    <Button size="sm" onClick={() => handleSaveClient(template)} disabled={saving === template.id} className="bg-amber-600 hover:bg-amber-700">
                      {saving === template.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                      Enregistrer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* SECTION B: ALERTES AGENT (PWA Agent)                   */}
      {/* ═══════════════════════════════════════════════════ */}
      <div className="pt-6 border-t">
        <div className="flex items-center gap-2 mb-3">
          <Bus className="h-5 w-5 text-amber-600" />
          <h2 className="text-lg font-bold">🚐 Alertes Agent (PWA Agent)</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Ces messages sont annoncés vocalement sur le téléphone de l'agent pendant l'embarquement.
        </p>

        {/* Ding-dong */}
        <Card className="mb-3">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Music className="h-4 w-4 text-amber-600" />
              🔔 Ding-dong (joué avant chaque message agent)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {agentConfig.dingDongUrl ? (
              <div className="flex items-center gap-3">
                <audio controls src={agentConfig.dingDongUrl} className="h-8" />
                <Button variant="outline" size="sm" onClick={() => setAgentConfig({ ...agentConfig, dingDongUrl: null })}>Supprimer</Button>
              </div>
            ) : (
              <Label className="cursor-pointer">
                <div className="border-2 border-dashed border-amber-200 rounded-lg p-4 text-center hover:bg-amber-50">
                  {uploading === 'dingDongUrl' ? <p className="text-sm text-amber-600">Upload...</p> : (
                    <>
                      <Upload className="h-6 w-6 text-amber-600 mx-auto mb-1" />
                      <p className="text-sm">Upload MP3 (max 10MB)</p>
                    </>
                  )}
                </div>
                <Input type="file" accept="audio/mp3,audio/mpeg" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload('dingDongUrl', e.target.files[0])} />
              </Label>
            )}
          </CardContent>
        </Card>

        {/* Agent message templates */}
        <Card className="mb-3">
          <CardHeader><CardTitle className="text-sm">Messages agent (TTS)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">H-1h30: Annonce d'embarquement</Label>
              <Textarea value={agentConfig.messageH130Text} onChange={(e) => setAgentConfig({ ...agentConfig, messageH130Text: e.target.value })} rows={2} className="text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">H-5min: Embarquement imminent</Label>
              <Textarea value={agentConfig.messageH5Text} onChange={(e) => setAgentConfig({ ...agentConfig, messageH5Text: e.target.value })} rows={2} className="text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">H-0: Départ confirmé</Label>
              <Textarea value={agentConfig.messageDepartText} onChange={(e) => setAgentConfig({ ...agentConfig, messageDepartText: e.target.value })} rows={2} className="text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Rappel absent</Label>
              <Textarea value={agentConfig.messageAbsentText} onChange={(e) => setAgentConfig({ ...agentConfig, messageAbsentText: e.target.value })} rows={2} className="text-sm" />
            </div>
            <Button onClick={handleSaveAgent} disabled={savingAgent} className="w-full bg-amber-600 hover:bg-amber-700">
              {savingAgent ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Enregistrer les messages agent
            </Button>
          </CardContent>
        </Card>

        {/* VocalSettingsPanel (sliders + toggles) */}
        <VocalSettingsPanel />
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* PREVIEW DIALOG                                        */}
      {/* ═══════════════════════════════════════════════════ */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {preview && TYPE_INFO[preview.type] && (() => {
                const Icon = TYPE_INFO[preview.type].icon;
                return <Icon className={`h-4 w-4 ${TYPE_INFO[preview.type].color}`} />;
              })()}
              Aperçu notification client
            </DialogTitle>
            <DialogDescription>Ainsi le passager recevra le message (variables remplacées).</DialogDescription>
          </DialogHeader>
          {preview && (
            <div className="space-y-4">
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">📩 Texte affiché</p>
                <p className="text-sm">{preview.text}</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">🔊 Message vocal (TTS)</p>
                <p className="text-sm italic">{preview.tts}</p>
              </div>
              <Button className="w-full" variant="outline" onClick={() => playTTS(preview.tts)}>
                <Volume2 className="h-4 w-4 mr-2" /> Écouter le TTS
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
