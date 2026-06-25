'use client';

/**
 * useAgentVocalAlerts — Hook pour les annonces vocales de l'agent mobile.
 *
 * Adapté de BusGo `use-vocal-alerts.ts` pour SmarticketS.
 * Utilise le système audio existant (`src/lib/audioSystem.ts`) qui est plus
 * avancé que celui de BusGo (priorités, queue, ding-dong, anti-doublon).
 *
 * Cas d'usage :
 *   - Annoncer l'embarquement à T-15, T-5, T-2
 *   - Annoncer les retards
 *   - Annoncer les passagers manquants
 *   - Annoncer le départ confirmé
 *
 * L'agent peut activer/désactiver les annonces et régler le volume depuis
 * le panneau de paramètres (VocalSettingsPanel).
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import {
  VocalManager,
  AnnouncementPriority,
  buildBoardingText,
  buildImminentText,
  buildDelayText,
  buildDepartedAfterDelayText,
  preloadVoices,
  toggleMute,
  setVolume as setSystemVolume,
  getIsMuted,
  getCurrentVolume,
  isAlreadyAnnounced,
} from '@/lib/audioSystem';

export interface AgentVocalConfig {
  enabled: boolean;
  autoTTS: boolean; // annonce automatique sur événements
  volume: number; // 0..1
  muted: boolean;
}

const DEFAULT_CONFIG: AgentVocalConfig = {
  enabled: true,
  autoTTS: true,
  volume: 0.9,
  muted: false,
};

const STORAGE_KEY = 'agent-vocal-config';

function loadConfig(): AgentVocalConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function saveConfig(cfg: AgentVocalConfig) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch {
    // ignore quota errors
  }
}

export function useAgentVocalAlerts() {
  // Lazy init from localStorage (no set-state-in-effect needed)
  const [config, setConfig] = useState<AgentVocalConfig>(() => loadConfig());
  const configRef = useRef(config);
  const managerRef = useRef<VocalManager | null>(null);

  // Keep ref synced with state for use in event handlers
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  // Init VocalManager + apply volume/mute on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Preload TTS voices (required for mobile browsers)
    preloadVoices();

    // Apply volume + mute to the system from loaded config
    const loaded = configRef.current;
    setSystemVolume(loaded.volume);
    if (loaded.muted !== getIsMuted()) {
      toggleMute();
    }

    // Get VocalManager singleton
    managerRef.current = VocalManager.getInstance();

    return () => {
      // Cleanup on unmount — cancel any pending speech
      if (managerRef.current) {
        managerRef.current.cancelAll();
      }
    };
  }, []);

  // Speak text immediately (respects enabled flag)
  const speak = useCallback((text: string, priority: AnnouncementPriority = AnnouncementPriority.NORMAL) => {
    const cfg = configRef.current;
    if (!cfg.enabled || cfg.muted) return;
    if (typeof window === 'undefined') return;

    const manager = managerRef.current ?? VocalManager.getInstance();
    managerRef.current = manager;

    // VocalManager.enqueue signature: (text, priority, customAudioUrl?, departureKey?)
    manager.enqueue(text, priority, undefined, undefined);
  }, []);

  // Higher-level helpers — use the build* functions from audioSystem
  const announceBoarding = useCallback((destination: string, time: string, platform?: string | null) => {
    if (isAlreadyAnnounced(`boarding:${destination}:${time}`)) return;
    speak(buildBoardingText(destination, time, platform), AnnouncementPriority.NORMAL);
  }, [speak]);

  const announceImminent = useCallback((destination: string) => {
    if (isAlreadyAnnounced(`imminent:${destination}`)) return;
    speak(buildImminentText(destination), AnnouncementPriority.HIGH);
  }, [speak]);

  const announceDelay = useCallback((destination: string, minutes: number) => {
    speak(buildDelayText(destination, minutes), AnnouncementPriority.HIGH);
  }, [speak]);

  const announceDepartedAfterDelay = useCallback((destination: string) => {
    speak(buildDepartedAfterDelayText(destination), AnnouncementPriority.NORMAL);
  }, [speak]);

  const announceMissingPassenger = useCallback((passengerName: string, seatNumber: string) => {
    speak(
      `Attention ! Le passager ${passengerName}, siège ${seatNumber}, n'a pas embarqué. Merci de se présenter immédiatement au quai.`,
      AnnouncementPriority.URGENT
    );
  }, [speak]);

  const announceCustom = useCallback((text: string, priority: AnnouncementPriority = AnnouncementPriority.NORMAL) => {
    speak(text, priority);
  }, [speak]);

  // Config update helpers
  const updateConfig = useCallback((patch: Partial<AgentVocalConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...patch };
      saveConfig(next);
      configRef.current = next;

      // Apply side effects immediately
      if (patch.volume !== undefined) setSystemVolume(patch.volume);
      if (patch.muted !== undefined && patch.muted !== getIsMuted()) {
        toggleMute();
      }

      return next;
    });
  }, []);

  const toggleEnabled = useCallback(() => {
    updateConfig({ enabled: !configRef.current.enabled });
  }, [updateConfig]);

  const toggleMuted = useCallback(() => {
    updateConfig({ muted: !configRef.current.muted });
  }, [updateConfig]);

  const setVolume = useCallback((v: number) => {
    updateConfig({ volume: Math.max(0, Math.min(1, v)) });
  }, [updateConfig]);

  return {
    config,
    speak,
    announceBoarding,
    announceImminent,
    announceDelay,
    announceDepartedAfterDelay,
    announceMissingPassenger,
    announceCustom,
    updateConfig,
    toggleEnabled,
    toggleMuted,
    setVolume,
  };
}
