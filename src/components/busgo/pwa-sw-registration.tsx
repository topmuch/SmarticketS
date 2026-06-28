'use client';

/**
 * PWA Passager — Service Worker Registration
 *
 * Enregistre le Service Worker /sw-busgo-passenger.js
 * Gère les messages TTS reçus du SW (quand l'utilisateur clique "🔊 Écouter")
 */

import { useEffect } from 'react';

export function BusGoSWRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    // Register the BusGo passenger service worker
    navigator.serviceWorker
      .register('/sw-busgo-passenger.js', { scope: '/' })
      .then((reg) => {
        console.log('[BusGo PWA] Service Worker registered:', reg.scope);
      })
      .catch((err) => {
        console.error('[BusGo PWA] SW registration failed:', err);
      });

    // Listen for TTS messages from the Service Worker
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'TTS_SPEAK') {
        const { message, alertType, forced } = event.data;
        if (message && 'speechSynthesis' in window) {
          // Cancel any in-progress speech
          window.speechSynthesis.cancel();

          const utterance = new SpeechSynthesisUtterance(message);
          utterance.lang = 'fr-FR';
          utterance.rate = 0.9;
          utterance.volume = 1.0;
          utterance.pitch = 1.0;

          // Try to find a French voice
          const voices = window.speechSynthesis.getVoices();
          const frVoice = voices.find((v) => v.lang.startsWith('fr'));
          if (frVoice) utterance.voice = frVoice;

          window.speechSynthesis.speak(utterance);
        }
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []);

  return null;
}
