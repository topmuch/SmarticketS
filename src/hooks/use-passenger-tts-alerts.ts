'use client';

/**
 * usePassengerTtsAlerts — Hook pour les annonces vocales temps réel sur la PWA passager.
 *
 * Écoute les events kiosk (boarding, departed, delay, cancel) via Socket.io
 * et joue une annonce vocale TTS + ding-dong quand un changement affecte
 * le billet du passager.
 *
 * Le passager doit avoir un ticketId en localStorage (défini lors de l'install PWA).
 */

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { playDingDong } from '@/lib/audioSystem';

interface UsePassengerTtsOptions {
  ticketId: string | null;
  departureId?: string | null;
  enabled?: boolean;
}

// Map kiosk event → message template
const EVENT_MESSAGES: Record<string, (data: Record<string, unknown>) => string> = {
  'kiosk:boarding': (d) => `Embarquement en cours pour ${d.destination || 'votre destination'}. Veuillez vous présenter au quai ${d.platform || ''}.`,
  'kiosk:departed': (d) => `Le bus pour ${d.destination || 'votre destination'} est parti. Bon voyage !`,
  'kiosk:delay': (d) => `Attention. Le bus pour ${d.destination || 'votre destination'} a ${d.delayMinutes || 5} minutes de retard.`,
  'kiosk:cancelled': (d) => `Attention. Le départ pour ${d.destination || 'votre destination'} a été annulé. Contactez l'agence.`,
  'kiosk:imminent': (d) => `Attention. Le bus pour ${d.destination || 'votre destination'} part dans 2 minutes. Présentez-vous immédiatement au quai ${d.platform || ''}.`,
};

export function usePassengerTtsAlerts({ ticketId, departureId, enabled = true }: UsePassengerTtsOptions) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!enabled || !ticketId || typeof window === 'undefined') return;

    // Connect to kiosk-service via Caddy gateway
    const socket = io('/?XTransformPort=3004', {
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
      tryAllTransports: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      // Subscribe as passenger to receive all trip updates
      socket.emit('subscribe_passenger', {});
    });

    // Listen for kiosk events that affect this passenger's departure
    Object.keys(EVENT_MESSAGES).forEach((event) => {
      socket.on(event, (data: { departureId?: string; [key: string]: unknown }) => {
        // Only react if the event is for our departure
        if (departureId && data.departureId && data.departureId !== departureId) return;

        const messageFn = EVENT_MESSAGES[event];
        if (!messageFn) return;

        const message = messageFn(data);

        // 1. Play ding-dong (base64 en dur ou MP3 uploadé)
        try {
          playDingDong();
        } catch {
          // Ding-dong failure is non-fatal
        }

        // 2. Wait 1.5s then speak the message via TTS
        setTimeout(() => {
          if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(message);
            utterance.lang = 'fr-FR';
            utterance.rate = 0.9;
            utterance.volume = 1.0;
            window.speechSynthesis.speak(utterance);
          }
        }, 1500);

        // 3. Also show a visual notification if permission granted
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            const titleMap: Record<string, string> = {
              'kiosk:boarding': '🚨 Embarquement en cours',
              'kiosk:departed': '🏁 Bus parti',
              'kiosk:delay': '⏰ Retard de départ',
              'kiosk:cancelled': '❌ Départ annulé',
              'kiosk:imminent': '⚠️ Départ imminent',
            };
            new Notification(titleMap[event] || '🔔 Notification BusGo', {
              body: message,
              icon: '/icons/icon-192x192.png',
              tag: `${event}-${data.departureId || ''}`,
            });
          } catch {
            // Notification failure is non-fatal
          }
        }
      });
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [ticketId, departureId, enabled]);
}
