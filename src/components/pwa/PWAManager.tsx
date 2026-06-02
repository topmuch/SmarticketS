'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { WifiOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * PWAUpdateDetector — Detects service worker updates and shows a toast with refresh button.
 */
export function PWAUpdateDetector() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        registrationRef.current = registration;

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
            }
          });
        });

        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (refreshing) return;
          refreshing = true;
          window.location.reload();
        });
      } catch {
        // SW not available
      }
    };

    registerSW();
  }, []);

  const handleUpdate = useCallback(() => {
    if (registrationRef.current?.waiting) {
      registrationRef.current.waiting.postMessage({ type: 'SKIP_WAITING' });
    } else {
      window.location.reload();
    }
  }, []);

  useEffect(() => {
    if (!updateAvailable) return;
    const toastId = toast('Mise à jour disponible', {
      description: 'Une nouvelle version de SmarticketS est disponible.',
      action: {
        label: 'Mettre à jour',
        onClick: handleUpdate,
      },
      duration: Infinity,
      closeButton: true,
    });

    return () => {
      toast.dismiss(toastId);
    };
  }, [updateAvailable, handleUpdate]);

  return null;
}

/**
 * PWAInstallPrompt — Shows install prompt when PWA can be installed.
 * Uses ref-based approach to avoid React state immutability issues.
 */
export function PWAInstallPrompt() {
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null);

  const handleInstall = useCallback(async () => {
    const dp = deferredRef.current;
    if (!dp) return;

    try {
      await dp.prompt();
      const { outcome } = await dp.userChoice;
      if (outcome === 'accepted') {
        toast.success('SmarticketS installé !');
      }
    } catch {
      // User cancelled
    }
    deferredRef.current = null;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in window.navigator && (window.navigator as Navigator & { standalone: boolean }).standalone);

    if (isStandalone) return;

    const wasDismissed = sessionStorage.getItem('pwa-install-dismissed');
    if (wasDismissed) return;

    const handler = (e: Event) => {
      e.preventDefault();
      deferredRef.current = e as BeforeInstallPromptEvent;

      setTimeout(() => {
        toast('Installer SmarticketS', {
          description: 'Accédez rapidement hors ligne — scannez vos billets en un tap.',
          action: {
            label: 'Installer',
            onClick: handleInstall,
          },
          duration: 15000,
          closeButton: true,
          onDismiss: () => {
            sessionStorage.setItem('pwa-install-dismissed', '1');
          },
        });
      }, 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [handleInstall]);

  return null;
}

/**
 * OfflineIndicator — Fixed bottom banner when offline.
 */
export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof window === 'undefined') return true;
    return navigator.onLine;
  });
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setIsOnline(true);
      setShowBanner(false);
      toast.success('Connexion rétablie');
    };

    const handleOffline = () => {
      setIsOnline(false);
      setTimeout(() => setShowBanner(true), 500);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline || !showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-amber-900 border-t border-amber-700 px-4 py-3 flex items-center justify-between animate-in slide-in-from-bottom duration-300">
      <div className="flex items-center gap-2">
        <WifiOff className="h-4 w-4 text-amber-400" />
        <p className="text-sm text-amber-100 font-medium">Vous êtes hors ligne</p>
        <p className="text-xs text-amber-300/70 hidden sm:inline">
          — Certaines fonctionnalités sont limitées
        </p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowBanner(false)}
        className="text-amber-300 hover:text-white hover:bg-amber-800 h-8 w-8 p-0"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

/**
 * PWAManager — All-in-one PWA lifecycle manager.
 * Combines: SW registration, update detection, install prompt, offline indicator.
 */
export function PWAManager() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        const isStandalone =
          window.matchMedia('(display-mode: standalone)').matches ||
          ('standalone' in window.navigator && (window.navigator as Navigator & { standalone: boolean }).standalone);

        if (isStandalone) {
          document.body.classList.add('pwa-mode');
        }
      })
      .catch(() => {
        // SW registration failed silently
      });
  }, []);

  return (
    <>
      <PWAUpdateDetector />
      <PWAInstallPrompt />
      <OfflineIndicator />
    </>
  );
}
