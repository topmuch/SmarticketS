'use client';

import { useState } from 'react';
import { Volume2, VolumeX, Bell, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { useAgentVocalAlerts } from '@/hooks/use-agent-vocal-alerts';
import { toast } from 'sonner';

export default function BusGoVoixPage() {
  const { config, toggleEnabled, toggleMuted, setVolume, announceCustom } = useAgentVocalAlerts();

  const handleTest = () => {
    announceCustom('Test des annonces vocales BusGo. Le système fonctionne correctement.', 'normal');
    toast.success('Annonce de test envoyée');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Voix & Annonces</h1>
        <p className="text-muted-foreground">Configurez les annonces vocales automatiques.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-amber-600" />
            Configuration générale
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Annonces vocales activées</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Active ou désactive toutes les annonces TTS
              </p>
            </div>
            <Switch checked={config.enabled} onCheckedChange={toggleEnabled} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Annonces automatiques</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Annoncer automatiquement les événements (embarquement, retards, etc.)
              </p>
            </div>
            <Switch checked={config.autoTTS} onCheckedChange={(v) => { /* TODO: add updateConfig for autoTTS */ }} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Son activé</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Couper ou réactiver le son immédiatement
              </p>
            </div>
            <Button variant="outline" size="icon" onClick={toggleMuted}>
              {config.muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Volume : {Math.round(config.volume * 100)}%</Label>
            <Slider
              value={[config.volume * 100]}
              onValueChange={(v) => setVolume(v[0] / 100)}
              max={100}
              step={5}
            />
          </div>

          <Button variant="outline" className="w-full" onClick={handleTest}>
            <Bell className="h-4 w-4 mr-2" />
            Tester les annonces
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Types d&apos;annonces</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between border-b pb-2">
            <span>🔔 Embarquement (T-15min)</span>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between border-b pb-2">
            <span>⚠️ Imminent (T-5min)</span>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between border-b pb-2">
            <span>🚨 Dernier appel (T-2min)</span>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between border-b pb-2">
            <span>📞 Passager manquant</span>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <span>⏰ Retard signalé</span>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
