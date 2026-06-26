'use client';

/**
 * VocalSettingsPanel — UI pour configurer les alertes vocales de l'agent.
 *
 * Permet de:
 *   - Activer/désactiver les alertes vocales globalement
 *   - Régler le volume et la vitesse via des sliders
 *   - Cocher/décocher chaque type d'alerte individuellement
 *   - Activer "Forcer le son même en mode silencieux" (AudioContext)
 *   - Bouton "Tester" pour entendre un exemple
 */

import {
  Volume2, VolumeX, Bell, BellOff, AlertTriangle, Clock, MessageCircle,
  CheckCircle2, Zap, Smartphone,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { useVocalAlerts } from '@/hooks/use-vocal-alerts';

export function VocalSettingsPanel() {
  const {
    config,
    ttsAvailable,
    toggleEnabled,
    toggleAlert,
    toggleForceSound,
    updateConfig,
    testVoice,
  } = useVocalAlerts();

  const alertItems = [
    { key: 'passagerManquant' as const, label: 'Passager manquant', icon: AlertTriangle, color: 'text-rose-600' },
    { key: 'timer5min' as const, label: 'Timer 5 minutes', icon: Clock, color: 'text-amber-600' },
    { key: 'timer2min' as const, label: 'Timer 2 minutes (dernier appel)', icon: Bell, color: 'text-orange-600' },
    { key: 'messageRetard' as const, label: 'Message de retard client', icon: MessageCircle, color: 'text-blue-600' },
    { key: 'departConfirme' as const, label: 'Départ confirmé', icon: CheckCircle2, color: 'text-emerald-600' },
  ];

  return (
    <div className="space-y-4">
      {/* TTS availability warning */}
      {!ttsAvailable && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>⚠️ Synthèse vocale non disponible sur cet appareil. Les alertes seront visuelles uniquement.</span>
        </div>
      )}

      {/* Main toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            {config.enabled ? (
              <Volume2 className="h-5 w-5 text-amber-600" />
            ) : (
              <VolumeX className="h-5 w-5 text-muted-foreground" />
            )}
            Alertes vocales
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Alertes vocales activées</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Active ou désactive toutes les annonces TTS
              </p>
            </div>
            <Switch checked={config.enabled} onCheckedChange={toggleEnabled} />
          </div>

          {/* Volume */}
          <div className="space-y-2">
            <Label>Volume : {Math.round(config.volume * 100)}%</Label>
            <Slider
              value={[config.volume * 100]}
              onValueChange={(v) => updateConfig({ volume: v[0] / 100 })}
              min={0}
              max={100}
              step={5}
              disabled={!config.enabled}
            />
          </div>

          {/* Speed */}
          <div className="space-y-2">
            <Label>Vitesse : {config.speed.toFixed(1)}x</Label>
            <Slider
              value={[config.speed * 10]}
              onValueChange={(v) => updateConfig({ speed: v[0] / 10 })}
              min={5}
              max={20}
              step={1}
              disabled={!config.enabled}
            />
            <p className="text-xs text-muted-foreground">0.9x = légèrement plus lent (recommandé en environnement bruyant)</p>
          </div>

          {/* Test button */}
          <Button
            variant="outline"
            className="w-full"
            onClick={testVoice}
            disabled={!config.enabled || !ttsAvailable}
          >
            <Bell className="h-4 w-4 mr-2" />
            Tester les annonces
          </Button>
        </CardContent>
      </Card>

      {/* Force sound */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-violet-600" />
              <div>
                <Label>Forcer le son même en mode silencieux</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Utilise AudioContext pour contourner le mute système (nécessite une interaction préalable)
                </p>
              </div>
            </div>
            <Switch checked={config.forceSound} onCheckedChange={toggleForceSound} />
          </div>
        </CardContent>
      </Card>

      {/* Alert types */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Types d&apos;alertes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {alertItems.map((item) => {
            const Icon = item.icon;
            const isEnabled = config.alerts[item.key];
            return (
              <div key={item.key} className="flex items-center justify-between border-b pb-2 last:border-0">
                <div className="flex items-center gap-3">
                  <Icon className={`h-4 w-4 ${item.color}`} />
                  <Label className="text-sm">{item.label}</Label>
                </div>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={() => toggleAlert(item.key)}
                  disabled={!config.enabled}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Info */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm space-y-1">
        <p className="font-medium text-amber-800 dark:text-amber-300">ℹ️ Comment ça marche</p>
        <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-1">
          <li>• Les alertes vocales (TTS) nécessitent que la PWA soit ouverte ou en arrière-plan actif</li>
          <li>• Le TTS ne fonctionne pas quand le téléphone est verrouillé</li>
          <li>• Les notifications push (sonnerie + vibration) fonctionnent toujours, même écran verrouillé</li>
          <li>• Avant chaque nouvelle annonce, la précédente est automatiquement annulée</li>
        </ul>
      </div>
    </div>
  );
}
