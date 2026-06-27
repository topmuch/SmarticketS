'use client';

/**
 * useLiveTrips — Hook for real-time trip updates on the passenger PWA.
 *
 * Connects to the kiosk-service via Socket.io (through Caddy gateway) and
 * listens for kiosk events (boarding, departed, delay, etc.) to update the
 * trips list in real-time.
 *
 * Also fetches initial trips from /api/pwa-passager/trips/today on mount.
 *
 * Adapted from the user's React code to Next.js 16 + TypeScript.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useLiveBoardStore, type LiveTrip } from '@/stores/live-board-store';

interface UseLiveTripsOptions {
  search?: string;
  stationSlug?: string | null;
}

interface UseLiveTripsResult {
  trips: LiveTrip[];
  loading: boolean;
  error: string | null;
  connected: boolean;
}

// Kiosk event → trip status mapping
const EVENT_STATUS_MAP: Record<string, string> = {
  'kiosk:boarding': 'BOARDING',
  'kiosk:departed': 'DEPARTED',
  'kiosk:cancelled': 'CANCELLED',
  'kiosk:delay': 'DELAYED',
  'kiosk:imminent': 'SCHEDULED', // imminent = T-2min, still scheduled
  'kiosk:resolutionDelay': 'SCHEDULED', // delay resolved
};

export function useLiveTrips(options: UseLiveTripsOptions = {}): UseLiveTripsResult {
  const { search = '', stationSlug = null } = options;
  const [trips, setTrips] = useState<LiveTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const setCachedTrips = useLiveBoardStore((s) => s.setCachedTrips);

  // Fetch initial trips
  const fetchInitial = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (stationSlug) params.set('stationSlug', stationSlug);
      const res = await fetch(`/api/pwa-passager/trips/today?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const initialTrips: LiveTrip[] = data.trips || [];
      setTrips(initialTrips);
      setCachedTrips(initialTrips);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
      // Fall back to cached trips (offline mode)
      const cached = useLiveBoardStore.getState().cachedTrips;
      if (cached.length > 0) {
        setTrips(cached);
      }
    } finally {
      setLoading(false);
    }
  }, [search, stationSlug, setCachedTrips]);

  // Socket.io connection
  useEffect(() => {
    if (typeof window === 'undefined') return;

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
      setConnected(true);
      // Subscribe as a passenger to receive trip updates
      socket.emit('subscribe_passenger', { stationSlug });
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('connect_error', () => {
      setConnected(false);
    });

    // Listen for kiosk events and update trips
    Object.keys(EVENT_STATUS_MAP).forEach((event) => {
      socket.on(event, (data: { departureId?: string; tripId?: string; [key: string]: unknown }) => {
        const tripId = data.departureId || data.tripId;
        if (!tripId) return;

        setTrips((prev) => {
          const idx = prev.findIndex((t) => t.id === tripId);
          if (idx === -1) return prev; // trip not in our list

          const updated = [...prev];
          const newStatus = EVENT_STATUS_MAP[event];

          updated[idx] = {
            ...updated[idx],
            status: newStatus,
            delayMinutes: typeof data.delayMinutes === 'number' ? data.delayMinutes : updated[idx].delayMinutes,
            departedAt: event === 'kiosk:departed' ? new Date().toISOString() : updated[idx].departedAt,
            boardingStartedAt: event === 'kiosk:boarding' ? new Date().toISOString() : updated[idx].boardingStartedAt,
            gpsPosition: (data.gps as { lat: number; lng: number }) || updated[idx].gpsPosition,
            etaMinutes: typeof data.eta === 'number' ? data.eta : updated[idx].etaMinutes,
          };

          return updated;
        });
      });
    });

    // Listen for GPS updates
    socket.on('kiosk:gps', (data: { departureId: string; lat: number; lng: number; eta?: number }) => {
      setTrips((prev) => {
        const idx = prev.findIndex((t) => t.id === data.departureId);
        if (idx === -1) return prev;
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          gpsPosition: { lat: data.lat, lng: data.lng },
          etaMinutes: data.eta ?? updated[idx].etaMinutes,
        };
        return updated;
      });
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [stationSlug]);

  // Initial fetch
  useEffect(() => {
    fetchInitial();
    // Poll every 30s as fallback (in case socket misses events)
    const interval = setInterval(fetchInitial, 30_000);
    return () => clearInterval(interval);
  }, [fetchInitial]);

  return { trips, loading, error, connected };
}
