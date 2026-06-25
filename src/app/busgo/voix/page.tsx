'use client';

/**
 * BusGo Voix — Configuration des annonces vocales.
 *
 * Le transporteur configure:
 *   - Ding-dong MP3 (joué avant chaque message)
 *   - Message H-1h30 (texte TTS OU MP3 uploadé)
 *   - Message H-5min (texte TTS OU MP3 uploadé)
 *   - Message départ (texte TTS OU MP3 uploadé)
 *   - Message rappel absent (texte TTS OU MP3 uploadé)
 *
 * Variables disponibles dans les textes TTS:
 *   {destination} {heure} {platform} {agentPhone} {agentName}
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Volume2, Bell, Save, Loader2, Upload, Music, Phone, User,
  CheckCircle2, AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface VoiceConfig {
  id?: string;
  dingDongUrl: string | null;
  messageH130Text: string | null;
  messageH130AudioUrl: string | null;
  messageH5Text: string | null;
  messageH5AudioUrl: string | null;
  messageDepartText: string | null;
  messageDepartAudioUrl: string | null;
  messageAbsentText: string | null;
  messageAbsentAudioUrl: string | null;
}

const DEFAULT_CONFIG: VoiceConfig = {
  dingDongUrl: null,
  messageH130Text: 'Embarquement pour {destination} à {heure}. En cas de retard, contactez l\'agent au {agentPhone}.',
  messageH130AudioUrl: null,
  messageH5Text: 'Embarquement imminent pour {destination}. Veuillez vous présenter au quai {platform}.',
  messageH5AudioUrl: null,
  messageDepartText: 'Le bus pour {destination} part maintenant. Bon voyage.',
  messageDepartAudioUrl: null,
  messageAbsentText: 'Le bus pour {destination} va partir dans quelques minutes. Présentez-vous immédiatement au quai {platform}.',
  messageAbsentAudioUrl: null,
};

export default function BusGoVoixPage() {
  const [config, setConfig] = useState<VoiceConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/busgo/voix', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      if (data.data) {
        setConfig({ ...DEFAULT_CONFIG, ...data.data });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/busgo/voix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error('Erreur');
      toast.success('Configuration vocale enregistrée');
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (field: keyof VoiceConfig, file: File) => {
    // For now, we'll use a placeholder URL — in production, upload to /api/upload
    toast.info(`Upload de ${file.name} (${Math.round(file.size / 1024)}KB)...`);

    // Create a temporary URL for the file (in production, upload to server/CDN)
    const url = URL.createObjectURL(file);
    setConfig({ ...config, [field]: url });
    toast.success(`${file.name} chargé. Cliquez sur "Enregistrer" pour sauvegarder.`);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Voix & Annonces</h1>
          <p className="text-muted-foreground">Configurez les messages vocaux envoyés aux passagers.</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-amber-600 hover:bg-amber-700">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Enregistrer
        </Button>
      </div>

      {/* Variables info */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm">
        <p className="font-medium text-amber-800 dark:text-amber-300 mb-1">Variables disponibles dans les textes TTS :</p>
        <code className="text-xs text-amber-700 dark:text-amber-400">
          {'{destination}'} · {'{heure}'} · {'{platform}'} · {'{agentPhone}'} · {'{agentName}'}
        </code>
      </div>

      {/* Ding-dong */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Music className="h-4 w-4 text-amber-600" />
            🔔 Ding-dong (joué avant chaque message)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {config.dingDongUrl ? (
            <div className="flex items-center gap-3">
              <audio controls src={config.dingDongUrl} className="h-8" />
              <Button variant="outline" size="sm" onClick={() => setConfig({ ...config, dingDongUrl: null })}>
                Supprimer
              </Button>
            </div>
          ) : (
            <Label htmlFor="dingDong" className="cursor-pointer">
              <div className="border-2 border-dashed border-amber-200 rounded-lg p-4 text-center hover:bg-amber-50 transition-colors">
                <Upload className="h-6 w-6 text-amber-600 mx-auto mb-1" />
                <p className="text-sm">Upload MP3 du ding-dong</p>
              </div>
              <Input
                id="dingDong"
                type="file"
                accept="audio/mp3,audio/mpeg"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleUpload('dingDongUrl', e.target.files[0])}
              />
            </Label>
          )}
        </CardContent>
      </Card>

      {/* Message H-1h30 */}
      <MessageEditor
        title="📢 Message H-1h30"
        description="Envoyé 1h30 avant le départ. Doit inclure le numéro de l'agent."
        text={config.messageH130Text}
        audioUrl={config.messageH130AudioUrl}
        onTextChange={(v) => setConfig({ ...config, messageH130Text: v })}
        onAudioChange={(v) => setConfig({ ...config, messageH130AudioUrl: v })}
      />

      {/* Message H-5min */}
      <MessageEditor
        title="📢 Message H-5min"
        description="Envoyé 5 minutes avant le départ."
        text={config.messageH5Text}
        audioUrl={config.messageH5AudioUrl}
        onTextChange={(v) => setConfig({ ...config, messageH5Text: v })}
        onAudioChange={(v) => setConfig({ ...config, messageH5AudioUrl: v })}
      />

      {/* Message départ */}
      <MessageEditor
        title="🚀 Message départ (H-0)"
        description="Envoyé à l'heure du départ, accompagné du ding-dong."
        text={config.messageDepartText}
        audioUrl={config.messageDepartAudioUrl}
        onTextChange={(v) => setConfig({ ...config, messageDepartText: v })}
        onAudioChange={(v) => setConfig({ ...config, messageDepartAudioUrl: v })}
      />

      {/* Message rappel absent */}
      <MessageEditor
        title="📞 Message rappel absent"
        description="Envoyé aux passagers qui n'ont pas embarqué au départ."
        text={config.messageAbsentText}
        audioUrl={config.messageAbsentAudioUrl}
        onTextChange={(v) => setConfig({ ...config, messageAbsentText: v })}
        onAudioChange={(v) => setConfig({ ...config, messageAbsentAudioUrl: v })}
      />

      {/* Save button bottom */}
      <Button onClick={handleSave} disabled={saving} className="w-full bg-amber-600 hover:bg-amber-700">
        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
        Enregistrer la configuration
      </Button>
    </div>
  );
}

// ─── Message Editor Component ─────────────────────────────────
function MessageEditor({
  title, description, text, audioUrl, onTextChange, onAudioChange,
}: {
  title: string;
  description: string;
  text: string | null;
  audioUrl: string | null;
  onTextChange: (v: string) => void;
  onAudioChange: (v: string | null) => void;
}) {
  const [mode, setMode] = useState<'text' | 'audio'>(audioUrl ? 'audio' : 'text');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Mode selector */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={mode === 'text' ? 'default' : 'outline'}
            onClick={() => setMode('text')}
            className={mode === 'text' ? 'bg-amber-600' : ''}
          >
            Texte TTS
          </Button>
          <Button
            size="sm"
            variant={mode === 'audio' ? 'default' : 'outline'}
            onClick={() => setMode('audio')}
            className={mode === 'audio' ? 'bg-amber-600' : ''}
          >
            MP3 uploadé
          </Button>
        </div>

        {mode === 'text' ? (
          <div className="space-y-2">
            <Label>Texte à lire (TTS)</Label>
            <Textarea
              value={text || ''}
              onChange={(e) => onTextChange(e.target.value)}
              rows={3}
              placeholder="Ex: Embarquement pour {destination} à {heure}..."
            />
          </div>
        ) : (
          <div>
            {audioUrl ? (
              <div className="flex items-center gap-3">
                <audio controls src={audioUrl} className="h-8" />
                <Button variant="outline" size="sm" onClick={() => onAudioChange(null)}>
                  Supprimer
                </Button>
              </div>
            ) : (
              <Label className="cursor-pointer">
                <div className="border-2 border-dashed border-amber-200 rounded-lg p-4 text-center hover:bg-amber-50">
                  <Upload className="h-6 w-6 text-amber-600 mx-auto mb-1" />
                  <p className="text-sm">Upload MP3</p>
                </div>
                <Input
                  type="file"
                  accept="audio/mp3,audio/mpeg"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onAudioChange(URL.createObjectURL(file));
                  }}
                />
              </Label>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
