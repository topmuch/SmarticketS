'use client';

import { useEffect } from 'react';

/**
 * PwaRegistry — Registers the Service Worker on mount.
 * Placed in the root layout so SW is always active.
 */
export function PwaRegistry() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) {
      console.warn('[PWA] Service Worker non supporté sur ce navigateur');
      return;
    }

    async function registerSW() {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        // Check for updates periodically
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'activated' &&
              navigator.serviceWorker.controller
            ) {
              // New version available — will update on next reload
            }
          });
        });
      } catch (error) {
        console.warn('[PWA] Échec de l\'enregistrement du Service Worker:', error);
      }
    }

    registerSW();
  }, []);

  return null;
}
