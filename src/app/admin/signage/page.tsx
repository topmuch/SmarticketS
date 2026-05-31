'use client';

import { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';

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
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

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
