'use client';

/**
 * useAgentGpsTracking — Hook pour que l'agent partage sa position GPS
 * avec les passagers en temps réel via le kiosk-service.
 *
 * Quand le bus est parti (status = DEPARTED), l'agent active le tracking.
 * Le hook utilise navigator.geolocation.watchPosition et émet `kiosk:gps`
 * toutes les ~10 secondes via Socket.io.
 *
 * Le passager reçoit les coordonnées et les affiche sur la carte Leaflet.
 *
 * Sécurité:
 *   - Demande la permission géoloc uniquement quand l'agent active le tracking
 *   - Désactivé par défaut (l'agent doit appuyer sur "Partager position")
 *   - Arrête automatiquement quand le bus arrive à destination
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseAgentGpsOptions {
  departureId: string | null;
  stationSlug?: string | null;
  enabled: boolean; // agent must explicitly enable
}

interface GpsPosition {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
}

export function useAgentGpsTracking({ departureId, stationSlug, enabled }: UseAgentGpsOptions) {
  const [position, setPosition] = useState<GpsPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastEmitRef = useRef<number>(0);

  // Connect to kiosk-service
  useEffect(() => {
    if (!enabled || !departureId) return;
    if (typeof window === 'undefined') return;

    const socket = io('/?XTransformPort=3004', {
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
      tryAllTransports: true,
      reconnection: true,
      reconnectionAttempts: 3,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[AgentGPS] Connected to kiosk-service');
      setIsTracking(true);
    });

    socket.on('disconnect', () => {
      setIsTracking(false);
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsTracking(false);
    };
  }, [enabled, departureId]);

  // Start GPS watching
  useEffect(() => {
    if (!enabled || !departureId || !socketRef.current) return;
    if (!('geolocation' in navigator)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError('Géolocalisation non supportée sur cet appareil');
      return;
    }

    const startWatch = () => {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const gps: GpsPosition = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp,
          };
          setPosition(gps);

          // Emit to kiosk-service (throttle to every 10s)
          const now = Date.now();
          if (now - lastEmitRef.current >= 10_000) {
            lastEmitRef.current = now;
            const socket = socketRef.current;
            if (socket && socket.connected) {
              socket.emit('kiosk:gps', {
                departureId,
                lat: gps.lat,
                lng: gps.lng,
                eta: null, // could be calculated with a routing API
                stationSlug: stationSlug || undefined,
              });
            }
          }
        },
        (err) => {
          let msg = 'Erreur GPS';
          if (err.code === err.PERMISSION_DENIED) msg = 'Permission GPS refusée';
          else if (err.code === err.POSITION_UNAVAILABLE) msg = 'Position GPS indisponible';
          else if (err.code === err.TIMEOUT) msg = 'Délai GPS dépassé';
          setError(msg);
        },
        {
          enableHighAccuracy: true,
          timeout: 15_000,
          maximumAge: 10_000,
        }
      );
    };

    startWatch();

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [enabled, departureId, stationSlug]);

  return { position, error, isTracking };
}
