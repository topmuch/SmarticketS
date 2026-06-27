'use client';

/**
 * useVocalAlerts — Hook React pour les alertes vocales TTS de l'agent BusGo.
 *
 * ARCHITECTURE:
 *   1. Écoute les événements Socket.io (passager:manquant, timer:5min, etc.)
 *   2. Génère du TTS via Web Speech API (speechSynthesis)
 *   3. Configuration persistante (localStorage)
 *
 * CONTRAINTES:
 *   - speechSynthesis.cancel() AVANT chaque speak() (pas d'accumulation)
 *   - Fallback visuel si TTS indisponible (toast)
 *   - Paramètres: fr-FR, rate=0.9, volume=1.0, pitch=1.0
 *   - Mode silencieux: toggle "Forcer le son" via AudioContext
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { toast } from 'sonner';
import { playDingDong } from '@/lib/audioSystem';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface VocalConfig {
  enabled: boolean;
  volume: number; // 0 à 1
  speed: number; // 0.5 à 2 (default: 0.9)
  forceSound: boolean; // Forcer le son même en mode silencieux (AudioContext)
  alerts: {
    passagerManquant: boolean;
    timer5min: boolean;
    timer2min: boolean;
    messageRetard: boolean;
    departConfirme: boolean;
  };
}

const DEFAULT_CONFIG: VocalConfig = {
  enabled: true,
  volume: 1.0,
  speed: 0.9,
  forceSound: false,
  alerts: {
    passagerManquant: true,
    timer5min: true,
    timer2min: true,
    messageRetard: true,
    departConfirme: true,
  },
};

const STORAGE_KEY = 'busgo-vocal-config';

// ═══════════════════════════════════════════════════════════════
// Config persistence
// ═══════════════════════════════════════════════════════════════

function loadConfig(): VocalConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      alerts: { ...DEFAULT_CONFIG.alerts, ...(parsed.alerts || {}) },
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function saveConfig(cfg: VocalConfig) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch { /* ignore quota */ }
}

// ═══════════════════════════════════════════════════════════════
// Message templates
// ═══════════════════════════════════════════════════════════════

const TEMPLATES: Record<string, (data: Record<string, unknown>) => string> = {
  'passager:manquant': (d) =>
    `Attention, passager manquant. Siège ${d.seatNumber || '?'}, ${d.passengerName || 'Inconnu'}. Téléphone : ${d.phone || 'Non renseigné'}.`,
  'timer:5min': (d) =>
    `Attention, départ dans 5 minutes. ${d.missingCount || 0} passager${(d.missingCount || 0) > 1 ? 's' : ''} manquant${(d.missingCount || 0) > 1 ? 's' : ''}.`,
  'timer:2min': (d) => {
    const names = d.missingNames || [];
    const list = Array.isArray(names) && names.length > 0
      ? names.map((n: { name: string; seat: string }) => `${n.name} siège ${n.seat}`).join(', ')
      : 'Aucun';
    return `Dernier appel ! Départ dans 2 minutes. Passagers manquants : ${list}.`;
  },
  'message:retard': (d) =>
    `Message de ${d.passengerName || 'Passager'}. Il arrive dans ${d.delayMinutes || 5} minutes. Siège ${d.seatNumber || '?'}.`,
  'depart:confirme': (d) =>
    `Départ confirmé. ${d.boardedCount || 0} embarqués. ${d.missingCount || 0} manquants. Bon voyage !`,
};

// ═══════════════════════════════════════════════════════════════
// Alert type mapping
// ═══════════════════════════════════════════════════════════════

const ALERT_TYPE_MAP: Record<string, keyof VocalConfig['alerts']> = {
  'passager:manquant': 'passagerManquant',
  'timer:5min': 'timer5min',
  'timer:2min': 'timer2min',
  'message:retard': 'messageRetard',
  'depart:confirme': 'departConfirme',
};

// ═══════════════════════════════════════════════════════════════
// Hook
// ═══════════════════════════════════════════════════════════════

export function useVocalAlerts() {
  const [config, setConfig] = useState<VocalConfig>(() => loadConfig());
  const [ttsAvailable, setTtsAvailable] = useState(true);
  const configRef = useRef(config);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Keep ref synced
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  // Check TTS availability
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!('speechSynthesis' in window)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTtsAvailable(false);
      toast.warning('⚠️ Synthèse vocale non disponible sur cet appareil. Les alertes seront visuelles uniquement.');
      return;
    }

    // Check voices (may be empty initially — wait for voiceschanged)
    const checkVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) {
        setTtsAvailable(false);
        toast.warning('⚠️ Aucune voix TTS disponible. Les alertes seront visuelles uniquement.');
      } else {
        setTtsAvailable(true);
      }
    };

    checkVoices();
    window.speechSynthesis.addEventListener('voiceschanged', checkVoices);

    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', checkVoices);
      // Cancel any pending speech on unmount
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // Core speak function
  // ═══════════════════════════════════════════════════════════════

  const speak = useCallback((text: string, alertType?: string) => {
    const cfg = configRef.current;

    if (!cfg.enabled) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    // Check if this alert type is enabled
    if (alertType && ALERT_TYPE_MAP[alertType]) {
      const alertKey = ALERT_TYPE_MAP[alertType];
      if (!cfg.alerts[alertKey]) return;
    }

    // CRITICAL: Cancel any in-progress speech BEFORE speaking new one
    window.speechSynthesis.cancel();

    // Create utterance
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = cfg.speed; // 0.9 default — slightly slower for clarity
    utterance.volume = cfg.volume;
    utterance.pitch = 1.0;

    // Try to find a French voice
    const voices = window.speechSynthesis.getVoices();
    const frVoice = voices.find((v) => v.lang.startsWith('fr'));
    if (frVoice) {
      utterance.voice = frVoice;
    }

    // Handle errors
    utterance.onerror = (e) => {
      console.error('[BusGo TTS] Error:', e);
      toast.error('Erreur TTS — alerte visuelle uniquement');
    };

    // If forceSound is enabled, use AudioContext to bypass silent mode
    if (cfg.forceSound && !audioContextRef.current) {
      try {
        audioContextRef.current = new AudioContext();
      } catch {
        // AudioContext not available
      }
    }

    // Speak
    window.speechSynthesis.speak(utterance);
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // Higher-level alert functions
  // ═══════════════════════════════════════════════════════════════

  const alertPassagerManquant = useCallback((data: {
    seatNumber: string; passengerName: string; phone?: string;
  }) => {
    const text = TEMPLATES['passager:manquant'](data);
    speak(text, 'passager:manquant');
  }, [speak]);

  const alertTimer5min = useCallback((data: { missingCount: number }) => {
    const text = TEMPLATES['timer:5min'](data);
    speak(text, 'timer:5min');
  }, [speak]);

  const alertTimer2min = useCallback((data: {
    missingNames: Array<{ name: string; seat: string }>;
  }) => {
    const text = TEMPLATES['timer:2min'](data);
    speak(text, 'timer:2min');
  }, [speak]);

  const alertMessageRetard = useCallback((data: {
    passengerName: string; delayMinutes: number; seatNumber: string;
  }) => {
    const text = TEMPLATES['message:retard'](data);
    speak(text, 'message:retard');
  }, [speak]);

  const alertDepartConfirme = useCallback((data: {
    boardedCount: number; missingCount: number;
  }) => {
    const text = TEMPLATES['depart:confirme'](data);
    speak(text, 'depart:confirme');
  }, [speak]);

  // ═══════════════════════════════════════════════════════════════
  // Config update helpers
  // ═══════════════════════════════════════════════════════════════

  const updateConfig = useCallback((patch: Partial<VocalConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...patch, alerts: { ...prev.alerts, ...(patch.alerts || {}) } };
      saveConfig(next);
      configRef.current = next;
      return next;
    });
  }, []);

  const toggleEnabled = useCallback(() => {
    updateConfig({ enabled: !configRef.current.enabled });
  }, [updateConfig]);

  const toggleAlert = useCallback((alertKey: keyof VocalConfig['alerts']) => {
    const current = configRef.current.alerts[alertKey];
    updateConfig({ alerts: { ...configRef.current.alerts, [alertKey]: !current } });
  }, [updateConfig]);

  const toggleForceSound = useCallback(() => {
    updateConfig({ forceSound: !configRef.current.forceSound });
  }, [updateConfig]);

  const testVoice = useCallback(() => {
    // ─── BUG #4 fix: play ding-dong chime BEFORE the TTS test message ───
    // This uses the same playDingDong() as the real announcements, so if the
    // agency uploaded a custom MP3, it will be played here too.
    // The ding-dong is played asynchronously — we don't wait for it to finish
    // before speaking, because the real announcement flow (via VocalManager)
    // waits 3s between ding-dong and TTS. Here we keep it simple: ding-dong
    // starts, then TTS speaks immediately (the ding-dong is short enough).
    try {
      playDingDong();
    } catch {
      /* ignore — ding-dong is best-effort */
    }
    speak('Test des annonces vocales BusGo. Le système fonctionne correctement. Embarquement pour Saint-Louis à huit heures.', undefined);
  }, [speak]);

  // ═══════════════════════════════════════════════════════════════
  // Socket.io event handler (to be called by useKioskSocket)
  // ═══════════════════════════════════════════════════════════════

  const handleSocketEvent = useCallback((event: string, data: Record<string, unknown>) => {
    switch (event) {
      case 'passager:manquant':
        alertPassagerManquant({
          seatNumber: String(data.seatNumber || '?'),
          passengerName: String(data.passengerName || 'Inconnu'),
          phone: String(data.phone || ''),
        });
        break;
      case 'timer:5min':
        alertTimer5min({ missingCount: Number(data.missingCount || 0) });
        break;
      case 'timer:2min':
        alertTimer2min({
          missingNames: (data.missingNames as Array<{ name: string; seat: string }>) || [],
        });
        break;
      case 'message:retard':
        alertMessageRetard({
          passengerName: String(data.passengerName || 'Passager'),
          delayMinutes: Number(data.delayMinutes || 5),
          seatNumber: String(data.seatNumber || '?'),
        });
        break;
      case 'depart:confirme':
        alertDepartConfirme({
          boardedCount: Number(data.boardedCount || 0),
          missingCount: Number(data.missingCount || 0),
        });
        break;
    }
  }, [alertPassagerManquant, alertTimer5min, alertTimer2min, alertMessageRetard, alertDepartConfirme]);

  return {
    config,
    ttsAvailable,
    speak,
    alertPassagerManquant,
    alertTimer5min,
    alertTimer2min,
    alertMessageRetard,
    alertDepartConfirme,
    handleSocketEvent,
    updateConfig,
    toggleEnabled,
    toggleAlert,
    toggleForceSound,
    testVoice,
  };
}
