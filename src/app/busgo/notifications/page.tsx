'use client';

/**
 * BusGo Notifications — Gestion des templates de notification.
 *
 * Le transporteur peut:
 *   - Voir les 5 templates (achat, 1h, 45min, 30min, 5min)
 *   - Modifier le texte et le TTS de chaque template
 *   - Activer/désactiver chaque type
 *   - Prévisualiser le rendu avec variables remplacées
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Bell, Save, Loader2, Eye, Volume2, MessageSquare, CheckCircle2,
  Clock, AlertTriangle, Bus, ShoppingBag,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface Template {
  id: string;
  notificationType: string;
  textTemplate: string;
  ttsTemplate: string;
  isActive: boolean;
}

const TYPE_INFO: Record<string, { label: string; icon: typeof Bell; color: string; delay: string }> = {
  purchase_confirm: { label: 'Confirmation achat', icon: ShoppingBag, color: 'text-emerald-600', delay: 'Immédiat' },
  reminder_1h:      { label: 'Rappel 1h avant', icon: Clock, color: 'text-blue-600', delay: 'H-1h00' },
  bags_45min:       { label: 'Alerte bagages', icon: AlertTriangle, color: 'text-amber-600', delay: 'H-0h45' },
  boarding_30min:   { label: 'Dernier appel', icon: Bell, color: 'text-orange-600', delay: 'H-0h30' },
  departure_5min:   { label: 'Départ imminent', icon: Bus, color: 'text-rose-600', delay: 'H-0h05' },
};

const VARIABLES = '{passenger_name} {company_name} {departure_city} {arrival_city} {date} {time} {platform} {ticket_number}';

export default function BusGoNotificationsPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ text: string; tts: string } | null>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/busgo/notification-templates', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      setTemplates(data.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const handleSave = async (template: Template) => {
    setSaving(template.id);
    try {
      const res = await fetch('/api/busgo/notification-templates', {
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
      if (!res.ok) throw new Error('Erreur');
      toast.success('Template enregistré !');
    } catch {
      toast.error('Erreur');
    } finally {
      setSaving(null);
    }
  };

  const handleToggle = async (template: Template) => {
    const updated = { ...template, isActive: !template.isActive };
    setTemplates(templates.map(t => t.id === template.id ? updated : t));
    handleSave(updated);
  };

  const handlePreview = (template: Template) => {
    // Replace variables with sample data for preview
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
    for (const [key, value] of Object.entries(sampleVars)) {
      text = text.replaceAll(key, value);
      tts = tts.replaceAll(key, value);
    }
    setPreview({ text, tts });
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-amber-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground">Personnalisez les messages envoyés aux passagers.</p>
      </div>

      {/* Variables info */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 rounded-lg p-3 text-sm">
        <p className="font-medium text-amber-800 dark:text-amber-300 mb-1">Variables disponibles :</p>
        <code className="text-xs text-amber-700 dark:text-amber-400">{VARIABLES}</code>
      </div>

      {/* Templates list */}
      {templates.map((template) => {
        const info = TYPE_INFO[template.notificationType] || { label: template.notificationType, icon: Bell, color: 'text-gray-600', delay: '—' };
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
                  <Button variant="ghost" size="sm" onClick={() => handlePreview(template)}>
                    <Eye className="h-3 w-3 mr-1" /> Aperçu
                  </Button>
                  <Switch checked={template.isActive} onCheckedChange={() => handleToggle(template)} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" /> Texte de la notification
                </Label>
                <Textarea
                  value={template.textTemplate}
                  onChange={(e) => setTemplates(templates.map(t => t.id === template.id ? { ...t, textTemplate: e.target.value } : t))}
                  rows={3}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1">
                  <Volume2 className="h-3 w-3" /> Message vocal (TTS)
                </Label>
                <Textarea
                  value={template.ttsTemplate}
                  onChange={(e) => setTemplates(templates.map(t => t.id === template.id ? { ...t, ttsTemplate: e.target.value } : t))}
                  rows={3}
                  className="text-sm"
                />
              </div>
              <Button
                size="sm"
                onClick={() => handleSave(template)}
                disabled={saving === template.id}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {saving === template.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                Enregistrer
              </Button>
            </CardContent>
          </Card>
        );
      })}

      {/* Preview dialog */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aperçu de la notification</DialogTitle>
            <DialogDescription>Ainsi le passager recevra le message (avec variables remplacées).</DialogDescription>
          </DialogHeader>
          {preview && (
            <div className="space-y-4">
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1 flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" /> Texte affiché
                </p>
                <p className="text-sm">{preview.text}</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-1 flex items-center gap-1">
                  <Volume2 className="h-3 w-3" /> Message vocal (TTS)
                </p>
                <p className="text-sm italic">{preview.tts}</p>
              </div>
              <Button
                className="w-full"
                variant="outline"
                onClick={() => {
                  if ('speechSynthesis' in window) {
                    window.speechSynthesis.cancel();
                    const u = new SpeechSynthesisUtterance(preview.tts);
                    u.lang = 'fr-FR';
                    u.rate = 0.9;
                    window.speechSynthesis.speak(u);
                    toast.success('Lecture TTS...');
                  } else {
                    toast.error('TTS non disponible');
                  }
                }}
              >
                <Volume2 className="h-4 w-4 mr-2" /> Écouter le TTS
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
