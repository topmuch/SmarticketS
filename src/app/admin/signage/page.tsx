'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import {
  Monitor,
  Save,
  Plus,
  Trash2,
  Volume2,
  VolumeX,
  AlertCircle,
  Palette,
  Bell,
  Megaphone,
  ExternalLink,
  Loader2,
  Upload,
} from 'lucide-react';

import { io, Socket } from 'socket.io-client';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TickerMessage {
  id: string;
  text: string;
  priority: 'info' | 'urgent';
  active: boolean;
}

interface SignageSettings {
  stationName: string;
  alertThresholdMinutes: number;
  alertSoundEnabled: boolean;
  tickerMessages: TickerMessage[];
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  volume: number;
  muted: boolean;
  customAudioUrl: string;
  customAudioName: string;
  generalMessage: string;
  generalMessageEnabled: boolean;
  generalMessageFrequency: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
};

const emptyMessage = (): TickerMessage => ({
  id: crypto.randomUUID(),
  text: '',
  priority: 'info',
  active: true,
});

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function SignageSettingsPage() {
  const [settings, setSettings] = useState<SignageSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initialLoadFailed, setInitialLoadFailed] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const [selectedAudioFile, setSelectedAudioFile] = useState<{ name: string; size: number } | null>(null);

  /* ---- fetch settings ---- */
  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/signage/settings');
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const data = await res.json();
      setSettings(data.settings);
      setInitialLoadFailed(false);
    } catch {
      setInitialLoadFailed(true);
      toast.error('Impossible de charger les paramètres');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  /* ---- WebSocket connection (kiosk-service port 3004) ---- */
  useEffect(() => {
    const socket = io('/?XTransformPort=3004');
    socketRef.current = socket;
    return () => {
      socket.disconnect();
    };
  }, []);

  /* ---- helpers to update nested state ---- */
  const patch = <K extends keyof SignageSettings>(
    key: K,
    value: SignageSettings[K],
  ) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const patchTicker = (id: string, field: keyof TickerMessage, value: string | boolean) => {
    setSettings((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        tickerMessages: prev.tickerMessages.map((m) =>
          m.id === id ? { ...m, [field]: value } : m,
        ),
      };
    });
  };

  const addTickerMessage = () => {
    setSettings((prev) => {
      if (!prev || prev.tickerMessages.length >= 5) return prev;
      return { ...prev, tickerMessages: [...prev.tickerMessages, emptyMessage()] };
    });
  };

  const removeTickerMessage = (id: string) => {
    setSettings((prev) => {
      if (!prev) return prev;
      return { ...prev, tickerMessages: prev.tickerMessages.filter((m) => m.id !== id) };
    });
  };

  /* ---- audio & volume handlers ---- */
  const handleVolumeChange = (percent: number) => {
    patch('volume', percent);
    socketRef.current?.emit('kiosk:config', { volume: percent / 100, stationSlug: '*' });
  };

  const handleMuteToggle = () => {
    if (!settings) return;
    const newMuted = !settings.muted;
    patch('muted', newMuted);
    socketRef.current?.emit('kiosk:config', { muted: newMuted, stationSlug: '*' });
  };

  const handleSendAudio = () => {
    if (!settings || !selectedAudioFile) return;
    const audioUrl = `/audio/custom/${selectedAudioFile.name}`;
    patch('customAudioUrl', audioUrl);
    patch('customAudioName', selectedAudioFile.name);
    socketRef.current?.emit('kiosk:config', { customAudioUrl: audioUrl, stationSlug: '*' });
    toast.success('Audio envoyé au kiosk');
  };

  /* ---- save ---- */
  const handleSave = async () => {
    if (!settings) return;
    try {
      setSaving(true);
      const res = await fetch('/api/admin/signage/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      toast.success('Paramètres enregistrés avec succès');

      // Push config to kiosk via WebSocket
      socketRef.current?.emit('kiosk:config', {
        volume: settings.volume / 100,
        muted: settings.muted,
        stationSlug: '*',
      });

      // Push general message if enabled
      if (settings.generalMessageEnabled && settings.generalMessage) {
        socketRef.current?.emit('kiosk:generalMessage', {
          text: settings.generalMessage,
          priority: 1,
          stationSlug: '*',
        });
        socketRef.current?.emit('kiosk:config', {
          generalMessage: settings.generalMessage,
          generalMessageInterval: settings.generalMessageFrequency,
          stationSlug: '*',
        });
      }
    } catch {
      toast.error("Une erreur est survenue lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  /* ================================================================ */
  /*  Loading skeleton                                                 */
  /* ================================================================ */
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* header skeleton */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="h-8 w-72 rounded bg-muted" />
            <div className="mt-2 h-4 w-96 rounded bg-muted" />
          </div>
          <div className="h-10 w-36 rounded-lg bg-muted" />
        </div>

        {/* card skeleton */}
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-border/50 bg-card p-6 dark:border-border/30"
          >
            <div className="h-6 w-48 rounded bg-muted" />
            <div className="mt-6 space-y-4">
              <div className="h-10 w-full rounded bg-muted" />
              <div className="h-10 w-3/4 rounded bg-muted" />
            </div>
          </div>
        ))}

        {/* save skeleton */}
        <div className="h-12 w-full rounded-lg bg-muted" />
      </div>
    );
  }

  /* ================================================================ */
  /*  Error state                                                      */
  /* ================================================================ */
  if (initialLoadFailed || !settings) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg font-medium text-foreground">Impossible de charger les paramètres</p>
        <button
          type="button"
          onClick={fetchSettings}
          className="mt-2 rounded-lg bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
        >
          Réessayer
        </button>
      </div>
    );
  }

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */
  return (
    <div className="space-y-6">
      {/* ---------- HEADER ---------- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            <Monitor className="mr-2 inline-block h-7 w-7 text-emerald-600" />
            Configuration Affichage Gare
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Personnalisez l&apos;affichage des départs en temps réel
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            const w = window.open('/signage', '_blank');
            if (w) w.focus();
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground dark:border-border/50"
        >
          <ExternalLink className="h-4 w-4" />
          Prévisualiser
        </button>
      </div>

      {/* ---------- SECTION 1 — Identité ---------- */}
      <section className="rounded-xl border border-border/50 bg-card p-5 shadow-sm sm:p-6 dark:border-border/30">
        <div className="mb-5 flex items-center gap-2">
          <Palette className="h-5 w-5 text-emerald-600" />
          <h2 className="text-lg font-semibold text-foreground">Identité de la gare</h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {/* stationName */}
          <div className="sm:col-span-2">
            <label htmlFor="stationName" className="mb-1.5 block text-sm font-medium text-foreground">
              Nom de la station
            </label>
            <input
              id="stationName"
              type="text"
              value={settings.stationName}
              onChange={(e) => patch('stationName', e.target.value)}
              placeholder="Ex: Gare Routière"
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors dark:border-border/50"
            />
          </div>

          {/* logoUrl */}
          <div className="sm:col-span-2">
            <label htmlFor="logoUrl" className="mb-1.5 block text-sm font-medium text-foreground">
              URL du logo
            </label>
            <input
              id="logoUrl"
              type="url"
              value={settings.logoUrl}
              onChange={(e) => patch('logoUrl', e.target.value)}
              placeholder="https://example.com/logo.png"
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors dark:border-border/50"
            />
          </div>

          {/* primaryColor */}
          <div>
            <label htmlFor="primaryColor" className="mb-1.5 block text-sm font-medium text-foreground">
              Couleur principale
            </label>
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-14 shrink-0 overflow-hidden rounded-lg border border-input shadow-sm dark:border-border/50">
                <input
                  id="primaryColor"
                  type="color"
                  value={settings.primaryColor}
                  onChange={(e) => patch('primaryColor', e.target.value)}
                  className="absolute inset-0 h-full w-full cursor-pointer"
                />
              </div>
              <span className="rounded-md bg-muted px-3 py-2 text-sm font-mono text-foreground">
                {settings.primaryColor}
              </span>
              {/* live preview swatch */}
              <span
                className="ml-auto h-8 w-8 shrink-0 rounded-full border border-border/50 shadow-sm"
                style={{ backgroundColor: settings.primaryColor }}
                aria-label={`Aperçu couleur: ${settings.primaryColor}`}
              />
            </div>
          </div>

          {/* secondaryColor */}
          <div>
            <label htmlFor="secondaryColor" className="mb-1.5 block text-sm font-medium text-foreground">
              Couleur secondaire
            </label>
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-14 shrink-0 overflow-hidden rounded-lg border border-input shadow-sm dark:border-border/50">
                <input
                  id="secondaryColor"
                  type="color"
                  value={settings.secondaryColor}
                  onChange={(e) => patch('secondaryColor', e.target.value)}
                  className="absolute inset-0 h-full w-full cursor-pointer"
                />
              </div>
              <span className="rounded-md bg-muted px-3 py-2 text-sm font-mono text-foreground">
                {settings.secondaryColor}
              </span>
              <span
                className="ml-auto h-8 w-8 shrink-0 rounded-full border border-border/50 shadow-sm"
                style={{ backgroundColor: settings.secondaryColor }}
                aria-label={`Aperçu couleur: ${settings.secondaryColor}`}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ---------- SECTION 2 — Alertes ---------- */}
      <section className="rounded-xl border border-border/50 bg-card p-5 shadow-sm sm:p-6 dark:border-border/30">
        <div className="mb-5 flex items-center gap-2">
          <Bell className="h-5 w-5 text-emerald-600" />
          <h2 className="text-lg font-semibold text-foreground">Alertes embarquement</h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {/* alertThresholdMinutes */}
          <div>
            <label
              htmlFor="alertThresholdMinutes"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              Seuil d&apos;alerte (minutes)
            </label>
            <input
              id="alertThresholdMinutes"
              type="number"
              min={1}
              max={30}
              value={settings.alertThresholdMinutes}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 1 && v <= 30) patch('alertThresholdMinutes', v);
              }}
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors dark:border-border/50"
            />
          </div>

          {/* alertSoundEnabled toggle */}
          <div className="flex flex-col justify-center gap-2">
            <div className="flex items-center justify-between rounded-lg border border-input bg-background px-4 py-3 shadow-sm dark:border-border/50">
              <div className="flex items-center gap-3">
                {settings.alertSoundEnabled ? (
                  <Volume2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <VolumeX className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <span className="text-sm font-medium text-foreground">Son d&apos;alerte embarquement</span>
                  <p className="text-xs text-muted-foreground">
                    Alerte sonore quand un départ est dans {settings.alertThresholdMinutes} minutes
                  </p>
                </div>
              </div>

              {/* toggle switch */}
              <button
                type="button"
                role="switch"
                aria-checked={settings.alertSoundEnabled}
                onClick={() => patch('alertSoundEnabled', !settings.alertSoundEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                  settings.alertSoundEnabled ? 'bg-emerald-600' : 'bg-muted'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                    settings.alertSoundEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- SECTION 4 — Volume & Audio Controls ---------- */}
      <section className="rounded-xl border border-border/50 bg-card p-5 shadow-sm sm:p-6 dark:border-border/30">
        <div className="mb-5 flex items-center gap-2">
          <Volume2 className="h-5 w-5 text-emerald-600" />
          <h2 className="text-lg font-semibold text-foreground">Volume &amp; Audio</h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {/* Volume slider */}
          <div>
            <label htmlFor="volumeSlider" className="mb-1.5 block text-sm font-medium text-foreground">
              Volume des annonces
            </label>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">0</span>
              <input
                id="volumeSlider"
                type="range"
                min={0}
                max={100}
                step={1}
                value={settings.volume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-emerald-600"
              />
              <span className="text-xs text-muted-foreground">100</span>
              <span className="ml-auto min-w-[3rem] rounded-md bg-muted px-2 py-1 text-center text-sm font-mono text-foreground">
                {settings.volume}%
              </span>
            </div>
          </div>

          {/* Mute toggle */}
          <div className="flex flex-col justify-center gap-2">
            <div className="flex items-center justify-between rounded-lg border border-input bg-background px-4 py-3 shadow-sm dark:border-border/50">
              <div className="flex items-center gap-3">
                {settings.muted ? (
                  <VolumeX className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <Volume2 className="h-5 w-5 text-emerald-600" />
                )}
                <span className="text-sm font-medium text-foreground">Couper le son (Mute)</span>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={settings.muted}
                onClick={handleMuteToggle}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                  settings.muted ? 'bg-emerald-600' : 'bg-muted'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                    settings.muted ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- SECTION 5 — Audio personnalisé ---------- */}
      <section className="rounded-xl border border-border/50 bg-card p-5 shadow-sm sm:p-6 dark:border-border/30">
        <div className="mb-5 flex items-center gap-2">
          <Upload className="h-5 w-5 text-emerald-600" />
          <h2 className="text-lg font-semibold text-foreground">Audio personnalisé</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="audioUpload" className="mb-1.5 block text-sm font-medium text-foreground">
              Fichier audio (MP3, WAV)
            </label>
            <input
              id="audioUpload"
              type="file"
              accept=".mp3,.wav,audio/mpeg,audio/wav"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setSelectedAudioFile({ name: file.name, size: file.size });
                }
              }}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-emerald-700 file:cursor-pointer"
            />
          </div>

          {selectedAudioFile && (
            <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-background px-4 py-3 dark:border-border/30">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950">
                <Volume2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{selectedAudioFile.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(selectedAudioFile.size)}</p>
              </div>
            </div>
          )}

          {settings.customAudioName && !selectedAudioFile && (
            <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-background px-4 py-3 dark:border-border/30">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950">
                <Volume2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{settings.customAudioName}</p>
                <p className="text-xs text-muted-foreground">Audio actuel</p>
              </div>
            </div>
          )}

          <button
            type="button"
            disabled={!selectedAudioFile}
            onClick={handleSendAudio}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Upload className="h-4 w-4" />
            Envoyer au kiosk
          </button>
        </div>
      </section>

      {/* ---------- SECTION 6 — Message général ---------- */}
      <section className="rounded-xl border border-border/50 bg-card p-5 shadow-sm sm:p-6 dark:border-border/30">
        <div className="mb-5 flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-emerald-600" />
          <h2 className="text-lg font-semibold text-foreground">Message général</h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {/* Message text */}
          <div className="sm:col-span-2">
            <label htmlFor="generalMessage" className="mb-1.5 block text-sm font-medium text-foreground">
              Contenu du message
            </label>
            <input
              id="generalMessage"
              type="text"
              value={settings.generalMessage}
              onChange={(e) => patch('generalMessage', e.target.value)}
              placeholder="Ex: Bienvenue, veuillez vérifier vos billets…"
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors dark:border-border/50"
            />
          </div>

          {/* Frequency select */}
          <div>
            <label htmlFor="generalMessageFrequency" className="mb-1.5 block text-sm font-medium text-foreground">
              Fréquence de diffusion
            </label>
            <select
              id="generalMessageFrequency"
              value={settings.generalMessageFrequency}
              onChange={(e) => patch('generalMessageFrequency', Number(e.target.value))}
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors dark:border-border/50"
            >
              <option value={30}>Toutes les 30 min</option>
              <option value={90}>Toutes les 1h30</option>
              <option value={120}>Toutes les 2h</option>
            </select>
          </div>

          {/* Enable toggle */}
          <div className="flex items-center justify-end">
            <div className="flex items-center justify-between rounded-lg border border-input bg-background px-4 py-3 shadow-sm dark:border-border/50">
              <span className="text-sm font-medium text-foreground">Activer</span>
              <button
                type="button"
                role="switch"
                aria-checked={settings.generalMessageEnabled}
                onClick={() => patch('generalMessageEnabled', !settings.generalMessageEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ml-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                  settings.generalMessageEnabled ? 'bg-emerald-600' : 'bg-muted'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                    settings.generalMessageEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- SECTION 3 — Ticker ---------- */}
      <section className="rounded-xl border border-border/50 bg-card p-5 shadow-sm sm:p-6 dark:border-border/30">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-foreground">Messages défilants (Ticker)</h2>
          </div>
          <span className="text-xs text-muted-foreground">
            {settings.tickerMessages.length} / 5
          </span>
        </div>

        {settings.tickerMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-10 text-center dark:border-border/50">
            <Megaphone className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Aucun message défilant configuré</p>
          </div>
        )}

        <div className="space-y-4">
          {settings.tickerMessages.map((msg, idx) => (
            <div
              key={msg.id}
              className="rounded-lg border border-border/50 bg-background p-4 shadow-sm dark:border-border/30"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Message {idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeTickerMessage(msg.id)}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Supprimer
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                {/* text */}
                <input
                  type="text"
                  value={msg.text}
                  onChange={(e) => patchTicker(msg.id, 'text', e.target.value)}
                  placeholder="Contenu du message…"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors dark:border-border/50"
                />

                {/* priority select */}
                <select
                  value={msg.priority}
                  onChange={(e) => patchTicker(msg.id, 'priority', e.target.value)}
                  className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors dark:border-border/50"
                >
                  <option value="info">ℹ️ Info</option>
                  <option value="urgent">🚨 Urgent</option>
                </select>

                {/* active toggle */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={msg.active}
                  aria-label={msg.active ? 'Désactiver le message' : 'Activer le message'}
                  onClick={() => patchTicker(msg.id, 'active', !msg.active)}
                  className={`relative inline-flex h-10 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                    msg.active ? 'bg-emerald-600' : 'bg-muted'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                      msg.active ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* add button */}
        {settings.tickerMessages.length < 5 && (
          <button
            type="button"
            onClick={addTickerMessage}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 dark:border-border/50 dark:hover:bg-emerald-950 dark:hover:text-emerald-400"
          >
            <Plus className="h-4 w-4" />
            Ajouter un message
          </button>
        )}
      </section>

      {/* ---------- SAVE BUTTON ---------- */}
      <button
        type="button"
        disabled={saving}
        onClick={handleSave}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Enregistrement…
          </>
        ) : (
          <>
            <Save className="h-4 w-4" />
            Enregistrer les modifications
          </>
        )}
      </button>
    </div>
  );
}
