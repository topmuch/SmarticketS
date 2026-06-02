'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  Volume2,
  VolumeX,
  Radio,
  MessageSquare,
  Save,
  RefreshCw,
  Loader2,
  Monitor,
  Send,
  AlertCircle,
  CheckCircle2,
  Mic,
  Trash2,
  Upload,
  BellRing,
  Clock,
  CloudRain,
  PartyPopper,
  Luggage,
  ShieldCheck,
  Ticket,
  Play,
} from 'lucide-react';
import { useAgency } from '../layout';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/* ══════════════════════════════════════════════
   Types
   ══════════════════════════════════════════════ */
interface KioskConfig {
  volume: number;
  muted: boolean;
  generalMessage: string;
  generalMessageInterval: number;
  alertSoundEnabled: boolean;
  customVoiceUrl: string | null;
  customVoiceName: string | null;
}

interface Station {
  id: string;
  name: string;
  city: string;
  slug: string;
  isActive: boolean;
}

type ReminderType = 'BAGAGES' | 'VALEURS' | 'CLOTURE_BILLETTERIE' | 'PLUIE' | 'FESTIVE';

interface ReminderItem {
  enabled: boolean;
  intervalMinutes: number;
  text: string;
}

interface ReminderConfigState {
  reminders: Record<ReminderType, ReminderItem>;
  closingTime: string;
  isRaining: boolean;
  isHolidayMode: boolean;
  holidayStartDate: string;
  holidayEndDate: string;
}

/* ══════════════════════════════════════════════
   Main Page — Kiosk Control Panel
   ══════════════════════════════════════════════ */
export default function KioskControlPage() {
  const { agencyId } = useAgency();

  // Config state
  const [config, setConfig] = useState<KioskConfig>({
    volume: 100,
    muted: false,
    generalMessage: '',
    generalMessageInterval: 10,
    alertSoundEnabled: true,
    customVoiceUrl: null,
    customVoiceName: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Voice upload
  const [voiceFile, setVoiceFile] = useState<File | null>(null);
  const [voiceUploading, setVoiceUploading] = useState(false);
  const voiceInputRef = useRef<HTMLInputElement>(null);

  // Stations
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<string>('');

  // WebSocket
  const socketRef = useRef<Socket | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);

  // Reminder config
  const [reminderConfig, setReminderConfig] = useState<ReminderConfigState>({
    reminders: {
      BAGAGES: { enabled: true, intervalMinutes: 45, text: '' },
      VALEURS: { enabled: true, intervalMinutes: 90, text: '' },
      CLOTURE_BILLETTERIE: { enabled: true, intervalMinutes: 0, text: '' },
      PLUIE: { enabled: false, intervalMinutes: 30, text: '' },
      FESTIVE: { enabled: false, intervalMinutes: 30, text: '' },
    },
    closingTime: '20:00',
    isRaining: false,
    isHolidayMode: false,
    holidayStartDate: '',
    holidayEndDate: '',
  });
  const [reminderSaving, setReminderSaving] = useState(false);

  /* ── Fetch kiosk config ── */
  const fetchConfig = useCallback(async () => {
    if (!agencyId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/kiosk/config?agencyId=${agencyId}`);
      if (res.ok) {
        const data = await res.json();
        setConfig({
          volume: data.volume ?? 100,
          muted: data.muted ?? false,
          generalMessage: data.generalMessage ?? '',
          generalMessageInterval: data.generalMessageInterval ?? 10,
          alertSoundEnabled: data.alertSoundEnabled ?? true,
          customVoiceUrl: null,
          customVoiceName: null,
        });
      }

      // Fetch voice info
      try {
        const voiceRes = await fetch(`/api/kiosk/voice`);
        if (voiceRes.ok) {
          const voiceData = await voiceRes.json();
          setConfig(prev => ({
            ...prev,
            customVoiceUrl: voiceData.url,
            customVoiceName: voiceData.name,
          }));
        }
      } catch { /* silent */ }
    } catch {
      // silent — use defaults
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  /* ── Fetch stations ── */
  const fetchStations = useCallback(async () => {
    if (!agencyId) return;
    try {
      const res = await fetch(`/api/stations?agencyId=${agencyId}`);
      if (res.ok) {
        const data = await res.json();
        const list = (data.stations || []).filter((s: Station) => s.isActive);
        setStations(list);
        if (list.length > 0) {
          setSelectedStation(list[0].slug);
        }
      }
    } catch {
      // silent
    }
  }, [agencyId]);

  /* ── Fetch reminder config ── */
  const fetchReminderConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/kiosk/reminder-config');
      if (res.ok) {
        const data = await res.json();
        setReminderConfig(prev => ({
          ...prev,
          reminders: data.reminders ? {
            BAGAGES: { ...prev.reminders.BAGAGES, ...data.reminders.BAGAGES },
            VALEURS: { ...prev.reminders.VALEURS, ...data.reminders.VALEURS },
            CLOTURE_BILLETTERIE: { ...prev.reminders.CLOTURE_BILLETTERIE, ...data.reminders.CLOTURE_BILLETTERIE },
            PLUIE: { ...prev.reminders.PLUIE, ...data.reminders.PLUIE },
            FESTIVE: { ...prev.reminders.FESTIVE, ...data.reminders.FESTIVE },
          } : prev.reminders,
          closingTime: data.closingTime ?? prev.closingTime,
          isRaining: data.isRaining ?? prev.isRaining,
          isHolidayMode: data.isHolidayMode ?? prev.isHolidayMode,
          holidayStartDate: data.holidayStartDate ?? '',
          holidayEndDate: data.holidayEndDate ?? '',
        }));
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchConfig();
    fetchStations();
    fetchReminderConfig();
  }, [fetchConfig, fetchStations, fetchReminderConfig]);

  /* ── WebSocket connection ── */
  useEffect(() => {
    const socket = io('/?XTransformPort=3004');
    socketRef.current = socket;
    socket.on('connect', () => {
      setSocketConnected(true);
    });
    socket.on('disconnect', () => {
      setSocketConnected(false);
    });
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  /* ── Save reminder config ── */
  const handleSaveReminderConfig = async () => {
    setReminderSaving(true);
    try {
      const res = await fetch('/api/kiosk/reminder-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reminderConfig),
      });
      if (!res.ok) throw new Error('Erreur serveur');
      toast.success('Configuration des rappels sauvegardée');

      // Broadcast via WebSocket
      if (socketRef.current?.connected) {
        socketRef.current.emit('kiosk:reminderConfig', {
          stationSlug: selectedStation,
          ...reminderConfig,
        });
      }
    } catch {
      toast.error('Erreur lors de la sauvegarde des rappels');
    } finally {
      setReminderSaving(false);
    }
  };

  /* ── Toggle single reminder ── */
  const toggleReminder = (type: ReminderType, enabled: boolean) => {
    setReminderConfig(prev => ({
      ...prev,
      reminders: {
        ...prev.reminders,
        [type]: { ...prev.reminders[type], enabled },
      },
    }));
  };

  /* ── Update closing time ── */
  const updateClosingTime = (value: string) => {
    setReminderConfig(prev => ({ ...prev, closingTime: value }));
  };

  /* ── Toggle rain mode (instant broadcast) ── */
  const toggleRainMode = (active: boolean) => {
    setReminderConfig(prev => ({ ...prev, isRaining: active }));
    if (socketRef.current?.connected) {
      socketRef.current.emit('kiosk:reminderConfig', {
        stationSlug: selectedStation,
        isRaining: active,
      });
    }
    toast.success(active ? '🌧️ Mode pluie activé sur le kiosk' : '☀️ Mode pluie désactivé');
  };

  /* ── Toggle holiday mode (instant broadcast) ── */
  const toggleHolidayMode = (active: boolean) => {
    setReminderConfig(prev => ({ ...prev, isHolidayMode: active }));
    if (socketRef.current?.connected) {
      socketRef.current.emit('kiosk:reminderConfig', {
        stationSlug: selectedStation,
        isHolidayMode: active,
      });
    }
    toast.success(active ? '🎄 Mode festive activé' : 'Mode festive désactivé');
  };

  /* ── Test play a reminder via WebSocket ── */
  const handleTestReminder = (type: ReminderType) => {
    if (!socketRef.current?.connected) {
      toast.error('WebSocket non connecté');
      return;
    }
    const testTexts: Record<ReminderType, string> = {
      BAGAGES: "Voyageurs, n'oubliez jamais vos bagages sans surveillance.",
      VALEURS: "Attention à vos effets personnels : téléphones, portefeuilles et sacs.",
      CLOTURE_BILLETTERIE: "La billetterie fermera ses portes dans 15 minutes.",
      PLUIE: "En raison de fortes pluies, les quais peuvent être glissants.",
      FESTIVE: "La gare est très fréquentée en cette période festive. Merci de patienter.",
    };
    socketRef.current.emit('kiosk:manualAnnounce', {
      stationSlug: selectedStation,
      text: testTexts[type],
      priority: -1,
      timestamp: Date.now(),
    });
    toast.success(`🔔 Rappel ${type} diffusé en test`);
  };

  /* ── Save config ── */
  const handleSave = async () => {
    if (!agencyId) return;
    setSaving(true);
    try {
      const res = await fetch('/api/kiosk/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agencyId, ...config }),
      });
      if (!res.ok) throw new Error('Erreur serveur');
      toast.success('Configuration sauvegardée');

      // Broadcast config to kiosk via WebSocket
      if (socketRef.current?.connected) {
        socketRef.current.emit('kiosk:config', {
          stationSlug: selectedStation,
          config: {
            volume: config.volume / 100,
            muted: config.muted,
            generalMessage: config.generalMessage,
            generalMessageInterval: config.generalMessageInterval,
          },
        });
      }
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  /* ── Broadcast general message now ── */
  const handleBroadcastNow = async () => {
    if (!config.generalMessage.trim()) {
      toast.error('Veuillez saisir un message général');
      return;
    }

    // Always call the API endpoint (works without WebSocket)
    try {
      const res = await fetch('/api/kiosk/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: config.generalMessage,
          stationSlug: selectedStation,
          agencyId,
        }),
      });
      if (res.ok) {
        toast.success(`Message diffusé sur la gare: ${selectedStation || 'toutes'}`);
      } else {
        toast.error("Erreur lors de la diffusion");
      }
    } catch {
      toast.error("Erreur de connexion au serveur");
    }

    // Also try WebSocket if connected (for instant delivery)
    if (socketRef.current?.connected) {
      socketRef.current.emit('kiosk:generalMessage', {
        text: config.generalMessage,
        priority: 1,
        stationSlug: selectedStation,
        timestamp: Date.now(),
      });
    }
  };

  /* ── Toggle mute ── */
  const toggleMute = () => {
    const newMuted = !config.muted;
    setConfig((prev) => ({ ...prev, muted: newMuted }));

    // Broadcast immediately
    if (socketRef.current?.connected) {
      socketRef.current.emit('kiosk:config', {
        stationSlug: selectedStation,
        config: { muted: newMuted },
      });
      toast.success(newMuted ? '🔊 Son coupé sur le kiosk' : '🔊 Son rétabli sur le kiosk');
    }
  };

  /* ── Voice upload ── */
  const handleVoiceUpload = async () => {
    if (!voiceFile) {
      toast.error('Veuillez sélectionner un fichier audio');
      return;
    }
    setVoiceUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', voiceFile);
      const res = await fetch('/api/kiosk/voice', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Erreur serveur');
      const data = await res.json();
      setConfig(prev => ({ ...prev, customVoiceUrl: data.url, customVoiceName: data.name }));
      setVoiceFile(null);
      toast.success(`Voix "${data.name}" uploadée avec succès`);
    } catch {
      toast.error("Erreur lors de l'upload de la voix");
    } finally {
      setVoiceUploading(false);
    }
  };

  const handleVoiceDelete = async () => {
    try {
      await fetch('/api/kiosk/voice', { method: 'DELETE' });
      setConfig(prev => ({ ...prev, customVoiceUrl: null, customVoiceName: null }));
      toast.success('Voix personnalisée supprimée');
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  /* ── Update volume ── */
  const updateVolume = (value: number[]) => {
    const vol = value[0];
    setConfig((prev) => ({ ...prev, volume: vol }));

    // Debounced broadcast
    if (socketRef.current?.connected) {
      socketRef.current.emit('kiosk:config', {
        stationSlug: selectedStation,
        config: { volume: vol / 100 },
      });
    }
  };

  /* ══════════════════════════════════════════════
     Render
     ══════════════════════════════════════════════ */
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Monitor className="w-5 h-5 text-white" />
            </div>
            Contrôle Kiosk
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gérez les annonces vocales et la configuration des écrans kiosk en temps réel
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Connection status */}
          <Badge
            variant={socketConnected ? 'default' : 'secondary'}
            className={
              socketConnected
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 gap-1.5'
                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800 gap-1.5'
            }
          >
            <div className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            {socketConnected ? 'WebSocket Connecté' : 'WebSocket Déconnecté'}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchConfig}
            className="rounded-xl gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Station selector */}
      {stations.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center gap-3">
            <Label htmlFor="station-select" className="text-sm font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
              Gare ciblée :
            </Label>
            <Select value={selectedStation} onValueChange={setSelectedStation}>
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue placeholder="Sélectionner une gare" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">📢 Toutes les gares</SelectItem>
                {stations.map((s) => (
                  <SelectItem key={s.slug} value={s.slug}>
                    {s.name} ({s.city})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-violet-600 hover:text-violet-700"
              onClick={() => window.open(`/signage-slug/${selectedStation}?kiosk=1`, '_blank')}
            >
              <Monitor className="w-4 h-4" />
              Voir kiosk
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── LEFT: Volume & Sound ── */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-violet-500" />
              Volume & Son
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Contrôlez le volume et les sons des écrans kiosk
            </p>
          </div>

          <div className="p-5 space-y-6">
            {/* Volume slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Volume principal
                </Label>
                <span className="text-sm font-bold text-violet-600 dark:text-violet-400 tabular-nums">
                  {config.volume}%
                </span>
              </div>
              <Slider
                value={[config.volume]}
                onValueChange={updateVolume}
                min={0}
                max={100}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Muet</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>Max</span>
              </div>
            </div>

            <Separator />

            {/* Mute toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {config.muted ? (
                  <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <VolumeX className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <Volume2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {config.muted ? 'Son coupé' : 'Son actif'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Coupe tous les sons sur le kiosk (touches M)
                  </p>
                </div>
              </div>
              <Switch
                checked={config.muted}
                onCheckedChange={toggleMute}
              />
            </div>

            <Separator />

            {/* Alert sound toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Radio className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Son d&apos;alerte embarquement
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Ding-dong automatique avant embarquement
                  </p>
                </div>
              </div>
              <Switch
                checked={config.alertSoundEnabled}
                onCheckedChange={(checked) =>
                  setConfig((prev) => ({ ...prev, alertSoundEnabled: checked }))
                }
              />
            </div>
          </div>
        </div>

        {/* ── RIGHT: General Message ── */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-violet-500" />
              Annonce Générale
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Message diffusé automatiquement en boucle sur le kiosk
            </p>
          </div>

          <div className="p-5 space-y-5">
            {/* Message text */}
            <div className="space-y-2">
              <Label htmlFor="general-message" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Message à diffuser
              </Label>
              <textarea
                id="general-message"
                className="w-full min-h-[100px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 resize-none"
                placeholder="Ex: Madame, Monsieur, bienvenue à la Gare Routière Peters. Nous vous rappelons de surveiller vos bagages."
                value={config.generalMessage}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, generalMessage: e.target.value }))
                }
              />
            </div>

            {/* Frequency */}
            <div className="space-y-2">
              <Label htmlFor="msg-frequency" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Fréquence de diffusion
              </Label>
              <Select
                value={String(config.generalMessageInterval)}
                onValueChange={(v) =>
                  setConfig((prev) => ({ ...prev, generalMessageInterval: parseInt(v, 10) }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">Toutes les 5 minutes</SelectItem>
                  <SelectItem value="10">Toutes les 10 minutes</SelectItem>
                  <SelectItem value="15">Toutes les 15 minutes</SelectItem>
                  <SelectItem value="20">Toutes les 20 minutes</SelectItem>
                  <SelectItem value="30">Toutes les 30 minutes</SelectItem>
                  <SelectItem value="60">Toutes les heures</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Info box */}
            <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-xl p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />
                <div className="text-xs text-violet-700 dark:text-violet-300 space-y-1">
                  <p className="font-semibold">Comment ça fonctionne ?</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>Le message est lu par la voix de synthèse française (TTS)</li>
                    <li>Un ding-dong précède chaque annonce</li>
                    <li>Les messages critiques (retard, départ) passent en priorité</li>
                    <li>Upload une voix personnalisée pour remplacer le TTS automatique</li>
                    <li>La touche <kbd className="px-1.5 py-0.5 bg-violet-200 dark:bg-violet-800 rounded text-[10px] font-mono">M</kbd> sur le kiosk coupe le son</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-violet-600 hover:bg-violet-700 text-white rounded-xl gap-2 shadow-lg shadow-violet-500/20"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {saving ? 'Enregistrement...' : 'Sauvegarder la config'}
              </Button>
              <Button
                variant="outline"
                onClick={handleBroadcastNow}
                disabled={!config.generalMessage.trim()}
                className="flex-1 rounded-xl gap-2"
              >
                <Send className="w-4 h-4" />
                Diffuser maintenant
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Reminder Config Card ── */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BellRing className="w-5 h-5 text-amber-500" />
            Rappels Automatiques
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Annonces cycliques à basse priorité (P6) — ne coupent jamais les annonces de départ
          </p>
        </div>

        <div className="p-5 space-y-5">
          {/* Reminder toggles */}
          <div className="space-y-4">
            {/* Bagages */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center shrink-0">
                  <Luggage className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Bagages</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Toutes les 45 min — bandeau jaune discret</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={reminderConfig.reminders.BAGAGES.enabled ? 'default' : 'secondary'}
                  className={reminderConfig.reminders.BAGAGES.enabled
                    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800 text-[10px]'
                    : 'text-[10px]'}>
                  {reminderConfig.reminders.BAGAGES.intervalMinutes} min
                </Badge>
                <Switch
                  checked={reminderConfig.reminders.BAGAGES.enabled}
                  onCheckedChange={(c) => toggleReminder('BAGAGES', c)}
                />
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Tester"
                  onClick={() => handleTestReminder('BAGAGES')}>
                  <Play className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            <Separator />

            {/* Valeurs */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Effets personnels</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Toutes les 1h30 — téléphones, portefeuilles</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={reminderConfig.reminders.VALEURS.enabled ? 'default' : 'secondary'}
                  className={reminderConfig.reminders.VALEURS.enabled
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 text-[10px]'
                    : 'text-[10px]'}>
                  {reminderConfig.reminders.VALEURS.intervalMinutes} min
                </Badge>
                <Switch
                  checked={reminderConfig.reminders.VALEURS.enabled}
                  onCheckedChange={(c) => toggleReminder('VALEURS', c)}
                />
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Tester"
                  onClick={() => handleTestReminder('VALEURS')}>
                  <Play className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            <Separator />

            {/* Clôture billetterie */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
                  <Ticket className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Clôture billetterie</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">H-15 min avant fermeture — bandeau orange</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Input
                  type="time"
                  value={reminderConfig.closingTime}
                  onChange={(e) => updateClosingTime(e.target.value)}
                  className="w-28 h-8 text-xs"
                />
                <Switch
                  checked={reminderConfig.reminders.CLOTURE_BILLETTERIE.enabled}
                  onCheckedChange={(c) => toggleReminder('CLOTURE_BILLETTERIE', c)}
                />
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Tester"
                  onClick={() => handleTestReminder('CLOTURE_BILLETTERIE')}>
                  <Play className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            <Separator />

            {/* Pluie — conditional */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                  <CloudRain className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Alerte pluie</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Manuel — bandeau bleu persistant tant que actif</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={reminderConfig.isRaining ? 'default' : 'secondary'}
                  className={reminderConfig.isRaining
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800 text-[10px]'
                    : 'text-[10px]'}>
                  {reminderConfig.isRaining ? 'ACTIF' : 'Inactif'}
                </Badge>
                <Switch
                  checked={reminderConfig.isRaining}
                  onCheckedChange={toggleRainMode}
                />
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Tester"
                  onClick={() => handleTestReminder('PLUIE')}>
                  <Play className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            <Separator />

            {/* Festif — conditional */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                  <PartyPopper className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Période festive</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Dates configurables — affluence exceptionnelle</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={reminderConfig.isHolidayMode ? 'default' : 'secondary'}
                  className={reminderConfig.isHolidayMode
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800 text-[10px]'
                    : 'text-[10px]'}>
                  {reminderConfig.isHolidayMode ? 'ACTIF' : 'Inactif'}
                </Badge>
                <Switch
                  checked={reminderConfig.isHolidayMode}
                  onCheckedChange={toggleHolidayMode}
                />
                <Button variant="ghost" size="icon" className="h-8 w-8" title="Tester"
                  onClick={() => handleTestReminder('FESTIVE')}>
                  <Play className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Holiday date range (shown when holiday mode enabled) */}
          {reminderConfig.isHolidayMode && (
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
              <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 mb-3 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Période festive
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] text-purple-600 dark:text-purple-400">Date début</Label>
                  <Input
                    type="date"
                    value={reminderConfig.holidayStartDate}
                    onChange={(e) => setReminderConfig(prev => ({ ...prev, holidayStartDate: e.target.value }))}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-purple-600 dark:text-purple-400">Date fin</Label>
                  <Input
                    type="date"
                    value={reminderConfig.holidayEndDate}
                    onChange={(e) => setReminderConfig(prev => ({ ...prev, holidayEndDate: e.target.value }))}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          <Separator />

          {/* Rules info */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
                <p className="font-semibold">Règles des rappels automatiques</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Priorité P6 (la plus basse) — ne coupe jamais les annonces de départ</li>
                  <li>Silence entre 22h00 et 06h00 (aucun rappel)</li>
                  <li>Anti-spam : 2 min minimum entre deux rappels</li>
                  <li>Intervalle propre par type (45 min, 1h30, etc.)</li>
                  <li>Les boutons ▶ testent le rappel sur le kiosk en temps réel</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Save button */}
          <Button
            onClick={handleSaveReminderConfig}
            disabled={reminderSaving}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white rounded-xl gap-2 shadow-lg shadow-amber-500/20"
          >
            {reminderSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {reminderSaving ? 'Enregistrement...' : 'Sauvegarder les rappels'}
          </Button>
        </div>
      </div>

      {/* ── Voice Upload Card ── */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Mic className="w-5 h-5 text-violet-500" />
            Voix Personnalisée
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Uploadez un fichier audio pour remplacer la voix de synthèse (TTS)
          </p>
        </div>

        <div className="p-5 space-y-5">
          {/* Current voice info */}
          {config.customVoiceUrl && config.customVoiceName && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <Volume2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                      {config.customVoiceName}
                    </p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">
                      Voix personnalisée active
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleVoiceDelete}
                  className="rounded-xl gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800"
                >
                  <Trash2 className="w-4 h-4" />
                  Supprimer
                </Button>
              </div>
            </div>
          )}

          {/* Drop zone */}
          <div
            onClick={() => voiceInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const file = e.dataTransfer.files?.[0];
              if (file && (file.type === 'audio/mpeg' || file.type === 'audio/wav' || file.name.endsWith('.mp3') || file.name.endsWith('.wav'))) {
                setVoiceFile(file);
              } else {
                toast.error('Format non supporté. Utilisez MP3 ou WAV.');
              }
            }}
            className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-6 text-center cursor-pointer hover:border-violet-400 dark:hover:border-violet-500 hover:bg-violet-50/50 dark:hover:bg-violet-900/10 transition-colors"
          >
            <input
              ref={voiceInputRef}
              type="file"
              accept="audio/mpeg,audio/wav,.mp3,.wav"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setVoiceFile(file);
              }}
            />\n            <Upload className="w-8 h-8 mx-auto text-slate-400 dark:text-slate-500 mb-2" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
              {voiceFile ? voiceFile.name : 'Cliquez ou glissez un fichier audio'}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              MP3 ou WAV — Max 10 Mo
            </p>
          </div>

          {/* Upload button */}
          <Button
            onClick={handleVoiceUpload}
            disabled={!voiceFile || voiceUploading}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white rounded-xl gap-2 shadow-lg shadow-violet-500/20"
          >
            {voiceUploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {voiceUploading ? 'Upload en cours...' : 'Uploader la voix'}
          </Button>

          {/* Info box */}
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                <p className="font-semibold text-slate-700 dark:text-slate-300">Remarque</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>La voix personnalisée remplace le TTS automatique</li>
                  <li>Le fichier doit contenir l&apos;annonce complète à diffuser</li>
                  <li>Si le fichier est introuvable, le kiosk revient au TTS automatique</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom: Quick Actions ── */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          Actions rapides sur le kiosk
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Button
            variant="outline"
            className="rounded-xl gap-2 justify-start h-auto py-3"
            onClick={() => {
              setConfig((prev) => ({ ...prev, muted: true }));
              if (socketRef.current?.connected) {
                socketRef.current.emit('kiosk:config', {
                  stationSlug: selectedStation,
                  config: { muted: true },
                });
              }
              toast.success('🔇 Son coupé sur le kiosk');
            }}
          >
            <VolumeX className="w-4 h-4 text-red-500" />
            <div className="text-left">
              <p className="text-sm font-semibold">Couper le son</p>
              <p className="text-[10px] text-slate-400">Muet immédiat</p>
            </div>
          </Button>

          <Button
            variant="outline"
            className="rounded-xl gap-2 justify-start h-auto py-3"
            onClick={() => {
              setConfig((prev) => ({ ...prev, muted: false }));
              if (socketRef.current?.connected) {
                socketRef.current.emit('kiosk:config', {
                  stationSlug: selectedStation,
                  config: { muted: false },
                });
              }
              toast.success('🔊 Son rétabli sur le kiosk');
            }}
          >
            <Volume2 className="w-4 h-4 text-emerald-500" />
            <div className="text-left">
              <p className="text-sm font-semibold">Rétablir le son</p>
              <p className="text-[10px] text-slate-400">Réactiver la voix</p>
            </div>
          </Button>

          <Button
            variant="outline"
            className="rounded-xl gap-2 justify-start h-auto py-3"
            onClick={() => window.open(`/signage-slug/${selectedStation || 'dakar-peters-x9s2'}?kiosk=1`, '_blank')}
          >
            <Monitor className="w-4 h-4 text-blue-500" />
            <div className="text-left">
              <p className="text-sm font-semibold">Ouvrir le kiosk</p>
              <p className="text-[10px] text-slate-400">Mode plein écran</p>
            </div>
          </Button>

          <Button
            variant="outline"
            className="rounded-xl gap-2 justify-start h-auto py-3"
            onClick={() => window.open('/agence/affichage-gare', '_self')}
          >
            <Radio className="w-4 h-4 text-violet-500" />
            <div className="text-left">
              <p className="text-sm font-semibold">Affichage Gare</p>
              <p className="text-[10px] text-slate-400">Gérer les écrans</p>
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
}
