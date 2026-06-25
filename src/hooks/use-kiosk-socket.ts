'use client';

/**
 * useKioskSocket — Hook client pour se connecter au mini-service kiosk-service
 * (WebSocket sur port 3004) et recevoir les événements temps réel.
 *
 * Adapté de BusGo `use-bus-go-socket.ts` pour SmarticketS.
 *
 * Le kiosk-service utilise socket.io avec des rooms par station:
 *   - room `station:<slug>` pour une gare précise
 *   - broadcast `__ALL__` pour toutes les gares
 *
 * Événements écoutés par l'agent:
 *   - `departure:status` — changement de statut d'un départ (BOARDING, DEPARTED, etc.)
 *   - `departure:delay` — retard signalé sur un départ
 *   - `ticket:validated` — un ticket a été validé (par controller ou agent)
 *   - `ticket:cancelled` — un ticket a été annulé
 *   - `passenger:boarded` — un passager a embarqué
 *   - `passenger:missing` — un passager est manquant à T-5
 *   - `announcement` — annonce manuelle de l'admin
 *
 * Usage:
 *   const { isConnected, lastEvent, emit } = useKioskSocket({
 *     stationSlug: 'dakar-gare',
 *     onEvent: (event, data) => { ... },
 *   });
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export type KioskEvent =
  | 'departure:status'
  | 'departure:delay'
  | 'ticket:validated'
  | 'ticket:cancelled'
  | 'passenger:boarded'
  | 'passenger:missing'
  | 'announcement'
  | 'sync:request';

export interface KioskEventPayload {
  departureId?: string;
  ticketId?: string;
  passengerName?: string;
  seatNumber?: string;
  status?: string;
  delayMinutes?: number;
  message?: string;
  timestamp: number;
  [key: string]: unknown;
}

export interface UseKioskSocketOptions {
  stationSlug?: string;
  onEvent?: (event: KioskEvent, data: KioskEventPayload) => void;
  enabled?: boolean;
}

export interface UseKioskSocketResult {
  isConnected: boolean;
  lastEvent: { event: KioskEvent; data: KioskEventPayload } | null;
  emit: (event: KioskEvent, data: Partial<KioskEventPayload>) => void;
  reconnect: () => void;
}

const KIOSK_WS_PATH = '/'; // Caddy route WS requests to kiosk-service via XTransformPort=3004

export function useKioskSocket(options: UseKioskSocketOptions): UseKioskSocketResult {
  const { stationSlug, onEvent, enabled = true } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<{ event: KioskEvent; data: KioskEventPayload } | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const onEventRef = useRef(onEvent);

  // Keep onEvent ref synced without re-creating the socket
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    // Connect to kiosk-service via the gateway (Caddy forwards ?XTransformPort=3004)
    // to the kiosk-service on port 3004.
    const socket = io({
      path: KIOSK_WS_PATH,
      query: { XTransformPort: '3004' },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      // Join the station room if a slug is provided
      if (stationSlug) {
        socket.emit('join', { station: stationSlug });
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('connect_error', () => {
      setIsConnected(false);
    });

    // Listen to all known kiosk events
    const events: KioskEvent[] = [
      'departure:status',
      'departure:delay',
      'ticket:validated',
      'ticket:cancelled',
      'passenger:boarded',
      'passenger:missing',
      'announcement',
      'sync:request',
    ];

    events.forEach((event) => {
      socket.on(event, (data: KioskEventPayload) => {
        const payload: KioskEventPayload = {
          ...data,
          timestamp: data.timestamp ?? Date.now(),
        };
        setLastEvent({ event, data: payload });
        onEventRef.current?.(event, payload);
      });
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [stationSlug, enabled]);

  const emit = useCallback((event: KioskEvent, data: Partial<KioskEventPayload>) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit(event, { ...data, timestamp: Date.now() });
  }, []);

  const reconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current.connect();
    }
  }, []);

  return {
    isConnected,
    lastEvent,
    emit,
    reconnect,
  };
}
